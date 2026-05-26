import type {
  User,
  InvestmentPlan,
  Investment,
  CopyTrader,
  TradingPool,
  TeamBonusInfo,
  AffiliateInfo,
  Withdrawal,
  AdminStats,
  SystemConfig,
  AffiliateLevel,
  AffiliateRank,
} from './store'

const API_BASE = '/api'

async function apiFetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  })
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Erro na requisição' }))
    throw new Error(error.error || `Erro ${res.status}`)
  }
  return res.json()
}

// Helper to convert string values to numbers
function toNum(val: string | number | undefined | null): number {
  if (val === undefined || val === null) return 0
  const n = typeof val === 'string' ? parseFloat(val) : val
  return isNaN(n) ? 0 : n
}

// Auth
export async function register(data: { name: string; email: string; password: string; referralCode?: string }) {
  const res = await apiFetch<{ user: Record<string, unknown>; token: string }>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(data),
  })
  return { user: mapUser(res.user), token: res.token }
}

export async function login(data: { email: string; password: string }) {
  const res = await apiFetch<{ user: Record<string, unknown>; token: string }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(data),
  })
  return { user: mapUser(res.user), token: res.token }
}

export async function getMe(): Promise<User> {
  const res = await apiFetch<Record<string, unknown>>('/auth/me')
  return mapUser(res)
}

export async function logout() {
  return apiFetch<void>('/auth/logout', { method: 'POST' })
}

function mapUser(data: Record<string, unknown>): User {
  const stats = data.stats as Record<string, unknown> | undefined
  return {
    id: String(data.id || ''),
    name: String(data.name || ''),
    email: String(data.email || ''),
    role: (data.role as 'user' | 'admin') || 'user',
    balance: toNum(data.balance),
    totalInvested: toNum(data.totalInvested),
    totalRoi: toNum(data.totalRoi),
    activeInvestments: toNum(stats?.activeInvestments ?? data.activeInvestments ?? 0),
    totalWithdrawals: toNum(data.totalWithdrawn ?? data.totalWithdrawals ?? 0),
    referralCode: String(data.referralCode || ''),
    teamBonusPct: toNum(data.teamBonusPct),
    referredBy: (data.referredById as string) || null,
    createdAt: String(data.createdAt || ''),
  }
}

// Investment Plans
export async function getInvestmentPlans(): Promise<InvestmentPlan[]> {
  const res = await apiFetch<{ plans: Record<string, unknown>[] }>('/investment-plans')
  return (res.plans || []).map(mapPlan)
}

function mapPlan(data: Record<string, unknown>): InvestmentPlan {
  return {
    id: String(data.id || ''),
    name: String(data.name || ''),
    minAmount: toNum(data.minAmount),
    maxAmount: data.maxAmount ? toNum(data.maxAmount) : null,
    dailyRoi: toNum(data.dailyRoi),
    duration: toNum(data.duration),
    isActive: Boolean(data.isActive),
    sortOrder: toNum(data.sortOrder),
  }
}

// Investments
export async function createInvestment(data: { planId: string; amount: number }) {
  const res = await apiFetch<{ investment: Record<string, unknown> }>('/investments', {
    method: 'POST',
    body: JSON.stringify(data),
  })
  return mapInvestment(res.investment)
}

export async function getInvestments(): Promise<Investment[]> {
  const res = await apiFetch<{ investments: Record<string, unknown>[] }>('/investments')
  return (res.investments || []).map(mapInvestment)
}

function mapInvestment(data: Record<string, unknown>): Investment {
  const plan = data.plan as Record<string, unknown> | undefined
  const stats = data.stats as Record<string, unknown> | undefined
  return {
    id: String(data.id || ''),
    planId: String(data.planId || plan?.id || ''),
    planName: String(plan?.name || ''),
    amount: toNum(data.amount),
    dailyRoi: toNum(data.dailyRoi),
    teamBonusPct: toNum(data.teamBonusPct),
    daysElapsed: toNum(data.daysElapsed),
    totalDays: toNum(plan?.duration ?? data.totalDays ?? 0),
    totalEarned: toNum(stats?.totalRoiEarned ?? data.totalRoi ?? 0),
    status: (data.isActive ? 'active' : 'completed') as 'active' | 'completed' | 'cancelled',
    createdAt: String(data.createdAt || data.startedAt || ''),
  }
}

