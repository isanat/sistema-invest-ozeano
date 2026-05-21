import { NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { apiSuccess, handleApiError } from '@/lib/api-utils';
import { testConnection, isNowPaymentsConfigured } from '@/lib/nowpayments';

// Test NowPayments API connection — admin only
// Uses environment variables ONLY (never reads credentials from database)
export async function POST(request: NextRequest) {
  try {
    await requireAdmin();

    // Check if NowPayments is configured via environment variables
    const configured = isNowPaymentsConfigured();

    if (!configured) {
      return apiSuccess({
        connected: false,
        status: 'not_configured',
        message: 'Credenciais NowPayments não configuradas nas variáveis de ambiente do Vercel',
      });
    }

    // Test connection using the SDK (reads from env vars)
    const result = await testConnection();

    return apiSuccess({
      connected: result.connected,
      status: result.connected ? 'connected' : 'connection_failed',
      message: result.connected
        ? 'Conexão com NowPayments estabelecida com sucesso'
        : `Falha na conexão: ${result.error || 'Erro desconhecido'}`,
      details: {
        authWorks: result.authWorks,
        apiKeyWorks: result.apiKeyWorks,
        subPartnerWorks: result.subPartnerWorks,
        error: result.error,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
