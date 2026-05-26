import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

// GET /api/withdrawals - Get user's withdrawal history
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const withdrawals = await db.withdrawal.findMany({
      where: { userId: auth.userId },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ withdrawals });
  } catch (error) {
    console.error('Get withdrawals error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/withdrawals - Request withdrawal
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { amount: amountStr, walletAddress } = body;

    if (!amountStr || !walletAddress) {
      return NextResponse.json(
        { error: 'Amount and wallet address are required' },
        { status: 400 }
      );
    }

    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount <= 0) {
      return NextResponse.json(
        { error: 'Invalid amount' },
        { status: 400 }
      );
    }

    // Get minimum withdrawal from system config
    let minWithdrawal = 10;
    const minWithdrawalConfig = await db.systemConfig.findUnique({
      where: { key: 'min_withdrawal' },
    });
    if (minWithdrawalConfig) {
      minWithdrawal = parseFloat(minWithdrawalConfig.value);
    }

    if (amount < minWithdrawal) {
      return NextResponse.json(
        { error: `Minimum withdrawal is ${minWithdrawal} USDT` },
        { status: 400 }
      );
    }

    // Get withdrawal fee
    let withdrawalFeePct = 0;
    const feeConfig = await db.systemConfig.findUnique({
      where: { key: 'withdrawal_fee' },
    });
    if (feeConfig) {
      withdrawalFeePct = parseFloat(feeConfig.value);
    }

    // Get user
    const user = await db.user.findUnique({ where: { id: auth.userId } });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const balance = parseFloat(user.balance);
    if (balance < amount) {
      return NextResponse.json(
        { error: 'Insufficient balance' },
        { status: 400 }
      );
    }

    // Calculate fee and net amount
    const fee = (amount * withdrawalFeePct) / 100;
    const netAmount = amount - fee;

    // Create withdrawal and update user
    const withdrawal = await db.$transaction(async (tx) => {
      const wd = await tx.withdrawal.create({
        data: {
          userId: user.id,
          amount: amount.toFixed(8),
          fee: fee.toFixed(8),
          netAmount: netAmount.toFixed(8),
          walletAddress,
          status: 'pending',
        },
      });

      // Deduct from user balance
      const newBalance = (parseFloat(user.balance) - amount).toFixed(8);
      const newTotalWithdrawn = (parseFloat(user.totalWithdrawn) + amount).toFixed(8);

      await tx.user.update({
        where: { id: user.id },
        data: {
          balance: newBalance,
          totalWithdrawn: newTotalWithdrawn,
        },
      });

      // Create transaction record
      await tx.transaction.create({
        data: {
          userId: user.id,
          type: 'withdrawal',
          amount: (-amount).toFixed(8),
          description: `Withdrawal to ${walletAddress.substring(0, 8)}...`,
          referenceId: wd.id,
          status: 'pending',
        },
      });

      return wd;
    });

    return NextResponse.json({ withdrawal }, { status: 201 });
  } catch (error) {
    console.error('Create withdrawal error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
