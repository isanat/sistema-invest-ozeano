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
// FETCH FROM BITGET API
// ============================================================================

async function fetchTraderRanking(
  rankingCode: RankingCode,
  pageNo: number,
  pageSize: number
): Promise<TransformedTrader[]> {
  const url =
    'https://www.bitget.com/v1/trigger/trace/public/traderRankingList';

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      Origin: 'https://www.bitget.com',
      Referer: 'https://www.bitget.com/',
    },
    body: JSON.stringify({
      rankingCode,
      pageNo,
      pageSize,
    }),
  });

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

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      Origin: 'https://www.bitget.com',
      Referer: 'https://www.bitget.com/',
    },
    body: JSON.stringify({
      searchKey,
      pageNo,
      pageSize,
    }),
  });

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
  try {
    const { searchParams } = new URL(request.url);

    // Parse and validate query params
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

    // Return graceful error with empty array — don't break the UI
    return NextResponse.json(
      {
        success: true,
        traders: [],
        cached: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to fetch trader data from Bitget',
      },
      { status: 200 } // Return 200 so client doesn't crash; empty array signals failure gracefully
    );
  }
}
