import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin, apiSuccess, apiError, handleApiError } from '@/lib/api-utils';

// Auto-migrate: ensures all expected config keys exist in the database.
// Called by the admin config UI when it detects missing categories.
// Admin-only endpoint.
export async function POST(request: NextRequest) {
  try {
    const adminId = await requireAdmin(request);
    if (!adminId) return apiError('Não autorizado', 401);

    const expectedConfigs = [
      // Branding
      { key: 'site_logo', value: '', type: 'string', description: 'URL do logo do site (PNG ou SVG, fundo transparente, 200x60px recomendado)', category: 'branding' },
      { key: 'site_favicon', value: '', type: 'string', description: 'URL do favicon do site (ICO ou PNG, 32x32px ou 64x64px recomendado)', category: 'branding' },
      // General
      { key: 'site_name', value: 'PLATAFORMA ROI', type: 'string', description: 'Nome do site', category: 'general' },
      { key: 'maintenance_mode', value: 'false', type: 'boolean', description: 'Modo manutenção', category: 'general' },
      { key: 'usdt_brl_rate', value: '5.50', type: 'number', description: 'Câmbio fixo USDT/BRL', category: 'general' },
      { key: 'system_min_reserve', value: '15', type: 'number', description: 'Reserva mínima do sistema (%)', category: 'general' },
      // Deposit
      { key: 'min_deposit_usdt', value: '5', type: 'number', description: 'Depósito mínimo USDT', category: 'deposit' },
      { key: 'max_deposit_usdt', value: '100000', type: 'number', description: 'Depósito máximo USDT', category: 'deposit' },
      { key: 'pix_wallet_address', value: '', type: 'string', description: 'Endereço USDT para depósitos PIX', category: 'deposit' },
      { key: 'usdt_trc20_address', value: '', type: 'string', description: 'Endereço USDT TRC20 para depósitos', category: 'deposit' },
      { key: 'usdt_polygon_address', value: '', type: 'string', description: 'Endereço USDT Polygon para depósitos', category: 'deposit' },
      { key: 'pix_key', value: '', type: 'string', description: 'Chave PIX para recebimentos', category: 'deposit' },
      { key: 'has_pix', value: 'false', type: 'boolean', description: 'Ativar depósito via PIX', category: 'deposit' },
      { key: 'has_usdt', value: 'true', type: 'boolean', description: 'Ativar depósito via USDT', category: 'deposit' },
      { key: 'manual_deposit_enabled', value: 'false', type: 'boolean', description: 'Ativar depósito manual (hash de transação)', category: 'deposit' },
      // Withdrawal
      { key: 'min_withdrawal_usdt', value: '5', type: 'number', description: 'Saque mínimo USDT', category: 'withdrawal' },
      { key: 'max_withdrawal_usdt', value: '50000', type: 'number', description: 'Saque máximo USDT', category: 'withdrawal' },
      { key: 'withdrawal_fee_pct', value: '5', type: 'number', description: 'Taxa de saque (%)', category: 'withdrawal' },
      { key: 'withdrawal_interval_hours', value: '12', type: 'number', description: 'Intervalo mínimo entre saques (horas)', category: 'withdrawal' },
      { key: 'manual_withdrawal_enabled', value: 'false', type: 'boolean', description: 'Permitir saques manuais (admin aprova cada solicitação)', category: 'withdrawal' },
      { key: 'nowpayments_withdrawal_enabled', value: 'true', type: 'boolean', description: 'Permitir saques automáticos via NowPayments (payout)', category: 'withdrawal' },
      // Trading
      { key: 'daily_roi_pct', value: '3.3', type: 'number', description: 'ROI diário padrão (%)', category: 'trading' },
      { key: 'min_investment_usdt', value: '5', type: 'number', description: 'Investimento mínimo USDT', category: 'trading' },
      { key: 'default_profit_share_pct', value: '70', type: 'number', description: 'Share de lucro do investidor (%)', category: 'trading' },
      { key: 'mining_variance_pct', value: '5', type: 'number', description: 'Variação diária de ROI (%)', category: 'trading' },
      // Affiliate
      { key: 'min_affiliate_withdrawal', value: '10', type: 'number', description: 'Saque mínimo afiliado USDT', category: 'affiliate' },
      { key: 'affiliate_withdrawal_fee_pct', value: '0', type: 'number', description: 'Taxa saque afiliado (%)', category: 'affiliate' },
      { key: 'affiliate_commission_mode', value: 'system_margin', type: 'string', description: 'Modo de comissão: system_margin, investment_profit, revenue_pool', category: 'affiliate' },
      { key: 'affiliate_system_margin_pct', value: '30', type: 'number', description: 'Margem do sistema (%) para modo system_margin', category: 'affiliate' },
      { key: 'affiliate_pool_revenue_pct', value: '5', type: 'number', description: '% da receita para pool de afiliados (modo revenue_pool)', category: 'affiliate' },
      { key: 'affiliate_investment_bonus_pct', value: '2', type: 'number', description: 'Bônus de investimento (%) para modo investment_profit', category: 'affiliate' },
      { key: 'affiliate_daily_cap_usd', value: '0', type: 'number', description: 'Cap diário de comissões afiliado em USDT (0 = sem cap explícito)', category: 'affiliate' },
      // NowPayments (settings only — credentials are in Vercel env vars)
      { key: 'nowpayments_enabled', value: 'true', type: 'boolean', description: 'Ativar depósito automático via NowPayments', category: 'nowpayments' },
      { key: 'nowpayments_split_pct', value: '0', type: 'number', description: 'Split da Plataforma (%)', category: 'nowpayments' },
      { key: 'nowpayments_split_wallet', value: '', type: 'string', description: 'Carteira de Split', category: 'nowpayments' },
      // Team Bonus
      { key: 'team_bonus_salary_enabled', value: 'true', type: 'boolean', description: 'Ativar Salário Semanal (0.5% do capital de equipe)', category: 'team_bonus', isActive: true },
      { key: 'team_bonus_salary_pct', value: '0.5', type: 'number', description: '% do capital de equipe paga semanalmente', category: 'team_bonus', isActive: true },
      { key: 'team_bonus_salary_min_team_capital', value: '2000', type: 'number', description: 'Capital mínimo de equipe para Salário em USDT', category: 'team_bonus', isActive: true },
      { key: 'team_bonus_salary_requires_own_investment', value: 'true', type: 'boolean', description: 'Requer investimento próprio ativo para Salário', category: 'team_bonus', isActive: true },
      { key: 'team_bonus_gold_enabled', value: 'true', type: 'boolean', description: 'Ativar Action Gold (50% dos diretos)', category: 'team_bonus', isActive: true },
      { key: 'team_bonus_gold_pct', value: '50', type: 'number', description: '% do salário dos diretos paga como Gold', category: 'team_bonus', isActive: true },
      { key: 'team_bonus_gold_min_team_capital', value: '4000', type: 'number', description: 'Capital mínimo de equipe para Gold em USDT', category: 'team_bonus', isActive: true },
      { key: 'team_bonus_daymond_enabled', value: 'true', type: 'boolean', description: 'Ativar Action Daymond (pkg $1000, time $20k)', category: 'team_bonus', isActive: true },
      { key: 'team_bonus_daymond_package_amount', value: '1000', type: 'number', description: 'Valor do pacote Daymond em USDT', category: 'team_bonus', isActive: true },
      { key: 'team_bonus_daymond_min_team_capital', value: '20000', type: 'number', description: 'Capital mínimo de equipe para Daymond em USDT', category: 'team_bonus', isActive: true },
      { key: 'team_bonus_daymond_duration_days', value: '30', type: 'number', description: 'Duração do pacote Daymond em dias', category: 'team_bonus', isActive: true },
      { key: 'team_bonus_daymond_generates_commissions', value: 'false', type: 'boolean', description: 'Se Daymond gera comissões de afiliado', category: 'team_bonus', isActive: true },
      { key: 'team_bonus_daily_cap_usd', value: '0', type: 'number', description: 'Cap diário de bônus de equipe em USDT (0 = sem cap)', category: 'team_bonus', isActive: true },
      { key: 'team_bonus_max_depth', value: '6', type: 'number', description: 'Profundidade máxima do time para cálculo', category: 'team_bonus', isActive: true },
      { key: 'team_bonus_daymond_premium_enabled', value: 'true', type: 'boolean', description: 'Ativar Action Daymond Premium (pkg $2000, time $50k)', category: 'team_bonus', isActive: true },
      { key: 'team_bonus_daymond_premium_package_amount', value: '2000', type: 'number', description: 'Valor do pacote Daymond Premium em USDT', category: 'team_bonus', isActive: true },
      { key: 'team_bonus_daymond_premium_min_team_capital', value: '50000', type: 'number', description: 'Capital mínimo de equipe para Daymond Premium em USDT', category: 'team_bonus', isActive: true },
      { key: 'team_bonus_daymond_premium_daily_roi_pct', value: '3.3', type: 'number', description: 'ROI diário do pacote Daymond Premium (%)', category: 'team_bonus', isActive: true },
      { key: 'team_bonus_daymond_premium_daily_cap_usd', value: '99', type: 'number', description: 'Cap diário de ganho Daymond Premium em USDT', category: 'team_bonus', isActive: true },
    ];

    let created = 0;
    let skipped = 0;

    for (const config of expectedConfigs) {
      const existing = await db.systemConfig.findUnique({ where: { key: config.key } });
      if (!existing) {
        await db.systemConfig.create({ data: config });
        created++;
      } else {
        skipped++;
      }
    }

    return apiSuccess({
      message: `Migração concluída: ${created} configs criadas, ${skipped} já existiam`,
      created,
      skipped,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
