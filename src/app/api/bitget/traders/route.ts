import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// ============================================================================
// TYPES
// ============================================================================

interface BitgetTraderRow {
  traderId?: string;
  displayName?: string;
  nickName?: string;
  headPic?: string;
  header?: string;
  roi?: string;
  totalPnl?: string;
  maxRetracement?: string;
  followCount?: number;
  followerTotalPnl?: string;
  aum?: string;
  traderGrade?: {
    gradeId?: number | string;
    gradeName?: string;
    lastGradeId?: number | string;
    lastGradeName?: string;
  };
  labelVos?: Array<{
    labelId?: number | string;
    labelName?: string;
    labelType?: string;
  }>;
  topSymbols?: string[];
  klineProfit?: string;
  rankingNo?: number;
  userName?: string;
}

interface BitgetRankingResponse {
  code: string;
  msg: string;
  data: {
    traderRankingList?: BitgetTraderRow[];
    rows?: BitgetTraderRow[];
    totals?: number;
    nextFlag?: boolean;
  };
  success?: boolean;
}

interface BitgetSearchResponse {
  code: string;
  msg: string;
  data: {
    traderSearchList?: BitgetTraderRow[];
    totals?: number;
  };
  success?: boolean;
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

function transformTrader(trader: BitgetTraderRow, rank: number): TransformedTrader {
  return {
    traderId: trader.traderId || trader.userName || '',
    displayName: trader.displayName || trader.nickName || 'Unknown Trader',
    avatar: trader.headPic || trader.header || '',
    roi: trader.roi || '0',
    totalPnl: trader.totalPnl || '0',
    maxDrawdown: trader.maxRetracement || '0',
    followers: trader.followCount || 0,
    aum: trader.aum || '0',
    grade: {
      id: String(trader.traderGrade?.gradeId || ''),
      name: trader.traderGrade?.gradeName || '',
    },
    labels: (trader.labelVos || []).map((label) => ({
      id: String(label.labelId || ''),
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
  const url = 'https://www.bitget.com/v1/trigger/trace/public/traderRankingList';

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

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

  if (data.code !== '00000') {
    throw new Error(`Bitget API error: code=${data.code}, msg=${data.msg || 'unknown'}`);
  }

  // Handle both response formats: traderRankingList (old) and rows (new)
  const traders = data.data?.traderRankingList || data.data?.rows || [];
  const offset = (pageNo - 1) * pageSize;

  return traders.map((trader, index) =>
    transformTrader(trader, trader.rankingNo || (offset + index + 1))
  );
}

async function fetchTraderSearch(
  searchKey: string,
  pageNo: number,
  pageSize: number
): Promise<TransformedTrader[]> {
  const url = 'https://www.bitget.com/v1/trigger/trace/public/traderSearch';

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

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

  if (data.code !== '00000') {
    throw new Error(`Bitget API error: code=${data.code}, msg=${data.msg || 'unknown'}`);
  }

  const traders = data.data?.traderSearchList || [];
  const offset = (pageNo - 1) * pageSize;

  return traders.map((trader, index) =>
    transformTrader(trader, offset + index + 1)
  );
}

// ============================================================================
// DATABASE CACHE OPERATIONS
// ============================================================================

async function saveTradersToCache(traders: TransformedTrader[], ranking: string): Promise<void> {
  try {
    // Upsert each trader into the cache
    for (const trader of traders) {
      if (!trader.traderId) continue;
      await db.bitgetTraderCache.upsert({
        where: { traderId_ranking: { traderId: trader.traderId, ranking } },
        create: {
          traderId: trader.traderId,
          displayName: trader.displayName,
          avatar: trader.avatar || '',
          roi: trader.roi,
          totalPnl: trader.totalPnl,
          maxDrawdown: trader.maxDrawdown,
          followers: trader.followers,
          aum: trader.aum,
          grade: JSON.stringify(trader.grade),
          labels: JSON.stringify(trader.labels),
          topSymbols: JSON.stringify(trader.topSymbols),
          klineProfit: trader.klineProfit,
          ranking,
          rank: trader.rank,
          isActive: true,
        },
        update: {
          displayName: trader.displayName,
          avatar: trader.avatar || '',
          roi: trader.roi,
          totalPnl: trader.totalPnl,
          maxDrawdown: trader.maxDrawdown,
          followers: trader.followers,
          aum: trader.aum,
          grade: JSON.stringify(trader.grade),
          labels: JSON.stringify(trader.labels),
          topSymbols: JSON.stringify(trader.topSymbols),
          klineProfit: trader.klineProfit,
          ranking,
          rank: trader.rank,
          isActive: true,
        },
      });
    }
    console.log(`[Bitget] Cached ${traders.length} traders for ranking: ${ranking}`);
  } catch (dbError) {
    console.error('[Bitget] Failed to save cache:', dbError);
  }
}

async function loadTradersFromCache(ranking: string, page: number, pageSize: number): Promise<TransformedTrader[]> {
  try {
    const cached = await db.bitgetTraderCache.findMany({
      where: { isActive: true, ranking },
      orderBy: { rank: 'asc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    if (cached.length === 0) return [];

    return cached.map((row) => ({
      traderId: row.traderId,
      displayName: row.displayName,
      avatar: row.avatar,
      roi: row.roi,
      totalPnl: row.totalPnl,
      maxDrawdown: row.maxDrawdown,
      followers: row.followers,
      aum: row.aum,
      grade: JSON.parse(row.grade || '{}'),
      labels: JSON.parse(row.labels || '[]'),
      topSymbols: JSON.parse(row.topSymbols || '[]'),
      klineProfit: row.klineProfit,
      rank: row.rank,
      isCached: true as never,
    }));
  } catch (dbError) {
    console.error('[Bitget] Failed to load cache:', dbError);
    return [];
  }
}

// ============================================================================
// DEMO DATA (last resort fallback when no cache exists)
// ============================================================================

type DemoGrade = 'Diamond' | 'Platinum' | 'Gold' | 'Silver';

interface DemoTraderSeed {
  traderId: string;
  displayName: string;
  roiPct: number;
  pnlUsd: number;
  aumUsd: number;
  drawdownPct: number;
  followers: number;
  grade: DemoGrade;
  labelNames: string[];
  topSymbols: string[];
}

const DEMO_TRADER_SEEDS: DemoTraderSeed[] = [
  { traderId: 'demo-001', displayName: 'Alexei Volkov', roiPct: 582, pnlUsd: 178500, aumUsd: 780000, drawdownPct: 28, followers: 4850, grade: 'Diamond', labelNames: ['Futures', 'Trend Following'], topSymbols: ['BTC', 'ETH', 'SOL'] },
  { traderId: 'demo-002', displayName: 'Sakura Tanaka', roiPct: 412, pnlUsd: 132000, aumUsd: 520000, drawdownPct: 22, followers: 3200, grade: 'Diamond', labelNames: ['Swing', 'Long-Short'], topSymbols: ['BTC', 'BNB', 'AVAX'] },
  { traderId: 'demo-003', displayName: 'Marco De Luca', roiPct: 345, pnlUsd: 97500, aumUsd: 410000, drawdownPct: 35, followers: 2100, grade: 'Platinum', labelNames: ['Futures', 'Scalping'], topSymbols: ['ETH', 'SOL', 'DOGE'] },
  { traderId: 'demo-004', displayName: 'Priya Sharma', roiPct: 298, pnlUsd: 86000, aumUsd: 350000, drawdownPct: 18, followers: 1950, grade: 'Platinum', labelNames: ['DeFi', 'Trend Following'], topSymbols: ['ETH', 'BNB', 'AVAX'] },
  { traderId: 'demo-005', displayName: 'Chen Wei Ming', roiPct: 245, pnlUsd: 72000, aumUsd: 290000, drawdownPct: 31, followers: 1680, grade: 'Platinum', labelNames: ['High Frequency', 'Arbitrage'], topSymbols: ['BTC', 'ETH', 'XRP'] },
  { traderId: 'demo-006', displayName: 'Olga Petrova', roiPct: 198, pnlUsd: 58000, aumUsd: 210000, drawdownPct: 25, followers: 1420, grade: 'Gold', labelNames: ['Swing', 'Futures'], topSymbols: ['SOL', 'BNB', 'DOGE'] },
];

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
    grade: { id: GRADE_ID_MAP[seed.grade], name: seed.grade },
    labels: seed.labelNames.map((name) => ({
      id: LABEL_ID_MAP[name] || 'label_unknown',
      name,
      type: LABEL_TYPE_MAP[name] || 'other',
    })),
    topSymbols: seed.topSymbols,
    klineProfit: '',
    rank: index + 1,
    isDemo: true,
  }));
}

// ============================================================================
// API ROUTE HANDLER
// ============================================================================

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const rankingParam = searchParams.get('ranking') || 'profit_rate';
  const pageParam = parseInt(searchParams.get('page') || '1', 10);
  const pageSizeParam = parseInt(searchParams.get('pageSize') || '20', 10);
  const searchParam = searchParams.get('search') || undefined;

  const rankingCode: RankingCode = VALID_RANKING_CODES.includes(rankingParam as RankingCode)
    ? (rankingParam as RankingCode)
    : 'profit_rate';

  const page = Math.max(1, Math.min(pageParam, 100));
  const pageSize = Math.max(1, Math.min(pageSizeParam, 50));

  try {
    // Try fetching from Bitget API
    let traders: TransformedTrader[];

    if (searchParam && searchParam.trim().length > 0) {
      traders = await fetchTraderSearch(searchParam.trim(), page, pageSize);
    } else {
      traders = await fetchTraderRanking(rankingCode, page, pageSize);
    }

    // Save to database cache (non-blocking)
    if (!searchParam && traders.length > 0) {
      // Use Promise with catch to avoid blocking the response
      saveTradersToCache(traders, rankingCode).catch(() => {});
    }

    return NextResponse.json({
      success: true,
      traders,
      cached: false,
      source: 'bitget',
      ranking: rankingCode,
      page,
      pageSize,
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[Bitget] API failed: ${errorMsg}`);

    // Try loading from database cache
    if (!searchParam) {
      const cachedTraders = await loadTradersFromCache(rankingCode, page, pageSize);
      if (cachedTraders.length > 0) {
        console.log(`[Bitget] Serving ${cachedTraders.length} traders from database cache`);
        return NextResponse.json({
          success: true,
          traders: cachedTraders,
          cached: true,
          source: 'database_cache',
          ranking: rankingCode,
          page,
          pageSize,
        });
      }
    }

    // Last resort: demo data
    console.log('[Bitget] No cache available, serving demo data');
    const allDemoTraders = generateDemoTraders();
    const startIndex = (page - 1) * pageSize;
    const paginatedDemo = allDemoTraders.slice(startIndex, startIndex + pageSize);

    return NextResponse.json(
      {
        success: true,
        traders: paginatedDemo,
        isDemo: true,
        cached: false,
        source: 'demo_fallback',
        ranking: rankingCode,
        page,
        pageSize,
        error: errorMsg,
      },
      { status: 200 }
    );
  }
}
