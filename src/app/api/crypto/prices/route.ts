import { NextResponse } from 'next/server';
import { getCryptoPrices } from '@/lib/market-data';
import { apiSuccess, handleApiError } from '@/lib/api-utils';

export async function GET() {
  try {
    const prices = await getCryptoPrices();

    // Map to our coin format
    const cryptoPrices = {
      BTC: {
        usd: prices.bitcoin?.usd ?? 95000,
        brl: prices.bitcoin?.brl ?? 540000,
        change24h: prices.bitcoin?.usd_24h_change ?? 0,
      },
      KAS: {
        usd: prices.kaspa?.usd ?? 0.12,
        brl: prices.kaspa?.brl ?? 0.68,
        change24h: prices.kaspa?.usd_24h_change ?? 0,
      },
      LTC: {
        usd: prices.litecoin?.usd ?? 95,
        brl: prices.litecoin?.brl ?? 540,
        change24h: prices.litecoin?.usd_24h_change ?? 0,
      },
      DOGE: {
        usd: prices.dogecoin?.usd ?? 0.18,
        brl: prices.dogecoin?.brl ?? 1.02,
        change24h: prices.dogecoin?.usd_24h_change ?? 0,
      },
      USDT: {
        usd: 1,
        brl: prices.tether?.brl ?? 5.70,
        change24h: 0,
      },
    };

    return apiSuccess({
      prices: cryptoPrices,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