// Copy Traders
export async function getCopyTraders(): Promise<CopyTrader[]> {
  const res = await apiFetch<{ traders: Record<string, unknown>[] }>('/copy-traders')
  return (res.traders || []).map(mapTrader)
}

function mapTrader(data: Record<string, unknown>): CopyTrader {
  return {
    id: String(data.id || ''),
    name: String(data.name || ''),
    avatar: (data.avatar as string) || null,
    specialty: String(data.specialty || ''),
    winRate: toNum(data.winRate),
    totalPnl: toNum(data.totalPnl),
    monthlyRoi: toNum(data.monthlyRoi),
    riskLevel: (data.riskLevel as 'low' | 'medium' | 'high') || 'medium',
    isActive: Boolean(data.isActive),
    isFeatured: Boolean(data.isFeatured),
  }
}

// Trading Pools
export async function getTradingPools(): Promise<TradingPool[]> {
  const res = await apiFetch<{ pools?: Record<string, unknown>[]; tradingPools?: Record<string, unknown>[] }>('/trading-pools')
  const list = res.pools || res.tradingPools || []
  return list.map(mapPool)
}

function mapPool(data: Record<string, unknown>): TradingPool {
  return {
    id: String(data.id || ''),
    name: String(data.name || ''),
    totalAum: toNum(data.totalAum),
    dailyVolume: toNum(data.dailyVolume),
    strategy: String(data.strategy || ''),
    status: (data.status === 'active' ? 'active' : 'inactive') as 'active' | 'inactive',
  }
}

// Team Bonus
export async function getTeamBonus(): Promise<TeamBonusInfo> {
  const res = await apiFetch<Record<string, unknown>>('/team-bonus')
  return {
    tier: (res.tier as TeamBonusInfo['tier']) || 'none',
    bonusPct: toNum(res.bonusPct),
    directReferrals: toNum(res.directCount ?? res.directReferrals ?? 0),
    nextTier: (res.nextTier as string) || null,
    referralsNeeded: toNum(res.referralsNeeded),
  }
}

// Affiliate
export async function getAffiliate(): Promise<AffiliateInfo> {
  const res = await apiFetch<Record<string, unknown>>('/affiliate')
  const levels = ((res.levels || []) as Record<string, unknown>[]).map((l) => ({
    level: toNum(l.level),
    percentage: toNum(l.percentage),
  }))
  const directReferrals = ((res.directReferrals || []) as Record<string, unknown>[]).map((r) => ({
    id: String(r.id || ''),
    name: String(r.name || ''),
    email: String(r.email || ''),
    hasInvested: Boolean(r.hasInvested),
    createdAt: String(r.createdAt || ''),
  }))
  const recentCommissions = ((res.recentCommissions || []) as Record<string, unknown>[]).map((c) => {
    const fromUser = c.fromUser as Record<string, unknown> | undefined
    return {
      id: String(c.id || ''),
      level: toNum(c.level),
      amount: toNum(c.amount),
      fromUser: String(fromUser?.name || fromUser?.id || ''),
      createdAt: String(c.createdAt || ''),
    }
  })
  return {
    referralCode: String(res.referralCode || ''),
    referralLink: String(res.referralLink || ''),
    directReferrals,
    commissionHistory: recentCommissions,
    levels,
    totalCommission: toNum(res.totalCommissions),
  }
}

// Withdrawals
export async function createWithdrawal(data: { amount: number; walletAddress: string }) {
  const res = await apiFetch<{ withdrawal: Record<string, unknown> }>('/withdrawals', {
    method: 'POST',
    body: JSON.stringify(data),
  })
  return mapWithdrawal(res.withdrawal)
}

export async function getWithdrawals(): Promise<Withdrawal[]> {
  const res = await apiFetch<{ withdrawals: Record<string, unknown>[] }>('/withdrawals')
  return (res.withdrawals || []).map(mapWithdrawal)
}

