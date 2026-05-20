import { NextRequest, NextResponse } from 'next/server';

// ============================================================================
// TYPES
// ============================================================================

interface BitgetTrader {
  traderId: string;
  displayName: string;
  nickName?: string;
  headPic?: string;
  roi?: string;
  totalPnl?: string;
  maxRetracement?: string;
  followCount?: number;
  followerTotalPnl?: string;
  aum?: string;
  traderGrade?: {
    gradeId?: string;
    gradeName?: string;
  };
  labelVos?: Array<{
    labelId?: string;
    labelName?: string;
    labelType?: string;
  }>;
  topSymbols?: string[];
  klineProfit?: string;
}

interface BitgetRankingResponse {
  code: string;
  msg: string;
  data: {
    traderRankingList?: BitgetTrader[];
    pageNo?: number;
    pageSize?: number;
    total?: number;
  };
}

interface BitgetSearchResponse {
  code: string;
  msg: string;
  data: {
    traderSearchList?: BitgetTrader[];
    pageNo?: number;
    pageSize?: number;
    total?: number;
  };
}

interface TransformedTrader {
  traderId: string;
  displayName: string;
  avatar: string;
  roi: string;
  totalPnl: string;
  maxDrawdown: string;
  followers: number;
  aum: string;
  grade: {
    id: string;
    name: string;
  };
  labels: Array<{
    id: string;
    name: string;
    type: string;
  }>;
  topSymbols: string[];
  klineProfit: string;
  rank: number;
  isDemo?: boolean;
}

// ============================================================================
// IN-MEMORY CACHE
// ============================================================================

