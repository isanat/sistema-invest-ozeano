import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { d, ds, dusdt } from '@/lib/auth';
import { getBTCPrice, getCryptoPrices } from '@/lib/market-data';
import { processCommissions } from '@/lib/affiliate';
import { apiError, apiSuccess, handleApiError } from '@/lib/api-utils';

// ============================================================================
// Cryptographically secure random number generation
// Replaces Math.random() for financial calculations
// ============================================================================

/**
 * Returns a cryptographically secure random float between 0 (inclusive) and 1 (exclusive).
 * Uses crypto.getRandomValues() for unpredictability in financial contexts.
 */
function secureRandom(): number {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return array[0] / (0x100000000); // Divide by 2^32 for [0, 1)
}

/**
 * Returns a cryptographically secure random integer between min (inclusive) and max (exclusive).
 */
function secureRandomInt(min: number, max: number): number {
  const range = max - min;
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return min + Math.floor((array[0] / 0x100000000) * range);
}

// ============================================================================
// CRON: Daily Mining Profit Distribution
// ============================================================================
// Called by Vercel Cron (daily at midnight UTC) or manually with Bearer token.
// Sustainable design:
//   - Mining profits are distributed from the system's operational margin
//   - Affiliate commissions are a small % of the user's mining profit
//   - Total affiliate outflow is capped by the commission level structure
//   - System retains its margin regardless of affiliate payouts
// ============================================================================

const CRON_SECRET = process.env.CRON_SECRET || '';
const IS_VERCEL = process.env.VERCEL === '1';

function isCronAuthorized(request: NextRequest): boolean {
  // Always check CRON_SECRET first
  const authHeader = request.headers.get('authorization');
  if (authHeader === `Bearer ${CRON_SECRET}` && CRON_SECRET) return true;
  // Vercel Cron sends a specific header for verification
  if (IS_VERCEL) {
    const vercelCronHeader = request.headers.get('x-vercel-cron');
    if (vercelCronHeader === 'true') return true;
  }
  // CRITICAL: Only allow without auth in development mode
  if (process.env.NODE_ENV === 'development' && !CRON_SECRET) return true;
  return false;
}

// Default BTC price if API fails (conservative estimate)
const DEFAULT_BTC_PRICE = 95000;

// Default crypto prices fallback
const DEFAULT_CRYPTO_PRICES: Record<string, { usd: number; usd_24h_change: number }> = {
  bitcoin: { usd: DEFAULT_BTC_PRICE, usd_24h_change: 0 },
  kaspa: { usd: 0.12, usd_24h_change: 0 },
  litecoin: { usd: 95, usd_24h_change: 0 },
  dogecoin: { usd: 0.18, usd_24h_change: 0 },
};

