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
      // Deposit
      { key: 'min_deposit_usdt', value: '10', type: 'number', description: 'Depósito mínimo USDT', category: 'deposit' },
      { key: 'max_deposit_usdt', value: '100000', type: 'number', description: 'Depósito máximo USDT', category: 'deposit' },
      { key: 'pix_wallet_address', value: '', type: 'string', description: 'Endereço USDT para depósitos PIX', category: 'deposit' },
      { key: 'usdt_trc20_address', value: '', type: 'string', description: 'Endereço USDT TRC20 para depósitos', category: 'deposit' },
      { key: 'usdt_polygon_address', value: '', type: 'string', description: 'Endereço USDT Polygon para depósitos', category: 'deposit' },
      { key: 'pix_key', value: '', type: 'string', description: 'Chave PIX para recebimentos', category: 'deposit' },
      { key: 'has_pix', value: 'false', type: 'boolean', description: 'Ativar depósito via PIX', category: 'deposit' },
      { key: 'has_usdt', value: 'true', type: 'boolean', description: 'Ativar depósito via USDT', category: 'deposit' },
      { key: 'manual_deposit_enabled', value: 'false', type: 'boolean', description: 'Ativar depósito manual (hash de transação)', category: 'deposit' },
      // Withdrawal
      { key: 'min_withdrawal_usdt', value: '10', type: 'number', description: 'Saque mínimo USDT', category: 'withdrawal' },
      { key: 'max_withdrawal_usdt', value: '50000', type: 'number', description: 'Saque máximo USDT', category: 'withdrawal' },
      { key: 'withdrawal_fee_pct', value: '0', type: 'number', description: 'Taxa de saque (%)', category: 'withdrawal' },
      { key: 'withdrawal_interval_hours', value: '12', type: 'number', description: 'Intervalo mínimo entre saques (horas)', category: 'withdrawal' },
      { key: 'manual_withdrawal_enabled', value: 'true', type: 'boolean', description: 'Permitir saques manuais (admin aprova cada solicitação)', category: 'withdrawal' },
      { key: 'nowpayments_withdrawal_enabled', value: 'false', type: 'boolean', description: 'Permitir saques automáticos via NowPayments (payout)', category: 'withdrawal' },
      // Trading
      { key: 'daily_roi_pct', value: '5', type: 'number', description: 'ROI diário padrão (%)', category: 'trading' },
      { key: 'min_investment_usdt', value: '10', type: 'number', description: 'Investimento mínimo USDT', category: 'trading' },
      // Affiliate
      { key: 'min_affiliate_withdrawal', value: '10', type: 'number', description: 'Saque mínimo afiliado USDT', category: 'affiliate' },
      { key: 'affiliate_withdrawal_fee_pct', value: '0', type: 'number', description: 'Taxa saque afiliado (%)', category: 'affiliate' },
      { key: 'affiliate_commission_mode', value: 'system_margin', type: 'string', description: 'Modo de comissão: system_margin, investment_profit, revenue_pool', category: 'affiliate' },
      { key: 'affiliate_system_margin_pct', value: '30', type: 'number', description: 'Margem do sistema (%) para modo system_margin', category: 'affiliate' },
      { key: 'affiliate_pool_revenue_pct', value: '5', type: 'number', description: '% da receita para pool de afiliados (modo revenue_pool)', category: 'affiliate' },
      { key: 'affiliate_investment_bonus_pct', value: '2', type: 'number', description: 'Bônus de investimento (%) para modo investment_profit', category: 'affiliate' },
      { key: 'affiliate_daily_cap_usd', value: '0', type: 'number', description: 'Cap diário de comissões afiliado em USDT (0 = sem cap explícito)', category: 'affiliate' },
      // NowPayments
      { key: 'nowpayments_enabled', value: 'true', type: 'boolean', description: 'Ativar depósito automático via NowPayments', category: 'nowpayments' },
      { key: 'nowpayments_deposit_currencies', value: 'usdttrc20', type: 'string', description: 'Moedas aceitas para depósito NowPayments (separar por vírgula)', category: 'nowpayments' },
      { key: 'nowpayments_api_key', value: '', type: 'secret', description: 'Chave de API do painel NowPayments', category: 'nowpayments' },
      { key: 'nowpayments_email', value: '', type: 'string', description: 'E-mail da conta NowPayments', category: 'nowpayments' },
      { key: 'nowpayments_password', value: '', type: 'secret', description: 'Senha da conta NowPayments', category: 'nowpayments' },
      { key: 'nowpayments_ipn_secret', value: '', type: 'secret', description: 'Chave secreta para verificação de webhooks', category: 'nowpayments' },
      { key: 'nowpayments_2fa_secret', value: '', type: 'secret', description: 'Chave TOTP para verificação automática de payouts', category: 'nowpayments' },
      { key: 'nowpayments_base_url', value: 'https://api.nowpayments.io/v1', type: 'string', description: 'URL base da API NowPayments (não alterar)', category: 'nowpayments' },
      { key: 'nowpayments_split_pct', value: '0', type: 'number', description: 'Split da Plataforma (%)', category: 'nowpayments' },
      { key: 'nowpayments_split_wallet', value: '', type: 'string', description: 'Carteira de Split', category: 'nowpayments' },
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