interface CacheEntry {
  data: TransformedTrader[];
  timestamp: number;
  key: string;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds

function getCacheKey(params: {
  ranking: string;
  page: number;
  pageSize: number;
  search?: string;
}): string {
  return `bitget:${params.ranking}:${params.page}:${params.pageSize}:${params.search || ''}`;
}

function getFromCache(key: string): TransformedTrader[] | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(key: string, data: TransformedTrader[]): void {
  // Limit cache size to prevent memory leaks
  if (cache.size > 100) {
    // Remove oldest entries
    const entries = Array.from(cache.entries()).sort(
      (a, b) => a[1].timestamp - b[1].timestamp
    );
    const toRemove = entries.slice(0, 20);
    toRemove.forEach(([k]) => cache.delete(k));
  }
  cache.set(key, { data, timestamp: Date.now(), key });
}

// ============================================================================
// VALID RANKING CODES
// ============================================================================

const VALID_RANKING_CODES = [
  'profit_rate',
  'total_income',
  'total_follow_profit',
  'trader_pro',
  'rookie_trader',
] as const;

type RankingCode = (typeof VALID_RANKING_CODES)[number];

// ============================================================================
// TRANSFORM BITGET DATA
// ============================================================================

function transformTrader(
  trader: BitgetTrader,
  rank: number
): TransformedTrader {
  return {
    traderId: trader.traderId || '',
    displayName: trader.displayName || trader.nickName || 'Unknown Trader',
    avatar: trader.headPic || '',
    roi: trader.roi || '0',
    totalPnl: trader.totalPnl || '0',
    maxDrawdown: trader.maxRetracement || '0',
    followers: trader.followCount || 0,
    aum: trader.aum || '0',
    grade: {
      id: trader.traderGrade?.gradeId || '',
      name: trader.traderGrade?.gradeName || '',
    },
    labels: (trader.labelVos || []).map((label) => ({
      id: label.labelId || '',
      name: label.labelName || '',
      type: label.labelType || '',
    })),
    topSymbols: trader.topSymbols || [],
    klineProfit: trader.klineProfit || '',
    rank,
  };
}

// ============================================================================
// DEMO DATA (fallback when Bitget API is unavailable)
// ============================================================================

type DemoGrade = 'Diamond' | 'Platinum' | 'Gold' | 'Silver';

interface DemoTraderSeed {
  traderId: string;
  displayName: string;
  roiPct: number; // e.g. 580 means +580%
  pnlUsd: number;
  aumUsd: number;
  drawdownPct: number;
  followers: number;
  grade: DemoGrade;
  labelNames: string[];
  topSymbols: string[];
}

const DEMO_TRADER_SEEDS: DemoTraderSeed[] = [
  {
    traderId: 'demo-001',
    displayName: 'Alexei Volkov',
    roiPct: 582,
    pnlUsd: 178500,
    aumUsd: 780000,
    drawdownPct: 28,
    followers: 4850,
    grade: 'Diamond',
    labelNames: ['Futures', 'Trend Following'],
    topSymbols: ['BTC', 'ETH', 'SOL'],
  },
  {
    traderId: 'demo-002',
    displayName: 'Sakura Tanaka',
    roiPct: 412,
    pnlUsd: 132000,
    aumUsd: 520000,
    drawdownPct: 22,
    followers: 3200,
    grade: 'Diamond',
    labelNames: ['Swing', 'Long-Short'],
    topSymbols: ['BTC', 'BNB', 'AVAX'],
  },
  {
    traderId: 'demo-003',
    displayName: 'Marco De Luca',
    roiPct: 345,
    pnlUsd: 97500,
    aumUsd: 410000,
    drawdownPct: 35,
    followers: 2100,
    grade: 'Platinum',
    labelNames: ['Futures', 'Scalping'],
    topSymbols: ['ETH', 'SOL', 'DOGE'],
  },
  {
    traderId: 'demo-004',
    displayName: 'Priya Sharma',
    roiPct: 298,
    pnlUsd: 86000,
    aumUsd: 350000,
    drawdownPct: 18,
    followers: 1950,
    grade: 'Platinum',
    labelNames: ['DeFi', 'Trend Following'],
    topSymbols: ['ETH', 'BNB', 'AVAX'],
  },
  {
    traderId: 'demo-005',
    displayName: 'Chen Wei Ming',
    roiPct: 245,
    pnlUsd: 72000,
    aumUsd: 290000,
    drawdownPct: 31,
    followers: 1680,
    grade: 'Platinum',
    labelNames: ['High Frequency', 'Arbitrage'],
    topSymbols: ['BTC', 'ETH', 'XRP'],
  },
  {
    traderId: 'demo-006',
    displayName: 'Olga Petrova',
    roiPct: 198,
    pnlUsd: 58000,
    aumUsd: 210000,
    drawdownPct: 25,
    followers: 1420,
    grade: 'Gold',
    labelNames: ['Swing', 'Futures'],
    topSymbols: ['SOL', 'BNB', 'DOGE'],
  },
  {
    traderId: 'demo-007',
    displayName: 'Javier Morales',
    roiPct: 156,
    pnlUsd: 43000,
    aumUsd: 165000,
    drawdownPct: 42,
    followers: 980,
    grade: 'Gold',
    labelNames: ['Futures', 'Long-Short'],
    topSymbols: ['BTC', 'XRP', 'AVAX'],
  },
  {
    traderId: 'demo-008',
    displayName: 'Yuki Nakamura',
    roiPct: 132,
    pnlUsd: 38000,
    aumUsd: 140000,
    drawdownPct: 20,
    followers: 870,
    grade: 'Gold',
    labelNames: ['Trend Following', 'DeFi'],
    topSymbols: ['ETH', 'SOL', 'BNB'],
  },
  {
    traderId: 'demo-009',
    displayName: 'Amir Hassan',
    roiPct: 108,
    pnlUsd: 31000,
    aumUsd: 110000,
    drawdownPct: 38,
    followers: 720,
    grade: 'Gold',
    labelNames: ['Scalping', 'High Frequency'],
    topSymbols: ['BTC', 'DOGE', 'XRP'],
  },
  {
    traderId: 'demo-010',
    displayName: 'Lena Müller',
    roiPct: 87,
    pnlUsd: 24000,
    aumUsd: 85000,
    drawdownPct: 29,
    followers: 540,
    grade: 'Silver',
    labelNames: ['Swing', 'Arbitrage'],
    topSymbols: ['ETH', 'BNB', 'SOL'],
  },
  {
    traderId: 'demo-011',
    displayName: 'Rafael Costa',
    roiPct: 72,
    pnlUsd: 18500,
    aumUsd: 65000,
    drawdownPct: 45,
    followers: 410,
    grade: 'Silver',
    labelNames: ['Futures', 'Scalping'],
    topSymbols: ['BTC', 'AVAX', 'DOGE'],
  },
  {
    traderId: 'demo-012',
    displayName: 'Mei Lin Zhou',
    roiPct: 64,
    pnlUsd: 15000,
    aumUsd: 52000,
    drawdownPct: 52,
    followers: 320,
    grade: 'Silver',
    labelNames: ['Long-Short', 'DeFi'],
    topSymbols: ['ETH', 'XRP', 'BNB'],
  },
  {
    traderId: 'demo-013',
    displayName: 'Dmitri Sokolov',
    roiPct: 53,
    pnlUsd: 11000,
    aumUsd: 38000,
    drawdownPct: 60,
    followers: 210,
    grade: 'Silver',
    labelNames: ['Trend Following', 'Futures'],
    topSymbols: ['BTC', 'SOL', 'DOGE'],
  },
  {
    traderId: 'demo-014',
    displayName: 'Aisha Okafor',
    roiPct: 47,
    pnlUsd: 2800,
    aumUsd: 15500,
    drawdownPct: 65,
    followers: 55,
    grade: 'Silver',
    labelNames: ['Scalping', 'High Frequency'],
    topSymbols: ['ETH', 'XRP', 'AVAX'],
  },
];

// Seeded pseudo-random number generator for deterministic klineProfit
function seededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) & 0xffffffff;
    return (state >>> 0) / 0xffffffff;
  };
}

