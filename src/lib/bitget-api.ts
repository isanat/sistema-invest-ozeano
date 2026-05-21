// ============================================================================
// BITGET V2 API CLIENT - Authenticated Copy Trading API
// ============================================================================
// Uses HMAC-SHA256 signature authentication
// Endpoint: /api/v2/copy/mix-broker/query-traders
// ============================================================================

import crypto from 'crypto';

// ============================================================================
// TYPES
// ============================================================================

export interface BitgetV2Trader {
  canTrace?: string;
  traderId: string;
  traderName: string;
  maxLimit?: string;
  followCount?: string;
  totalFollowers?: string;
  totalEquity?: string;
  currentTradingList?: string[];
  columnList?: Array<{
    describe: string;
    value: string;
  }>;
  profitCount?: string;
  lossCount?: string;
  tradeCount?: string;
  traderPic?: string;
  maxCallbackRate?: string;
  averageWinRate?: string;
  dailyProfitRateList?: Array<{ rate: string; cTime: string }>;
  dailyProfitList?: Array<{ amount: string; cTime: string }>;
  followerTotalProfit?: string;
  profitRate24hList?: Array<{ rate: string; cTime: string }>;
  profit24hList?: Array<{ amount: string; cTime: string }>;
  lastTradeTime?: string;
  tradeDays?: string;
}

export interface BitgetV2Response {
  code: string;
  msg: string;
  requestTime?: number;
  data: BitgetV2Trader[];
}

export interface TransformedTrader {
  traderId: string;
  displayName: string;
  avatar: string;
  roi: string;
  totalPnl: string;
  maxDrawdown: string;
  followers: number;
  aum: string;
  grade: {
    id: string;
    name: string;
  };
  labels: Array<{
    id: string;
    name: string;
    type: string;
  }>;
  topSymbols: string[];
  klineProfit: string;
  rank: number;
  // V2 enriched fields
  winRate?: string;
  tradeDays?: string;
  tradeCount?: string;
  profitCount?: string;
  lossCount?: string;
  lastTradeTime?: string;
  dailyProfitRateList?: Array<{ rate: string; cTime: string }>;
  canTrace?: string;
  totalEquity?: string;
  isDemo?: boolean;
  isCached?: boolean;
  source?: string;
}

export type SortRule = 'Composite' | 'ROI' | 'totalPL' | 'AUM';
export type SortFlag = 'Asc' | 'Desc';

