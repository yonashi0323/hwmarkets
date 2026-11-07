import {CACHE_MS, createHyperliquidService, DataError} from '../lib/hyperliquid.js';
const service=createHyperliquidService();
export default async function handler(request,response) {
  response.setHeader('Content-Type','application/json; charset=utf-8');
  response.setHeader('X-Content-Type-Options','nosniff');
  response.setHeader('Cache-Control','no-store');
  if (!['GET','HEAD'].includes(request.method)) {
    response.setHeader('Allow','GET, HEAD'); response.statusCode=405;
    return response.end(JSON.stringify({error:{code:'method_not_allowed'}}));
  }
  try {
    const query=new URL(request.url,'http://localhost').searchParams;
    const coin=query.get('coin');
    if ([...query.keys()].some(k=>!['coin','range'].includes(k)) || (!coin && query.has('range'))) throw new DataError('invalid_request',400);
    const data=coin?await service.candles(coin,query.get('range')||'day'):await service.markets();
    response.statusCode=200;
    response.setHeader('Cache-Control','public, max-age=0, must-revalidate');
    const ttl=Math.max(1,Math.floor((Date.parse(data.fetchedAt)+CACHE_MS-Date.now())/1000));
    response.setHeader('Vercel-CDN-Cache-Control',data.stale?'no-store':`public, s-maxage=${ttl}`);
    return response.end(request.method==='HEAD'?undefined:JSON.stringify(data));
  } catch(error) {
    const safe=error instanceof DataError?error:new DataError();
    response.statusCode=safe.status;
    response.setHeader('Vercel-CDN-Cache-Control','no-store');
    if (safe.status>=500) response.setHeader('Retry-After','30');
    return response.end(request.method==='HEAD'?undefined:JSON.stringify({error:{code:safe.code}}));
  }
}