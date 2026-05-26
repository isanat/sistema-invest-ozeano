import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { getNowPaymentsConfig } from '@/lib/nowpayments';

// POST /api/payments/withdraw - Create a NowPayments withdrawal
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { amount: amountStr, walletAddress, currency = 'USDTTRC20' } = body;

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

    // Check NowPayments configuration
    const npConfig = await getNowPaymentsConfig();
    if (!npConfig.enabled || !npConfig.apiKey) {
      // Fall back to manual withdrawal processing
      return await createManualWithdrawal(auth.userId, amount, walletAddress, currency);
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
    let withdrawalFeeFlat = 0;
    const feePctConfig = await db.systemConfig.findUnique({
      where: { key: 'withdrawal_fee_pct' },
    });
    const feeFlatConfig = await db.systemConfig.findUnique({
      where: { key: 'withdrawal_fee' },
    });
    if (feePctConfig) {
      withdrawalFeePct = parseFloat(feePctConfig.value);
    }
    if (feeFlatConfig) {
      withdrawalFeeFlat = parseFloat(feeFlatConfig.value);
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
    const fee = withdrawalFeeFlat + (amount * withdrawalFeePct) / 100;
    const netAmount = amount - fee;

    if (netAmount <= 0) {
      return NextResponse.json(
        { error: 'Withdrawal amount is too small after fees' },
        { status: 400 }
      );
    }

    // Create payment and withdrawal records
    const result = await db.$transaction(async (tx) => {
      // Create payment record
      const payment = await tx.payment.create({
        data: {
          userId: user.id,
          type: 'withdrawal',
          amount: amount.toFixed(8),
          currency,
          network: currency === 'USDTTRC20' ? 'TRC-20' : null,
          paymentStatus: 'pending',
          description: `Withdrawal to ${walletAddress.substring(0, 8)}...`,
          fee: fee.toFixed(8),
          netAmount: netAmount.toFixed(8),
          walletAddress,
        },
      });

      // Create withdrawal record
      const withdrawal = await tx.withdrawal.create({
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
          referenceId: payment.id,
          status: 'pending',
        },
      });

      return { payment, withdrawal };
    });

    return NextResponse.json({
      payment: {
        id: result.payment.id,
        type: result.payment.type,
        amount: result.payment.amount,
        currency: result.payment.currency,
        status: result.payment.paymentStatus,
        fee: result.payment.fee,
        netAmount: result.payment.netAmount,
        walletAddress: result.payment.walletAddress,
        createdAt: result.payment.createdAt,
      },
      withdrawal: {
        id: result.withdrawal.id,
        amount: result.withdrawal.amount,
        fee: result.withdrawal.fee,
        netAmount: result.withdrawal.netAmount,
        status: result.withdrawal.status,
        createdAt: result.withdrawal.createdAt,
      },
    }, { status: 201 });
  } catch (error) {
    console.error('Create withdrawal error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Create a manual withdrawal when NowPayments is not configured
 */
async function createManualWithdrawal(
  userId: string,
  amount: number,
  walletAddress: string,
  currency: string
): Promise<NextResponse> {
  // Get minimum withdrawal
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
  let withdrawalFeeFlat = 0;
  const feePctConfig = await db.systemConfig.findUnique({
    where: { key: 'withdrawal_fee_pct' },
  });
  const feeFlatConfig = await db.systemConfig.findUnique({
    where: { key: 'withdrawal_fee' },
  });
  if (feePctConfig) withdrawalFeePct = parseFloat(feePctConfig.value);
  if (feeFlatConfig) withdrawalFeeFlat = parseFloat(feeFlatConfig.value);

  const user = await db.user.findUnique({ where: { id: userId } });
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

  const fee = withdrawalFeeFlat + (amount * withdrawalFeePct) / 100;
  const netAmount = amount - fee;

  if (netAmount <= 0) {
    return NextResponse.json(
      { error: 'Withdrawal amount is too small after fees' },
      { status: 400 }
    );
  }

  const result = await db.$transaction(async (tx) => {
    // Create payment record
    const payment = await tx.payment.create({
      data: {
        userId: user.id,
        type: 'withdrawal',
        amount: amount.toFixed(8),
        currency,
        network: currency === 'USDTTRC20' ? 'TRC-20' : null,
        paymentStatus: 'pending',
        description: `Manual withdrawal to ${walletAddress.substring(0, 8)}...`,
        fee: fee.toFixed(8),
        netAmount: netAmount.toFixed(8),
        walletAddress,
      },
    });

    // Create withdrawal record
    const withdrawal = await tx.withdrawal.create({
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
        referenceId: payment.id,
        status: 'pending',
      },
    });

    return { payment, withdrawal };
  });

  return NextResponse.json({
    payment: {
      id: result.payment.id,
      type: result.payment.type,
      amount: result.payment.amount,
      currency: result.payment.currency,
      status: result.payment.paymentStatus,
      fee: result.payment.fee,
      netAmount: result.payment.netAmount,
      walletAddress: result.payment.walletAddress,
      createdAt: result.payment.createdAt,
    },
    withdrawal: {
      id: result.withdrawal.id,
      amount: result.withdrawal.amount,
      fee: result.withdrawal.fee,
      netAmount: result.withdrawal.netAmount,
      status: result.withdrawal.status,
      createdAt: result.withdrawal.createdAt,
    },
    note: 'NowPayments is not configured. Withdrawal will be processed manually by admin.',
  }, { status: 201 });
}
