import { create } from 'zustand'

export type DashboardTab = 'overview' | 'invest' | 'plans' | 'copy-traders' | 'affiliate' | 'team-bonus' | 'withdrawals' | 'transfer' | 'admin'
export type AdminTab = 'admin-dashboard' | 'admin-plans' | 'admin-copy-traders' | 'admin-pools' | 'admin-users' | 'admin-withdrawals' | 'admin-settings' | 'admin-levels' | 'admin-ranks' | 'admin-nowpayments'
export type AuthModal = null | 'login' | 'register'

export interface User {
  id: string
  name: string
  email: string
  role: 'user' | 'admin'
  balance: number
  totalInvested: number
  totalRoi: number
  activeInvestments: number
  totalWithdrawals: number
  referralCode: string
  teamBonusPct: number
  referredBy: string | null
  createdAt: string
}

export interface InvestmentPlan {
  id: string
  name: string
  minAmount: number
  maxAmount: number | null
  dailyRoi: number
  duration: number
  isActive: boolean
  sortOrder: number
}

export interface Investment {
  id: string
  planId: string
  planName: string
  amount: number
  dailyRoi: number
  teamBonusPct: number
  daysElapsed: number
  totalDays: number
  totalEarned: number
  status: 'active' | 'completed' | 'cancelled'
  createdAt: string
}

export interface CopyTrader {
  id: string
  name: string
  avatar: string | null
  specialty: string
  winRate: number
  totalPnl: number
  monthlyRoi: number
  riskLevel: 'low' | 'medium' | 'high'
  isActive: boolean
  isFeatured: boolean
}

export interface TradingPool {
  id: string
  name: string
  totalAum: number
  dailyVolume: number
  strategy: string
  status: 'active' | 'inactive'
}

export interface AffiliateLevel {
  level: number
  percentage: number
}

export interface AffiliateRank {
  id: string
  name: string
  directReferrals: number
  bonusPct: number
}

export interface TeamBonusInfo {
  tier: 'none' | 'bronze' | 'silver' | 'gold'
  bonusPct: number
  directReferrals: number
  nextTier: string | null
  referralsNeeded: number
}

export interface AffiliateInfo {
  referralCode: string
  referralLink: string
  directReferrals: Array<{
    id: string
    name: string
    email: string
    hasInvested: boolean
    createdAt: string
  }>
  commissionHistory: Array<{
    id: string
    level: number
    amount: number
    fromUser: string
    createdAt: string
  }>
  levels: AffiliateLevel[]
  totalCommission: number
}

export interface Withdrawal {
  id: string
  amount: number
  fee: number
  netAmount: number
  walletAddress: string
  status: 'pending' | 'approved' | 'rejected' | 'processed'
  createdAt: string
  processedAt: string | null
}

export interface Transaction {
  id: string
  type: 'investment' | 'roi_profit' | 'withdrawal' | 'commission' | 'team_bonus'
  amount: number
  description: string
  createdAt: string
}

export interface AdminStats {
  totalUsers: number
  totalInvested: number
  totalRoi: number
  totalWithdrawals: number
  activeInvestments: number
  pendingWithdrawals: number
  activeCopyTraders: number
  activeTradingPools: number
}

export interface SystemConfig {
  [key: string]: string | number | boolean
}

interface AppState {
  // Auth
  currentUser: User | null
  isAuthenticated: boolean
  isLoading: boolean
  authModal: AuthModal

  // Navigation
  currentView: 'landing' | 'dashboard'
  dashboardTab: DashboardTab
  adminTab: AdminTab

  // Data
  investmentPlans: InvestmentPlan[]
  investments: Investment[]
  copyTraders: CopyTrader[]
  tradingPools: TradingPool[]
  teamBonusInfo: TeamBonusInfo | null
  affiliateInfo: AffiliateInfo | null
  withdrawals: Withdrawal[]
  transactions: Transaction[]
  adminStats: AdminStats | null
  systemConfig: SystemConfig | null
  affiliateLevels: AffiliateLevel[]
  affiliateRanks: AffiliateRank[]
  adminUsers: Array<{
    id: string
    name: string
    email: string
    role: string
    balance: number
    totalInvested: number
    isActive: boolean
    createdAt: string
  }>
  adminWithdrawals: Withdrawal[]