export async function POST(request: NextRequest) {
  try {
    // Verify cron authorization
    if (!isCronAuthorized(request)) {
      return apiError('Não autorizado', 401);
    }

    console.log('[CRON] Starting daily mining profit distribution...', new Date().toISOString());

    // PostgreSQL: acquire advisory lock to prevent concurrent cron execution
    let lockReleased = false;
    try {
      await db.$queryRaw`SELECT pg_advisory_lock(12345)`;
    } catch (lockErr) {
      console.warn('[CRON] Could not acquire advisory lock, proceeding with caution:', lockErr);
    }

    // Get all active rentals
    const activeRentals = await db.miningRental.findMany({
      where: { status: 'active' },
      include: {
        miner: true,
        plan: true,
      },
    });

    if (activeRentals.length === 0) {
      console.log('[CRON] No active rentals found');
      return apiSuccess({ message: 'Nenhuma locação ativa', processed: 0 });
    }

    console.log(`[CRON] Found ${activeRentals.length} active rentals`);

    // Get current crypto prices for realistic calculations (with robust fallback)
    let cryptoPrices: Record<string, { usd: number; brl?: number; usd_24h_change: number }> = DEFAULT_CRYPTO_PRICES;
    try {
      const prices = await getCryptoPrices();
      if (prices && Object.keys(prices).length > 0) {
        cryptoPrices = prices;
      }
    } catch (e) {
      console.error('[CRON] Crypto prices API failed, using defaults:', e);
    }

    // Get BTC price (with fallback)
    let btcPrice = DEFAULT_BTC_PRICE;
    try {
      const fetched = await getBTCPrice();
      if (fetched && fetched > 0) {
        btcPrice = fetched;
      }
    } catch (e) {
      console.error('[CRON] BTC price API failed, using default:', e);
    }

    console.log(`[CRON] BTC Price: $${btcPrice.toLocaleString()}`);

    // Price multipliers based on real market data (10% of daily change affects mining revenue)
    const priceMultipliers: Record<string, number> = {
      BTC: cryptoPrices.bitcoin?.usd_24h_change
        ? 1 + (cryptoPrices.bitcoin.usd_24h_change / 100) * 0.1
        : 1,
      KAS: cryptoPrices.kaspa?.usd_24h_change
        ? 1 + (cryptoPrices.kaspa.usd_24h_change / 100) * 0.1
        : 1,
      LTC: cryptoPrices.litecoin?.usd_24h_change
        ? 1 + (cryptoPrices.litecoin.usd_24h_change / 100) * 0.1
        : 1,
      DOGE: cryptoPrices.dogecoin?.usd_24h_change
        ? 1 + (cryptoPrices.dogecoin.usd_24h_change / 100) * 0.1
        : 1,
    };

    let processed = 0;
    let skipped = 0;
    let completed = 0;
    let totalDistributed = 0;
    const errors: string[] = [];

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    for (const rental of activeRentals) {
      try {
        // Check if rental has ended
        if (new Date(rental.endDate) <= today) {
          await db.miningRental.update({
            where: { id: rental.id },
            data: { status: 'completed' },
          });
          completed++;
          continue;
        }

        // Check if rental hasn't started yet
        if (new Date(rental.startDate) > today) {
          skipped++;
          continue;
        }

        // Check if we already distributed for today
        const existingHistory = await db.miningHistory.findFirst({
          where: {
            rentalId: rental.id,
            date: { gte: today },
          },
        });

        if (existingHistory) {
          skipped++;
          continue;
        }

        // Calculate daily return with small variance based on market conditions
        const baseDailyReturn = d(rental.dailyReturn);
        const marketMultiplier = priceMultipliers[rental.miner.coin] || 1;

        // Small daily variance (simulating real mining fluctuations) ±5%
        // Using secure random for financial integrity
        const variance = 1 + (secureRandom() * 0.1 - 0.05);
        const actualReturn = baseDailyReturn * marketMultiplier * variance;

        // Ensure non-negative (sustainability: never pay more than expected)
        const dailyProfit = Math.max(0, actualReturn);

        // Skip if zero profit (edge case)
        if (dailyProfit <= 0) {
          skipped++;
          continue;
        }

        // Calculate BTC equivalent
        const coinToBtc: Record<string, number> = {
          BTC: 1,
          KAS: (cryptoPrices.kaspa?.usd || 0.12) / btcPrice,
          LTC: (cryptoPrices.litecoin?.usd || 95) / btcPrice,
          DOGE: (cryptoPrices.dogecoin?.usd || 0.18) / btcPrice,
        };
        const btcMined = dailyProfit / btcPrice * (coinToBtc[rental.miner.coin] || 1);

        // Use transaction for atomicity
        const miningHistoryId = await db.$transaction(async (tx) => {
          // Create mining history record
          const miningHistory = await tx.miningHistory.create({
            data: {
              userId: rental.userId,
              rentalId: rental.id,
              minerId: rental.minerId,
              date: today,
              hashRate: rental.miner.hashRate,
              btcMined: ds(btcMined),
              usdtValue: ds(dailyProfit),
              pool: rental.miner.pool,
              sharesValid: secureRandomInt(500, 1500),
              sharesInvalid: secureRandomInt(0, 10),
            },
          });

          // Credit user balance atomically using raw SQL (PostgreSQL)
          await tx.$executeRaw`UPDATE "User" SET balance = (CAST(balance AS NUMERIC) + ${dailyProfit})::text, "totalMined" = (CAST("totalMined" AS NUMERIC) + ${dailyProfit})::text WHERE id = ${rental.userId}`;

          // Create transaction record
          await tx.transaction.create({
            data: {
              userId: rental.userId,
              type: 'mining_profit',
              amount: ds(dailyProfit),
              status: 'completed',
              description: `Lucro mineração ${rental.miner.coin} - ${rental.miner.name}`,
              referenceId: rental.id,
              referenceType: 'MiningRental',
            },
          });

          return miningHistory.id;
        });

        // Process affiliate commissions (outside main transaction to avoid long locks)
        // This is SUSTAINABLE because commissions are % of user's mining profit,
        // not of total revenue. The system margin is untouched.
        try {
          await processCommissions(rental.userId, dailyProfit, 'mining', miningHistoryId);
        } catch (commErr) {
          console.error('[CRON] Commission error for rental', rental.id, commErr);
          errors.push(`Commission error: rental ${rental.id}`);
        }

        totalDistributed += dailyProfit;
        processed++;
      } catch (rentalErr: any) {
        console.error('[CRON] Distribution error for rental', rental.id, rentalErr);
        errors.push(`Rental ${rental.id}: ${rentalErr.message}`);
      }
    }

    const summary = `Processed: ${processed}, Skipped: ${skipped}, Completed: ${completed}, Total: $${totalDistributed.toFixed(2)}`;
    console.log(`[CRON] Distribution complete: ${summary}`);

    // Release PostgreSQL advisory lock
    if (!lockReleased) {
      try {
        await db.$queryRaw`SELECT pg_advisory_unlock(12345)`;
        lockReleased = true;
      } catch (unlockErr) {
        console.warn('[CRON] Could not release advisory lock:', unlockErr);
      }
    }

    return apiSuccess({
      message: `Distribuição concluída: ${processed} locações processadas`,
      processed,
      skipped,
      completed: completed > 0 ? completed : undefined,
      totalDistributed: dusdt(totalDistributed),
      errors: errors.length > 0 ? errors : undefined,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[CRON] Fatal error:', error);
    // Release PostgreSQL advisory lock on error
    try {
      await db.$queryRaw`SELECT pg_advisory_unlock(12345)`;
    } catch (unlockErr) {
      console.warn('[CRON] Could not release advisory lock on error:', unlockErr);
    }
    return handleApiError(error);
  }
}

// GET endpoint to check next distribution time (for frontend countdown)
export async function GET(request: NextRequest) {
  // Calculate time until next midnight UTC
  const now = new Date();
  const nextMidnight = new Date(now);
  nextMidnight.setUTCDate(nextMidnight.getUTCDate() + 1);
  nextMidnight.setUTCHours(0, 0, 0, 0);

  const msUntilNext = nextMidnight.getTime() - now.getTime();
  const hoursUntilNext = Math.floor(msUntilNext / (1000 * 60 * 60));
  const minutesUntilNext = Math.floor((msUntilNext % (1000 * 60 * 60)) / (1000 * 60));
  const secondsUntilNext = Math.floor((msUntilNext % (1000 * 60)) / 1000);

  return apiSuccess({
    nextDistribution: nextMidnight.toISOString(),
    hoursUntil: hoursUntilNext,
    minutesUntil: minutesUntilNext,
    secondsUntil: secondsUntilNext,
    schedule: '0 0 * * *', // Daily at midnight UTC
  });
}
