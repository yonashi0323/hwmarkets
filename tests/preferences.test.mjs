import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import test from 'node:test';

const app=await readFile(new URL('../app.js',import.meta.url),'utf8');
const account=await readFile(new URL('../account.js',import.meta.url),'utf8');
// Run the real workspace and account code; only rendering, storage and HTTP are stubbed.
const workspaceSource=app.slice(0,app.indexOf('function toast(message)'))+
  '\nfunction repaintPreferences(){} function updateWatchCounts(){} function toast(){}';
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const settle=async()=>{await tick();await tick();};
const waitForSave=async()=>{await new Promise(resolve=>setTimeout(resolve,720));await settle();};
const defaults=()=>({board:['nikkei'],favorites:['nikkei'],futuresFavorites:[],cryptoFavorites:[],watchView:'charts',compact:false,focusId:'nikkei'});
const cloud=()=>({configured:true,user:{id:'test-user',email:'test@example.test'},cloudEnabled:true,preferences:defaults()});
const accountKey='hwmarkets-account-v1:test-user';

function createTab(storage,{profile=cloud(),signedIn=false,onSave}={}){
  const elements=new Map(),listeners=new Map(),sessionStorage=new Map(),requests=[];
  let failSave=false;
  class Element{
    constructor(id){this.id=id;this.listeners=new Map();this.children=[];this.value='';this.open=false;this.classList={toggle(){},add(){},remove(){}};}
    set innerHTML(value){
      this.html=value;for(const child of this.children)elements.delete(child.id);this.children=[];
      for(const match of value.matchAll(/<[a-z]+\b([^>]*)>/g)){
        const id=/\bid="([^"]+)"/.exec(match[1])?.[1];
        if(id){const child=new Element(id);elements.set(id,child);this.children.push(child);}
      }
    }
    get innerHTML(){return this.html||'';}
    setAttribute(){}
    addEventListener(type,handler){this.listeners.set(type,handler);}
    querySelector(){return new Element('button');}
    focus(){}
    showModal(){this.open=true;}
  }
  for(const id of ['accountDialog','accountContent','accountButton','signupButton','accountButtonLabel','accountTitle'])elements.set(id,new Element(id));
  const window={addEventListener:(type,handler)=>listeners.set(type,handler),dispatchEvent:event=>listeners.get(event.type)?.(event)};
  const document={querySelectorAll:()=>[],getElementById:id=>elements.get(id)||null,hidden:false,addEventListener:(type,handler)=>listeners.set('document:'+type,handler)};
  const context=vm.createContext({window,document,location:{hash:''},
    CustomEvent:class{constructor(type,options){this.type=type;this.detail=options?.detail;}},Event:class{constructor(type){this.type=type;}},
    localStorage:{getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,value)},
    sessionStorage:{getItem:key=>sessionStorage.get(key),setItem:(key,value)=>sessionStorage.set(key,value),removeItem:key=>sessionStorage.delete(key)},
    setTimeout,clearTimeout,AbortController,fetch:async(_url,options)=>{
      const body=options.body?JSON.parse(options.body):null;requests.push(body);
      if(body?.action==='save'){
        if(failSave)return {ok:false,status:503,headers:{get:()=>null},json:async()=>({error:{code:'save_unavailable'}})};
        if(onSave)await onSave(body);
        profile.preferences=structuredClone(body.preferences);
      }
      return {ok:true,status:200,headers:{get:()=>null},json:async()=>body?.action==='save'?{saved:true}:body?.action==='logout'?{ok:true}:structuredClone(profile)};
    }});
  vm.runInContext(workspaceSource,context);
  if(signedIn)vm.runInContext(account,context);
  return {workspace:window.HWWorkspace,elements,requests,failSaves(){failSave=true;},storageEvent(key){listeners.get('storage')?.({key});},
    async click(id){assert(elements.has(id),'Missing button '+id);await elements.get(id).listeners.get('click')?.();await settle();}};
}

test('a stale second tab preserves another tab’s additions before its storage event arrives',()=>{
  const storage=new Map(),a=createTab(storage),b=createTab(storage);
  a.workspace.toggleWatch('futures','xyz:NVDA');b.workspace.toggleWatch('futures','xyz:TSLA');
  assert.deepEqual(JSON.parse(storage.get('orbit-markets-v1')).futuresFavorites,['xyz:NVDA','xyz:TSLA']);
  a.storageEvent('orbit-markets-v1');
  assert.deepEqual([...a.workspace.getWatchlist('futures')],['xyz:NVDA','xyz:TSLA']);
});

test('a removal in a stale tab preserves unrelated additions and scalar settings',()=>{
  const storage=new Map(),a=createTab(storage);
  a.workspace.applyPreferences({...defaults(),futuresFavorites:['xyz:NVDA']});
  const b=createTab(storage);
  a.workspace.applyPreferences({...defaults(),futuresFavorites:['xyz:NVDA','xyz:TSLA'],compact:true});
  b.workspace.toggleWatch('futures','xyz:NVDA');
  const result=JSON.parse(storage.get('orbit-markets-v1'));
  assert.deepEqual(result.futuresFavorites,['xyz:TSLA']);assert.equal(result.compact,true);
});

test('concurrent additions respect the limit without evicting an existing saved item',()=>{
  const storage=new Map(),a=createTab(storage);
  a.workspace.applyPreferences({...defaults(),futuresFavorites:Array.from({length:99},(_,i)=>'xyz:S'+i)});
  const b=createTab(storage);a.workspace.toggleWatch('futures','xyz:NVDA');
  assert.equal(b.workspace.toggleWatch('futures','xyz:TSLA'),false);
  const list=JSON.parse(storage.get('orbit-markets-v1')).futuresFavorites;
  assert.equal(list.length,100);assert(list.includes('xyz:NVDA'));
});

