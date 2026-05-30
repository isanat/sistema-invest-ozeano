import { NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { apiError, apiSuccess, handleApiError, getIpFromRequest } from '@/lib/api-utils';
import { db } from '@/lib/db';
import {
  isBitgetConfigured,
  fetchV2BrokerTraders,
  fetchV1PublicTraders,
  type TransformedTrader,
} from '@/lib/bitget-api';

// ============================================================================
// ADMIN BITGET CACHE REFRESH - Force refresh trader data from Bitget API
// ============================================================================

const RANKING_CODES = ['profit_rate', 'total_income', 'total_follow_profit', 'trader_pro'] as const;

const RANKING_TO_SORT: Record<string, 'Composite' | 'ROI' | 'totalPL' | 'AUM'> = {
  profit_rate: 'ROI',
  total_income: 'totalPL',
  total_follow_profit: 'totalPL',
  trader_pro: 'Composite',
};

async function fetchAndCacheRanking(rankingCode: string, pageSize: number = 20): Promise<number> {
  let traders: TransformedTrader[] = [];

  // Try V2 first, then V1 fallback
  if (isBitgetConfigured()) {
    try {
      const sortRule = RANKING_TO_SORT[rankingCode] || 'ROI';
      traders = await fetchV2BrokerTraders({
        sortRule,
        sortFlag: 'Desc',
        pageNo: 1,
        pageSize,
      });
      console.log(`[Bitget Cache] V2 API: ${traders.length} traders for ${rankingCode}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      console.warn(`[Bitget Cache] V2 failed for ${rankingCode}: ${msg}, trying V1...`);
      try {
        traders = await fetchV1PublicTraders(rankingCode, 1, pageSize);
        console.log(`[Bitget Cache] V1 fallback: ${traders.length} traders for ${rankingCode}`);
      } catch (v1Err) {
        const v1Msg = v1Err instanceof Error ? v1Err.message : 'Unknown error';
        console.error(`[Bitget Cache] V1 also failed for ${rankingCode}: ${v1Msg}`);
        throw new Error(`V2: ${msg}; V1: ${v1Msg}`);
      }
    }
  } else {
    try {
      traders = await fetchV1PublicTraders(rankingCode, 1, pageSize);
      console.log(`[Bitget Cache] V1 only: ${traders.length} traders for ${rankingCode}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      throw new Error(`V1 failed: ${msg}`);
    }
  }

  let saved = 0;
  for (const trader of traders) {
    if (!trader.traderId) continue;
    await db.bitgetTraderCache.upsert({
      where: { traderId_ranking: { traderId: trader.traderId, ranking: rankingCode } },
      create: {
        traderId: trader.traderId,
        displayName: trader.displayName || 'Unknown',
        avatar: trader.avatar || '',
        roi: trader.roi || '0',
        totalPnl: trader.totalPnl || '0',
        maxDrawdown: trader.maxDrawdown || '0',
        followers: trader.followers || 0,
        aum: trader.aum || '0',
        grade: JSON.stringify(trader.grade || {}),
        labels: JSON.stringify(trader.labels || []),
        topSymbols: JSON.stringify(trader.topSymbols || []),
        klineProfit: trader.klineProfit || '',
        ranking: rankingCode,
        rank: trader.rank || (saved + 1),
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
        displayName: trader.displayName || 'Unknown',
        avatar: trader.avatar || '',
        roi: trader.roi || '0',
        totalPnl: trader.totalPnl || '0',
        maxDrawdown: trader.maxDrawdown || '0',
        followers: trader.followers || 0,
        aum: trader.aum || '0',
        grade: JSON.stringify(trader.grade || {}),
        labels: JSON.stringify(trader.labels || []),
        topSymbols: JSON.stringify(trader.topSymbols || []),
        klineProfit: trader.klineProfit || '',
        ranking: rankingCode,
        rank: trader.rank || (saved + 1),
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
    saved++;
  }

  return saved;
}

// GET: Check cache status
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const totalCached = await db.bitgetTraderCache.count({ where: { isActive: true } });
    const byRanking = await db.bitgetTraderCache.groupBy({
      by: ['ranking'],
      where: { isActive: true },
      _count: { id: true },
    });
    const lastUpdated = await db.bitgetTraderCache.findFirst({
      where: { isActive: true },
      orderBy: { updatedAt: 'desc' },
      select: { updatedAt: true },
    });

    return apiSuccess({
      totalCached,
      byRanking: Object.fromEntries(byRanking.map(r => [r.ranking, r._count.id])),
      lastUpdated: lastUpdated?.updatedAt || null,
      bitgetV2Configured: isBitgetConfigured(),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

// POST: Force refresh cache from Bitget API
export async function POST(request: NextRequest) {
  try {
    const session = await requireAdmin();

    const body = await request.json().catch(() => ({}));
    const rankingCodes = body.rankings || RANKING_CODES;
    const pageSize = body.pageSize || 20;

    const results: Record<string, number> = {};
    const errors: Record<string, string> = {};

    for (const code of rankingCodes) {
      try {
        const count = await fetchAndCacheRanking(code, pageSize);
        results[code] = count;
        console.log(`[Bitget Cache] ${code}: ${count} traders cached`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        errors[code] = msg;
        console.error(`[Bitget Cache] ${code} failed: ${msg}`);
      }
    }

    const totalCached = Object.values(results).reduce((a, b) => a + b, 0);

    // Log
    await db.adminLog.create({
      data: {
        adminId: session.userId,
        action: 'update',
        entity: 'bitget_cache',
        description: `Bitget trader cache refreshed: ${totalCached} traders (V2=${isBitgetConfigured()})`,
        newValue: JSON.stringify({ results, errors }),
        ipAddress: getIpFromRequest(request),
      },
    });

    return apiSuccess({
      message: `Cache atualizado: ${totalCached} traders carregados da Bitget`,
      results,
      errors: Object.keys(errors).length > 0 ? errors : undefined,
      totalCached,
      apiVersion: isBitgetConfigured() ? 'v2' : 'v1',
    }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}

// DELETE: Clear cache
export async function DELETE(request: NextRequest) {
  try {
    const session = await requireAdmin();

    const result = await db.bitgetTraderCache.deleteMany({});

    // Log
    await db.adminLog.create({
      data: {
        adminId: session.userId,
        action: 'delete',
        entity: 'bitget_cache',
        description: `Bitget trader cache cleared: ${result.count} traders removidos`,
        newValue: JSON.stringify({ deletedCount: result.count }),
        ipAddress: getIpFromRequest(request),
      },
    });

    return apiSuccess({
      message: `Cache limpo: ${result.count} traders removidos`,
      deleted: result.count,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

// PUT: Import trader data directly (for when Bitget API is blocked on server but works elsewhere)
export async function PUT(request: NextRequest) {
  try {
    const session = await requireAdmin();

    const body = await request.json();
    const traders: Array<{
      traderId: string;
      displayName: string;
      avatar?: string;
      roi?: string;
      totalPnl?: string;
      maxDrawdown?: string;
      followers?: number;
      aum?: string;
      grade?: { id: string; name: string };
      labels?: Array<{ id: string; name: string; type: string }>;
      topSymbols?: string[];
      klineProfit?: string;
      ranking?: string;
      rank?: number;
      winRate?: string;
      tradeDays?: string;
      tradeCount?: string;
      profitCount?: string;
      lossCount?: string;
      lastTradeTime?: string;
      dailyProfitRateList?: Array<{ rate: string; cTime: string }>;
    }> = body.traders || [];

    if (!Array.isArray(traders) || traders.length === 0) {
      return apiError('Array de traders é obrigatório');
    }

    const ranking = body.ranking || 'profit_rate';
    let saved = 0;

    for (const trader of traders) {
      if (!trader.traderId) continue;

      await db.bitgetTraderCache.upsert({
        where: { traderId_ranking: { traderId: trader.traderId, ranking } },
        create: {
          traderId: trader.traderId,
          displayName: trader.displayName || 'Unknown',
          avatar: trader.avatar || '',
          roi: trader.roi || '0',
          totalPnl: trader.totalPnl || '0',
          maxDrawdown: trader.maxDrawdown || '0',
          followers: trader.followers || 0,
          aum: trader.aum || '0',
          grade: JSON.stringify(trader.grade || {}),
          labels: JSON.stringify(trader.labels || []),
          topSymbols: JSON.stringify(trader.topSymbols || []),
          klineProfit: trader.klineProfit || '',
          ranking,
          rank: trader.rank || (saved + 1),
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
          displayName: trader.displayName || 'Unknown',
          avatar: trader.avatar || '',
          roi: trader.roi || '0',
          totalPnl: trader.totalPnl || '0',
          maxDrawdown: trader.maxDrawdown || '0',
          followers: trader.followers || 0,
          aum: trader.aum || '0',
          grade: JSON.stringify(trader.grade || {}),
          labels: JSON.stringify(trader.labels || []),
          topSymbols: JSON.stringify(trader.topSymbols || []),
          klineProfit: trader.klineProfit || '',
          ranking,
          rank: trader.rank || (saved + 1),
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
      saved++;
    }

    // Log
    await db.adminLog.create({
      data: {
        adminId: session.userId,
        action: 'update',
        entity: 'bitget_cache',
        description: `Bitget trader cache imported: ${saved} traders for ranking ${ranking}`,
        newValue: JSON.stringify({ count: saved, ranking }),
        ipAddress: getIpFromRequest(request),
      },
    });

    return apiSuccess({
      message: `${saved} traders importados para o cache (ranking: ${ranking})`,
      saved,
      ranking,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
