import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin, apiSuccess, apiError, handleApiError } from '@/lib/api-utils';

// Test NowPayments API connection — admin only
export async function POST(request: NextRequest) {
  try {
    const adminId = await requireAdmin(request);
    if (!adminId) return apiError('Não autorizado', 401);

    // Get NowPayments credentials
    const configKeys = ['nowpayments_api_key', 'nowpayments_base_url'];
    const configs = await db.systemConfig.findMany({
      where: { key: { in: configKeys } },
    });
    const configMap = Object.fromEntries(configs.map((c) => [c.key, c.value]));

    const apiKey = configMap.nowpayments_api_key;
    const baseUrl = configMap.nowpayments_base_url || 'https://api.nowpayments.io/v1';

    if (!apiKey) {
      return apiSuccess({
        connected: false,
        status: 'not_configured',
        message: 'Chave de API não configurada',
      });
    }

    // Test connection by calling the status endpoint
    try {
      const response = await fetch(`${baseUrl}/status`, {
        method: 'GET',
        headers: { 'x-api-key': apiKey },
        signal: AbortSignal.timeout(10000),
      });

      if (response.ok) {
        const data = await response.json();
        return apiSuccess({
          connected: true,
          status: 'connected',
          message: 'Conexão com NowPayments estabelecida com sucesso',
          details: data,
        });
      } else {
        return apiSuccess({
          connected: false,
          status: 'auth_failed',
          message: `Falha na autenticação: ${response.status} ${response.statusText}`,
        });
      }
    } catch (fetchError: any) {
      return apiSuccess({
        connected: false,
        status: 'connection_error',
        message: `Erro de conexão: ${fetchError.message}`,
      });
    }
  } catch (error) {
    return handleApiError(error);
  }
}