export interface BitgetV2QueryParams {
  traderId?: string;
  traderName?: string;
  fullStatus?: 'Full' | 'All';
  sortRule?: SortRule;
  sortFlag?: SortFlag;
  language?: 'en-US' | 'zh-CN' | 'pt-BR';
  pageSize?: number;
  pageNo?: number;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const BITGET_API_BASE = 'https://api.bitget.com';

function getApiKey(): string {
  return process.env.BITGET_API_KEY || '';
}

function getSecretKey(): string {
  return process.env.BITGET_SECRET_KEY || '';
}

function getPassphrase(): string {
  return process.env.BITGET_PASSPHRASE || '';
}

export function isBitgetConfigured(): boolean {
  return !!(getApiKey() && getSecretKey());
}

// ============================================================================
// HMAC-SHA256 SIGNATURE
// ============================================================================

function generateSignature(
  timestamp: string,
  method: string,
  requestPath: string,
  queryString: string = '',
  body: string = ''
): string {
  // Build pre-hash string: timestamp + METHOD + requestPath + ?queryString + body
  const preHash =
    timestamp +
    method.toUpperCase() +
    requestPath +
    (queryString ? '?' + queryString : '') +
    body;

  const signature = crypto
    .createHmac('sha256', getSecretKey())
    .update(preHash)
    .digest('base64');

  return signature;
}

// ============================================================================
// AUTHENTICATED REQUEST
// ============================================================================

async function bitgetRequest<T>(
  method: 'GET' | 'POST',
  requestPath: string,
  params?: Record<string, string | number | undefined>,
  body?: object
): Promise<T> {
  const apiKey = getApiKey();
  const passphrase = getPassphrase();

  if (!apiKey) {
    throw new Error('BITGET_API_KEY não configurada');
  }

  const timestamp = Date.now().toString();

  // Sort params alphabetically by key (required by Bitget)
  const sortedParams: Record<string, string> = {};
  if (params) {
    Object.keys(params)
      .sort()
      .forEach((key) => {
        const val = params[key];
        if (val !== undefined && val !== '') {
          sortedParams[key] = String(val);
        }
      });
  }

  // Build query string
  const queryString = Object.entries(sortedParams)
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join('&');

  const bodyStr = body ? JSON.stringify(body) : '';

  // Generate signature
  const sign = generateSignature(timestamp, method, requestPath, queryString, method === 'POST' ? bodyStr : '');

  // Build URL
  const url = `${BITGET_API_BASE}${requestPath}${queryString ? '?' + queryString : ''}`;

  const headers: Record<string, string> = {
    'ACCESS-KEY': apiKey,
    'ACCESS-SIGN': sign,
    'ACCESS-TIMESTAMP': timestamp,
    'ACCESS-PASSPHRASE': passphrase,
    'Content-Type': 'application/json',
    'locale': 'en-US',
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers,
      body: method === 'POST' ? bodyStr : undefined,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Bitget API HTTP ${response.status}: ${text || response.statusText}`);
  }

  const data = await response.json();

  if (data.code !== '00000') {
    throw new Error(`Bitget API error [${data.code}]: ${data.msg || 'Unknown error'}`);
  }

  return data as T;
}

// ============================================================================
// V2 ENDPOINT: QUERY TRADERS (Broker - discover copy traders)
// ============================================================================

export async function fetchV2BrokerTraders(
  params: BitgetV2QueryParams = {}
): Promise<TransformedTrader[]> {
  const {
    sortRule = 'ROI',
    sortFlag = 'Desc',
    language = 'en-US',
    pageSize = 20,
    pageNo = 1,
    fullStatus = 'All',
    traderName,
    traderId,
  } = params;

  const queryParams: Record<string, string | number | undefined> = {
    fullStatus,
    language,
    pageNo,
    pageSize: Math.min(pageSize, 20), // API max is 20
    sortFlag,
    sortRule,
  };

  if (traderName) queryParams.traderName = traderName;
  if (traderId) queryParams.traderId = traderId;

  const response = await bitgetRequest<BitgetV2Response>(
    'GET',
    '/api/v2/copy/mix-broker/query-traders',
    queryParams
  );

  const traders = response.data || [];

  return traders.map((trader, index) => transformV2Trader(trader, (pageNo - 1) * pageSize + index + 1));
}

// ============================================================================
// V2 ENDPOINT: SEARCH TRADERS (same endpoint with traderName filter)
// ============================================================================

export async function searchV2Traders(
  searchKey: string,
  pageNo: number = 1,
  pageSize: number = 20
): Promise<TransformedTrader[]> {
  return fetchV2BrokerTraders({
    traderName: searchKey,
    pageNo,
    pageSize,
    sortRule: 'Composite',
    sortFlag: 'Desc',
  });
}

// ============================================================================
// V1 PUBLIC FALLBACK (existing endpoint - no auth required)
// ============================================================================

interface BitgetV1TraderRow {
  traderId?: string;
  displayName?: string;
  nickName?: string;
  headPic?: string;
  header?: string;
  roi?: string;
  totalPnl?: string;
  maxRetracement?: string;
  followCount?: number;
  aum?: string;
  traderGrade?: { gradeId?: number | string; gradeName?: string };
  labelVos?: Array<{ labelId?: number | string; labelName?: string; labelType?: string }>;
  topSymbols?: string[];
  klineProfit?: string;
  rankingNo?: number;
  userName?: string;
}

export async function fetchV1PublicTraders(
  rankingCode: string,
  pageNo: number,
  pageSize: number
): Promise<TransformedTrader[]> {
  const url = 'https://www.bitget.com/v1/trigger/trace/public/traderRankingList';

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        Origin: 'https://www.bitget.com',
        Referer: 'https://www.bitget.com/copy-trading/futures',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      body: JSON.stringify({ rankingCode, pageNo, pageSize }),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    throw new Error(`Bitget V1 API returned ${response.status}`);
  }

  const data = await response.json();
  if (data.code !== '00000') {
    throw new Error(`Bitget V1 API error: ${data.msg || data.code}`);
  }

  const traders: BitgetV1TraderRow[] = data.data?.traderRankingList || data.data?.rows || [];
  const offset = (pageNo - 1) * pageSize;

  return traders.map((trader, index) => ({
    traderId: trader.traderId || trader.userName || '',
    displayName: trader.displayName || trader.nickName || 'Unknown Trader',
    avatar: trader.headPic || trader.header || '',
    roi: trader.roi || '0',
    totalPnl: trader.totalPnl || '0',
    maxDrawdown: trader.maxRetracement || '0',
    followers: trader.followCount || 0,
    aum: trader.aum || '0',
    grade: {
      id: String(trader.traderGrade?.gradeId || ''),
      name: trader.traderGrade?.gradeName || '',
    },
    labels: (trader.labelVos || []).map((label) => ({
      id: String(label.labelId || ''),
      name: label.labelName || '',
      type: label.labelType || '',
    })),
    topSymbols: trader.topSymbols || [],
    klineProfit: trader.klineProfit || '',
    rank: trader.rankingNo || (offset + index + 1),
    source: 'bitget_v1',
  }));
}

// ============================================================================
// TRANSFORM V2 TRADER DATA
// ============================================================================

function transformV2Trader(trader: BitgetV2Trader, rank: number): TransformedTrader {
  // Extract metrics from columnList
  const columnMap: Record<string, string> = {};
  if (trader.columnList && Array.isArray(trader.columnList)) {
    for (const col of trader.columnList) {
      if (col.describe && col.value !== undefined) {
        columnMap[col.describe.toLowerCase()] = col.value;
      }
    }
  }

  // Map column names to values
  const roi = columnMap['roi'] || columnMap['return on investment'] || '0';
  const totalPnl = columnMap['total pnl'] || columnMap['total profit and loss'] || '0';
  const aum = columnMap['aum'] || columnMap['assets under management'] || '0';
  const maxDrawdown = columnMap['max drawdown'] || trader.maxCallbackRate || '0';
  const winRate = columnMap['last 3w win rate'] || trader.averageWinRate || '0';
  const followerPnl = columnMap['total followers pnl'] || trader.followerTotalProfit || '0';

  return {
    traderId: trader.traderId || '',
    displayName: trader.traderName || 'Unknown Trader',
    avatar: trader.traderPic || '',
    roi,
    totalPnl,
    maxDrawdown,
    followers: parseInt(trader.totalFollowers || trader.followCount || '0', 10),
    aum,
    grade: {
      id: '',
      name: '',
    },
    labels: [],
    topSymbols: trader.currentTradingList || [],
    klineProfit: '',
    rank,
    // V2 enriched fields
    winRate,
    tradeDays: trader.tradeDays,
    tradeCount: trader.tradeCount,
    profitCount: trader.profitCount,
    lossCount: trader.lossCount,
    lastTradeTime: trader.lastTradeTime,
    dailyProfitRateList: trader.dailyProfitRateList,
    canTrace: trader.canTrace,
    totalEquity: trader.totalEquity,
    source: 'bitget_v2',
  };
}

// ============================================================================
// DEMO DATA (last resort fallback)
// ============================================================================

interface DemoTraderSeed {
  traderId: string;
  displayName: string;
  roiPct: number;
  pnlUsd: number;
  aumUsd: number;
  drawdownPct: number;
  followers: number;
  grade: string;
  labelNames: string[];
  topSymbols: string[];
  winRatePct: number;
  tradeDays: number;
}

const DEMO_TRADER_SEEDS: DemoTraderSeed[] = [
  { traderId: 'demo-001', displayName: 'Alexei Volkov', roiPct: 582, pnlUsd: 178500, aumUsd: 780000, drawdownPct: 28, followers: 4850, grade: 'Diamond', labelNames: ['Futures', 'Trend Following'], topSymbols: ['BTC', 'ETH', 'SOL'], winRatePct: 78, tradeDays: 365 },
  { traderId: 'demo-002', displayName: 'Sakura Tanaka', roiPct: 412, pnlUsd: 132000, aumUsd: 520000, drawdownPct: 22, followers: 3200, grade: 'Diamond', labelNames: ['Swing', 'Long-Short'], topSymbols: ['BTC', 'BNB', 'AVAX'], winRatePct: 74, tradeDays: 280 },
  { traderId: 'demo-003', displayName: 'Marco De Luca', roiPct: 345, pnlUsd: 97500, aumUsd: 410000, drawdownPct: 35, followers: 2100, grade: 'Platinum', labelNames: ['Futures', 'Scalping'], topSymbols: ['ETH', 'SOL', 'DOGE'], winRatePct: 68, tradeDays: 220 },
  { traderId: 'demo-004', displayName: 'Priya Sharma', roiPct: 298, pnlUsd: 86000, aumUsd: 350000, drawdownPct: 18, followers: 1950, grade: 'Platinum', labelNames: ['DeFi', 'Trend Following'], topSymbols: ['ETH', 'BNB', 'AVAX'], winRatePct: 82, tradeDays: 190 },
  { traderId: 'demo-005', displayName: 'Chen Wei Ming', roiPct: 245, pnlUsd: 72000, aumUsd: 290000, drawdownPct: 31, followers: 1680, grade: 'Platinum', labelNames: ['High Frequency', 'Arbitrage'], topSymbols: ['BTC', 'ETH', 'XRP'], winRatePct: 65, tradeDays: 310 },
  { traderId: 'demo-006', displayName: 'Olga Petrova', roiPct: 198, pnlUsd: 58000, aumUsd: 210000, drawdownPct: 25, followers: 1420, grade: 'Gold', labelNames: ['Swing', 'Futures'], topSymbols: ['SOL', 'BNB', 'DOGE'], winRatePct: 71, tradeDays: 150 },
];

export function generateDemoTraders(): TransformedTrader[] {
  return DEMO_TRADER_SEEDS.map((seed, index) => ({
    traderId: seed.traderId,
    displayName: seed.displayName,
    avatar: '',
    roi: seed.roiPct.toString(),
    totalPnl: seed.pnlUsd.toString(),
    maxDrawdown: seed.drawdownPct.toString(),
    followers: seed.followers,
    aum: seed.aumUsd.toString(),
    grade: { id: `grade_${seed.grade.toLowerCase()}`, name: seed.grade },
    labels: seed.labelNames.map((name) => ({
      id: `label_${name.toLowerCase().replace(/\s+/g, '_')}`,
      name,
      type: 'strategy',
    })),
    topSymbols: seed.topSymbols,
    klineProfit: '',
    rank: index + 1,
    winRate: seed.winRatePct.toString(),
    tradeDays: seed.tradeDays.toString(),
    isDemo: true,
    source: 'demo_fallback',
  }));
}
