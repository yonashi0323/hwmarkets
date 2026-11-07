const INFO_URL = 'https://api.hyperliquid.xyz/info';
export const CACHE_MS = 60000;
export const RANGES = Object.freeze({day: {interval: '15m', ms: 86400000}, week: {interval: '1h', ms: 604800000}, month: {interval: '4h', ms: 2592000000}});
export class DataError extends Error {
  constructor(code = 'upstream_error', status = 502) { super(code); this.code = code; this.status = status; }
}
function num(value, nonnegative = false) {
  if (value == null) return null;
  if (!['string', 'number'].includes(typeof value) || String(value).trim() === '') throw new DataError();
  const n = Number(value);
  if (!Number.isFinite(n) || (nonnegative && n < 0)) throw new DataError();
  return n;
}
export function normalizeMarkets(payload, now, categories) {
  if (!Array.isArray(payload) || !Array.isArray(payload[0]?.universe) || !Array.isArray(payload[1]) || payload[0].universe.length !== payload[1].length) throw new DataError();
  if (!Array.isArray(categories) || !categories.length || categories.some(c=>!Array.isArray(c)||c.length!==2||typeof c[0]!=='string'||typeof c[1]!=='string')) throw new DataError();
  const types=new Map(categories);
  const seen = new Set();
  const markets = payload[0].universe.flatMap((asset, index) => {
    // Context indices refer to the original universe, including delisted contracts.
    if (asset.isDelisted) return [];
    // Fail closed: only explicitly classified stocks/ETFs and equity indices on xyz.
    const category=types.get(asset.name)?.toLowerCase();
    if (!['stocks','stock','indices'].includes(category)) return [];
    if (typeof asset.name !== 'string' || !/^xyz:[A-Za-z0-9_.-]{1,40}$/.test(asset.name) || seen.has(asset.name)) throw new DataError();
    seen.add(asset.name);
    const ctx = payload[1][index];
    if (!ctx || typeof ctx !== 'object') throw new DataError();
    const mark = num(ctx.markPx, true), previous = num(ctx.prevDayPx, true), oi = num(ctx.openInterest, true);
    const change24h = mark != null && previous > 0 ? (mark / previous - 1) * 100 : null;
    const openInterestUsdc = oi != null && mark != null ? oi * mark : null;
    if ((change24h != null && !Number.isFinite(change24h)) || (openInterestUsdc != null && !Number.isFinite(openInterestUsdc))) throw new DataError();
    return [{coin: asset.name, symbol:asset.name.slice(4), category:category==='indices'?'indices':'stocks', mark, change24h, volume24h: num(ctx.dayNtlVlm, true), openInterestUsdc, fundingHourly: num(ctx.funding)}];
  }).sort((a,b) => (b.volume24h ?? -1) - (a.volume24h ?? -1) || a.coin.localeCompare(b.coin));
  if (!markets.length) throw new DataError();
  return {source: 'Hyperliquid', dex: 'xyz', scope:'equities', notionalUnit:'USDC', priceUnit:'contract_reference', fetchedAt: new Date(now).toISOString(), stale: false, markets};
}
export function normalizeCandles(payload, coin, range, now) {
  if (!Array.isArray(payload) || payload.length > 1000) throw new DataError();
  const spec = RANGES[range];
  const seen = new Set();
  const candles = payload.map(c => {
    if (c.s !== coin || c.i !== spec.interval || !Number.isSafeInteger(c.t) || !Number.isSafeInteger(c.T) || c.T < c.t || seen.has(c.t)) throw new DataError();
    seen.add(c.t);
    const open = num(c.o,true), high = num(c.h,true), low = num(c.l,true), close = num(c.c,true), volume = num(c.v,true);
    if ([open,high,low,close,volume].some(n=>n==null) || Math.min(open,close)<low || Math.max(open,close)>high) throw new DataError();
    return {time: c.t, endTime: c.T, open, high, low, close, volume};
  }).filter(c => c.time >= now - spec.ms && c.time <= now).sort((a,b)=>a.time-b.time);
  return {source: 'Hyperliquid', coin, range, interval: spec.interval, fetchedAt: new Date(now).toISOString(), stale: false, candles};
}
export function createHyperliquidService({fetchImpl = globalThis.fetch, now = Date.now} = {}) {
  const cache = new Map(), pending = new Map(), retryAt = new Map();
  async function cached(key, get) {
    const entry = cache.get(key), time = now();
    if (entry && time-Date.parse(entry.fetchedAt)<CACHE_MS) return entry;
    if (pending.has(key)) return pending.get(key);
    const fallback = () => {
      if (entry && time-Date.parse(entry.fetchedAt)<5*CACHE_MS) return {...entry, stale:true};
      throw new DataError('temporarily_unavailable',503);
    };
    if (time<(retryAt.get(key)||0)) return fallback();
    const promise = (async()=>{
      try {
        const data = await get();
        // Keep memory bounded across symbols and ranges.
        if (cache.size>=100 && !cache.has(key)) { const oldest=cache.keys().next().value; cache.delete(oldest); retryAt.delete(oldest); }
        cache.set(key,data); retryAt.delete(key); return data;
      } catch { retryAt.set(key,now()+30000); return fallback(); }
      finally {pending.delete(key);}
    })();
    pending.set(key,promise); return promise;
  }
  async function post(body) {
    const response=await fetchImpl(INFO_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(12000)});
    if (!response.ok) throw new DataError();
    return response.json();
  }
  const markets = () => cached('markets',async()=>{
    const [payload,categories]=await Promise.all([post({type:'metaAndAssetCtxs',dex:'xyz'}),post({type:'perpCategories'})]);
    return normalizeMarkets(payload,now(),categories);
  });
  async function candles(coin, range) {
    if (!Object.hasOwn(RANGES,range) || typeof coin!=='string' || !/^xyz:[A-Za-z0-9_.-]{1,40}$/.test(coin)) throw new DataError('invalid_request',400);
    const listing=await markets();
    if (!listing.markets.some(m=>m.coin===coin)) throw new DataError('unknown_market',400);
    return cached(coin+':'+range,async()=>{
      const endTime=now();
      return normalizeCandles(await post({type:'candleSnapshot',req:{coin,interval:RANGES[range].interval,startTime:endTime-RANGES[range].ms,endTime}}),coin,range,now());
    });
  }
  return {markets,candles};
}