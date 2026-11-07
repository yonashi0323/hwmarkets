import {createHash} from 'node:crypto';

const IDS=new Set(['nikkei','sp500','dow','nasdaq','dax','ftse','usdjpy','bitcoin','hangseng','shanghai','eurusd','gbpjpy','ethereum','gold','oil','silver','eurjpy','audjpy','nzdjpy','cadjpy','chfjpy','zarjpy','gbpusd','audusd','nzdusd','usdcad','usdchf','eurgbp','euraud','gbpaud','audnzd']);
const ATTRIBUTE='hwmarketsPreferences';
const PRODUCTION_ORIGIN='https://orbit-markets-jp.vercel.app';
const LIMIT=16384;
export class AccountError extends Error {
  constructor(code,status=400,retryAfter){super(code);this.code=code;this.status=status;this.retryAfter=retryAfter;}
}
export function normalizePreferences(value,{now=Date.now(),stored=false}={}) {
  if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(k=>!['board','favorites','futuresFavorites','cryptoFavorites','watchView','compact','focusId','updatedAt','version'].includes(k)))throw new AccountError('invalid_preferences');
  const ids=values=>{
    if(!Array.isArray(values)||values.length>IDS.size||values.some(id=>typeof id!=='string'||!IDS.has(id)))throw new AccountError('invalid_preferences');
    return [...new Set(values)];
  };
  if(typeof value.compact!=='boolean'||!IDS.has(value.focusId)||(value.version!=null&&value.version!==1))throw new AccountError('invalid_preferences');
  const watchIds=(values,max,valid)=>{if(values===undefined)return [];if(!Array.isArray(values)||values.length>max||values.some(id=>!valid(id)))throw new AccountError('invalid_preferences');return [...new Set(values)];};
  if(value.watchView!==undefined&&!['list','charts'].includes(value.watchView))throw new AccountError('invalid_preferences');
  const result={version:1,board:ids(value.board),favorites:ids(value.favorites),futuresFavorites:watchIds(value.futuresFavorites,100,id=>typeof id==='string'&&/^xyz:[A-Za-z0-9_.-]{1,40}$/.test(id)),cryptoFavorites:watchIds(value.cryptoFavorites,50,id=>Number.isSafeInteger(id)&&id>0&&id<=2147483647),compact:value.compact,focusId:value.focusId,updatedAt:new Date(now).toISOString()};
  if(stored&&value.updatedAt){if(typeof value.updatedAt!=='string'||!Number.isFinite(Date.parse(value.updatedAt)))throw new AccountError('invalid_preferences');result.updatedAt=new Date(value.updatedAt).toISOString();}
  result.watchView=value.watchView||'charts';
  return result;
}
const validEmail=value=>typeof value==='string'&&value.length<=254&&/^[^\s@<>]{1,64}@[^\s@<>]+\.[^\s@<>]+$/.test(value);
const canonicalEmail=value=>typeof value==='string'?value.trim().toLowerCase():'';
function cookies(request){
  const result={};
  for(const part of String(request.headers?.cookie||'').split(';')){
    const index=part.indexOf('=');if(index<1)continue;
    const name=part.slice(0,index).trim(),value=part.slice(index+1).trim();
    if(value.length<=7000&&/^[A-Za-z0-9._~-]*$/.test(value))result[name]=value;
  }
  return result;
}
function jwtAge(jwt,fallback,now,max){
  try{const exp=JSON.parse(Buffer.from(jwt.split('.')[1],'base64url').toString()).exp;return Number.isFinite(exp)?Math.max(1,Math.min(max,Math.floor(exp-now/1000))):fallback;}catch{return fallback;}
}
async function body(request){
  let data=request.body;
  if(data==null){
    let text='';for await(const chunk of request){text+=chunk.toString();if(Buffer.byteLength(text)>LIMIT)throw new AccountError('request_too_large',413);}data=text;
  }
  if(typeof data==='string'){if(Buffer.byteLength(data)>LIMIT)throw new AccountError('request_too_large',413);try{data=JSON.parse(data);}catch{throw new AccountError('invalid_request');}}
  if(!data||typeof data!=='object'||Array.isArray(data)||Buffer.byteLength(JSON.stringify(data))>LIMIT)throw new AccountError('invalid_request');
  return data;
}
function sdkOk(result,code,status=503){
  if(!result?.ok&&Number(result?.code)>=500)throw new AccountError(code==='invalid_magic_link'?'authentication_unavailable':code,503);
  if(!result?.ok)throw new AccountError(Number(result?.code)===429?'rate_limited':code,Number(result?.code)===429?429:status,Number(result?.code)===429?60:undefined);
  return result.data;
}
export function createAccountHandler({env=process.env,getClient,now=Date.now}={}){
  const attempts=new Map();
  function origin(){
    const value=env.AUTH_PUBLIC_ORIGIN||PRODUCTION_ORIGIN;
    // An alternate origin is only for explicit loopback development, never preview domains.
    if(value!==PRODUCTION_ORIGIN&&!(env.NODE_ENV!=='production'&&/^http:\/\/(127\.0\.0\.1|localhost):\d{1,5}$/.test(value)))throw new AccountError('configuration_required',503);
    return value;
  }
  function names(){const secure=origin().startsWith('https:');return {secure,session:secure?'__Host-hw-session':'hw-session-dev',refresh:secure?'__Host-hw-refresh':'hw-refresh-dev'};}
  function cookieHeaders(response,session,refresh){
    const settings=names(),suffix=`; Path=/; HttpOnly; SameSite=Lax${settings.secure?'; Secure':''}`;
    const values=[];
    for(const [name,token,ttl] of [[settings.session,session,600],[settings.refresh,refresh,30*86400]]){
      if(token!==undefined){if(token&&!/^[A-Za-z0-9._~-]{1,7000}$/.test(token))throw new AccountError('authentication_unavailable',503);values.push(`${name}=${token||''}; Max-Age=${token?jwtAge(token,ttl,now(),name===settings.session?3600:90*86400):0}${suffix}`);}
    }
    if(values.length)response.setHeader('Set-Cookie',values);
  }
  function throttle(request,email){
    const time=now();
    const ip=String(request.headers?.['x-forwarded-for']||request.socket?.remoteAddress||'unknown').split(',')[0].trim();
    const digest=value=>createHash('sha256').update(value).digest('hex');
    const keys=[{key:'email:'+digest(email),window:60000,max:1},{key:'ip:'+digest(ip),window:3600000,max:12}];
    for(const rule of keys){const entry=attempts.get(rule.key);if(entry&&time-entry.start<rule.window&&entry.count>=rule.max)throw new AccountError('rate_limited',429,Math.max(1,Math.ceil((entry.start+rule.window-time)/1000)));}
    if(attempts.size>2000){for(const [key,entry] of attempts)if(time-entry.start>3600000)attempts.delete(key);if(attempts.size>2000)attempts.delete(attempts.keys().next().value);}
    for(const rule of keys){const old=attempts.get(rule.key);attempts.set(rule.key,!old||time-old.start>=rule.window?{start:time,count:1}:{...old,count:old.count+1});}
  }
  async function authenticated(request,response,sdk){
    const values=cookies(request),keys=names(),refresh=values[keys.refresh];
    if(!refresh)throw new AccountError('not_authenticated',401);
    try{
      let auth,currentRefresh=refresh;
      try{auth=await sdk.validateSession(values[keys.session],{audience:env.DESCOPE_PROJECT_ID});}
      catch{
        // The Node helper flattens errors. The raw refresh response preserves HTTP status,
        // so a temporary provider outage does not sign out a valid browser session.
        const result=await sdk.refresh(refresh);
        if(!result?.ok){if([400,401,403].includes(Number(result?.code)))throw new AccountError('not_authenticated',401);throw new AccountError('authentication_unavailable',503);}
        const next=result.data;
        if(!next?.sessionJwt)throw new AccountError('authentication_unavailable',503);
        auth=await sdk.validateSession(next.sessionJwt,{audience:env.DESCOPE_PROJECT_ID});
        currentRefresh=next.refreshJwt||refresh;
      }
      if(!auth?.token?.sub||typeof auth.token.sub!=='string')throw new AccountError('not_authenticated',401);
      if(auth.jwt!==values[keys.session]||currentRefresh!==refresh)cookieHeaders(response,auth.jwt,currentRefresh);
      return {id:auth.token.sub,refresh:currentRefresh};
    }catch(error){
      if(error instanceof AccountError){if(error.status===401)cookieHeaders(response,'','');throw error;}
      throw new AccountError('authentication_unavailable',503);
    }
  }
  async function profile(sdk,auth){
    const result=await sdk.me(auth.refresh);
    if(!result?.ok&&[401,403].includes(Number(result?.code)))throw new AccountError('not_authenticated',401);
    const user=sdkOk(result,'authentication_unavailable');
    if(user?.userId!==auth.id||user.verifiedEmail!==true||!validEmail(user.email))throw new AccountError('authentication_unavailable',503);
    let preferences=null,preferencesError=false;
    const value=user.customAttributes?.[ATTRIBUTE];
    if(value!=null&&value!==''){
      try{if(typeof value!=='string'||Buffer.byteLength(value)>8192)throw Error();preferences=normalizePreferences(JSON.parse(value),{now:now(),stored:true});}
      catch{preferencesError=true;}
    }
    return {configured:true,user:{id:auth.id,email:user.email},cloudEnabled:!!env.DESCOPE_MANAGEMENT_KEY,preferences,preferencesError};
  }
  return async function handler(request,response){
    response.setHeader('Content-Type','application/json; charset=utf-8');
    response.setHeader('Cache-Control','no-store');response.setHeader('Vercel-CDN-Cache-Control','no-store');
    response.setHeader('X-Content-Type-Options','nosniff');response.setHeader('Referrer-Policy','no-referrer');
    const reply=(status,value)=>{response.statusCode=status;response.end(request.method==='HEAD'?undefined:JSON.stringify(value));};
    try{
      if(!['GET','POST'].includes(request.method)){response.setHeader('Allow','GET, POST');return reply(405,{error:{code:'method_not_allowed'}});}
      if(!env.DESCOPE_PROJECT_ID){
        return request.method==='GET'?reply(200,{configured:false,user:null,cloudEnabled:false,preferences:null}):reply(503,{error:{code:'configuration_required'}});
      }
      if(request.method==='POST'){
        if(request.headers?.origin!==origin()||request.headers?.['sec-fetch-site']==='cross-site')throw new AccountError('request_not_allowed',403);
        if(!String(request.headers?.['content-type']||'').toLowerCase().startsWith('application/json'))throw new AccountError('invalid_request',415);
      }
      const sdk=await getClient();
      if(request.method==='GET'){
        try{return reply(200,await profile(sdk,await authenticated(request,response,sdk)));}
        catch(error){if(error.code==='not_authenticated'){cookieHeaders(response,'','');return reply(200,{configured:true,user:null,cloudEnabled:!!env.DESCOPE_MANAGEMENT_KEY,preferences:null});}throw error;}
      }
      const input=await body(request);
      if(input.action==='start'){
        const email=canonicalEmail(input.email);if(!validEmail(email))throw new AccountError('invalid_email');
        const mode=input.mode??'login';if(!['login','signup'].includes(mode))throw new AccountError('invalid_request');
        throttle(request,email);
        const result=await sdk.magicLink[mode==='signup'?'signUp':'signIn'].email(email,origin()+'/auth.html?mode='+mode);
        // Keep account existence private, while sign-in never creates a new user.
        if(!result?.ok&&![400,401,404,409].includes(Number(result?.code)))sdkOk(result,'email_delivery_unavailable');
        return reply(200,{sent:true});
      }
      if(input.action==='verify'){
        const email=canonicalEmail(input.email);
        if(!validEmail(email)||typeof input.token!=='string'||input.token.length<1||input.token.length>4096)throw new AccountError('invalid_request');
        const data=sdkOk(await sdk.magicLink.verify(input.token),'invalid_magic_link',400);
        if(!data?.sessionJwt||!data.refreshJwt||!data.user?.userId||data.user.verifiedEmail!==true||canonicalEmail(data.user.email)!==email)throw new AccountError('email_mismatch',400);
        const verified=await sdk.validateSession(data.sessionJwt,{audience:env.DESCOPE_PROJECT_ID});
        if(verified?.token?.sub!==data.user.userId)throw new AccountError('authentication_unavailable',503);
        const result=await profile(sdk,{id:verified.token.sub,refresh:data.refreshJwt});
        cookieHeaders(response,data.sessionJwt,data.refreshJwt);
        return reply(200,result);
      }
      if(input.action==='logout'){
        const refresh=cookies(request)[names().refresh];let revoked=false;
        if(refresh){try{revoked=!!(await sdk.logout(refresh))?.ok;}catch{}}
        cookieHeaders(response,'','');return reply(200,{ok:true,revoked});
      }
      if(input.action==='save'){
        const auth=await authenticated(request,response,sdk);
        if(input.owner!==auth.id)throw new AccountError('account_changed',409);
        if(!env.DESCOPE_MANAGEMENT_KEY)throw new AccountError('cloud_unavailable',503);
        const preferences=normalizePreferences(input.preferences,{now:now()});
        // An older open tab must not erase watchlists added by a newer client.
        if(!Object.hasOwn(input.preferences,'futuresFavorites')||!Object.hasOwn(input.preferences,'cryptoFavorites')||!Object.hasOwn(input.preferences,'watchView')){
          const previous=await profile(sdk,auth);
          if(previous.preferencesError)throw new AccountError('save_unavailable',503);
          for(const key of ['futuresFavorites','cryptoFavorites','watchView'])if(!Object.hasOwn(input.preferences,key))preferences[key]=previous.preferences?.[key]||(key==='watchView'?'charts':[]);
        }
        sdkOk(await sdk.management.user.updateCustomAttribute(auth.id,ATTRIBUTE,JSON.stringify(preferences)),'save_unavailable');
        return reply(200,{saved:true,preferences});
      }
      throw new AccountError('invalid_request');
    }catch(error){
      const safe=error instanceof AccountError?error:new AccountError('authentication_unavailable',503);
      if(safe.retryAfter)response.setHeader('Retry-After',String(safe.retryAfter));
      return reply(safe.status,{error:{code:safe.code}});
    }
  };
}