function generateKlineProfit(seed: number): string {
  const rng = seededRandom(seed);
  const values: number[] = [];
  let base = 100;
  for (let i = 0; i < 20; i++) {
    // Random walk with slight upward bias
    const change = (rng() - 0.35) * 8;
    base = Math.max(base + change, 50);
    values.push(Math.round(base * 100) / 100);
  }
  return values.join(',');
}

const GRADE_ID_MAP: Record<DemoGrade, string> = {
  Diamond: 'grade_diamond',
  Platinum: 'grade_platinum',
  Gold: 'grade_gold',
  Silver: 'grade_silver',
};

const LABEL_ID_MAP: Record<string, string> = {
  Futures: 'label_futures',
  'High Frequency': 'label_hf',
  Swing: 'label_swing',
  'Trend Following': 'label_trend',
  Scalping: 'label_scalping',
  Arbitrage: 'label_arb',
  DeFi: 'label_defi',
  'Long-Short': 'label_ls',
};

const LABEL_TYPE_MAP: Record<string, string> = {
  Futures: 'strategy',
  'High Frequency': 'frequency',
  Swing: 'strategy',
  'Trend Following': 'strategy',
  Scalping: 'frequency',
  Arbitrage: 'strategy',
  DeFi: 'sector',
  'Long-Short': 'strategy',
};

function generateDemoTraders(): TransformedTrader[] {
  return DEMO_TRADER_SEEDS.map((seed, index) => ({
    traderId: seed.traderId,
    displayName: seed.displayName,
    avatar: '',
    roi: seed.roiPct.toString(),
    totalPnl: seed.pnlUsd.toString(),
    maxDrawdown: seed.drawdownPct.toString(),
    followers: seed.followers,
    aum: seed.aumUsd.toString(),
    grade: {
      id: GRADE_ID_MAP[seed.grade],
      name: seed.grade,
    },
    labels: seed.labelNames.map((name) => ({
      id: LABEL_ID_MAP[name] || 'label_unknown',
      name,
      type: LABEL_TYPE_MAP[name] || 'other',
    })),
    topSymbols: seed.topSymbols,
    klineProfit: generateKlineProfit(index * 7919 + 42),
    rank: index + 1,
    isDemo: true,
  }));
}

function filterAndSortDemoTraders(
  traders: TransformedTrader[],
  ranking: string,
  search?: string
): TransformedTrader[] {
  let filtered = [...traders];

  // Apply search filter (case-insensitive name match)
  if (search && search.trim().length > 0) {
    const query = search.trim().toLowerCase();
    filtered = filtered.filter((t) =>
      t.displayName.toLowerCase().includes(query)
    );
  }

  // Apply ranking filter for trader_pro: only Diamond & Platinum
  if (ranking === 'trader_pro') {
    filtered = filtered.filter(
      (t) => t.grade.name === 'Diamond' || t.grade.name === 'Platinum'
    );
  }

  // Sort based on ranking
  switch (ranking) {
    case 'profit_rate':
      filtered.sort((a, b) => parseFloat(b.roi) - parseFloat(a.roi));
      break;
    case 'total_income':
      filtered.sort((a, b) => parseFloat(b.totalPnl) - parseFloat(a.totalPnl));
      break;
    case 'total_follow_profit':
      filtered.sort((a, b) => b.followers - a.followers);
      break;
    case 'trader_pro':
      // Sort pro traders by ROI descending
      filtered.sort((a, b) => parseFloat(b.roi) - parseFloat(a.roi));
      break;
    default:
      filtered.sort((a, b) => parseFloat(b.roi) - parseFloat(a.roi));
      break;
  }

  // Re-assign ranks after filtering & sorting
  return filtered.map((t, i) => ({ ...t, rank: i + 1 }));
}

// ============================================================================
// FETCH FROM BITGET API
// ============================================================================

