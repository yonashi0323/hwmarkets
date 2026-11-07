import {CACHE_MS, CompanyCatalogError, createCompanyCatalogService} from '../lib/japan-companies.js';

export function createCompanyCatalogHandler(getCatalog = createCompanyCatalogService(), now = Date.now) {
  return async function handler(request, response) {
    response.setHeader('Content-Type', 'application/json; charset=utf-8');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('Vercel-CDN-Cache-Control', 'no-store');
    if (!['GET', 'HEAD'].includes(request.method)) {
      response.setHeader('Allow', 'GET, HEAD'); response.statusCode = 405;
      return response.end(JSON.stringify({error: {code: 'method_not_allowed'}}));
    }
    if (new URL(request.url || '/', 'https://hwmarkets.invalid').search) {
      response.statusCode = 400;
      return response.end(request.method === 'HEAD' ? undefined : JSON.stringify({error: {code: 'query_not_supported'}}));
    }
    try {
      const data = await getCatalog();
      response.statusCode = 200;
      response.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
      const remaining = Math.max(1, Math.min(CACHE_MS / 1000, Math.floor((Date.parse(data.fetchedAt) + CACHE_MS - now()) / 1000)));
      // Stale snapshots keep their original date. Do not reset freshness to the fallback time.
      response.setHeader('Vercel-CDN-Cache-Control', data.stale ? 'public, s-maxage=3600' : `public, s-maxage=${remaining}`);
      return response.end(request.method === 'HEAD' ? undefined : JSON.stringify(data));
    } catch (error) {
      response.statusCode = error instanceof CompanyCatalogError ? error.status : 503;
      return response.end(request.method === 'HEAD' ? undefined : JSON.stringify({error: {code: 'catalog_unavailable'}}));
    }
  };
}

export default createCompanyCatalogHandler();