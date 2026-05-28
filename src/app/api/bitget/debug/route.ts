import { NextResponse } from 'next/server';
import { isBitgetConfigured } from '@/lib/bitget-api';

export async function GET() {
  const apiKey = process.env.BITGET_API_KEY || '';
  const secretKey = process.env.BITGET_SECRET_KEY || '';
  const passphrase = process.env.BITGET_PASSPHRASE || '';
  
  return NextResponse.json({
    configured: isBitgetConfigured(),
    apiKeyPresent: !!apiKey,
    apiKeyPrefix: apiKey ? apiKey.substring(0, 8) + '...' : 'NOT SET',
    secretKeyPresent: !!secretKey,
    secretKeyPrefix: secretKey ? secretKey.substring(0, 8) + '...' : 'NOT SET',
    passphrasePresent: !!passphrase,
    passphrasePrefix: passphrase ? passphrase.substring(0, 4) + '...' : 'NOT SET',
  });
}
