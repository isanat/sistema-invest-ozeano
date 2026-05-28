import { NextResponse } from 'next/server';
import { isBitgetConfigured, fetchV2BrokerTraders } from '@/lib/bitget-api';

export async function GET() {
  const apiKey = process.env.BITGET_API_KEY || '';
  const secretKey = process.env.BITGET_SECRET_KEY || '';
  const passphrase = process.env.BITGET_PASSPHRASE || '';

  let v2TestResult = 'not_tested';
  let v2Error = '';

  if (isBitgetConfigured()) {
    try {
      const traders = await fetchV2BrokerTraders({ pageSize: 1, pageNo: 1 });
      v2TestResult = `success: ${traders.length} traders`;
    } catch (err) {
      v2TestResult = 'failed';
      v2Error = err instanceof Error ? err.message : String(err);
    }
  } else {
    v2TestResult = 'not_configured';
  }

  return NextResponse.json({
    configured: isBitgetConfigured(),
    apiKeyPresent: !!apiKey,
    apiKeyPrefix: apiKey ? apiKey.substring(0, 8) + '...' : 'NOT SET',
    secretKeyPresent: !!secretKey,
    secretKeyPrefix: secretKey ? secretKey.substring(0, 8) + '...' : 'NOT SET',
    passphrasePresent: !!passphrase,
    passphrasePrefix: passphrase ? passphrase.substring(0, 4) + '...' : 'NOT SET',
    v2TestResult,
    v2Error,
  });
}