  // Actions
  setAuthModal: (modal: AuthModal) => void
  setUser: (user: User | null) => void
  setCurrentView: (view: 'landing' | 'dashboard') => void
  setDashboardTab: (tab: DashboardTab) => void
  setAdminTab: (tab: AdminTab) => void
  setLoading: (loading: boolean) => void
  setInvestmentPlans: (plans: InvestmentPlan[]) => void
  setInvestments: (investments: Investment[]) => void
  setCopyTraders: (traders: CopyTrader[]) => void
  setTradingPools: (pools: TradingPool[]) => void
  setTeamBonusInfo: (info: TeamBonusInfo | null) => void
  setAffiliateInfo: (info: AffiliateInfo | null) => void
  setWithdrawals: (withdrawals: Withdrawal[]) => void
  setTransactions: (transactions: Transaction[]) => void
  setAdminStats: (stats: AdminStats | null) => void
  setSystemConfig: (config: SystemConfig | null) => void
  setAffiliateLevels: (levels: AffiliateLevel[]) => void
  setAffiliateRanks: (ranks: AffiliateRank[]) => void
  setAdminUsers: (users: AppState['adminUsers']) => void
  setAdminWithdrawals: (withdrawals: Withdrawal[]) => void
  logout: () => void
}

export const useAppStore = create<AppState>((set) => ({
  // Auth
  currentUser: null,
  isAuthenticated: false,
  isLoading: false,
  authModal: null,

  // Navigation
  currentView: 'landing',
  dashboardTab: 'overview',
  adminTab: 'admin-dashboard',

  // Data
  investmentPlans: [],
  investments: [],
  copyTraders: [],
  tradingPools: [],
  teamBonusInfo: null,
  affiliateInfo: null,
  withdrawals: [],
  transactions: [],
  adminStats: null,
  systemConfig: null,
  affiliateLevels: [],
  affiliateRanks: [],
  adminUsers: [],
  adminWithdrawals: [],

  // Actions
  setAuthModal: (modal) => set({ authModal: modal }),
  setUser: (user) => set({ currentUser: user, isAuthenticated: !!user }),
  setCurrentView: (view) => set({ currentView: view }),
  setDashboardTab: (tab) => set({ dashboardTab: tab }),
  setAdminTab: (tab) => set({ adminTab: tab }),
  setLoading: (loading) => set({ isLoading: loading }),
  setInvestmentPlans: (plans) => set({ investmentPlans: plans }),
  setInvestments: (investments) => set({ investments }),
  setCopyTraders: (traders) => set({ copyTraders: traders }),
  setTradingPools: (pools) => set({ tradingPools: pools }),
  setTeamBonusInfo: (info) => set({ teamBonusInfo: info }),
  setAffiliateInfo: (info) => set({ affiliateInfo: info }),
  setWithdrawals: (withdrawals) => set({ withdrawals }),
  setTransactions: (transactions) => set({ transactions }),
  setAdminStats: (stats) => set({ adminStats: stats }),
  setSystemConfig: (config) => set({ systemConfig: config }),
  setAffiliateLevels: (levels) => set({ affiliateLevels: levels }),
  setAffiliateRanks: (ranks) => set({ affiliateRanks: ranks }),
  setAdminUsers: (users) => set({ adminUsers: users }),
  setAdminWithdrawals: (withdrawals) => set({ adminWithdrawals: withdrawals }),
  logout: () => set({
    currentUser: null,
    isAuthenticated: false,
    currentView: 'landing',
    dashboardTab: 'overview',
    authModal: null,
    investments: [],
    teamBonusInfo: null,
    affiliateInfo: null,
    withdrawals: [],
    transactions: [],
  }),
}))
