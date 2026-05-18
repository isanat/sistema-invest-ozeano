// ============================================================================
// NOWPAYMENTS API SERVICE
// ============================================================================

import crypto from 'crypto';
import { authenticator } from 'otplib';

// ============================================================================
// CONFIGURATION
// ============================================================================

const BASE_URL = process.env.NOWPAYMENTS_BASE_URL || 'https://api.nowpayments.io/v1';
const API_KEY = process.env.NOWPAYMENTS_API_KEY || '';
const IPN_SECRET = process.env.NOWPAYMENTS_IPN_SECRET || '';
const AUTH_EMAIL = process.env.NOWPAYMENTS_EMAIL || '';
const AUTH_PASSWORD = process.env.NOWPAYMENTS_PASSWORD || '';
const TWO_FA_SECRET = process.env.NOWPAYMENTS_2FA_SECRET || '';

// ============================================================================
// JWT TOKEN MANAGEMENT (5-minute expiry, auto-refresh)
// ============================================================================

let jwtToken: string | null = null;
let jwtExpiry: number = 0;

export async function getJwtToken(): Promise<string> {
  // If token is still valid (with 30s buffer), return it
  if (jwtToken && Date.now() < jwtExpiry - 30000) {
    return jwtToken;
  }

  // Authenticate with email/password
  const res = await fetch(`${BASE_URL}/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: AUTH_EMAIL, password: AUTH_PASSWORD }),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`NowPayments auth failed: ${error}`);
  }

  const data = await res.json();
  jwtToken = data.token;
  jwtExpiry = Date.now() + 5 * 60 * 1000; // 5 minutes
  return jwtToken!;
}

export function clearJwtToken(): void {
  jwtToken = null;
  jwtExpiry = 0;
}

// ============================================================================
// API HELPER
// ============================================================================

async function apiRequest(
  endpoint: string,
  options: {
    method?: string;
    body?: unknown;
    requireJwt?: boolean;
  } = {}
): Promise<unknown> {
  const { method = 'GET', body, requireJwt = false } = options;

  const headers: Record<string, string> = {
    'x-api-key': API_KEY,
    'Content-Type': 'application/json',
  };

  if (requireJwt) {
    headers['Authorization'] = `Bearer ${await getJwtToken()}`;
  }

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`NowPayments API error (${res.status}): ${error}`);
  }

  return res.json();
}

// ============================================================================
// PAYMENT API - Create payments with deposit addresses
// ============================================================================

export interface CreatePaymentParams {
  price_amount: number;
  price_currency: string;
  pay_currency: string;
  order_id: string;
  order_description?: string;
  ipn_callback_url?: string;
}

export interface PaymentResponse {
  payment_id: string;
  payment_status: string;
  pay_address: string;
  price_amount: number;
  price_currency: string;
  pay_amount: number;
  pay_currency: string;
  order_id: string;
  order_description?: string;
  purchase_id?: string;
  outcome_amount?: number;
  outcome_currency?: string;
  expiration_estimate_date?: string;
  updated_at: string;
  created_at: string;
}

export async function createPayment(params: CreatePaymentParams): Promise<PaymentResponse> {
  return apiRequest('/payment', {
    method: 'POST',
    body: params,
  }) as Promise<PaymentResponse>;
}

export async function getPaymentStatus(paymentId: string): Promise<PaymentResponse> {
  return apiRequest(`/payment/${paymentId}`) as Promise<PaymentResponse>;
}

export async function getMinimumPaymentAmount(currencyFrom: string, currencyTo: string): Promise<{ min_amount: number }> {
  return apiRequest(`/min-amount?currency_from=${currencyFrom}&currency_to=${currencyTo}`) as Promise<{ min_amount: number }>;
}

export async function getEstimatedPrice(amount: number, currencyFrom: string, currencyTo: string): Promise<{ estimated_amount: number }> {
  return apiRequest(`/estimate?amount=${amount}&currency_from=${currencyFrom}&currency_to=${currencyTo}`) as Promise<{ estimated_amount: number }>;
}

// ============================================================================
// INVOICE API - Hosted payment pages
// ============================================================================

export interface CreateInvoiceParams {
  price_amount: number;
  price_currency: string;
  order_id: string;
  order_description?: string;
  success_url?: string;
  cancel_url?: string;
  ipn_callback_url?: string;
}

export interface InvoiceResponse {
  id: string;
  invoice_url: string;
  price_amount: number;
  price_currency: string;
  status: string;
  order_id: string;
  order_description?: string;
  success_url?: string;
  cancel_url?: string;
  ipn_callback_url?: string;
  created_at: string;
  updated_at: string;
}

export async function createInvoice(params: CreateInvoiceParams): Promise<InvoiceResponse> {
  return apiRequest('/invoice', {
    method: 'POST',
    body: params,
  }) as Promise<InvoiceResponse>;
}

export async function createInvoicePayment(invoiceId: string, payCurrency: string): Promise<PaymentResponse> {
  return apiRequest('/invoice-payment', {
    method: 'POST',
    body: { iid: invoiceId, pay_currency: payCurrency },
  }) as Promise<PaymentResponse>;
}

// ============================================================================
// SUB-PARTNER / CUSTODY API - Per-user deposit accounts
// ============================================================================
// NOTE: NowPayments Sub-Partner API uses these parameter names:
//   - Create: { name: string } → returns { result: { id, name, created_at } }
//   - Deposit: { sub_partner_id: string, currency: string } (requires Payment API key)
//   - Write-off: { sub_partner_id: string, currency: string, amount: number }
//   - Transfer: { from_id: string, sub_partner_id: string, currency: string, amount: number }
//   - Balance: GET /sub-partner/balance/{id} (requires Payment API key)
// ============================================================================

export interface SubPartnerAccount {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface CreateSubPartnerResult {
  result: SubPartnerAccount;
}

/**
 * Create a sub-partner account in NowPayments.
 * Uses `name` parameter (not `user_id`).
 * Returns the sub-partner account with ID.
 */
export async function createSubPartnerAccount(name: string): Promise<CreateSubPartnerResult> {
  return apiRequest('/sub-partner/balance', {
    method: 'POST',
    body: { name },
    requireJwt: true,
  }) as Promise<CreateSubPartnerResult>;
}

export async function getSubPartnerBalance(subPartnerId: string): Promise<unknown> {
  return apiRequest(`/sub-partner/balance/${subPartnerId}`, { requireJwt: true });
}

export async function listSubPartners(): Promise<{ result: SubPartnerAccount[]; count: number }> {
  return apiRequest('/sub-partner', { requireJwt: true }) as Promise<{ result: SubPartnerAccount[]; count: number }>;
}

export interface SubPartnerDepositParams {
  sub_partner_id: string;
  currency: string;
}

export interface SubPartnerDepositResponse {
  result: {
    address: string;
    currency: string;
  };
}

/**
 * Generate a deposit address for a sub-partner.
 * NOTE: This requires the API key to have "Payment" permissions.
 * If using a Custody-only API key, this will fail with INVALID_API_KEY.
 * Falls back to using the standard payment flow in that case.
 */
export async function createSubPartnerDeposit(params: SubPartnerDepositParams): Promise<SubPartnerDepositResponse> {
  return apiRequest('/sub-partner/deposit', {
    method: 'POST',
    body: params,
    requireJwt: true,
  }) as Promise<SubPartnerDepositResponse>;
}

export interface SubPartnerPaymentParams {
  sub_partner_id: string;
  price_amount: number;
  price_currency: string;
  pay_currency: string;
  ipn_callback_url?: string;
}

export async function createSubPartnerPayment(params: SubPartnerPaymentParams): Promise<unknown> {
  return apiRequest('/sub-partner/payment', {
    method: 'POST',
    body: params,
    requireJwt: true,
  });
}

export interface SubPartnerTransferParams {
  sub_partner_id: string;
  currency: string;
  amount: number;
  from_id?: string;
}

export async function transferToSubPartner(params: SubPartnerTransferParams): Promise<unknown> {
  return apiRequest('/sub-partner/transfer', {
    method: 'POST',
    body: params,
    requireJwt: true,
  });
}

export async function writeOffFromSubPartner(params: SubPartnerTransferParams): Promise<unknown> {
  return apiRequest('/sub-partner/write-off', {
    method: 'POST',
    body: params,
    requireJwt: true,
  });
}

// ============================================================================
// PAYOUT API - Send crypto to external wallets
// ============================================================================

export interface PayoutWithdrawal {
  address: string;
  currency: string;
  amount: number;
  ipn_callback_url?: string;
  payout_description?: string;
}

export interface CreatePayoutResponse {
  id: string;
  withdrawals: Array<{
    id: string;
    amount: number;
    currency: string;
    address: string;
    status: string;
    batch_withdrawal_id: string;
  }>;
  payout_description?: string;
}

export async function createPayout(withdrawals: PayoutWithdrawal[], description?: string): Promise<CreatePayoutResponse> {
  const body: Record<string, unknown> = { withdrawals };
  if (description) body.payout_description = description;

  const result = await apiRequest('/payout', {
    method: 'POST',
    body,
    requireJwt: true,
  }) as CreatePayoutResponse;

  // Auto-verify payout with 2FA if secret is configured
  if (TWO_FA_SECRET && result.withdrawals?.length > 0) {
    try {
      const verificationCode = generate2FACode();
      if (verificationCode) {
        const batchWithdrawalId = result.withdrawals[0].batch_withdrawal_id;
        if (batchWithdrawalId) {
          console.log('[NowPayments] Auto-verifying payout with 2FA...');
          await verifyPayout(batchWithdrawalId, verificationCode);
          console.log('[NowPayments] Payout verified successfully');
        }
      }
    } catch (err) {
      console.error('[NowPayments] Failed to auto-verify payout:', err);
      // Don't throw - payout was created, just verification failed
    }
  }

  return result;
}

export async function verifyPayout(batchWithdrawalId: string, verificationCode: string): Promise<unknown> {
  return apiRequest('/payout/verify', {
    method: 'POST',
    body: {
      batch_withdrawal_id: batchWithdrawalId,
      verification_code: verificationCode,
    },
    requireJwt: true,
  });
}

export async function getPayoutStatus(payoutId: string): Promise<unknown> {
  return apiRequest(`/payout/${payoutId}`, { requireJwt: true });
}

export async function validatePayoutAddress(address: string, currency: string, extraId?: string): Promise<unknown> {
  return apiRequest('/payout/address/validate', {
    method: 'POST',
    body: { address, currency, extra_id: extraId || '' },
  });
}

export async function getMinimumPayoutAmount(currency: string): Promise<{ min_amount: number }> {
  return apiRequest(`/payout/min-amount/${currency}`) as Promise<{ min_amount: number }>;
}

export async function calculatePayoutFee(currency: string, amount: number): Promise<{ fee: number }> {
  return apiRequest(`/payout/fee?currency=${currency}&amount=${amount}`) as Promise<{ fee: number }>;
}

// ============================================================================
// BALANCE API
// ============================================================================

export async function getBalance(): Promise<Record<string, number>> {
  return apiRequest('/balance', { requireJwt: true }) as Promise<Record<string, number>>;
}

// ============================================================================
// CURRENCY API
// ============================================================================

export async function getAvailableCurrencies(): Promise<{ currencies: string[] }> {
  return apiRequest('/currencies') as Promise<{ currencies: string[] }>;
}

export async function getFullCurrencies(): Promise<unknown> {
  return apiRequest('/full-currencies');
}

export async function getMerchantCoins(): Promise<unknown> {
  return apiRequest('/merchant/coins');
}

// ============================================================================
// WEBHOOK SIGNATURE VERIFICATION
// ============================================================================

function sortObject(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.keys(obj).sort().reduce((result: Record<string, unknown>, key: string) => {
    const value = obj[key];
    result[key] = (value && typeof value === 'object' && !Array.isArray(value))
      ? sortObject(value as Record<string, unknown>)
      : value;
    return result;
  }, {});
}

export function verifyWebhookSignature(body: Record<string, unknown>, signature: string): boolean {
  if (!IPN_SECRET) {
    console.warn('[NowPayments] IPN_SECRET not configured, skipping webhook verification');
    return true; // Allow in development
  }

  try {
    const sortedBody = sortObject(body);
    const hmac = crypto.createHmac('sha512', IPN_SECRET);
    hmac.update(JSON.stringify(sortedBody));
    const computed = hmac.digest('hex');

    // Constant-time comparison to prevent timing attacks
    if (computed.length !== signature.length) return false;
    return crypto.timingSafeEqual(
      Buffer.from(computed, 'hex'),
      Buffer.from(signature, 'hex')
    );
  } catch (error) {
    console.error('[NowPayments] Webhook signature verification failed:', error);
    return false;
  }
}

// ============================================================================
// PAYMENT STATUS HELPERS
// ============================================================================

export type PaymentStatus =
  | 'waiting'
  | 'confirming'
  | 'confirmed'
  | 'sending'
  | 'partially_paid'
  | 'finished'
  | 'failed'
  | 'refunded'
  | 'expired';

export type PayoutStatus =
  | 'CREATED'
  | 'WAITING'
  | 'PROCESSING'
  | 'SENDING'
  | 'FINISHED'
  | 'FAILED'
  | 'REJECTED';

export function isPaymentFinal(status: string): boolean {
  return ['finished', 'failed', 'refunded', 'expired'].includes(status);
}

export function isPaymentSuccessful(status: string): boolean {
  return ['finished', 'confirmed', 'sending'].includes(status);
}

export function isPayoutFinal(status: string): boolean {
  return ['FINISHED', 'FAILED', 'REJECTED'].includes(status);
}

// ============================================================================
// CURRENCY MAPPING - Map our internal currency codes to NowPayments codes
// ============================================================================

export const CURRENCY_MAP: Record<string, string> = {
  usdt_trc20: 'usdttrc20',
  usdt_polygon: 'usdtmatic',
  usdt_bsc: 'usdtbsc',
  usdt_erc20: 'usdterc20',
  btc: 'btc',
  eth: 'eth',
  trx: 'trx',
  usdc_polygon: 'usdcmatic',
  ltc: 'ltc',
  doge: 'doge',
};

export function toNowPaymentsCurrency(internalCurrency: string): string {
  return CURRENCY_MAP[internalCurrency] || internalCurrency;
}

export function fromNowPaymentsCurrency(npCurrency: string): string {
  const reverse = Object.fromEntries(
    Object.entries(CURRENCY_MAP).map(([k, v]) => [v, k])
  );
  return reverse[npCurrency] || npCurrency;
}

// ============================================================================
// 2FA / TOTP SUPPORT
// ============================================================================

/**
 * Generate a TOTP verification code from the configured 2FA secret.
 * Used for NowPayments payout verification.
 */
export function generate2FACode(): string | null {
  if (!TWO_FA_SECRET) {
    console.warn('[NowPayments] 2FA secret not configured, cannot generate verification code');
    return null;
  }
  try {
    authenticator.options = { step: 30 };
    return authenticator.generate(TWO_FA_SECRET);
  } catch (err) {
    console.error('[NowPayments] Failed to generate 2FA code:', err);
    return null;
  }
}

/**
 * Verify a TOTP code against the configured 2FA secret.
 * Useful for admin UI to test 2FA configuration.
 */
export function validate2FACode(code: string): boolean {
  if (!TWO_FA_SECRET) return false;
  try {
    authenticator.options = { step: 30 };
    return authenticator.verify({ token: code, secret: TWO_FA_SECRET });
  } catch {
    return false;
  }
}

// ============================================================================
// CONFIGURATION CHECK
// ============================================================================

export function isNowPaymentsConfigured(): boolean {
  return !!(API_KEY && AUTH_EMAIL && AUTH_PASSWORD);
}

export function getNowPaymentsConfig(): {
  configured: boolean;
  hasApiKey: boolean;
  hasEmail: boolean;
  hasPassword: boolean;
  hasIpnSecret: boolean;
  has2FA: boolean;
  baseUrl: string;
} {
  return {
    configured: isNowPaymentsConfigured(),
    hasApiKey: !!API_KEY,
    hasEmail: !!AUTH_EMAIL,
    hasPassword: !!AUTH_PASSWORD,
    hasIpnSecret: !!IPN_SECRET,
    has2FA: !!TWO_FA_SECRET,
    baseUrl: BASE_URL,
  };
}

/**
 * Test the NowPayments API connection by attempting to authenticate.
 * Returns connection status and any error messages.
 */
export async function testConnection(): Promise<{
  connected: boolean;
  authWorks: boolean;
  apiKeyWorks: boolean;
  subPartnerWorks: boolean;
  error?: string;
}> {
  const result = {
    connected: false,
    authWorks: false,
    apiKeyWorks: false,
    subPartnerWorks: false,
    error: undefined as string | undefined,
  };

  // Test auth
  try {
    const token = await getJwtToken();
    result.authWorks = !!token;
    result.connected = result.authWorks;
  } catch (err) {
    result.error = err instanceof Error ? err.message : 'Auth failed';
    return result;
  }

  // Test sub-partner list (this works with custody-only API keys)
  try {
    await listSubPartners();
    result.subPartnerWorks = true;
    result.apiKeyWorks = true;
  } catch (err) {
    const msg = err instanceof Error ? err.message : '';
    if (msg.includes('INVALID_API_KEY')) {
      result.apiKeyWorks = false;
      result.error = 'API key lacks required permissions. Please generate a full API key from NowPayments dashboard.';
    } else {
      result.error = msg;
    }
  }

  return result;
}
