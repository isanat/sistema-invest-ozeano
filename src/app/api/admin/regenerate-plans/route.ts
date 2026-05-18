import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin, d, ds } from '@/lib/auth';
import { apiSuccess, handleApiError } from '@/lib/api-utils';

function calculatePlanPricing(miner: { pricePerDay: string; dailyRevenue: string; profitSharePct: string }, days: number, discountPct: string) {
  const pricePerDay = d(miner.pricePerDay);
  const dailyRevenue = d(miner.dailyRevenue);
  const profitShare = d(miner.profitSharePct);
  const discount = d(discountPct);

  const totalPrice = pricePerDay * days * (1 - discount / 100);
  const dailyReturn = dailyRevenue * (profitShare / 100);
  const totalReturn = dailyReturn * days;

  return {
    totalPrice: ds(totalPrice),
    dailyReturn: ds(dailyReturn),
    totalReturn: ds(totalReturn),
  };
}

const DEFAULT_PLANS = [
  { name: 'Starter', days: 7, discountPct: '0', sortOrder: 1 },
  { name: 'Pro', days: 30, discountPct: '5', sortOrder: 2 },
  { name: 'Elite', days: 90, discountPct: '10', sortOrder: 3 },
  { name: 'Ultimate', days: 365, discountPct: '15', sortOrder: 4 },
];

export async function POST(request: NextRequest) {
  try {
    const session = await requireAdmin();

    // Find all active miners
    const activeMiners = await db.miner.findMany({
      where: { isActive: true },
      include: {
        plans: { where: { isActive: true } },
      },
    });

    // Filter miners with 0 active plans
    const minersWithoutPlans = activeMiners.filter(m => m.plans.length === 0);

    let totalCreated = 0;
    const createdPlans: string[] = [];

    for (const miner of minersWithoutPlans) {
      for (const planTemplate of DEFAULT_PLANS) {
        const planName = `${planTemplate.name} ${miner.name}`;
        const pricing = calculatePlanPricing(miner, planTemplate.days, planTemplate.discountPct);

        // Check if plan name already exists
        const existing = await db.miningPlan.findUnique({ where: { name: planName } });
        if (existing) continue;

        await db.miningPlan.create({
          data: {
            name: planName,
            description: `Plano ${planTemplate.name} - ${planTemplate.days} dias`,
            minerId: miner.id,
            days: planTemplate.days,
            discountPct: planTemplate.discountPct,
            totalPrice: pricing.totalPrice,
            dailyReturn: pricing.dailyReturn,
            totalReturn: pricing.totalReturn,
            isActive: true,
            isFeatured: planTemplate.name === 'Pro' || planTemplate.name === 'Elite',
            sortOrder: planTemplate.sortOrder,
          },
        });

        createdPlans.push(planName);
        totalCreated++;
      }
    }

    // Log the action
    await db.adminLog.create({
      data: {
        adminId: session.userId,
        action: 'create',
        entity: 'plan',
        newValue: JSON.stringify({ totalCreated, createdPlans }),
        description: `Regenerar planos padrão: ${totalCreated} planos criados para ${minersWithoutPlans.length} mineradoras`,
      },
    });

    return apiSuccess({
      totalCreated,
      minersProcessed: minersWithoutPlans.length,
      createdPlans,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
