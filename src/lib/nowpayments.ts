// ============================================================================
// NOWPAYMENTS API SERVICE
// Credentials come ONLY from environment variables (Vercel env vars)
// Admin panel can only test connection and toggle settings
// ============================================================================

import crypto from 'crypto';
import { authenticator } from 'otplib';

// ============================================================================
// CONFIGURATION - reads from env vars ONLY (no database fallback)
// ============================================================================

interface NowPaymentsConfig {
  baseUrl: string;
  apiKey: string;
  ipnSecret: string;
  email: string;
  password: string;
  twoFaSecret: string;
}

let configCache: NowPaymentsConfig | null = null;
let configCacheExpiry: number = 0;
const CONFIG_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getConfig(): NowPaymentsConfig {
  // Return cached config if still valid
  if (configCache && Date.now() < configCacheExpiry) {
    return configCache;
  }

  // Read from environment variables ONLY
  const envConfig: NowPaymentsConfig = {
    baseUrl: process.env.NOWPAYMENTS_BASE_URL || 'https://api.nowpayments.io/v1',
    apiKey: process.env.NOWPAYMENTS_API_KEY || '',
    ipnSecret: process.env.NOWPAYMENTS_IPN_SECRET || '',
    email: process.env.NOWPAYMENTS_EMAIL || '',
    password: process.env.NOWPAYMENTS_PASSWORD || '',
    twoFaSecret: process.env.NOWPAYMENTS_2FA_SECRET || '',
  };

  configCache = envConfig;
  configCacheExpiry = Date.now() + CONFIG_CACHE_TTL;
  return envConfig;
}

