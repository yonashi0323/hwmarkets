const LISTINGS_URL = 'https://pro-api.coinmarketcap.com/v3/cryptocurrency/listings/latest?start=1&limit=50&sort=market_cap&sort_dir=desc&convert=USD';
export const CACHE_MS = 5 * 60 * 1000;
const MAX_STALE_MS = 30 * 60 * 1000;

export class MarketDataError extends Error {
  constructor(code, status = 502, retryAfter = 60) {
    super(code);
    this.code = code;
    this.status = status;
    this.retryAfter = retryAfter;
  }
}

function timestamp(value) {
  if (typeof value !== 'string' || !Number.isFinite(Date.parse(value))) {
    throw new MarketDataError('upstream_error');
  }
  return new Date(value).toISOString();
}

function numeric(value, nonnegative = false) {
  if (value == null) return null;
  if (typeof value !== 'number' || !Number.isFinite(value) || (nonnegative && value < 0)) {
    throw new MarketDataError('upstream_error');
  }
  return value;
}

function string(value, maxLength = 160) {
  if (typeof value !== 'string' || !value.trim() || value.length > maxLength) {
    throw new MarketDataError('upstream_error');
  }
  return value;
}

// v3 returns an array of quotes. USD is currency ID 2781.
export function normalizeListings(payload, fetchedAt) {
  if (String(payload?.status?.error_code) !== '0' || !Array.isArray(payload.data) || payload.data.length !== 50) {
    throw new MarketDataError('upstream_error');
  }
  const ids = new Set();
  const ranks = new Set();
  const coins = payload.data.map(coin => {
    if (!Number.isSafeInteger(coin.id) || coin.id < 1 || ids.has(coin.id) ||
        !Number.isSafeInteger(coin.cmc_rank) || coin.cmc_rank < 1 || coin.cmc_rank > 50 || ranks.has(coin.cmc_rank)) {
      throw new MarketDataError('upstream_error');
    }
    ids.add(coin.id);
    ranks.add(coin.cmc_rank);
    const quote = Array.isArray(coin.quote) && coin.quote.find(q => q.symbol === 'USD' || q.id === 2781);
    if (!quote) throw new MarketDataError('upstream_error');
    const slug = string(coin.slug);
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new MarketDataError('upstream_error');
    return {
      id: coin.id,
      rank: coin.cmc_rank,
      name: string(coin.name),
      symbol: string(coin.symbol, 40),
      slug,
      price: numeric(quote.price, true),
      marketCap: numeric(quote.market_cap, true),
      volume24h: numeric(quote.volume_24h, true),
      change24h: numeric(quote.percent_change_24h),
      change7d: numeric(quote.percent_change_7d),
      updatedAt: timestamp(quote.last_updated || coin.last_updated)
    };
  }).sort((a, b) => a.rank - b.rank);
  // Show the oldest quote timestamp, so a fresh quote never masks an older one.
  const updatedAt = coins.reduce((oldest, coin) => coin.updatedAt < oldest ? coin.updatedAt : oldest, coins[0].updatedAt);
  return {source: 'CoinMarketCap', currency: 'USD', updatedAt, fetchedAt: timestamp(fetchedAt), stale: false, coins};
}

export function createTop50Service({fetchImpl = fetch, now = Date.now, getApiKey = () => process.env.CMC_API_KEY} = {}) {
  let cached;
  let cachedAt = 0;
  let pending;
  let failure;
  let retryAt = 0;

  async function load(key) {
    let response;
    try {
      response = await fetchImpl(LISTINGS_URL, {
        headers: {Accept: 'application/json', 'X-CMC_PRO_API_KEY': key},
        signal: AbortSignal.timeout(10000)
      });
    } catch {
      throw new MarketDataError('upstream_error');
    }
    if (response.status === 429) throw new MarketDataError('rate_limit', 429);
    if ([401, 402, 403].includes(response.status)) throw new MarketDataError('configuration_required', 503);
    if (!response.ok) throw new MarketDataError('upstream_error');
    let payload;
    try { payload = await response.json(); } catch { throw new MarketDataError('upstream_error'); }
    const code = String(payload?.status?.error_code);
    if (['1008', '1009', '1010', '1011'].includes(code)) throw new MarketDataError('rate_limit', 429);
    if (['1001', '1002', '1003', '1004', '1005', '1006', '1007'].includes(code)) throw new MarketDataError('configuration_required', 503);
    const value = normalizeListings(payload, new Date(now()).toISOString());
    cached = value;
    cachedAt = now();
    failure = undefined;
    retryAt = 0;
    return value;
  }

  return async function getTop50() {
    const key = getApiKey()?.trim();
    if (!key) throw new MarketDataError('configuration_required', 503);
    if (cached && now() - cachedAt < CACHE_MS) return cached;
    try {
      if (failure && now() < retryAt) throw failure;
      if (!pending) {
        pending = load(key).catch(error => {
          failure = error instanceof MarketDataError ? error : new MarketDataError('upstream_error');
          retryAt = now() + failure.retryAfter * 1000;
          throw failure;
        }).finally(() => { pending = undefined; });
      }
      return await pending;
    } catch (error) {
      if (cached && now() - cachedAt < MAX_STALE_MS && error.code !== 'configuration_required') {
        return {...cached, stale: true, staleReason: error.code};
      }
      throw error;
    }
  };
}