test('failed cloud saves survive reload and explicit retry clears the persistent pending state',async()=>{
  const storage=new Map(),profile=cloud(),a=createTab(storage,{signedIn:true,profile});await settle();
  a.failSaves();a.workspace.toggleWatch('futures','xyz:NVDA');await waitForSave();
  assert.match(a.elements.get('accountContent').innerHTML,/同期できませんでした/);
  assert(a.workspace.hasPendingSync());
  const b=createTab(storage,{signedIn:true,profile});await settle();
  assert.deepEqual([...b.workspace.getWatchlist('futures')],['xyz:NVDA']);
  assert.match(b.elements.get('accountContent').innerHTML,/未同期の変更/);
  assert.equal(b.requests.filter(body=>body?.action==='save').length,0);
  await b.click('accountSyncRetry');await waitForSave();
  assert.equal(b.workspace.hasPendingSync(),false);
  assert.deepEqual(profile.preferences.futuresFavorites,['xyz:NVDA']);
  const c=createTab(storage,{signedIn:true,profile});await settle();
  assert.deepEqual([...c.workspace.getWatchlist('futures')],['xyz:NVDA']);
  assert.equal(c.workspace.hasPendingSync(),false);
});

test('an older save acknowledgement does not mark a newer revision as synced',()=>{
  const storage=new Map(),a=createTab(storage);a.workspace.setOwner('test-user');
  a.workspace.toggleWatch('futures','xyz:NVDA');const older=a.workspace.getSyncSnapshot();
  a.workspace.toggleWatch('futures','xyz:TSLA');const newer=a.workspace.getSyncSnapshot();
  assert.equal(a.workspace.acknowledgeSync(newer),true);
  assert.equal(a.workspace.acknowledgeSync(older),false);
  assert.deepEqual(JSON.parse(storage.get(accountKey)).futuresFavorites,['xyz:NVDA','xyz:TSLA']);
  assert.equal(a.workspace.acknowledgeSync(newer),true);
});

test('an edit during an in-flight save is sent next and sync metadata never reaches the API',async()=>{
  const storage=new Map(),profile=cloud();let release,calls=0;
  const a=createTab(storage,{signedIn:true,profile,onSave:()=>++calls===1?new Promise(resolve=>{release=resolve;}):undefined});await settle();
  a.workspace.toggleWatch('futures','xyz:NVDA');await waitForSave();assert(release);
  a.workspace.toggleWatch('futures','xyz:TSLA');release();await settle();await settle();
  const saves=a.requests.filter(body=>body?.action==='save');
  assert.equal(saves.length,2);assert.deepEqual(saves[1].preferences.futuresFavorites,['xyz:NVDA','xyz:TSLA']);
  assert(saves.every(body=>!Object.keys(body.preferences).some(key=>key.startsWith('_'))));
  assert.equal(a.workspace.hasPendingSync(),false);
  await waitForSave();assert.equal(a.requests.filter(body=>body?.action==='save').length,2);
});

test('pending state and storage events stay within their account and guest workspaces',()=>{
  const storage=new Map(),a=createTab(storage);a.workspace.toggleWatch('futures','xyz:GUEST');
  a.workspace.setOwner('test-user');a.workspace.toggleWatch('futures','xyz:NVDA');
  const pending=a.workspace.getSyncSnapshot();a.workspace.setOwner('other-user');
  a.storageEvent(accountKey);assert.deepEqual([...a.workspace.getWatchlist('futures')],[]);
  assert.equal(a.workspace.hasPendingSync(),false);
  a.workspace.setOwner('test-user');assert(a.workspace.hasPendingSync());
  assert.deepEqual([...a.workspace.getWatchlist('futures')],['xyz:NVDA']);
  a.workspace.acknowledgeSync(pending);a.workspace.setOwner(null);
  assert.deepEqual([...a.workspace.getWatchlist('futures')],['xyz:GUEST']);
  assert.equal(a.workspace.hasPendingSync(),false);
});

test('cloud preferences cannot replace a pending local edit and legacy records still load',()=>{
  const storage=new Map([[accountKey,JSON.stringify({...defaults(),futuresFavorites:['xyz:LEGACY']})]]);
  const a=createTab(storage);a.workspace.setOwner('test-user');assert.equal(a.workspace.hasPendingSync(),false);
  a.workspace.toggleWatch('futures','xyz:NVDA');
  a.workspace.applyPreferences(defaults(),{fromCloud:true});
  assert.deepEqual([...a.workspace.getWatchlist('futures')],['xyz:LEGACY','xyz:NVDA']);
  assert(a.workspace.hasPendingSync());
});

test('cross-tab changes remain device-only when cloud sync is disabled',async()=>{
  const storage=new Map(),profile={...cloud(),cloudEnabled:false};
  const a=createTab(storage,{signedIn:true,profile}),b=createTab(storage,{signedIn:true,profile});await settle();
  a.workspace.toggleWatch('futures','xyz:NVDA');b.storageEvent(accountKey);
  assert.deepEqual([...b.workspace.getWatchlist('futures')],['xyz:NVDA']);
  assert.match(b.elements.get('accountContent').innerHTML,/このブラウザに保存しました/);
  assert.equal(b.requests.filter(body=>body?.action==='save').length,0);
});