async function fetchTraderRanking(
  rankingCode: RankingCode,
  pageNo: number,
  pageSize: number
): Promise<TransformedTrader[]> {
  const url =
    'https://www.bitget.com/v1/trigger/trace/public/traderRankingList';

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Origin: 'https://www.bitget.com',
        Referer: 'https://www.bitget.com/copy-trading/futures',
        'Accept-Language': 'en-US,en;q=0.9',
        'sec-ch-ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
        'sec-ch-ua-platform': '"Windows"',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-origin',
      },
      body: JSON.stringify({
        rankingCode,
        pageNo,
        pageSize,
      }),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    throw new Error(`Bitget API returned ${response.status}: ${response.statusText}`);
  }

  const data: BitgetRankingResponse = await response.json();

  if (data.code !== '00000' || !data.data?.traderRankingList) {
    throw new Error(
      `Bitget API error: code=${data.code}, msg=${data.msg || 'unknown'}`
    );
  }

  const traders = data.data.traderRankingList;
  const offset = (pageNo - 1) * pageSize;

  return traders.map((trader, index) =>
    transformTrader(trader, offset + index + 1)
  );
}

async function fetchTraderSearch(
  searchKey: string,
  pageNo: number,
  pageSize: number
): Promise<TransformedTrader[]> {
  const url =
    'https://www.bitget.com/v1/trigger/trace/public/traderSearch';

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Origin: 'https://www.bitget.com',
        Referer: 'https://www.bitget.com/copy-trading/futures',
        'Accept-Language': 'en-US,en;q=0.9',
        'sec-ch-ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
        'sec-ch-ua-platform': '"Windows"',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-origin',
      },
      body: JSON.stringify({
        searchKey,
        pageNo,
        pageSize,
      }),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    throw new Error(`Bitget API returned ${response.status}: ${response.statusText}`);
  }

  const data: BitgetSearchResponse = await response.json();

  if (data.code !== '00000' || !data.data?.traderSearchList) {
    throw new Error(
      `Bitget API error: code=${data.code}, msg=${data.msg || 'unknown'}`
    );
  }

  const traders = data.data.traderSearchList;
  const offset = (pageNo - 1) * pageSize;

  return traders.map((trader, index) =>
    transformTrader(trader, offset + index + 1)
  );
}

// ============================================================================
// API ROUTE HANDLER
// ============================================================================

export async function GET(request: NextRequest) {
  // Parse and validate query params outside try block so they're available in catch
  const { searchParams } = new URL(request.url);
  const rankingParam = searchParams.get('ranking') || 'profit_rate';
  const pageParam = parseInt(searchParams.get('page') || '1', 10);
  const pageSizeParam = parseInt(searchParams.get('pageSize') || '20', 10);
  const searchParam = searchParams.get('search') || undefined;

  // Validate ranking code
  const rankingCode: RankingCode = VALID_RANKING_CODES.includes(
    rankingParam as RankingCode
  )
    ? (rankingParam as RankingCode)
    : 'profit_rate';

  // Validate pagination params
  const page = Math.max(1, Math.min(pageParam, 100));
  const pageSize = Math.max(1, Math.min(pageSizeParam, 50));

  try {
    // Build cache key
    const cacheKey = getCacheKey({
      ranking: rankingCode,
      page,
      pageSize,
      search: searchParam,
    });

    // Check cache first
    const cached = getFromCache(cacheKey);
    if (cached) {
      return NextResponse.json({
        success: true,
        traders: cached,
        cached: true,
        ranking: rankingCode,
        page,
        pageSize,
      });
    }

    // Fetch from Bitget API
    let traders: TransformedTrader[];

    if (searchParam && searchParam.trim().length > 0) {
      traders = await fetchTraderSearch(searchParam.trim(), page, pageSize);
    } else {
      traders = await fetchTraderRanking(rankingCode, page, pageSize);
    }

    // Cache the result
    setCache(cacheKey, traders);

    return NextResponse.json({
      success: true,
      traders,
      cached: false,
      ranking: rankingCode,
      page,
      pageSize,
    });
  } catch (error) {
    console.error('[Bitget API Error]', error);

    // Return realistic demo data when Bitget API is unavailable (403, timeout, etc.)
    const allDemoTraders = generateDemoTraders();
    const filteredTraders = filterAndSortDemoTraders(
      allDemoTraders,
      rankingCode,
      searchParam
    );

    // Apply pagination
    const startIndex = (page - 1) * pageSize;
    const paginatedTraders = filteredTraders.slice(
      startIndex,
      startIndex + pageSize
    );

    return NextResponse.json(
      {
        success: true,
        traders: paginatedTraders,
        isDemo: true,
        totalDemoTraders: filteredTraders.length,
        cached: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to fetch trader data from Bitget',
      },
      { status: 200 }
    );
  }
}
