import {CACHE_MS, createTop50Service, MarketDataError} from '../lib/cmc.js';

const getTop50 = createTop50Service();

export default async function handler(request, response) {
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('Cache-Control', 'no-store');
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.setHeader('Allow', 'GET, HEAD');
    response.statusCode = 405;
    return response.end(JSON.stringify({error: {code: 'method_not_allowed'}}));
  }
  try {
    const data = await getTop50();
    response.statusCode = 200;
    // Only shared server/CDN caches retain the result. Refresh clicks cannot bypass it.
    response.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
    const remainingSeconds = Math.max(1, Math.floor((Date.parse(data.fetchedAt) + CACHE_MS - Date.now()) / 1000));
    response.setHeader('Vercel-CDN-Cache-Control', data.stale ? 'no-store' : `public, s-maxage=${remainingSeconds}`);
    if (data.stale) response.setHeader('Retry-After', '60');
    return response.end(request.method === 'HEAD' ? undefined : JSON.stringify(data));
  } catch (error) {
    const safe = error instanceof MarketDataError ? error : new MarketDataError('upstream_error');
    response.statusCode = safe.status;
    response.setHeader('Vercel-CDN-Cache-Control', 'no-store');
    response.setHeader('Retry-After', String(safe.retryAfter));
    return response.end(request.method === 'HEAD' ? undefined : JSON.stringify({error: {code: safe.code}}));
  }
}