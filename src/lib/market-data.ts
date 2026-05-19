// Market Data Service - Real-time crypto prices and exchange rates
// Uses CoinGecko API with caching

interface PriceCache {
  data: number;
  timestamp: number;
}

const cache: Record<string, PriceCache> = {};
const CACHE_TTL = 60_000; // 60 seconds

async function fetchWithCache(url: string): Promise<any> {
  try {
    const res = await fetch(url, { next: { revalidate: 60 } });
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    return res.json();
  } catch (error) {
    console.error('Market data fetch error:', error);
    return null;
  }
}

// ============ USDT/BRL Rate ============

export async function getUSDTBRLRate(): Promise<number> {
  const cacheKey = 'usdt_brl';
  const cached = cache[cacheKey];
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  const data = await fetchWithCache(
    'https://api.coingecko.com/api/v3/simple/price?ids=tether,bitcoin&vs_currencies=brl,usd'
  );

  if (data?.tether?.brl) {
    const rate = data.tether.brl;
    cache[cacheKey] = { data: rate, timestamp: Date.now() };
    return rate;
  }

  // Fallback
  return cache[cacheKey]?.data ?? 5.70;
}

// ============ BTC Price ============

export async function getBTCPrice(): Promise<number> {
  const cacheKey = 'btc_usdt';
  const cached = cache[cacheKey];
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  const data = await fetchWithCache(
    'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd'
  );

  if (data?.bitcoin?.usd) {
    const price = data.bitcoin.usd;
    cache[cacheKey] = { data: price, timestamp: Date.now() };
    return price;
  }

  return cache[cacheKey]?.data ?? 95000;
}

// ============ Multi-coin Prices ============

export async function getCryptoPrices(): Promise<Record<string, { usd: number; brl: number; usd_24h_change: number }>> {
  const cacheKey = 'crypto_prices';
  const cached = cache[cacheKey];
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  const data = await fetchWithCache(
    'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,tether,usd-coin&vs_currencies=usd,brl&include_24hr_change=true'
  );

  if (data) {
    cache[cacheKey] = { data, timestamp: Date.now() };
    return data;
  }

  return cache[cacheKey]?.data ?? {
    bitcoin: { usd: 95000, brl: 540000, usd_24h_change: 0 },
    ethereum: { usd: 3500, brl: 19950, usd_24h_change: 0 },
    tether: { usd: 1, brl: 5.70, usd_24h_change: 0 },
    'usd-coin': { usd: 1, brl: 5.70, usd_24h_change: 0 },
  };
}

// ============ Trading Stats ============

export interface TradingStats {
  totalUsers: string;
  totalInvested: string;
  totalRoiPaid: string;
  activeInvestments: string;
  avgDailyRoi: string;
}

export async function getTradingStats(): Promise<TradingStats> {
  const cacheKey = 'trading_stats';
  const cached = cache[cacheKey];
  if (cached && Date.now() - cached.timestamp < CACHE_TTL * 5) {
    return cached.data;
  }

  // Realistic-looking platform stats for a copy trading ROI platform
  // These are mock values since we don't have a real trading API yet
  const result: TradingStats = {
    totalUsers: '12,847',
    totalInvested: '$4,231,590',
    totalRoiPaid: '$1,892,340',
    activeInvestments: '8,421',
    avgDailyRoi: '1.8%',
  };

  cache[cacheKey] = { data: result, timestamp: Date.now() };
  return result;
}

// ============ Platform Stats ============

export async function getPlatformStats(): Promise<{
  btcPrice: number;
  ethPrice: number;
  fearGreedIndex: number;
  fearGreedClassification: string;
  totalMarketCap: string;
  btcDominance: string;
}> {
  const [btcPrice, ethPrice, fng] = await Promise.all([
    getBTCPrice(),
    getETHPrice(),
    getFearGreedIndex(),
  ]);

  return {
    btcPrice,
    ethPrice,
    fearGreedIndex: fng.value,
    fearGreedClassification: fng.classification,
    totalMarketCap: '$3.2T',
    btcDominance: '52.4%',
  };
}

// ============ ETH Price ============

async function getETHPrice(): Promise<number> {
  const cacheKey = 'eth_usdt';
  const cached = cache[cacheKey];
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  const data = await fetchWithCache(
    'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd'
  );

  if (data?.ethereum?.usd) {
    const price = data.ethereum.usd;
    cache[cacheKey] = { data: price, timestamp: Date.now() };
    return price;
  }

  return cache[cacheKey]?.data ?? 3500;
}

// ============ Fear & Greed Index ============

export async function getFearGreedIndex(): Promise<{ value: number; classification: string }> {
  const cacheKey = 'fear_greed';
  const cached = cache[cacheKey];
  if (cached && Date.now() - cached.timestamp < CACHE_TTL * 10) {
    return cached.data;
  }

  const data = await fetchWithCache(
    'https://api.alternative.me/fng/?limit=1'
  );

  if (data?.data?.[0]) {
    const result = {
      value: parseInt(data.data[0].value),
      classification: data.data[0].value_classification,
    };
    cache[cacheKey] = { data: result, timestamp: Date.now() };
    return result;
  }

  return { value: 50, classification: 'Neutral' };
}