function mapWithdrawal(data: Record<string, unknown>): Withdrawal {
  return {
    id: String(data.id || ''),
    amount: toNum(data.amount),
    fee: toNum(data.fee),
    netAmount: toNum(data.netAmount),
    walletAddress: String(data.walletAddress || ''),
    status: (data.status as Withdrawal['status']) || 'pending',
    createdAt: String(data.createdAt || ''),
    processedAt: data.approvedAt ? String(data.approvedAt) : null,
  }
}

// Admin
export async function getAdminStats(): Promise<AdminStats> {
  const res = await apiFetch<Record<string, unknown>>('/admin/stats')
  const users = res.users as Record<string, unknown> | undefined
  const investments = res.investments as Record<string, unknown> | undefined
  const trading = res.trading as Record<string, unknown> | undefined
  const withdrawals = res.withdrawals as Record<string, unknown> | undefined
  return {
    totalUsers: toNum(users?.total ?? res.totalUsers ?? 0),
    totalInvested: toNum(investments?.totalInvested ?? res.totalInvested ?? 0),
    totalRoi: toNum(investments?.totalRoiDistributed ?? res.totalRoi ?? 0),
    totalWithdrawals: toNum(withdrawals?.total ?? res.totalWithdrawals ?? 0),
    activeInvestments: toNum(investments?.active ?? res.activeInvestments ?? 0),
    pendingWithdrawals: toNum(withdrawals?.pending ?? res.pendingWithdrawals ?? 0),
    activeCopyTraders: toNum(trading?.activeCopyTraders ?? res.activeCopyTraders ?? 0),
    activeTradingPools: toNum(trading?.activeTradingPools ?? res.activeTradingPools ?? 0),
  }
}

export async function getAdminConfig(): Promise<SystemConfig> {
  const res = await apiFetch<{ configs: Record<string, unknown>[] }>('/admin/config')
  const configs = res.configs || []
  const configMap: SystemConfig = {}
  for (const c of configs) {
    const key = String(c.key || '')
    const value = c.value
    // Convert to appropriate type
    if (value === 'true') configMap[key] = true
    else if (value === 'false') configMap[key] = false
    else if (!isNaN(Number(value)) && value !== '') configMap[key] = Number(value)
    else configMap[key] = String(value)
  }
  return configMap
}

export async function updateAdminConfig(data: SystemConfig) {
  // Send each config key-value pair individually
  const results: SystemConfig = {}
  for (const [key, value] of Object.entries(data)) {
    try {
      const res = await apiFetch<{ config: Record<string, unknown> }>('/admin/config', {
        method: 'PUT',
        body: JSON.stringify({ key, value: String(value) }),
      })
      results[key] = res.config?.value ?? value
    } catch {
      // Continue with other configs
    }
  }
  return results
}

export async function getAdminInvestmentPlans(): Promise<InvestmentPlan[]> {
  const res = await apiFetch<{ plans: Record<string, unknown>[] }>('/admin/investment-plans')
  return (res.plans || []).map(mapPlan)
}

export async function createAdminInvestmentPlan(data: Partial<InvestmentPlan>) {
  const res = await apiFetch<{ plan: Record<string, unknown> }>('/admin/investment-plans', {
    method: 'POST',
    body: JSON.stringify(data),
  })
  return mapPlan(res.plan)
}

