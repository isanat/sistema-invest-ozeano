import { NextRequest } from 'next/server';
import { requireAuth, dusdt } from '@/lib/auth';
import { apiSuccess, handleApiError } from '@/lib/api-utils';
import { calculateWithdrawalBreakdown } from '../route';

// GET /api/withdraw/breakdown — Returns withdrawal breakdown for the frontend
// Shows how much is own source (always withdrawable) vs voucher profits (locked by voucher)
export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();
    const breakdown = await calculateWithdrawalBreakdown(session.userId);

    return apiSuccess({
      balance: dusdt(breakdown.balance),
      ownSource: dusdt(breakdown.ownSource),
      voucherProfits: dusdt(breakdown.voucherProfits),
      unlockPct: breakdown.unlockPct,
      maxWithdrawable: dusdt(breakdown.maxWithdrawable),
      hasActiveVoucher: breakdown.hasActiveVoucher,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
