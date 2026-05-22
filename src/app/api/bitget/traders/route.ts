import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  isBitgetConfigured,
  fetchV2BrokerTraders,
  searchV2Traders,
  fetchV1PublicTraders,
  generateDemoTraders,
  type TransformedTrader,
  type SortRule,
} from '@/lib/bitget-api';

// ============================================================================
// SORT RULE MAPPING: Frontend ranking codes → V2 sortRule values
// ============================================================================

const RANKING_TO_SORT: Record<string, SortRule> = {
  profit_rate: 'ROI',
  total_income: 'totalPL',
  total_follow_profit: 'totalPL',
  trader_pro: 'Composite',
  rookie_trader: 'Composite',
};

const VALID_RANKING_CODES = [
  'profit_rate',
  'total_income',
  'total_follow_profit',
  'trader_pro',
  'rookie_trader',
] as const;

type RankingCode = (typeof VALID_RANKING_CODES)[number];

// ============================================================================
// DATABASE CACHE OPERATIONS
// ============================================================================

async function saveTradersToCache(traders: TransformedTrader[], ranking: string): Promise<void> {
  try {
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
          winRate: trader.winRate || null,
          tradeDays: trader.tradeDays ? parseInt(trader.tradeDays, 10) : null,
          tradeCount: trader.tradeCount ? parseInt(trader.tradeCount, 10) : null,
          profitCount: trader.profitCount ? parseInt(trader.profitCount, 10) : null,
          lossCount: trader.lossCount ? parseInt(trader.lossCount, 10) : null,
          lastTradeTime: trader.lastTradeTime || null,
          dailyProfitRateList: trader.dailyProfitRateList ? JSON.stringify(trader.dailyProfitRateList) : null,
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
          winRate: trader.winRate || null,
          tradeDays: trader.tradeDays ? parseInt(trader.tradeDays, 10) : null,
          tradeCount: trader.tradeCount ? parseInt(trader.tradeCount, 10) : null,
          profitCount: trader.profitCount ? parseInt(trader.profitCount, 10) : null,
          lossCount: trader.lossCount ? parseInt(trader.lossCount, 10) : null,
          lastTradeTime: trader.lastTradeTime || null,
          dailyProfitRateList: trader.dailyProfitRateList ? JSON.stringify(trader.dailyProfitRateList) : null,
        },
      });
    }
    console.info(`[Bitget] Cached ${traders.length} traders for ranking: ${ranking}`);
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
      winRate: row.winRate || undefined,
      tradeDays: row.tradeDays?.toString() || undefined,
      tradeCount: row.tradeCount?.toString() || undefined,
      profitCount: row.profitCount?.toString() || undefined,
      lossCount: row.lossCount?.toString() || undefined,
      lastTradeTime: row.lastTradeTime || undefined,
      dailyProfitRateList: row.dailyProfitRateList ? JSON.parse(row.dailyProfitRateList) : undefined,
      isCached: true as never,
      source: 'database_cache',
    }));
  } catch (dbError) {
    console.error('[Bitget] Failed to load cache:', dbError);
    return [];
  }
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
    let traders: TransformedTrader[];
    let source = 'bitget_v2';

    // =========================================================================
    // PRIORITY 1: V2 Authenticated API (if credentials configured)
    // =========================================================================
    if (isBitgetConfigured()) {
      try {
        if (searchParam && searchParam.trim().length > 0) {
          traders = await searchV2Traders(searchParam.trim(), page, pageSize);
        } else {
          const sortRule = RANKING_TO_SORT[rankingCode] || 'ROI';
          traders = await fetchV2BrokerTraders({
            sortRule,
            sortFlag: 'Desc',
            pageNo: page,
            pageSize,
          });
        }
        source = 'bitget_v2';
        console.info(`[Bitget] V2 API success: ${traders.length} traders fetched`);
      } catch (v2Error) {
        const msg = v2Error instanceof Error ? v2Error.message : 'V2 API error';
        console.warn(`[Bitget] V2 API failed: ${msg}, trying V1 fallback...`);

        // =====================================================================
        // PRIORITY 2: V1 Public API fallback (no auth required)
        // =====================================================================
        try {
          if (searchParam && searchParam.trim().length > 0) {
            // V1 doesn't have a good search, use V2 with no result
            traders = [];
          } else {
            traders = await fetchV1PublicTraders(rankingCode, page, pageSize);
          }
          source = 'bitget_v1';
          console.info(`[Bitget] V1 API fallback: ${traders.length} traders fetched`);
        } catch (v1Error) {
          const v1Msg = v1Error instanceof Error ? v1Error.message : 'V1 API error';
          console.warn(`[Bitget] V1 API also failed: ${v1Msg}`);
          traders = [];
        }
      }
    } else {
      // =========================================================================
      // No V2 credentials — try V1 public API
      // =========================================================================
      // V2 not configured, trying V1 public API
      try {
        if (searchParam && searchParam.trim().length > 0) {
          traders = [];
        } else {
          traders = await fetchV1PublicTraders(rankingCode, page, pageSize);
        }
        source = 'bitget_v1';
      } catch (v1Error) {
        const v1Msg = v1Error instanceof Error ? v1Error.message : 'V1 API error';
        console.warn(`[Bitget] V1 API failed: ${v1Msg}`);
        traders = [];
      }
    }

    // Save to database cache (non-blocking) — only for non-search results
    if (!searchParam && traders.length > 0) {
      saveTradersToCache(traders, rankingCode).catch(() => {});
    }

    // Return results if we got traders
    if (traders.length > 0) {
      return NextResponse.json({
        success: true,
        traders,
        cached: false,
        source,
        ranking: rankingCode,
        page,
        pageSize,
      });
    }

    // =========================================================================
    // PRIORITY 3: Database cache
    // =========================================================================
    if (!searchParam) {
      const cachedTraders = await loadTradersFromCache(rankingCode, page, pageSize);
      if (cachedTraders.length > 0) {
        console.info(`[Bitget] Serving ${cachedTraders.length} traders from database cache`);
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

    // =========================================================================
    // PRIORITY 4: Demo data (last resort)
    // =========================================================================
    // No cache available, serving demo data
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
      },
      { status: 200 }
    );
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[Bitget] Unexpected error: ${errorMsg}`);

    // Try database cache
    if (!searchParam) {
      const cachedTraders = await loadTradersFromCache(rankingCode, page, pageSize);
      if (cachedTraders.length > 0) {
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

    // Demo fallback
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
