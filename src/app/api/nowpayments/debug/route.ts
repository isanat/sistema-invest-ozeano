import { apiSuccess, handleApiError } from '@/lib/api-utils';
import { requireAdmin } from '@/lib/auth';

// ============================================================================
// GET /api/nowpayments/debug
// Debug endpoint to verify NowPayments credentials are being read correctly
// from environment variables. Admin-only.
// ============================================================================

export async function GET() {
  try {
    await requireAdmin();

    // Check environment variables directly (mask sensitive parts)
    const envKeys = {
      NOWPAYMENTS_API_KEY: process.env.NOWPAYMENTS_API_KEY
        ? `${process.env.NOWPAYMENTS_API_KEY.slice(0, 6)}...${process.env.NOWPAYMENTS_API_KEY.slice(-4)}`
        : '(not set)',
      NOWPAYMENTS_IPN_SECRET: process.env.NOWPAYMENTS_IPN_SECRET
        ? `${process.env.NOWPAYMENTS_IPN_SECRET.slice(0, 4)}****`
        : '(not set)',
      NOWPAYMENTS_EMAIL: process.env.NOWPAYMENTS_EMAIL || '(not set)',
      NOWPAYMENTS_PASSWORD: process.env.NOWPAYMENTS_PASSWORD
        ? '****(set)'
        : '(not set)',
      NOWPAYMENTS_2FA_SECRET: process.env.NOWPAYMENTS_2FA_SECRET
        ? '****(set)'
        : '(not set)',
      NOWPAYMENTS_BASE_URL: process.env.NOWPAYMENTS_BASE_URL || '(default: https://api.nowpayments.io/v1)',
    };

    // Check Bitget credentials
    const bitgetKeys = {
      BITGET_API_KEY: process.env.BITGET_API_KEY
        ? `${process.env.BITGET_API_KEY.slice(0, 6)}...${process.env.BITGET_API_KEY.slice(-4)}`
        : '(not set)',
      BITGET_SECRET_KEY: process.env.BITGET_SECRET_KEY
        ? `${process.env.BITGET_SECRET_KEY.slice(0, 6)}****`
        : '(not set)',
      BITGET_PASSPHRASE: process.env.BITGET_PASSPHRASE
        ? '****(set)'
        : '(not set - REQUIRED for V2 API)',
      BITGET_BASE_URL: process.env.BITGET_BASE_URL || '(default: https://api.bitget.com)',
    };

    // Summary
    const npConfigured = !!(process.env.NOWPAYMENTS_API_KEY && process.env.NOWPAYMENTS_EMAIL && process.env.NOWPAYMENTS_PASSWORD);
    const bitgetConfigured = !!(process.env.BITGET_API_KEY && process.env.BITGET_SECRET_KEY);
    const bitgetHasPassphrase = !!process.env.BITGET_PASSPHRASE;

    return apiSuccess({
      nowpayments: {
        envVars: envKeys,
        configured: npConfigured,
        missingKeys: [
          !process.env.NOWPAYMENTS_API_KEY && 'NOWPAYMENTS_API_KEY',
          !process.env.NOWPAYMENTS_EMAIL && 'NOWPAYMENTS_EMAIL',
          !process.env.NOWPAYMENTS_PASSWORD && 'NOWPAYMENTS_PASSWORD',
        ].filter(Boolean),
      },
      bitget: {
        envVars: bitgetKeys,
        configured: bitgetConfigured,
        hasPassphrase: bitgetHasPassphrase,
        missingKeys: [
          !process.env.BITGET_API_KEY && 'BITGET_API_KEY',
          !process.env.BITGET_SECRET_KEY && 'BITGET_SECRET_KEY',
          !process.env.BITGET_PASSPHRASE && 'BITGET_PASSPHRASE (required for V2 API)',
        ].filter(Boolean),
      },
      environment: process.env.NODE_ENV || 'unknown',
      vercelEnv: process.env.VERCEL ? 'yes' : 'no',
    });
  } catch (error) {
    return handleApiError(error);
  }
}