export async function updateAdminInvestmentPlan(id: string, data: Partial<InvestmentPlan>) {
  const res = await apiFetch<{ plan: Record<string, unknown> }>(`/admin/investment-plans/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
  return mapPlan(res.plan)
}

export async function getAdminCopyTraders(): Promise<CopyTrader[]> {
  const res = await apiFetch<{ traders: Record<string, unknown>[] }>('/admin/copy-traders')
  return (res.traders || []).map(mapTrader)
}

export async function createAdminCopyTrader(data: Partial<CopyTrader>) {
  const res = await apiFetch<{ trader: Record<string, unknown> }>('/admin/copy-traders', {
    method: 'POST',
    body: JSON.stringify(data),
  })
  return mapTrader(res.trader || res)
}

export async function updateAdminCopyTrader(id: string, data: Partial<CopyTrader>) {
  const res = await apiFetch<{ trader: Record<string, unknown> }>(`/admin/copy-traders/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
  return mapTrader(res.trader || res)
}

export async function getAdminTradingPools(): Promise<TradingPool[]> {
  const res = await apiFetch<{ pools?: Record<string, unknown>[]; tradingPools?: Record<string, unknown>[] }>('/admin/trading-pools')
  const list = res.pools || res.tradingPools || []
  return list.map(mapPool)
}

export async function createAdminTradingPool(data: Partial<TradingPool>) {
  const res = await apiFetch<{ pool: Record<string, unknown>; tradingPool: Record<string, unknown> }>('/admin/trading-pools', {
    method: 'POST',
    body: JSON.stringify(data),
  })
  return mapPool(res.pool || res.tradingPool || res)
}

export async function updateAdminTradingPool(id: string, data: Partial<TradingPool>) {
  const res = await apiFetch<{ pool: Record<string, unknown>; tradingPool: Record<string, unknown> }>(`/admin/trading-pools/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
  return mapPool(res.pool || res.tradingPool || res)
}

export async function getAdminWithdrawals(): Promise<Withdrawal[]> {
  const res = await apiFetch<{ withdrawals: Record<string, unknown>[] }>('/admin/withdrawals')
  return (res.withdrawals || []).map(mapWithdrawal)
}

export async function updateAdminWithdrawal(id: string, data: { status: string }) {
  const res = await apiFetch<{ withdrawal: Record<string, unknown> }>(`/admin/withdrawals/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
  return mapWithdrawal(res.withdrawal)
}

export async function getAdminUsers(): Promise<Array<{
  id: string
  name: string
  email: string
  role: string
  balance: number
  totalInvested: number
  isActive: boolean
  createdAt: string
}>> {
  const res = await apiFetch<{ users: Record<string, unknown>[] }>('/admin/users')
  return (res.users || []).map((u) => ({
    id: String(u.id || ''),
    name: String(u.name || ''),
    email: String(u.email || ''),
    role: String(u.role || 'user'),
    balance: toNum(u.balance),
    totalInvested: toNum(u.totalInvested),
    isActive: Boolean(u.isActive),
    createdAt: String(u.createdAt || ''),
  }))
}

export async function updateAdminUser(id: string, data: { balance?: number; isActive?: boolean }) {
  const res = await apiFetch<{ user: Record<string, unknown> }>(`/admin/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
  return mapUser(res.user || res)
}

export async function getAdminAffiliateLevels(): Promise<AffiliateLevel[]> {
  const res = await apiFetch<{ levels: Record<string, unknown>[] }>('/admin/affiliate-levels')
  return (res.levels || []).map((l) => ({
    level: toNum(l.level),
    percentage: toNum(l.percentage),
  }))
}

export async function updateAdminAffiliateLevels(data: AffiliateLevel[]) {
  const res = await apiFetch<{ levels: Record<string, unknown>[] }>('/admin/affiliate-levels', {
    method: 'PUT',
    body: JSON.stringify(data),
  })
  return (res.levels || []).map((l) => ({
    level: toNum(l.level),
    percentage: toNum(l.percentage),
  }))
}

export async function getAdminAffiliateRanks(): Promise<AffiliateRank[]> {
  const res = await apiFetch<{ ranks: Record<string, unknown>[] }>('/admin/affiliate-ranks')
  return (res.ranks || []).map((r) => ({
    id: String(r.id || ''),
    name: String(r.name || ''),
    directReferrals: toNum(r.minDirectReferrals ?? r.directReferrals ?? 0),
    bonusPct: toNum(r.commissionBoost ?? r.bonusPct ?? 0),
  }))
}

export async function updateAdminAffiliateRank(id: string, data: Partial<AffiliateRank>) {
  const res = await apiFetch<{ rank: Record<string, unknown> }>(`/admin/affiliate-ranks/${id}`, {
    method: 'PUT',
    body: JSON.stringify({
      minDirectReferrals: data.directReferrals,
      commissionBoost: data.bonusPct,
    }),
  })
  const r = res.rank || res
  return {
    id: String(r.id || id),
    name: String(r.name || ''),
    directReferrals: toNum(r.minDirectReferrals ?? r.directReferrals ?? 0),
    bonusPct: toNum(r.commissionBoost ?? r.bonusPct ?? 0),
  }
}

// Format helpers
export function formatUSDT(amount: number): string {
  return amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`
}
