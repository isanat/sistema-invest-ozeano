import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { getNowPaymentsConfig, createInvoice, getMinimumPaymentAmount } from '@/lib/nowpayments';
import { getTeamBonusPct } from '@/lib/affiliate';

// POST /api/payments/deposit - Create a NowPayments deposit invoice
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { amount: amountStr, currency = 'USDTTRC20', planId } = body;

    if (!amountStr || !planId) {
      return NextResponse.json(
        { error: 'Amount and plan ID are required' },
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
      return NextResponse.json(
        { error: 'NowPayments is not configured. Please contact support.' },
        { status: 503 }
      );
    }

    // Get the investment plan
    const plan = await db.investmentPlan.findUnique({ where: { id: planId } });
    if (!plan || !plan.isActive) {
      return NextResponse.json(
        { error: 'Investment plan not found or inactive' },
        { status: 404 }
      );
    }

    // Validate amount against plan
    const minAmount = parseFloat(plan.minAmount);
    if (amount < minAmount) {
      return NextResponse.json(
        { error: `Minimum investment for ${plan.name} plan is ${plan.minAmount} USDT` },
        { status: 400 }
      );
    }

    if (plan.maxAmount) {
      const maxAmount = parseFloat(plan.maxAmount);
      if (amount > maxAmount) {
        return NextResponse.json(
          { error: `Maximum investment for ${plan.name} plan is ${plan.maxAmount} USDT` },
          { status: 400 }
        );
      }
    }

    // Get minimum investment from system config
    const minInvestmentConfig = await db.systemConfig.findUnique({
      where: { key: 'min_investment' },
    });
    const minInvestment = minInvestmentConfig ? parseFloat(minInvestmentConfig.value) : 10;
    if (amount < minInvestment) {
      return NextResponse.json(
        { error: `Minimum deposit is ${minInvestment} USDT` },
        { status: 400 }
      );
    }

    // Check minimum payment amount from NowPayments
    const minAmountCheck = await getMinimumPaymentAmount('usdt', currency.toLowerCase());
    if (minAmountCheck.ok && minAmountCheck.data) {
      const npMinAmount = parseFloat(minAmountCheck.data.minAmount as string || '0');
      if (amount < npMinAmount) {
        return NextResponse.json(
          { error: `Minimum payment amount for ${currency} is ${npMinAmount}` },
          { status: 400 }
        );
      }
    }

    // Create NowPayments invoice
    const orderId = `dep_${auth.userId}_${Date.now()}`;
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || '';
    const callbackUrl = baseUrl
      ? `${baseUrl}/api/payments/callback`
      : '/api/payments/callback';

    const invoiceResult = await createInvoice({
      priceAmount: amount,
      priceCurrency: 'usdt',
      payCurrency: currency.toLowerCase(),
      orderId,
      orderDescription: `Deposit: ${plan.name} Plan - ${amount} USDT`,
      ipnCallbackUrl: callbackUrl,
    });

    if (!invoiceResult.ok || !invoiceResult.data) {
      console.error('NowPayments invoice creation failed:', invoiceResult.error);
      // Create a pending payment record even if NowPayments fails
      const payment = await db.payment.create({
        data: {
          userId: auth.userId,
          type: 'deposit',
          amount: amount.toFixed(8),
          currency,
          network: currency === 'USDTTRC20' ? 'TRC-20' : null,
          paymentStatus: 'pending',
          purchaseId: orderId,
          description: `Deposit for ${plan.name} Plan`,
          fee: '0',
          netAmount: amount.toFixed(8),
        },
      });

      return NextResponse.json({
        payment: {
          id: payment.id,
          amount: payment.amount,
          currency: payment.currency,
          status: payment.paymentStatus,
          createdAt: payment.createdAt,
        },
        error: 'NowPayments invoice creation failed. Payment created in pending state.',
        nowpaymentsError: invoiceResult.error,
      }, { status: 202 });
    }

    const invoiceData = invoiceResult.data;

    // Create payment record with NowPayments details
    const payment = await db.payment.create({
      data: {
        userId: auth.userId,
        type: 'deposit',
        amount: amount.toFixed(8),
        currency,
        network: currency === 'USDTTRC20' ? 'TRC-20' : null,
        nowpaymentsId: (invoiceData.id as string)?.toString() || null,
        payAddress: (invoiceData.payAddress as string) || null,
        payAmount: (invoiceData.payAmount as string)?.toString() || null,
        payCurrency: (invoiceData.payCurrency as string) || null,
        paymentStatus: 'waiting',
        purchaseId: orderId,
        description: `Deposit for ${plan.name} Plan`,
        fee: '0',
        netAmount: amount.toFixed(8),
        expiresAt: invoiceData.expirationDate
          ? new Date(invoiceData.expirationDate as string)
          : new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours default
      },
    });

    return NextResponse.json({
      payment: {
        id: payment.id,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.paymentStatus,
        nowpaymentsId: payment.nowpaymentsId,
        payAddress: payment.payAddress,
        payAmount: payment.payAmount,
        payCurrency: payment.payCurrency,
        expiresAt: payment.expiresAt,
        createdAt: payment.createdAt,
      },
      invoice: invoiceData,
    }, { status: 201 });
  } catch (error) {
    console.error('Create deposit error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