export function clearConfigCache(): void {
  configCache = null;
  configCacheExpiry = 0;
  clearJwtToken();
}

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

  const config = getConfig();

  // Authenticate with email/password
  const res = await fetch(`${config.baseUrl}/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: config.email, password: config.password }),
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
  const config = getConfig();

  const headers: Record<string, string> = {
    'x-api-key': config.apiKey,
    'Content-Type': 'application/json',
  };

  if (requireJwt) {
    headers['Authorization'] = `Bearer ${await getJwtToken()}`;
  }

  const res = await fetch(`${config.baseUrl}${endpoint}`, {
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

export interface SubPartnerAccount {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface CreateSubPartnerResult {
  result: SubPartnerAccount;
}

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

  const config = getConfig();

  const result = await apiRequest('/payout', {
    method: 'POST',
    body,
    requireJwt: true,
  }) as CreatePayoutResponse;

  // Auto-verify payout with 2FA if secret is configured
  if (config.twoFaSecret && result.withdrawals?.length > 0) {
    try {
      const verificationCode = generate2FACode(config.twoFaSecret);
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

export async function verifyWebhookSignature(body: Record<string, unknown>, signature: string): Promise<boolean> {
  const config = getConfig();

  if (!config.ipnSecret) {
    if (process.env.NODE_ENV === 'production') {
      console.error('[NowPayments] CRITICAL: IPN_SECRET not configured in production - webhook REJECTED');
      return false;
    }
    console.warn('[NowPayments] IPN_SECRET not configured, skipping webhook verification (development only)');
    return true;
  }

  try {
    const sortedBody = sortObject(body);
    const hmac = crypto.createHmac('sha512', config.ipnSecret);
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
// Extended map covering all common NowPayments-supported currencies
// ============================================================================

export const CURRENCY_MAP: Record<string, string> = {
  // USDT variants (most common for deposits/withdrawals)
  usdt_trc20: 'usdttrc20',
  usdt_polygon: 'usdtmatic',
  usdt_bsc: 'usdtbsc',
  usdt_erc20: 'usdterc20',
  usdt_avax: 'usdtavax',
  usdt_sol: 'usdtsol',
  usdt_trc20_alias: 'usdttrx',
  // USDC variants
  usdc_trc20: 'usdctrx',
  usdc_polygon: 'usdcmatic',
  usdc_bsc: 'usdcbsc',
  usdc_erc20: 'usdcerc20',
  usdc_sol: 'usdcsol',
  usdc_avax: 'usdcavax',
  // Major coins
  btc: 'btc',
  eth: 'eth',
  trx: 'trx',
  ltc: 'ltc',
  doge: 'doge',
  bnb: 'bnbbsc',
  sol: 'sol',
  matic: 'matic',
  avax: 'avax',
  xrp: 'xrp',
  dai_polygon: 'daimatic',
  dai_erc20: 'daierc20',
  // Additional stablecoins
  busd_bsc: 'busdbsc',
  tusd_erc20: 'tusderc20',
};

// Reverse map for NowPayments → internal currency conversion
const REVERSE_CURRENCY_MAP: Record<string, string> = Object.fromEntries(
  Object.entries(CURRENCY_MAP).map(([k, v]) => [v, k])
);

// Human-readable labels for currencies (used in UI)
export const CURRENCY_LABELS: Record<string, string> = {
  usdttrc20: 'USDT TRC20',
  usdtmatic: 'USDT Polygon',
  usdtbsc: 'USDT BSC',
  usdterc20: 'USDT ERC20',
  usdtavax: 'USDT Avalanche',
  usdtsol: 'USDT Solana',
  usdttrx: 'USDT TRC20',
  usdctrx: 'USDC TRC20',
  usdcmatic: 'USDC Polygon',
  usdcbsc: 'USDC BSC',
  usdcerc20: 'USDC ERC20',
  usdcsol: 'USDC Solana',
  usdcavax: 'USDC Avalanche',
  btc: 'Bitcoin',
  eth: 'Ethereum',
  trx: 'TRON',
  ltc: 'Litecoin',
  doge: 'Dogecoin',
  bnbbsc: 'BNB',
  sol: 'Solana',
  matic: 'Polygon MATIC',
  avax: 'Avalanche',
  xrp: 'XRP',
  daimatic: 'DAI Polygon',
  daierc20: 'DAI ERC20',
  busdbsc: 'BUSD BSC',
  tusderc20: 'TUSD ERC20',
  // Internal codes also need labels
  usdt_trc20: 'USDT TRC20',
  usdt_polygon: 'USDT Polygon',
  usdt_bsc: 'USDT BSC',
  usdt_erc20: 'USDT ERC20',
  usdc_polygon: 'USDC Polygon',
  pix: 'PIX (BRL)',
};

export function toNowPaymentsCurrency(internalCurrency: string): string {
  return CURRENCY_MAP[internalCurrency] || internalCurrency;
}

export function fromNowPaymentsCurrency(npCurrency: string): string {
  return REVERSE_CURRENCY_MAP[npCurrency] || npCurrency;
}

/**
 * Get a human-readable label for any currency code (NowPayments or internal)
 */
export function getCurrencyLabel(code: string): string {
  return CURRENCY_LABELS[code] || code.toUpperCase().replace(/_/g, ' ');
}

// ============================================================================
// 2FA / TOTP SUPPORT
// ============================================================================

/**
 * Generate a TOTP verification code from the configured 2FA secret.
 * Used for NowPayments payout verification.
 */
export function generate2FACode(secret?: string): string | null {
  // Use provided secret or try to read from config
  const twoFaSecret = secret || process.env.NOWPAYMENTS_2FA_SECRET || '';
  if (!twoFaSecret) {
    console.warn('[NowPayments] 2FA secret not configured, cannot generate verification code');
    return null;
  }
  try {
    authenticator.options = { step: 30 };
    return authenticator.generate(twoFaSecret);
  } catch (err) {
    console.error('[NowPayments] Failed to generate 2FA code:', err);
    return null;
  }
}

/**
 * Verify a TOTP code against the configured 2FA secret.
 */
export function validate2FACode(code: string, secret?: string): boolean {
  const twoFaSecret = secret || process.env.NOWPAYMENTS_2FA_SECRET || '';
  if (!twoFaSecret) return false;
  try {
    authenticator.options = { step: 30 };
    return authenticator.verify({ token: code, secret: twoFaSecret });
  } catch {
    return false;
  }
}

// ============================================================================
// CONFIGURATION CHECK
// ============================================================================

export function isNowPaymentsConfigured(): boolean {
  const config = getConfig();
  return !!(config.apiKey && config.email && config.password);
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
  const config = getConfig();
  return {
    configured: !!(config.apiKey && config.email && config.password),
    hasApiKey: !!config.apiKey,
    hasEmail: !!config.email,
    hasPassword: !!config.password,
    hasIpnSecret: !!config.ipnSecret,
    has2FA: !!config.twoFaSecret,
    baseUrl: config.baseUrl,
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
