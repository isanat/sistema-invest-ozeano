import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { apiError, apiSuccess, handleApiError } from '@/lib/api-utils';

// One-time migration: add missing config keys that should exist
export async function POST(request: NextRequest) {
  try {
    const session = await requireAdmin();

    const missingConfigs = [
      // Deposit toggles
      { key: 'has_pix', value: 'false', type: 'boolean', description: 'Ativar depósito via PIX', category: 'deposit' },
      { key: 'has_usdt', value: 'true', type: 'boolean', description: 'Ativar depósito via USDT', category: 'deposit' },
      { key: 'manual_deposit_enabled', value: 'false', type: 'boolean', description: 'Ativar depósito manual (hash de transação)', category: 'deposit' },
      // Withdrawal toggles
      { key: 'manual_withdrawal_enabled', value: 'true', type: 'boolean', description: 'Permitir saques manuais (admin aprova cada solicitação)', category: 'withdrawal' },
      { key: 'nowpayments_withdrawal_enabled', value: 'false', type: 'boolean', description: 'Permitir saques automáticos via NowPayments (payout)', category: 'withdrawal' },
      { key: 'withdrawal_interval_hours', value: '12', type: 'number', description: 'Intervalo mínimo entre saques (horas)', category: 'withdrawal' },
      // General additions
      { key: 'usdt_brl_rate', value: '5.50', type: 'number', description: 'Câmbio fixo USDT/BRL', category: 'general' },
      { key: 'maintenance_mode', value: 'false', type: 'boolean', description: 'Modo manutenção', category: 'general' },
      // Branding
      { key: 'site_logo', value: '', type: 'string', description: 'URL do logo do site (PNG ou SVG, fundo transparente)', category: 'branding' },
      { key: 'site_favicon', value: '', type: 'string', description: 'URL do favicon do site (ICO ou PNG, 32x32px)', category: 'branding' },
      // NowPayments credentials
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

    for (const config of missingConfigs) {
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
