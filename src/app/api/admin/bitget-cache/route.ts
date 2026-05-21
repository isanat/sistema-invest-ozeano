import { NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { apiError, apiSuccess, handleApiError } from '@/lib/api-utils';
import { db } from '@/lib/db';

// ============================================================================
// ADMIN BITGET CACHE REFRESH - Force refresh trader data from Bitget API
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
  aum?: string;
  traderGrade?: { gradeId?: number | string; gradeName?: string };
  labelVos?: Array<{ labelId?: number | string; labelName?: string; labelType?: string }>;
  topSymbols?: string[];
  klineProfit?: string;
  rankingNo?: number;
  userName?: string;
}

const RANKING_CODES = ['profit_rate', 'total_income', 'total_follow_profit', 'trader_pro'] as const;

async function fetchAndCacheRanking(rankingCode: string, pageSize: number = 50): Promise<number> {
  const url = 'https://www.bitget.com/v1/trigger/trace/public/traderRankingList';

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

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
      body: JSON.stringify({ rankingCode, pageNo: 1, pageSize }),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    throw new Error(`Bitget API returned ${response.status}`);
  }

  const data = await response.json();
  if (data.code !== '00000') {
    throw new Error(`Bitget API error: ${data.msg || data.code}`);
  }

  const traders: BitgetTraderRow[] = data.data?.traderRankingList || data.data?.rows || [];
  let saved = 0;

  for (const trader of traders) {
    const traderId = trader.traderId || trader.userName;
    if (!traderId) continue;

    await db.bitgetTraderCache.upsert({
      where: { traderId_ranking: { traderId, ranking: rankingCode } },
      create: {
        traderId,
        displayName: trader.displayName || trader.nickName || 'Unknown',
        avatar: trader.headPic || trader.header || '',
        roi: trader.roi || '0',
        totalPnl: trader.totalPnl || '0',
        maxDrawdown: trader.maxRetracement || '0',
        followers: trader.followCount || 0,
        aum: trader.aum || '0',
        grade: JSON.stringify(trader.traderGrade || {}),
        labels: JSON.stringify(trader.labelVos || []),
        topSymbols: JSON.stringify(trader.topSymbols || []),
        klineProfit: trader.klineProfit || '',
        ranking: rankingCode,
        rank: trader.rankingNo || (saved + 1),
        isActive: true,
      },
      update: {
        displayName: trader.displayName || trader.nickName || 'Unknown',
        avatar: trader.headPic || trader.header || '',
        roi: trader.roi || '0',
        totalPnl: trader.totalPnl || '0',
        maxDrawdown: trader.maxRetracement || '0',
        followers: trader.followCount || 0,
        aum: trader.aum || '0',
        grade: JSON.stringify(trader.traderGrade || {}),
        labels: JSON.stringify(trader.labelVos || []),
        topSymbols: JSON.stringify(trader.topSymbols || []),
        klineProfit: trader.klineProfit || '',
        ranking: rankingCode,
        rank: trader.rankingNo || (saved + 1),
        isActive: true,
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
    const pageSize = body.pageSize || 50;

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
        description: `Bitget trader cache refreshed: ${totalCached} traders`,
        newValue: JSON.stringify({ results, errors }),
      },
    });

    return apiSuccess({
      message: `Cache atualizado: ${totalCached} traders carregados da Bitget`,
      results,
      errors: Object.keys(errors).length > 0 ? errors : undefined,
      totalCached,
    }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}

// DELETE: Clear cache
export async function DELETE(request: NextRequest) {
  try {
    await requireAdmin();

    const result = await db.bitgetTraderCache.deleteMany({});
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
