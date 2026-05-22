'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import {
  Home, Bot, Clock, History, Users, User, Shield, Settings, FileText,
  ChevronRight, Copy, Check, TrendingUp, TrendingDown, DollarSign, Wallet,
  Bell, LogOut, Menu, X, Plus, Pencil, Trash2, Search, RefreshCw,
  ArrowUpRight, ArrowDownLeft, Zap, Cpu, Activity, BarChart3, Coins,
  Eye, EyeOff, ExternalLink, Loader2, AlertTriangle, CheckCircle2,
  XCircle, Clock4, Server, Database, Globe, Percent, Gift,
  LayoutDashboard, UserCog, Banknote, HandCoins, Link2, ChevronLeft,
  Trophy, Target, Crown, Star, Share2, Medal, Award,
  Info, MessageSquare, Ticket, LineChart, Calculator,
  Lock, Image,
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import { useI18n } from '@/lib/i18n';

// ============================================================================
// TYPES
// ============================================================================

interface User {
  id: string; email: string; name: string; role: string; isActive: boolean;
  walletAddress?: string | null; pixKey?: string | null;
  balance: string; affiliateBalance: string; voucherBalance: string; totalRoi: string;
  totalInvested: string; totalDeposited: string; totalWithdrawn: string;
  affiliateCode?: string | null; referredBy?: string | null;
  referralLevel: number; totalAffiliateEarnings: string;
  hasInvested: boolean; linkUnlocked: boolean;
  createdAt: string; updatedAt: string;
  _count?: { referrals: number; investment: number };
}

interface CopyTrader {
  id: string; name: string; avatar?: string | null; specialty: string; winRate: string; monthlyRoi: string;
  totalPnl: string; riskLevel: string;
  isActive: boolean; isFeatured: boolean;
  sortOrder: number;
  createdAt: string; updatedAt: string;
  plans?: InvestmentPlan[];
  _count?: { investments: number };
}

interface BitgetTrader {
  traderId: string;
  displayName: string;
  avatar: string;
  roi: string;
  totalPnl: string;
  maxDrawdown: string;
  followers: number;
  aum: string;
  grade: { id: string; name: string };
  labels: Array<{ id: string; name: string; type: string }>;
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

interface InvestmentPlan {
  id: string; name: string; description?: string | null;
  minAmount: string; maxAmount: string; dailyRoiPct: string; durationDays: number;
  days: number; totalReturn: string;
  isActive: boolean; isFeatured: boolean; sortOrder: number;
  createdAt: string; updatedAt: string;
}

interface UserInvestment {
  id: string; userId: string; planId?: string | null;
  startDate: string; endDate: string; amount: string; dailyRoiPct: string;
  dailyRoi: string; totalRoi: string;
  teamBonusPct: string;
  status: string; createdAt: string; updatedAt: string;
  plan?: { id: string; name: string; dailyRoiPct: string; durationDays: number; coin?: string; model?: string; pool?: string };
}

interface Transaction {
  id: string; userId: string; type: string; amount: string;
  brlAmount?: string | null; usdtRate?: string | null;
  status: string; description: string; referenceId?: string | null;
  referenceType?: string | null; createdAt: string;
}

interface Investment {
  id: string; userId: string; amount: string; brlAmount?: string | null;
  usdtRate?: string | null; type: string; method: string; network?: string | null;
  status: string; txHash?: string | null; pixTxId?: string | null;
  destination?: string | null; description?: string | null;
  adminNotes?: string | null; processedBy?: string | null;
  processedAt?: string | null; createdAt: string; updatedAt: string;
  user?: { id: string; name: string; email: string; walletAddress?: string; pixKey?: string };
}

interface AffiliateBadge {
  id: string; name: string; description?: string | null;
  icon: string; color: string; category: string;
  requirement: string; rewardType: string; rewardValue: string;
  isAuto: boolean; sortOrder: number;
  earned: boolean; awardedAt?: string | null;
  progress: number; isClose: boolean;
}

interface AffiliateData {
  code?: string | null; linkUnlocked: boolean; hasInvested: boolean;
  totalEarnings: number; affiliateBalance: number; totalReferrals: number;
  directReferrals?: number;
  referralTree: Record<number, Array<{ id: string; name: string; email: string; createdAt: string; totalInvested: string }>>;
  commissionByLevel: Array<{ level: number; _sum: { commissionAmount: number | null }; _count: number }>;
  recentCommissions: Array<{
    id: string; userId: string; fromUserId: string; level: number;
    baseAmount: string; percentage: string; commissionAmount: string;
    status: string; createdAt: string;
    user: { id: string; name: string };
  }>;
  commissionMode?: 'system_margin' | 'investment_profit' | 'revenue_pool';
  systemMarginPct?: number;
  poolRevenuePct?: number;
  investmentBonusPct?: number;
  ranks?: AffiliateRank[];
  currentRank?: AffiliateRank | null;
  nextRank?: AffiliateRank | null;
  nextRankReferralsNeeded?: number;
  nextRankEarningsNeeded?: number;
  milestones?: AffiliateMilestone[];
  contests?: AffiliateContest[];
  leaderboard?: AffiliateLeaderboardEntry[];
  badges?: AffiliateBadge[];
  affiliateLevels?: AffiliateLevel[];
}

interface AffiliateLevel {
  id: string; level: number; percentage: string; description?: string | null;
  isActive: boolean; createdAt: string; updatedAt: string;
}

interface AffiliateRank {
  id: string; name: string; icon: string; color: string;
  minReferrals: number; minEarnings: string; bonusAmount: string;
  commissionBoost: string; perks?: string | null;
  sortOrder: number; isActive: boolean;
  createdAt: string; updatedAt: string;
}

interface AffiliateMilestone {
  id: string; name: string; description?: string | null;
  targetCount: number; rewardType: string; rewardValue: string;
  icon: string; isActive: boolean; sortOrder: number;
  claimed?: boolean; claimedAt?: string | null; canClaim?: boolean;
  createdAt: string; updatedAt: string;
}

interface AffiliateContest {
  id: string; name: string; description?: string | null;
  startDate: string; endDate: string; rewardPool: string;
  metric: string; isActive: boolean; isFeatured: boolean;
  createdAt: string; updatedAt: string;
}

interface AffiliateLeaderboardEntry {
  rank: number; nameInitial: string; totalEarnings: number;
  totalReferrals: number; currentRankName: string;
}

interface SystemConfig {
  id: string; key: string; value: string; type: string;
  description?: string | null; category: string; isActive: boolean; updatedAt: string;
}

interface AdminLog {
  id: string; adminId: string; action: string; entity: string;
  entityId?: string | null; oldValue?: string | null; newValue?: string | null;
  description: string; ipAddress?: string | null; createdAt: string;
  admin: { id: string; name: string; email: string };
}

interface AdminStats {
  users: { total: number; active: number; newToday: number };
  deposits: { total: number; totalAmount: number; confirmedAmount: number; pendingCount: number; pendingAmount: number };
  withdrawals: { total: number; totalAmount: number; confirmedAmount: number; pendingCount: number; pendingAmount: number };
  investment: { active: number; total: number; totalAmount: number };
  trading: { totalRoi: number; totalInvested: number };
  affiliates: { totalCommissions: number; totalAmount: number };
}

// ============================================================================
// NOTIFICATION SYSTEM
// ============================================================================

type NotificationType = 'roi' | 'trading' | 'deposit' | 'withdrawal' | 'affiliate' | 'investment' | 'system';

interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  amount?: string;
  timestamp: string;
  read: boolean;
}

const NOTIF_STORAGE_KEY = 'roi_notifications';
const MAX_NOTIFICATIONS = 50;

function loadNotifications(userId: string): AppNotification[] {
  try {
    const stored = localStorage.getItem(`${NOTIF_STORAGE_KEY}_${userId}`);
    if (stored) return JSON.parse(stored);
  } catch {}
  return [];
}

function saveNotifications(userId: string, notifs: AppNotification[]) {
  try {
    localStorage.setItem(`${NOTIF_STORAGE_KEY}_${userId}`, JSON.stringify(notifs.slice(0, MAX_NOTIFICATIONS)));
  } catch {}
}

function createNotifId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'agora';
  if (mins < 60) return `${mins}min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `${days}d`;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

const d = (val: string | number | null | undefined): number => {
  if (val === null || val === undefined) return 0;
  const num = typeof val === 'number' ? val : parseFloat(val);
  return isNaN(num) ? 0 : num;
};

const fmtUSDT = (val: string | number | null | undefined): string => {
  return d(val).toFixed(2);
};

const fmtBRL = (val: number): string => {
  // Manual formatting to avoid toLocaleString SSR/CSR differences
  const parts = Math.abs(val).toFixed(2).split('.');
  const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return (val < 0 ? '-' : '') + intPart + ',' + parts[1];
};

const fmtDate = (dateStr: string): string => {
  return new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const fmtDateTime = (dateStr: string): string => {
  return new Date(dateStr).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const assetIconBase = (coin: string): string => {
  const icons: Record<string, string> = { BTC: '₿', KAS: 'K', LTC: 'Ł', DOGE: 'Ð', KDA: 'K' };
  return icons[coin] || '📈';
};

const assetColor = (coin: string): string => {
  const colors: Record<string, string> = { BTC: 'text-amber-400', KAS: 'text-cyan-400', LTC: 'text-gray-300', DOGE: 'text-yellow-400' };
  return colors[coin] || 'text-white';
};

const statusColor = (status: string): string => {
  const colors: Record<string, string> = {
    active: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
    completed: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    cancelled: 'bg-red-500/20 text-red-400 border-red-500/30',
    pending: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    confirmed: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
    rejected: 'bg-red-500/20 text-red-400 border-red-500/30',
    failed: 'bg-red-500/20 text-red-400 border-red-500/30',
    online: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
    offline: 'bg-red-500/20 text-red-400 border-red-500/30',
    maintenance: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    paid: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
    approved: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
    processing: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  };
  return colors[status] || 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30';
};

// statusLabel moved inside component to use t()

const txTypeIcon = (type: string) => {
  const icons: Record<string, typeof TrendingUp> = {
    deposit: ArrowDownLeft, withdrawal: ArrowUpRight,
    roi_profit: TrendingUp, investment: Clock,
    affiliate_commission: Users, admin_adjust: Shield,
  };
  return icons[type] || DollarSign;
};

// txTypeLabel moved inside component to use t()

// relativeTime moved inside component to use t()

// methodBadge moved inside component to use t()

// categoryLabel moved inside component to use t()

// ============================================================================
// CONFIG_LABELS — Defines how each SystemConfig key is displayed in the admin UI
// Matches the mining-protocol pattern with label, description, type, unit, options
// ============================================================================
const CONFIG_LABELS: Record<string, {
  label: string;
  description: string;
  type?: 'boolean' | 'number' | 'string' | 'select' | 'secret';
  unit?: string;
  options?: { value: string; label: string }[];
}> = {
  // Branding
  site_logo: { label: 'Logo do Site', description: 'URL da imagem do logo (PNG ou SVG, fundo transparente, 200x60px recomendado)', type: 'string' },
  site_favicon: { label: 'Favicon (Ícone da Aba)', description: 'URL do favicon (ICO ou PNG, 32x32px ou 64x64px recomendado)', type: 'string' },
  // General
  site_name: { label: 'Nome do Site', description: 'Nome exibido no site e nos e-mails' },
  maintenance_mode: { label: 'Modo Manutenção', description: 'Ativar para colocar o site em manutenção', type: 'boolean' },
  usdt_brl_rate: { label: 'Câmbio USDT/BRL', description: 'Taxa de câmbio fixa USDT para BRL', type: 'number', unit: 'BRL' },
  // Deposit
  has_pix: { label: 'PIX Habilitado', description: 'Permitir depósitos via PIX', type: 'boolean' },
  has_usdt: { label: 'USDT Habilitado', description: 'Permitir depósitos via USDT', type: 'boolean' },
  manual_deposit_enabled: { label: 'Depósito Manual', description: 'Permitir depósitos manuais (PIX/USDT) para usuários', type: 'boolean' },
  min_deposit_usdt: { label: 'Depósito Mínimo', description: 'Valor mínimo para depósito em USDT', type: 'number', unit: 'USDT' },
  max_deposit_usdt: { label: 'Depósito Máximo', description: 'Valor máximo para depósito em USDT', type: 'number', unit: 'USDT' },
  pix_wallet_address: { label: 'Carteira PIX', description: 'Endereço da carteira para recebimentos PIX', type: 'string' },
  usdt_trc20_address: { label: 'Endereço USDT TRC20', description: 'Carteira para depósitos manuais USDT TRC20' },
  usdt_polygon_address: { label: 'Endereço USDT Polygon', description: 'Carteira para depósitos manuais USDT Polygon' },
  pix_key: { label: 'Chave PIX', description: 'Chave PIX para recebimentos' },
  // Withdrawal
  min_withdrawal_usdt: { label: 'Saque Mínimo', description: 'Valor mínimo para saque em USDT', type: 'number', unit: 'USDT' },
  max_withdrawal_usdt: { label: 'Saque Máximo', description: 'Valor máximo para saque em USDT', type: 'number', unit: 'USDT' },
  withdrawal_fee_pct: { label: 'Taxa de Saque', description: 'Percentual cobrado sobre o lucro em saques (não sobre o capital investido)', type: 'number', unit: '%' },
  withdrawal_interval_hours: { label: 'Intervalo Mínimo entre Saques', description: 'Horas mínimas entre solicitações de saque', type: 'number', unit: 'horas' },
  manual_withdrawal_enabled: { label: 'Saque Manual', description: 'Permitir saques manuais (admin aprova cada solicitação)', type: 'boolean' },
  nowpayments_withdrawal_enabled: { label: 'Saque NowPayments', description: 'Permitir saques automáticos via NowPayments (payout)', type: 'boolean' },
  // Trading
  daily_roi_pct: { label: 'ROI Diário (%)', description: 'Percentual de ROI diário padrão', type: 'number', unit: '%' },
  min_investment_usdt: { label: 'Investimento Mínimo', description: 'Valor mínimo para investimento em USDT', type: 'number', unit: 'USDT' },
  // Affiliate
  affiliate_commission_mode: { label: 'Modo de Comissão', description: 'Como as comissões de afiliados são calculadas', type: 'select', options: [
    { value: 'system_margin', label: 'Margem do Sistema' },
    { value: 'investment_profit', label: 'Lucro de Investimento' },
    { value: 'revenue_pool', label: 'Pool de Receita' },
  ] },
  affiliate_system_margin_pct: { label: 'Margem do Sistema (%)', description: 'Percentual da margem do sistema para afiliados', type: 'number', unit: '%' },
  affiliate_pool_revenue_pct: { label: 'Pool de Receita (%)', description: 'Percentual fixo da receita para o pool de afiliados', type: 'number', unit: '%' },
  affiliate_investment_bonus_pct: { label: 'Bônus de Investimento (%)', description: '% do valor do investimento dado como bônus ao afiliado', type: 'number', unit: '%' },
  min_affiliate_withdrawal: { label: 'Saque Mínimo Afiliado', description: 'Valor mínimo para saque de comissões em USDT', type: 'number', unit: 'USDT' },
  affiliate_withdrawal_fee_pct: { label: 'Taxa Saque Afiliado (%)', description: 'Percentual cobrado em saques de afiliado', type: 'number', unit: '%' },
  affiliate_daily_cap_usd: { label: 'Cap Diário Afiliado', description: 'Cap diário de comissões em USDT (0 = sem limite)', type: 'number', unit: 'USDT' },
  // NowPayments
  nowpayments_enabled: { label: 'NowPayments Habilitado', description: 'Ativar integração com NowPayments para depósitos automáticos', type: 'boolean' },
};

// Keys hidden from the generic config list (managed via dedicated UI sections)
const HIDDEN_CONFIG_KEYS = new Set<string>([
  'nowpayments_split_pct',    // Managed via NowPayments → Sócios & Split
  'nowpayments_split_wallet', // Managed via NowPayments → Sócios & Split
  // All affiliate keys — managed via Afiliados tab (dedicated UI with mode descriptions)
  'affiliate_commission_mode',
  'affiliate_system_margin_pct',
  'affiliate_pool_revenue_pct',
  'affiliate_investment_bonus_pct',
  'affiliate_daily_cap_usd',
  'min_affiliate_withdrawal',
  'affiliate_withdrawal_fee_pct',
]);

const categoryIcon = (cat: string) => {
  const icons: Record<string, typeof Settings> = {
    branding: Image, general: Settings, deposit: Banknote, withdrawal: HandCoins,
    trading: LineChart, affiliate: Link2, nowpayments: Globe,
  };
  return icons[cat] || Settings;
};

const categoryDescription: Record<string, string> = {
  branding: 'Logo e favicon exibidos no site. Formatos aceitos: PNG, SVG, JPG, ICO (máx. 2MB)',
  general: 'Configurações gerais do site',
  deposit: 'Opções de depósito e métodos de pagamento',
  withdrawal: 'Regras para saques e taxas',
  trading: 'Configurações de ROI e investimentos',
  affiliate: 'Comissões e configurações de afiliados',
  nowpayments: 'Configurações NowPayments — o split é gerenciado na aba NowPayments → Sócios & Split',
};

// ============================================================================
// API HELPER
// ============================================================================

async function api<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data.error || 'Request error');
  }
  return data as T;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function PlataformaROI() {
  // Auth State
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const { t, locale, setLocale, locales } = useI18n();

  // i18n-aware label functions
  const assetIcon = assetIconBase;
  const statusLabel = (status: string): string => {
    const labels: Record<string, string> = {
      active: t('status.active'), completed: t('status.completed'), cancelled: t('status.cancelled'),
      pending: t('status.pending'), confirmed: t('status.confirmed'), rejected: t('status.rejected'),
      failed: t('status.failed'), online: t('status.online'), offline: t('status.offline'),
      maintenance: t('status.maintenance'), paid: t('status.paid'), approved: t('status.approved'),
      processing: t('status.processing'),
    };
    return labels[status] || status;
  };
  const txTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      deposit: t('txType.deposit'), withdrawal: t('txType.withdrawal'),
      roi_profit: t('txType.roi_profit'), investment: t('txType.investment'),
      affiliate_commission: t('txType.affiliate_commission'), admin_adjust: t('txType.admin_adjust'),
    };
    return labels[type] || type;
  };
  const categoryLabel = (cat: string): string => {
    const labels: Record<string, string> = {
      branding: 'Marca do Site', general: t('category.general'), deposit: t('category.deposit'), withdrawal: t('category.withdrawal'),
      trading: t('category.trading'), affiliate: t('category.affiliate'), nowpayments: 'NowPayments',
    };
    return labels[cat] || cat;
  };
  const methodBadge = (method: string) => {
    if (method === 'pix') return <Badge className="bg-green-500/20 text-green-400 border-green-500/30" variant="outline">{t('method.pix')}</Badge>;
    if (method === 'usdt_trc20') return <Badge className="bg-sky-500/20 text-sky-400 border-sky-500/30" variant="outline">{t('method.usdt_trc20')}</Badge>;
    if (method === 'usdt_polygon') return <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30" variant="outline">{t('method.usdt_polygon')}</Badge>;
    return <Badge variant="outline">{method}</Badge>;
  };
  const relativeTime = (dateStr: string): string => {
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);
    if (diffSec < 60) return t('common.justNow');
    if (diffMin < 60) return t('common.minutesAgo', { n: diffMin });
    if (diffHour < 24) return diffHour > 1 ? t('common.hoursAgoPlural', { n: diffHour }) : t('common.hoursAgo', { n: diffHour });
    if (diffDay < 7) return diffDay > 1 ? t('common.daysAgoPlural', { n: diffDay }) : t('common.daysAgo', { n: diffDay });
    return fmtDateTime(dateStr);
  };

  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  // Dashboard State
  const [activeTab, setActiveTab] = useState('home');
  const [adminTab, setAdminTab] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // Admin view mode: 'admin' shows admin panel, 'investor' shows investor dashboard
  const [adminViewMode, setAdminViewMode] = useState<'admin' | 'investor'>('admin');

  // Data State
  const [copyTraders, setCopyTraders] = useState <CopyTrader[]> ([]);
  const [userInvestments, setUserInvestments] = useState<UserInvestment[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [affiliateData, setAffiliateData] = useState<AffiliateData | null>(null);
  const [affiliateLoading, setAffiliateLoading] = useState(false);
  const [affiliateSearch, setAffiliateSearch] = useState('');
  const [usdtBrlRate, setUsdtBrlRate] = useState(5.5);
  const [dataLoading, setDataLoading] = useState(false);

  // Hydration guard: prevents SSR/CSR mismatch for dynamic content
  const [mounted, setMounted] = useState(false);

  // Real-time trading state
  const [previousBalance, setPreviousBalance] = useState<string | null>(null);
  const [roiFlash, setRoiFlash] = useState<number | null>(null);
  const [nextDistribution, setNextDistribution] = useState<{ hours: number; minutes: number; seconds: number } | null>(null);
  const [todayEarnings, setTodayEarnings] = useState<string>('0');
  const [isLivePolling, setIsLivePolling] = useState(false);

  // Notification state
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const unreadCount = notifications.filter(n => !n.read).length;

  // Live Trading state
  const [liveEarnings, setLiveEarnings] = useState(0); // cumulative per-second earnings
  const [liveShares, setLiveShares] = useState<{ valid: number; invalid: number }[]>([]); // per investment
  const [liveVolatility, setLiveVolatility] = useState<number[]>([]); // per investment
  const [liveWinRates, setLiveWinRates] = useState<number[]>([]); // per investment (fluctuating)
  const [liveBlocks, setLiveBlocks] = useState(0); // total blocks found
  const [liveEarningsFeed, setLiveEarningsFeed] = useState<{ id: number; amount: number; time: string; coin: string }[]>([]); // recent micro-earnings
  const [liveEarningsCounter, setLiveEarningsCounter] = useState(0); // incrementing counter for feed IDs

  // Landing Page State
  const [landingTraders, setLandingTraders] = useState <CopyTrader[]> ([]);
  const [landingAffiliateLevels, setLandingAffiliateLevels] = useState<AffiliateLevel[]>([]);
  const [landingStats, setLandingStats] = useState<{ totalUsers: number; activeInvestments: number; totalRoi: number; totalInvested: number } | null>(null);
  const [landingConfig, setLandingConfig] = useState<{ siteName: string; minDeposit: string; minWithdrawal: string; hasPix: boolean; hasUsdt: boolean } | null>(null);
  const [landingRate, setLandingRate] = useState(5.5);

  // Site Config State (for deposit/withdrawal modal toggles)
  // All booleans default to FALSE — only enable what admin explicitly sets to 'true'
  const [siteConfig, setSiteConfig] = useState<{
    hasPix: boolean; hasUsdt: boolean;
    manualDepositEnabled: boolean; nowpaymentsEnabled: boolean;
    manualWithdrawalEnabled: boolean; nowpaymentsWithdrawalEnabled: boolean;
    minDepositUsdt: number; maxDepositUsdt: number;
    minWithdrawalUsdt: number; maxWithdrawalUsdt: number; withdrawalFeePct: number;
    siteName: string;
  }>({
    hasPix: false, hasUsdt: false,
    manualDepositEnabled: false, nowpaymentsEnabled: false,
    manualWithdrawalEnabled: false, nowpaymentsWithdrawalEnabled: false,
    minDepositUsdt: 10, maxDepositUsdt: 100000,
    minWithdrawalUsdt: 10, maxWithdrawalUsdt: 50000, withdrawalFeePct: 0,
    siteName: 'PLATAFORMA ROI',
  });

  // Admin Data
  const [adminCopyTraders, setAdminCopyTraders] = useState <CopyTrader[]> ([]);
  const [adminPlans, setAdminPlans] = useState<InvestmentPlan[]>([]);
  const [adminUsers, setAdminUsers] = useState<any[]>([]);
  const [adminDeposits, setAdminDeposits] = useState<Investment[]>([]);
  const [adminWithdrawals, setAdminWithdrawals] = useState<Investment[]>([]);
  const [adminConfigs, setAdminConfigs] = useState<SystemConfig[]>([]);
  const [adminLogs, setAdminLogs] = useState<AdminLog[]>([]);
  const [adminStats, setAdminStats] = useState<AdminStats | null>(null);
  const [adminAffiliates, setAdminAffiliates] = useState<any>(null);
  const [adminAffiliateWithdrawals, setAdminAffiliateWithdrawals] = useState<any[]>([]);
  const [affiliateLevels, setAffiliateLevels] = useState<AffiliateLevel[]>([]);
  const [adminLoading, setAdminLoading] = useState(false);

  // Admin affiliate data for new models
  const [adminRanks, setAdminRanks] = useState<AffiliateRank[]>([]);
  const [adminMilestones, setAdminMilestones] = useState<AffiliateMilestone[]>([]);
  const [adminContests, setAdminContests] = useState<AffiliateContest[]>([]);
  const [adminBadges, setAdminBadges] = useState<any[]>([]);
  const [rankDialog, setRankDialog] = useState<{ open: boolean; rank?: AffiliateRank | null }>({ open: false });
  const [milestoneDialog, setMilestoneDialog] = useState<{ open: boolean; milestone?: AffiliateMilestone | null }>({ open: false });
  const [contestDialog, setContestDialog] = useState<{ open: boolean; contest?: AffiliateContest | null }>({ open: false });
  const [badgeDialog, setBadgeDialog] = useState<{ open: boolean; badge?: any | null }>({ open: false });

  // User Voucher state (leader view)
  const [userVouchers, setUserVouchers] = useState<any[]>([]);
  const [voucherProgressLoading, setVoucherProgressLoading] = useState(false);

  const recalculateVoucherProgress = async () => {
    setVoucherProgressLoading(true);
    try {
      const data = await api<{ success: boolean; vouchers: any[] }>('/api/vouchers/progress', { method: 'POST' });
      setUserVouchers(data.vouchers || []);
      toast.success('Progresso dos vouchers atualizado!');
    } catch (e: any) {
      toast.error(e.message || 'Erro ao atualizar progresso');
    } finally {
      setVoucherProgressLoading(false);
    }
  };

  // Admin Voucher state
  const [adminVouchers, setAdminVouchers] = useState<any[]>([]);
  const [voucherDialog, setVoucherDialog] = useState<{ open: boolean; voucher?: any | null }>({ open: false });
  const [voucherActionDialog, setVoucherActionDialog] = useState<{ open: boolean; action: 'revoke' | 'extend' | 'complete'; voucher?: any | null }>({ open: false, action: 'revoke', voucher: null });
  const [voucherFilter, setVoucherFilter] = useState<string>('all');
  const [voucherLoading, setVoucherLoading] = useState(false);
  const [userVouchersLoading, setUserVouchersLoading] = useState(false);

  // Dialog State
  const [loginLoading, setLoginLoading] = useState(false);
  const [investDialogPlan, setInvestDialogPlan] = useState<CopyTrader | null>(null);
  const [investmentDuration, setInvestmentDuration] = useState(7);
  const [selectedPlanId, setSelectedPlanId] = useState<string | undefined>(undefined);
  const [investLoading, setInvestLoading] = useState(false);
  const [simulatorAmount, setSimulatorAmount] = useState<string>('100');
  const [investAmount, setInvestAmount] = useState<string>('');
  const [useVoucherForInvest, setUseVoucherForInvest] = useState(false);
  const [selectedVoucherId, setSelectedVoucherId] = useState<string>('');
  const [depositDialog, setDepositDialog] = useState(false);
  const [withdrawDialog, setWithdrawDialog] = useState(false);
  const [depositLoading, setDepositLoading] = useState(false);
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const [withdrawVoucherInfo, setWithdrawVoucherInfo] = useState<{ hasActiveVoucher: boolean; unlockPct: number; maxWithdrawable: number; ownSource: number; voucherProfits: number; balance: number } | null>(null);

  // NowPayments deposit state
  const [npDepositAddress, setNpDepositAddress] = useState<string | null>(null);
  const [npDepositAmount, setNpDepositAmount] = useState<string>('');
  const [npDepositCurrency, setNpDepositCurrency] = useState<string>('usdttrc20');
  const [npDepositStatus, setNpDepositStatus] = useState<string | null>(null);
  const [npDepositPaymentId, setNpDepositPaymentId] = useState<string | null>(null);
  const [npGeneratingAddress, setNpGeneratingAddress] = useState(false);
  const [npAddressCopied, setNpAddressCopied] = useState(false);
  const [npDepositId, setNpDepositId] = useState<string | null>(null);
  const [npPayAmount, setNpPayAmount] = useState<string | null>(null);
  const [npPriceAmount, setNpPriceAmount] = useState<number | null>(null);
  const [npExpirationDate, setNpExpirationDate] = useState<string | null>(null);
  const [npEstimatedFee, setNpEstimatedFee] = useState<number>(0);
  const [npCountdown, setNpCountdown] = useState<string>('');
  // Dynamic currencies — populated ONLY from NowPayments API (no hardcoded fallbacks)
  const [availableDepositCurrencies, setAvailableDepositCurrencies] = useState<string[]>([]);
  const [availableWithdrawCurrencies, setAvailableWithdrawCurrencies] = useState<string[]>([]);
  const [currencyLabels, setCurrencyLabels] = useState<Record<string, string>>({});
  const [pixEnabled, setPixEnabled] = useState(false);

  // Currency label helper — uses dynamic labels from NowPayments API when available
  const currencyLabel = (code: string): string => {
    if (currencyLabels[code]) return currencyLabels[code];
    // Fallback: common known currencies
    const fallbackLabels: Record<string, string> = {
      usdttrc20: 'USDT TRC20', usdtmatic: 'USDT Polygon', usdtbsc: 'USDT BSC', usdterc20: 'USDT ERC20',
      usdtavax: 'USDT Avalanche', usdtsol: 'USDT Solana', usdttrx: 'USDT TRC20',
      usdctrx: 'USDC TRC20', usdcmatic: 'USDC Polygon', usdcbsc: 'USDC BSC', usdcerc20: 'USDC ERC20',
      usdcsol: 'USDC Solana', usdcavax: 'USDC Avalanche',
      btc: 'Bitcoin', eth: 'Ethereum', trx: 'TRON', ltc: 'Litecoin', doge: 'Dogecoin',
      bnbbsc: 'BNB', sol: 'Solana', matic: 'Polygon MATIC', avax: 'Avalanche', xrp: 'XRP',
      usdt_trc20: 'USDT TRC20', usdt_polygon: 'USDT Polygon', usdt_bsc: 'USDT BSC', usdt_erc20: 'USDT ERC20',
      usdc_polygon: 'USDC Polygon', pix: 'PIX (BRL)',
    };
    return fallbackLabels[code] || code.toUpperCase().replace(/_/g, ' ');
  };

  // Bitget real trader data
  const [bitgetTraders, setBitgetTraders] = useState<BitgetTrader[]>([]);
  const [bitgetLoading, setBitgetLoading] = useState(false);
  const [bitgetRanking, setBitgetRanking] = useState<string>('profit_rate');
  const [bitgetSearch, setBitgetSearch] = useState('');
  const [landingBitgetTraders, setLandingBitgetTraders] = useState<BitgetTrader[]>([]);

  // Plans filter state
  const [plansFilter, setPlansFilter] = useState<string>('ALL');

  // Admin Dialogs
  const [traderDialog, setTraderDialog] = useState<{ open: boolean; trader?: CopyTrader | null }>({ open: false });
  const [planDialog, setPlanDialog] = useState<{ open: boolean; plan?: InvestmentPlan | null }>({ open: false });
  const [userDialog, setUserDialog] = useState<{ open: boolean; user?: any | null }>({ open: false });
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; type: string; id: string; name: string }>({ open: false, type: '', id: '', name: '' });
  const [adminActionLoading, setAdminActionLoading] = useState(false);

  // Config Edit State (grouped by category)
  const [configEdits, setConfigEdits] = useState<Record<string, string>>({});
  const [configSaving, setConfigSaving] = useState<string | null>(null);
  const [secretVisible, setSecretVisible] = useState<Record<string, boolean>>({});
  const [newConfigDialog, setNewConfigDialog] = useState(false);
  const [changePasswordDialog, setChangePasswordDialog] = useState(false);
  const [removeLoading, setRemoveLoading] = useState(false);

  // Notes Dialog for deposit/withdrawal actions
  const [notesDialog, setNotesDialog] = useState<{ open: boolean; id: string; action: 'approve' | 'reject' | 'complete'; type: 'deposit' | 'withdrawal' }>({ open: false, id: '', action: 'approve', type: 'deposit' });
  const [adminNotes, setAdminNotes] = useState('');

  // Deposits/Payouts/Statement state (for Faturas, Saques, Extrato tabs)
  const [userDeposits, setUserDeposits] = useState<any[]>([]);
  const [userDepositStats, setUserDepositStats] = useState<any>(null);
  const [userPayouts, setUserPayouts] = useState<any[]>([]);
  const [userPayoutStats, setUserPayoutStats] = useState<any>(null);
  const [statementData, setStatementData] = useState<any[]>([]);
  const [statementSummary, setStatementSummary] = useState<any>(null);
  const [depositsLoading, setDepositsLoading] = useState(false);
  const [payoutsLoading, setPayoutsLoading] = useState(false);
  const [statementLoading, setStatementLoading] = useState(false);
  const [depositFilter, setDepositFilter] = useState<string>('all');
  const [payoutFilter, setPayoutFilter] = useState<string>('all');
  const [statementFilter, setStatementFilter] = useState<string>('all');

  // Admin NowPayments state
  const [adminNpDeposits, setAdminNpDeposits] = useState<any[]>([]);
  const [adminNpPayouts, setAdminNpPayouts] = useState<any[]>([]);
  const [adminNpWallets, setAdminNpWallets] = useState<any[]>([]);
  const [adminNpWebhooks, setAdminNpWebhooks] = useState<any[]>([]);
  const [adminNpStats, setAdminNpStats] = useState<any>(null);
  const [npEnvStatus, setNpEnvStatus] = useState<{ hasApiKey: boolean; hasEmail: boolean; hasPassword: boolean; hasIpnSecret: boolean; has2FA: boolean; configured: boolean } | null>(null);
  const [adminNpLoading, setAdminNpLoading] = useState(false);
  const [adminNpSection, setAdminNpSection] = useState<string>('deposits');
  const [npConnectionTest, setNpConnectionTest] = useState<any>(null);
  const [npTestingConnection, setNpTestingConnection] = useState(false);

  // Split recipients state
  const [splitRecipients, setSplitRecipients] = useState<any[]>([]);
  const [splitSummary, setSplitSummary] = useState<any>(null);
  const [splitLogs, setSplitLogs] = useState<any[]>([]);
  const [splitLoading, setSplitLoading] = useState(false);
  const [splitEditRecipient, setSplitEditRecipient] = useState<any>(null);
  const [splitEditDialog, setSplitEditDialog] = useState(false);
  const [splitNewRecipient, setSplitNewRecipient] = useState({ name: '', role: 'partner', walletAddress: '', currency: 'usdttrc20', percentage: '', minPayout: '50', autoPayout: true });
  const [splitPayoutLoading, setSplitPayoutLoading] = useState(false);

  // Hydration guard: set mounted after first client render
  useEffect(() => {
    setMounted(true);
  }, []);

  // Check auth on mount
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      setAuthLoading(true);
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.user) {
          setUser(data.user);
          // Set initial tab based on role: admin goes to overview, user goes to home
          if (data.user.role === 'admin') {
            setActiveTab('overview');
            setAdminTab('overview');
          }
          return;
        }
      }
      setUser(null);
    } catch {
      setUser(null);
    } finally {
      setAuthLoading(false);
    }
  };

  // Fetch data when authenticated
  useEffect(() => {
    if (user) {
      fetchDashboardData();
      fetchAvailableCurrencies();
      // Fetch user vouchers on login so they're available for investment flow
      api<{ success: boolean; vouchers: any[] }>('/api/vouchers').then(data => {
        setUserVouchers(data.vouchers || []);
      }).catch(() => {});
    }
  }, [user]);

  // Fetch site config (deposit/withdrawal toggles) when authenticated
  // All values default to FALSE — only what admin explicitly enables is shown
  useEffect(() => {
    fetch('/api/site/config')
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          setSiteConfig(prev => ({
            ...prev,
            hasPix: data.hasPix ?? false,
            hasUsdt: data.hasUsdt ?? false,
            manualDepositEnabled: data.manualDepositEnabled ?? false,
            nowpaymentsEnabled: data.nowpaymentsEnabled ?? false,
            manualWithdrawalEnabled: data.manualWithdrawalEnabled ?? false,
            nowpaymentsWithdrawalEnabled: data.nowpaymentsWithdrawalEnabled ?? false,
            minDepositUsdt: data.minDepositUsdt ?? 10,
            maxDepositUsdt: data.maxDepositUsdt ?? 100000,
            minWithdrawalUsdt: data.minWithdrawalUsdt ?? 10,
            maxWithdrawalUsdt: data.maxWithdrawalUsdt ?? 50000,
            withdrawalFeePct: data.withdrawalFeePct ?? 0,
            siteName: data.siteName ?? 'PLATAFORMA ROI',
          }));
        }
      })
      .catch(() => {});
  }, []);

  const fetchAvailableCurrencies = async () => {
    try {
      const res = await fetch('/api/nowpayments/currencies');
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.deposit?.length > 0) {
          // Currencies come dynamically from NowPayments GET /merchant/coins API
          setAvailableDepositCurrencies(data.deposit);
          if (data.withdrawal?.length > 0) setAvailableWithdrawCurrencies(data.withdrawal);
          if (data.pixEnabled !== undefined) setPixEnabled(data.pixEnabled);
          // Store labels from API for dynamic display
          if (data.labels) setCurrencyLabels(data.labels);
        } else if (!data.success) {
          // Log the reason for debugging
          console.warn('[Deposit] Currencies not available:', data.reason, data.message);
        }
      }
    } catch {
      // No fallback on error — currencies must be properly configured
    }
  };

  const fetchDashboardData = async () => {
    setDataLoading(true);
    try {
      const [tradersRes, investmentsRes, txRes, rateRes] = await Promise.allSettled([
        api<{ success: boolean; traders: CopyTrader[] }>('/api/copy-traders'),
        api<{ success: boolean; investments: UserInvestment[] }>('/api/investments'),
        api<{ success: boolean; transactions: Transaction[] }>('/api/transactions'),
        api<{ success: boolean; rate: number }>('/api/exchange-rate'),
      ]);
      if (tradersRes.status === 'fulfilled') setCopyTraders(tradersRes.value.traders || []);
      if (investmentsRes.status === 'fulfilled') setUserInvestments(investmentsRes.value.investments || []);
      if (txRes.status === 'fulfilled') setTransactions(txRes.value.transactions || []);
      if (rateRes.status === 'fulfilled') setUsdtBrlRate(rateRes.value.rate || 5.5);
    } catch (e) {
      console.error('Dashboard data error:', e);
    } finally {
      setDataLoading(false);
    }
  };

  // Fetch withdrawal breakdown (Abordagem B — origin-based locking)
  const fetchWithdrawalBreakdown = async () => {
    try {
      const data = await api<{ success: boolean; balance: string; ownSource: string; voucherProfits: string; unlockPct: number; maxWithdrawable: string; hasActiveVoucher: boolean }>('/api/withdraw/breakdown');
      setWithdrawVoucherInfo({
        balance: d(data.balance),
        ownSource: d(data.ownSource),
        voucherProfits: d(data.voucherProfits),
        unlockPct: data.unlockPct,
        maxWithdrawable: d(data.maxWithdrawable),
        hasActiveVoucher: data.hasActiveVoucher,
      });
    } catch {
      // If breakdown fails, user can still withdraw — just won't have detailed info
      setWithdrawVoucherInfo(null);
    }
  };

  const fetchBitgetTraders = async (ranking?: string, search?: string) => {
    setBitgetLoading(true);
    try {
      const params = new URLSearchParams();
      if (ranking) params.set('ranking', ranking);
      if (search && search.trim()) params.set('search', search.trim());
      params.set('pageSize', '20');
      const res = await fetch(`/api/bitget/traders?${params.toString()}`);
      const data = await res.json();
      if (data.success && data.traders?.length > 0) {
        setBitgetTraders(data.traders);
      } else {
        // Fallback to DB copy traders if Bitget is blocked
        setBitgetTraders([]);
      }
    } catch (e) {
      console.error('Bitget traders error:', e);
      setBitgetTraders([]);
    } finally {
      setBitgetLoading(false);
    }
  };

  const fetchAffiliateData = async () => {
    setAffiliateLoading(true);
    try {
      const data = await api<{ success: boolean; affiliate: AffiliateData; ranks?: AffiliateRank[]; currentRank?: AffiliateRank | null; nextRank?: any; milestones?: AffiliateMilestone[]; contests?: AffiliateContest[]; leaderboard?: AffiliateLeaderboardEntry[]; badges?: AffiliateBadge[]; affiliateLevels?: AffiliateLevel[] }>('/api/affiliate');
      setAffiliateData({
        ...data.affiliate,
        ranks: data.ranks,
        currentRank: data.currentRank,
        nextRank: data.nextRank,
        nextRankReferralsNeeded: data.nextRank?.referralsNeeded,
        nextRankEarningsNeeded: data.nextRank?.earningsNeeded,
        milestones: data.milestones,
        contests: data.contests,
        leaderboard: data.leaderboard,
        badges: data.badges,
        affiliateLevels: data.affiliateLevels,
      });
    } catch (e) {
      console.error('Affiliate data error:', e);
    } finally {
      setAffiliateLoading(false);
    }
  };

  const fetchAdminData = async () => {
    setAdminLoading(true);
    try {
      const [statsRes, tradersRes, plansRes, usersRes, depsRes, wdsRes, configsRes, logsRes, affRes, affWdRes, ranksRes, milestonesRes, contestsRes, badgesRes, vouchersRes] = await Promise.allSettled([
        api<{ success: boolean; stats: AdminStats }>('/api/admin/stats'),
        api<{ success: boolean; traders: CopyTrader[] }>('/api/admin/copy-traders'),
        api<{ success: boolean; plans: InvestmentPlan[] }>('/api/admin/plans'),
        api<{ success: boolean; users: any[] }>('/api/admin/users'),
        api<{ success: boolean; deposits: Investment[] }>('/api/admin/deposits'),
        api<{ success: boolean; withdrawals: Investment[] }>('/api/admin/withdrawals'),
        api<{ success: boolean; configs: SystemConfig[] }>('/api/admin/config'),
        api<{ success: boolean; logs: AdminLog[] }>('/api/admin/logs'),
        api<{ success: boolean; levels: AffiliateLevel[]; commissions: any[]; stats: any }>('/api/admin/affiliates?action=stats'),
        api<{ success: boolean; withdrawals: any[] }>('/api/admin/affiliate-withdrawals?limit=50'),
        api<{ success: boolean; ranks: AffiliateRank[] }>('/api/admin/affiliate-ranks'),
        api<{ success: boolean; milestones: AffiliateMilestone[] }>('/api/admin/affiliate-milestones'),
        api<{ success: boolean; contests: AffiliateContest[] }>('/api/admin/affiliate-contests'),
        api<{ success: boolean; badges: any[] }>('/api/admin/affiliate-badges'),
        api<{ success: boolean; vouchers: any[] }>('/api/admin/vouchers'),
      ]);
      if (statsRes.status === 'fulfilled') setAdminStats(statsRes.value.stats);
      if (tradersRes.status === 'fulfilled') setAdminCopyTraders(tradersRes.value.traders || []);
      if (plansRes.status === 'fulfilled') setAdminPlans(plansRes.value.plans || []);
      if (usersRes.status === 'fulfilled') setAdminUsers(usersRes.value.users || []);
      if (depsRes.status === 'fulfilled') setAdminDeposits(depsRes.value.deposits || []);
      if (wdsRes.status === 'fulfilled') setAdminWithdrawals(wdsRes.value.withdrawals || []);
      if (configsRes.status === 'fulfilled') {
        const loadedConfigs = configsRes.value.configs || [];
        setAdminConfigs(loadedConfigs);
        // Auto-migrate: if key categories are missing, run migration silently
        const categories = new Set(loadedConfigs.map((c: SystemConfig) => c.category));
        if (!categories.has('branding') || !categories.has('withdrawal') || loadedConfigs.length < 30) {
          try {
            const migrateRes = await api<{ created: number }>('/api/admin/migrate-config', { method: 'POST' });
            if (migrateRes.created > 0) {
              // Reload configs after migration
              const freshConfigs = await api<{ success: boolean; configs: SystemConfig[] }>('/api/admin/config');
              setAdminConfigs(freshConfigs.configs || []);
            }
          } catch {
            // Migration failed silently — admin can use manual "Migrar Configs" button
          }
        }
      }
      if (logsRes.status === 'fulfilled') setAdminLogs(logsRes.value.logs || []);
      if (affRes.status === 'fulfilled') {
        setAdminAffiliates(affRes.value.stats);
        setAffiliateLevels(affRes.value.levels || []);
      }
      if (affWdRes.status === 'fulfilled') setAdminAffiliateWithdrawals(affWdRes.value.withdrawals || []);
      if (ranksRes.status === 'fulfilled') setAdminRanks(ranksRes.value.ranks || []);
      if (milestonesRes.status === 'fulfilled') setAdminMilestones(milestonesRes.value.milestones || []);
      if (contestsRes.status === 'fulfilled') setAdminContests(contestsRes.value.contests || []);
      if (badgesRes.status === 'fulfilled') setAdminBadges(badgesRes.value.badges || []);
      if (vouchersRes.status === 'fulfilled') setAdminVouchers(vouchersRes.value.vouchers || []);
    } catch (e) {
      console.error('Admin data error:', e);
    } finally {
      setAdminLoading(false);
    }
  };

  // Fetch user deposits (for Faturas tab)
  const fetchUserDeposits = async () => {
    setDepositsLoading(true);
    try {
      const data = await api<{ success: boolean; deposits: any[]; stats: any }>(`/api/nowpayments/user-deposits${depositFilter && depositFilter !== 'all' ? `?status=${depositFilter}` : ''}`);
      setUserDeposits(data.deposits || []);
      setUserDepositStats(data.stats || null);
    } catch (e) {
      console.error('User deposits error:', e);
    } finally {
      setDepositsLoading(false);
    }
  };

  // Fetch user payouts (for Saques tab)
  const fetchUserPayouts = async () => {
    setPayoutsLoading(true);
    try {
      const data = await api<{ success: boolean; withdrawals: any[]; stats: any }>(`/api/nowpayments/user-payouts${payoutFilter && payoutFilter !== 'all' ? `?status=${payoutFilter}` : ''}`);
      setUserPayouts(data.withdrawals || []);
      setUserPayoutStats(data.stats || null);
    } catch (e) {
      console.error('User payouts error:', e);
    } finally {
      setPayoutsLoading(false);
    }
  };

  // Fetch statement (for Extrato tab)
  const fetchStatement = async () => {
    setStatementLoading(true);
    try {
      const params = new URLSearchParams();
      if (statementFilter && statementFilter !== 'all') params.set('type', statementFilter);
      const data = await api<{ success: boolean; statement: any[]; summary: any }>(`/api/nowpayments/statement${params.toString() ? `?${params.toString()}` : ''}`);
      setStatementData(data.statement || []);
      setStatementSummary(data.summary || null);
    } catch (e) {
      console.error('Statement error:', e);
    } finally {
      setStatementLoading(false);
    }
  };

  // Fetch admin NowPayments data
  const fetchAdminNpData = async () => {
    setAdminNpLoading(true);
    try {
      const data = await api<{ success: boolean; deposits?: any[]; payouts?: any[]; wallets?: any[]; webhooks?: any[]; stats?: any }>('/api/admin/nowpayments?section=all');
      setAdminNpDeposits(data.deposits || []);
      setAdminNpPayouts(data.payouts || []);
      setAdminNpWallets(data.wallets || []);
      setAdminNpWebhooks(data.webhooks || []);
      setAdminNpStats(data.stats || null);
    } catch (e) {
      console.error('Admin NP data error:', e);
    } finally {
      setAdminNpLoading(false);
    }
  };

  const testNpConnection = async () => {
    setNpTestingConnection(true);
    try {
      // First fetch env var status
      const configData = await api<{ success: boolean; configured: boolean; config: { hasApiKey: boolean; hasEmail: boolean; hasPassword: boolean; hasIpnSecret: boolean; has2FA: boolean } }>('/api/nowpayments/config');
      setNpEnvStatus({
        hasApiKey: configData.config?.hasApiKey || false,
        hasEmail: configData.config?.hasEmail || false,
        hasPassword: configData.config?.hasPassword || false,
        hasIpnSecret: configData.config?.hasIpnSecret || false,
        has2FA: configData.config?.has2FA || false,
        configured: configData.configured || false,
      });

      // Then test connection
      const data = await api<{ success: boolean; connectionTest: any; message: string }>('/api/nowpayments/config', { method: 'PUT' });
      setNpConnectionTest(data.connectionTest);
      toast.success(data.message || 'Conexão testada');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao testar conexão');
      setNpConnectionTest({ connected: false, error: err.message });
    } finally {
      setNpTestingConnection(false);
    }
  };

  // Load Bitget traders when investir tab is selected
  useEffect(() => {
    if (activeTab === 'investir' && user) {
      if (bitgetTraders.length === 0) {
        fetchBitgetTraders(bitgetRanking);
      }
    }
  }, [activeTab, user]);

  // Load affiliate data when tab is selected
  useEffect(() => {
    if (activeTab === 'afiliados' && user) {
      fetchAffiliateData();
      // Fetch user vouchers
      setUserVouchersLoading(true);
      api<{ success: boolean; vouchers: any[] }>('/api/vouchers').then(data => {
        setUserVouchers(data.vouchers || []);
      }).catch(() => {}).finally(() => {
        setUserVouchersLoading(false);
      });
    }
  }, [activeTab, user]);

  // Fetch split recipients
  const fetchSplitData = async () => {
    setSplitLoading(true);
    try {
      const data = await api<{ success: boolean; recipients: any[]; summary: any; recentLogs: any[] }>('/api/admin/split-recipients');
      setSplitRecipients(data.recipients || []);
      setSplitSummary(data.summary || null);
      setSplitLogs(data.recentLogs || []);
    } catch (e) {
      console.error('Split data error:', e);
    } finally {
      setSplitLoading(false);
    }
  };

  // Load split data when section is selected
  useEffect(() => {
    if (adminNpSection === 'split' && user?.role === 'admin' && !splitLoading && splitRecipients.length === 0) {
      fetchSplitData();
    }
  }, [adminNpSection, user]);

  // Load deposits/payouts/statement when tabs are selected
  useEffect(() => {
    if (activeTab === 'faturas' && user) fetchUserDeposits();
  }, [activeTab, user, depositFilter]);

  useEffect(() => {
    if (activeTab === 'saques' && user) fetchUserPayouts();
  }, [activeTab, user, payoutFilter]);

  useEffect(() => {
    if (activeTab === 'extrato' && user) fetchStatement();
  }, [activeTab, user, statementFilter]);

  // Load admin data when admin tab is selected
  // For admin users, activeTab IS the admin section ID directly (e.g., 'overview', 'users')
  const adminTabIds = ['overview', 'copyTraders', 'plans', 'users', 'deposits', 'withdrawals', 'nowpayments', 'affiliates', 'affiliateWithdrawals', 'affiliateRanks', 'affiliateMilestones', 'affiliateContests', 'affiliateBadges', 'vouchers', 'config', 'marketing', 'logs'];
  const isAdminUser = user?.role === 'admin';
  // Admin tab is only active if the admin is in admin view mode AND the tab is an admin tab
  const isAdminTab = isAdminUser && adminViewMode === 'admin' && adminTabIds.includes(activeTab);

  // Sync adminTab state with activeTab for admin users
  useEffect(() => {
    if (isAdminUser && isAdminTab && adminTab !== activeTab) {
      setAdminTab(activeTab);
    }
  }, [activeTab, isAdminUser, isAdminTab]);

  useEffect(() => {
    if (isAdminUser && isAdminTab) fetchAdminData();
  }, [activeTab, isAdminUser]);

  // Initialize investAmount when investment dialog opens or plan changes
  // Also auto-select voucher if user has active vouchers
  useEffect(() => {
    if (investDialogPlan) {
      const plan = selectedPlanId
        ? investDialogPlan.plans?.find((p: any) => p.id === selectedPlanId)
        : investDialogPlan.plans?.[0];
      if (plan) {
        const minAmt = d(plan.minAmount) || 10;
        // If user has active vouchers, auto-check voucher and set amount from voucher/plan
        const activeVouchers = userVouchers.filter((v: any) => v.status === 'active');
        if (activeVouchers.length > 0) {
          const bestVoucher = activeVouchers.sort((a: any, b: any) => (d(b.amount) - d(b.usedAmount)) - (d(a.amount) - d(a.usedAmount)))[0];
          const voucherAvail = d(bestVoucher.amount) - d(bestVoucher.usedAmount);
          const investAmt = Math.min(voucherAvail, d(plan.maxAmount) || 100000);
          // Only auto-set if amount is greater or equal to minAmount
          if (investAmt >= minAmt) {
            setInvestAmount(String(minAmt));
            setUseVoucherForInvest(true);
            setSelectedVoucherId(bestVoucher.id);
          } else {
            setInvestAmount(String(minAmt));
          }
        } else {
          setInvestAmount(String(minAmt));
        }
      } else if (investDialogPlan.plans?.length > 0) {
        setInvestAmount(String(d(investDialogPlan.plans[0].minAmount) || 10));
      }
    }
  }, [investDialogPlan, selectedPlanId, userVouchers]);

  // Load admin NowPayments data when that sub-tab is selected
  useEffect(() => {
    if (isAdminUser && activeTab === 'nowpayments') {
      fetchAdminNpData();
      // Also fetch env var status on tab open
      api<{ success: boolean; configured: boolean; config: { hasApiKey: boolean; hasEmail: boolean; hasPassword: boolean; hasIpnSecret: boolean; has2FA: boolean } }>('/api/nowpayments/config')
        .then(data => {
          setNpEnvStatus({
            hasApiKey: data.config?.hasApiKey || false,
            hasEmail: data.config?.hasEmail || false,
            hasPassword: data.config?.hasPassword || false,
            hasIpnSecret: data.config?.hasIpnSecret || false,
            has2FA: data.config?.has2FA || false,
            configured: data.configured || false,
          });
        })
        .catch(() => {});
    }
  }, [activeTab, isAdminUser]);

  // ==========================================
  // NOTIFICATION SYSTEM: Load from storage + generate from transactions
  // ==========================================
  const addNotification = useCallback((notif: Omit<AppNotification, 'id' | 'timestamp' | 'read'>) => {
    if (!user) return;
    setNotifications(prev => {
      // Deduplicate by title+message within last 60 seconds
      const recent = prev.find(n => n.title === notif.title && n.message === notif.message && Date.now() - new Date(n.timestamp).getTime() < 60000);
      if (recent) return prev;
      const newNotif: AppNotification = { ...notif, id: createNotifId(), timestamp: new Date().toISOString(), read: false };
      const updated = [newNotif, ...prev].slice(0, MAX_NOTIFICATIONS);
      saveNotifications(user.id, updated);
      // Show toast notification for immediate visibility
      try { toast(notif.title, { description: notif.message, duration: 4000 }); } catch {}
      return updated;
    });
  }, [user]);

  const markAllRead = useCallback(() => {
    if (!user) return;
    setNotifications(prev => {
      const updated = prev.map(n => ({ ...n, read: true }));
      saveNotifications(user.id, updated);
      return updated;
    });
  }, [user]);

  const clearNotifications = useCallback(() => {
    if (!user) return;
    setNotifications([]);
    saveNotifications(user.id, []);
  }, [user]);

  // Load notifications from localStorage on mount
  useEffect(() => {
    if (!user) return;
    setNotifications(loadNotifications(user.id));
  }, [user?.id]);

  // Generate notifications from new transactions (detected during polling)
  const lastProcessedTxId = React.useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!user || transactions.length === 0) return;
    for (const tx of transactions) {
      if (lastProcessedTxId.current.has(tx.id)) continue;
      lastProcessedTxId.current.add(tx.id);
      // Only notify for recent transactions (last 5 minutes)
      const txAge = Date.now() - new Date(tx.createdAt).getTime();
      if (txAge > 300000) continue;
      if (tx.type === 'roi_profit') {
        addNotification({ type: 'roi', title: '💰 ROI Diário', message: tx.description || `+$${d(tx.amount).toFixed(4)} USDT`, amount: tx.amount });
      } else if (tx.type === 'affiliate_commission') {
        addNotification({ type: 'affiliate', title: '🤝 Comissão de afiliado', message: tx.description || `+$${d(tx.amount).toFixed(4)} USDT`, amount: tx.amount });
      } else if (tx.type === 'deposit') {
        addNotification({ type: 'deposit', title: '📥 Depósito confirmado', message: tx.description || `+$${d(tx.amount).toFixed(2)} USDT`, amount: tx.amount });
      } else if (tx.type === 'withdrawal') {
        if (tx.status === 'completed' || tx.status === 'pending') {
          addNotification({ type: 'withdrawal', title: '📤 Saque processado', message: tx.description || `-$${d(tx.amount).toFixed(2)} USDT`, amount: tx.amount });
        }
      } else if (tx.type === 'investment') {
        addNotification({ type: 'investment', title: '📈 Investimento ativado', message: tx.description || `$${d(tx.amount).toFixed(2)} USDT`, amount: tx.amount });
      }
    }
  }, [transactions, user, addNotification]);

  // ==========================================
  // REAL-TIME POLLING: Auto-refresh user data every 30 seconds
  // Detects new ROI earnings and shows flash animation + notification
  // ==========================================
  useEffect(() => {
    if (!user) return;

    setIsLivePolling(true);

    // Poll user balance every 30 seconds to detect new earnings
    const pollInterval = setInterval(async () => {
      try {
        // Refresh user data
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.user) {
            const oldBalance = d(user.balance);
            const newBalance = d(data.user.balance);
            const oldTotalMined = d(user.totalRoi);
            const newTotalMined = d(data.user.totalRoi);

            // Detect new earnings (balance increased from ROI)
            if (newBalance > oldBalance && oldTotalMined < newTotalMined) {
              const earningsDiff = newBalance - oldBalance;
              setRoiFlash(earningsDiff);
              // Auto-dismiss flash after 5 seconds
              setTimeout(() => setRoiFlash(null), 5000);
              // Push notification for ROI earnings
              addNotification({ type: 'roi', title: '💰 ROI Diário', message: `+$${earningsDiff.toFixed(4)} USDT creditado`, amount: earningsDiff.toFixed(8) });
            }

            // Detect affiliate balance increase
            const oldAffBal = d(user.affiliateBalance);
            const newAffBal = d(data.user.affiliateBalance);
            if (newAffBal > oldAffBal && newAffBal - oldAffBal > 0.001) {
              const affDiff = newAffBal - oldAffBal;
              addNotification({ type: 'affiliate', title: '🤝 Comissão recebida', message: `+$${affDiff.toFixed(4)} USDT em comissões`, amount: affDiff.toFixed(8) });
            }

            // Update user state silently (no loading spinner)
            setUser(data.user);
          }
        }

        // Also refresh transactions to show new roi_profit entries
        const txRes = await fetch('/api/transactions?limit=10');
        if (txRes.ok) {
          const txData = await txRes.json();
          if (txData.success) {
            setTransactions(txData.transactions || []);
          }
        }
      } catch {
        // Silent fail for background polling
      }
    }, 30000); // Every 30 seconds

    return () => {
      clearInterval(pollInterval);
      setIsLivePolling(false);
    };
  }, [user?.id, user?.balance]);

  // ==========================================
  // COUNTDOWN: Next distribution timer
  // Updates every second (uses userInvestments directly, not activeInvestments which is computed later)
  // ==========================================
  const hasActiveRentals = userInvestments.some(r => r.status === 'active');
  useEffect(() => {
    if (!user || !hasActiveRentals) return;

    const updateCountdown = () => {
      const now = new Date();
      const nextMidnight = new Date(now);
      nextMidnight.setUTCDate(nextMidnight.getUTCDate() + 1);
      nextMidnight.setUTCHours(0, 0, 0, 0);

      const diff = nextMidnight.getTime() - now.getTime();
      if (diff <= 0) return;

      setNextDistribution({
        hours: Math.floor(diff / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000),
      });
    };

    updateCountdown();
    const countdownInterval = setInterval(updateCountdown, 1000);

    return () => clearInterval(countdownInterval);
  }, [user, hasActiveRentals]);

  // ==========================================
  // TODAY'S EARNINGS: Fetch from ROI history
  // ==========================================
  useEffect(() => {
    if (!user) return;

    const fetchTodayEarnings = async () => {
      try {
        const res = await fetch('/api/roi-history?limit=1');
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            setTodayEarnings(data.todayEarnings || '0');
          }
        }
      } catch {
        // Silent fail
      }
    };

    fetchTodayEarnings();
    // Refresh every 60 seconds
    const earningsInterval = setInterval(fetchTodayEarnings, 60000);
    return () => clearInterval(earningsInterval);
  }, [user?.id]);

  // Fetch landing page data when NOT authenticated
  useEffect(() => {
    if (!user && !authLoading) {
      fetch('/api/landing')
        .then(r => r.json())
        .then(data => {
          if (data.success) {
            setLandingTraders(data.traders || data.plans || []);
            setLandingAffiliateLevels(data.affiliateLevels || []);
            setLandingStats(data.stats || null);
            setLandingConfig(data.config || null);
            setLandingRate(data.usdtBrlRate || 5.5);
          }
        })
        .catch(() => {});
      // Also fetch real Bitget traders for landing page
      fetch('/api/bitget/traders?ranking=profit_rate&pageSize=6')
        .then(r => r.json())
        .then(data => {
          if (data.success && data.traders?.length > 0) {
            setLandingBitgetTraders(data.traders);
          }
        })
        .catch(() => {});
    }
  }, [user, authLoading]);

  // Auth handlers
  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoginLoading(true);
    try {
      const form = e.currentTarget;
      const data = await api<{ success: boolean; user: User }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: (form.email as HTMLInputElement).value,
          password: (form.password as HTMLInputElement).value,
        }),
      });
      setUser(data.user);
      setShowAuth(false);
      toast.success(t('toast.loginSuccess'));
    } catch (err: any) {
      toast.error(err.message || t('toast.loginError'));
    } finally {
      setLoginLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoginLoading(true);
    try {
      const form = e.currentTarget;
      const data = await api<{ success: boolean; user: User }>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          name: (form.name as HTMLInputElement).value,
          email: (form.email as HTMLInputElement).value,
          password: (form.password as HTMLInputElement).value,
          confirmPassword: (form.confirmPassword as HTMLInputElement).value,
          referralCode: (form.referralCode as HTMLInputElement)?.value || undefined,
        }),
      });
      setUser(data.user);
      setShowAuth(false);
      toast.success(t('toast.registerSuccess'));
    } catch (err: any) {
      toast.error(err.message || t('toast.registerError'));
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await api('/api/auth/logout', { method: 'POST' });
    } catch { /* ignore */ }
    setUser(null);
    setActiveTab('home');
    toast.success(t('toast.logoutSuccess'));
  };

  // Rental handler
  const handleRent = async () => {
    if (!investDialogPlan) return;
    setInvestLoading(true);
    try {
      // Get the selected plan details to send with the investment
      const selectedPlan = selectedPlanId
        ? investDialogPlan.plans?.find((p: any) => p.id === selectedPlanId)
        : investDialogPlan.plans?.[0];
      await api('/api/investments', {
        method: 'POST',
        body: JSON.stringify({
          planId: selectedPlanId || investDialogPlan.plans?.[0]?.id || '',
          amount: rentalCalc.totalPrice,
          useVoucher: useVoucherForInvest,
          voucherId: useVoucherForInvest ? selectedVoucherId : undefined,
          // Send plan params so backend can use them if plan doesn't exist in DB
          dailyRoiPct: selectedPlan?.dailyRoiPct || '5',
          durationDays: selectedPlan?.durationDays || selectedPlan?.days || 35,
          planName: selectedPlan?.name || investDialogPlan.name,
        }),
      });
      toast.success(useVoucherForInvest ? t('toast.voucherInvestSuccess') : t('toast.rentSuccess'));
      setInvestDialogPlan(null);
      setSelectedPlanId(undefined);
      setUseVoucherForInvest(false);
      setSelectedVoucherId('');
      setInvestAmount('');
      fetchDashboardData();
      checkAuth();
      // Refresh voucher data if on affiliates tab
      if (activeTab === 'afiliados') {
        api<{ success: boolean; vouchers: any[] }>('/api/vouchers').then(data => {
          setUserVouchers(data.vouchers || []);
        }).catch(() => {});
      }
    } catch (err: any) {
      toast.error(err.message || t('toast.rentError'));
    } finally {
      setInvestLoading(false);
    }
  };

  // Deposit handler
  const handleDeposit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setDepositLoading(true);
    try {
      const form = e.currentTarget;
      const data = await api('/api/deposit', {
        method: 'POST',
        body: JSON.stringify({
          amount: parseFloat((form.amount as HTMLInputElement).value),
          method: (form.method as HTMLSelectElement).value,
          txHash: (form.txHash as HTMLInputElement)?.value || undefined,
        }),
      });
      toast.success(data.message || t('toast.depositSuccess'));
      setDepositDialog(false);
      fetchDashboardData();
      checkAuth();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setDepositLoading(false);
    }
  };

  // NowPayments deposit - generate wallet address
  const handleNowPaymentsDeposit = async () => {
    const minAmount = siteConfig?.minDepositUsdt || 10;
    if (!npDepositAmount || parseFloat(npDepositAmount) < minAmount) {
      toast.error(`Valor mínimo: ${minAmount} USDT`);
      return;
    }
    setNpGeneratingAddress(true);
    try {
      const data = await api<{ success: boolean; depositId: string; deposit: any; paymentInfo: any; message: string }>('/api/nowpayments/deposit', {
        method: 'POST',
        body: JSON.stringify({
          amount: parseFloat(npDepositAmount),
          pay_currency: npDepositCurrency,
        }),
      });
      if (data.paymentInfo?.depositAddress) {
        setNpDepositAddress(data.paymentInfo.depositAddress);
        setNpDepositPaymentId(data.paymentInfo.paymentId?.toString() || null);
        setNpDepositId(data.depositId || null);
        setNpPayAmount(data.paymentInfo.payAmount ? String(data.paymentInfo.payAmount) : null);
        setNpPriceAmount(data.paymentInfo.priceAmount || parseFloat(npDepositAmount));
        setNpExpirationDate(data.paymentInfo.expirationDate || null);
        setNpEstimatedFee(data.paymentInfo.estimatedFee || 0);
        setNpDepositStatus('waiting');
        toast.success('Endereço de depósito gerado! Envie o valor para a carteira abaixo.');
        // Refresh deposits list so the new invoice appears in Faturas tab
        fetchUserDeposits();
      } else {
        // Should not reach here anymore - API returns error if no address
        toast.error('Não foi possível gerar o endereço de depósito. Tente novamente.');
      }
    } catch (err: any) {
      // Show the specific error message from the API
      const errorMsg = err.message || 'Erro ao gerar endereço de depósito';
      toast.error(errorMsg);
    } finally {
      setNpGeneratingAddress(false);
    }
  };

  // Copy deposit address to clipboard
  const copyDepositAddress = () => {
    if (npDepositAddress) {
      navigator.clipboard.writeText(npDepositAddress);
      setNpAddressCopied(true);
      setTimeout(() => setNpAddressCopied(false), 2000);
    }
  };

  const resetNpDeposit = () => {
    setNpDepositAddress(null);
    setNpDepositAmount('');
    setNpDepositCurrency('usdttrc20');
    setNpDepositStatus(null);
    setNpDepositPaymentId(null);
    setNpAddressCopied(false);
    setNpDepositId(null);
    setNpPayAmount(null);
    setNpPriceAmount(null);
    setNpExpirationDate(null);
    setNpEstimatedFee(0);
    setNpCountdown('');
  };

  // Poll NowPayments deposit status
  useEffect(() => {
    if (!npDepositPaymentId || !npDepositAddress) return;
    const poll = setInterval(async () => {
      try {
        const data = await api<{ success: boolean; type: string; deposit: { paymentStatus: string } }>(`/api/nowpayments/status?nowpaymentsPaymentId=${npDepositPaymentId}`);
        const status = data.deposit?.paymentStatus;
        if (status && status !== npDepositStatus) {
          setNpDepositStatus(status);
          if (['finished', 'confirmed', 'sending'].includes(status)) {
            toast.success('Depósito confirmado! Saldo creditado.');
            setDepositDialog(false);
            resetNpDeposit();
            fetchDashboardData();
            checkAuth();
          } else if (['failed', 'expired', 'refunded'].includes(status)) {
            toast.error('Depósito falhou ou expirou.');
            setNpDepositStatus(status);
          }
        }
      } catch { /* ignore poll errors */ }
    }, 15000);
    return () => clearInterval(poll);
  }, [npDepositPaymentId, npDepositAddress, npDepositStatus]);

  // Countdown timer for deposit expiration
  useEffect(() => {
    if (!npExpirationDate || !npDepositAddress) return;
    const updateCountdown = () => {
      const now = Date.now();
      const expiry = new Date(npExpirationDate).getTime();
      const diff = expiry - now;
      if (diff <= 0) {
        setNpCountdown('Expirado');
        return;
      }
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      setNpCountdown(`${hours}h ${minutes}m ${seconds}s`);
    };
    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, [npExpirationDate, npDepositAddress]);

  // Withdraw handler - tries NowPayments first for crypto, falls back to manual
  const handleWithdraw = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setWithdrawLoading(true);
    try {
      const form = e.currentTarget;
      const amount = parseFloat((form.amount as HTMLInputElement).value);
      const method = (form.method as HTMLSelectElement).value;
      const destination = (form.destination as HTMLInputElement).value;

      // Try NowPayments withdrawal first for crypto methods
      if (['usdt_trc20', 'usdt_polygon', 'btc', 'eth', 'trx'].includes(method)) {
        try {
          const data = await api('/api/nowpayments/withdraw', {
            method: 'POST',
            body: JSON.stringify({ amount, currency: method, destination_address: destination }),
          });
          toast.success(data.message || 'Saque solicitado via NowPayments');
          setWithdrawDialog(false);
          fetchDashboardData();
          checkAuth();
          return;
        } catch (npErr: any) {
          // If NowPayments fails, fall back to manual withdrawal
          console.warn('NowPayments withdrawal failed, falling back to manual:', npErr.message);
        }
      }

      // Fallback to manual withdrawal
      const data = await api('/api/withdraw', {
        method: 'POST',
        body: JSON.stringify({ amount, method, destination }),
      });
      toast.success(data.message || t('toast.withdrawSuccess'));
      setWithdrawDialog(false);
      fetchDashboardData();
      checkAuth();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setWithdrawLoading(false);
    }
  };

  // Profile update
  const handleProfileUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      const form = e.currentTarget;
      await api('/api/user', {
        method: 'PUT',
        body: JSON.stringify({
          name: (form.name as HTMLInputElement).value,
          walletAddress: (form.walletAddress as HTMLInputElement).value,
          pixKey: (form.pixKey as HTMLInputElement).value,
        }),
      });
      toast.success(t('toast.profileSuccess'));
      checkAuth();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  // Affiliate unlock
  const handleUnlockAffiliate = async () => {
    try {
      await api('/api/affiliate', { method: 'POST' });
      toast.success(t('toast.affiliateUnlockSuccess'));
      fetchAffiliateData();
      checkAuth();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  // Affiliate withdraw
  const handleAffiliateWithdraw = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      const form = e.currentTarget;
      await api('/api/affiliate/withdraw', {
        method: 'POST',
        body: JSON.stringify({
          amount: parseFloat((form.amount as HTMLInputElement).value),
          method: (form.method as HTMLSelectElement).value,
          destination: (form.destination as HTMLInputElement).value,
        }),
      });
      toast.success(t('toast.affiliateWithdrawSuccess'));
      fetchAffiliateData();
      checkAuth();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  // Milestone claim
  const handleClaimMilestone = async (milestoneId: string) => {
    try {
      await api('/api/affiliate', {
        method: 'POST',
        body: JSON.stringify({ milestoneId }),
      });
      toast.success(t('affiliates.milestoneReached'));
      fetchAffiliateData();
      checkAuth();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  // Admin CRUD handlers
  const handleAdminTraderSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setAdminActionLoading(true);
    try {
      const form = e.currentTarget;
      const body: any = {
        name: (form.name as HTMLInputElement).value,
        specialty: (form.specialty as HTMLInputElement)?.value || 'DeFi',
        winRate: (form.winRate as HTMLInputElement)?.value || '87',
        totalPnl: (form.totalPnl as HTMLInputElement)?.value || '0',
        monthlyRoi: (form.monthlyRoi as HTMLInputElement)?.value || '150',
        riskLevel: (form.riskLevel as HTMLSelectElement)?.value || 'medium',
        isActive: (form.isActive as HTMLInputElement).checked,
        isFeatured: (form.isFeatured as HTMLInputElement).checked,
        sortOrder: parseInt((form.sortOrder as HTMLInputElement).value) || 0,
      };
      if (traderDialog.trader) {
        body.id = traderDialog.trader.id;
        await api('/api/admin/copy-traders', { method: 'PUT', body: JSON.stringify(body) });
        toast.success(t('toast.adminUpdateSuccess'));
      } else {
        await api('/api/admin/copy-traders', { method: 'POST', body: JSON.stringify(body) });
        toast.success(t('toast.adminCreateSuccess'));
      }
      setTraderDialog({ open: false });
      fetchAdminData();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setAdminActionLoading(false);
    }
  };

  const handleAdminPlanSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setAdminActionLoading(true);
    try {
      const form = e.currentTarget;
      const body: any = {
        name: (form.name as HTMLInputElement).value,
        description: (form.description as HTMLInputElement)?.value || undefined,
        dailyRoiPct: (form.dailyRoiPct as HTMLInputElement)?.value || '5',
        durationDays: parseInt((form.durationDays as HTMLInputElement)?.value) || 40,
        minAmount: (form.minAmount as HTMLInputElement)?.value || '10',
        maxAmount: (form.maxAmount as HTMLInputElement)?.value || undefined,
        isActive: (form.isActive as HTMLInputElement).checked,
        isFeatured: (form.isFeatured as HTMLInputElement).checked,
        sortOrder: parseInt((form.sortOrder as HTMLInputElement).value) || 0,
      };
      if (planDialog.plan) {
        body.id = planDialog.plan?.id;
        await api('/api/admin/plans', { method: 'PUT', body: JSON.stringify(body) });
        toast.success(t('toast.adminPlanUpdateSuccess'));
      } else {
        await api('/api/admin/plans', { method: 'POST', body: JSON.stringify(body) });
        toast.success(t('toast.adminPlanCreateSuccess'));
      }
      setPlanDialog({ open: false });
      fetchAdminData();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setAdminActionLoading(false);
    }
  };

  const handleAdminUserUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setAdminActionLoading(true);
    try {
      const form = e.currentTarget;
      const body: any = { id: userDialog.user.id };
      const fields = ['name', 'role', 'balance', 'affiliateBalance', 'walletAddress', 'pixKey'];
      fields.forEach(f => {
        const el = (form as any)[f] as HTMLInputElement;
        if (el) body[f] = el.value;
      });
      body.isActive = (form.isActive as HTMLInputElement).checked;
      body.linkUnlocked = (form.linkUnlocked as HTMLInputElement).checked;
      await api('/api/admin/users', { method: 'PUT', body: JSON.stringify(body) });
      toast.success(t('toast.adminUserUpdateSuccess'));
      setUserDialog({ open: false });
      fetchAdminData();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setAdminActionLoading(false);
    }
  };

  const handleAdminAffWithdrawalAction = async (id: string, action: 'approve' | 'reject' | 'complete') => {
    try {
      await api('/api/admin/affiliate-withdrawals', {
        method: 'PUT',
        body: JSON.stringify({ id, action }),
      });
      toast.success(t('toast.adminActionSuccess'));
      fetchAdminData();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleAdminDepositAction = async (id: string, action: 'approve' | 'reject') => {
    setNotesDialog({ open: true, id, action, type: 'deposit' });
    setAdminNotes('');
  };

  const handleAdminWithdrawalAction = async (id: string, action: 'approve' | 'reject' | 'complete') => {
    setNotesDialog({ open: true, id, action, type: 'withdrawal' });
    setAdminNotes('');
  };

  const handleAdminDelete = async () => {
    setAdminActionLoading(true);
    try {
      if (deleteConfirm.type === 'trader') {
        await api(`/api/admin/copy-traders?id=${deleteConfirm.id}`, { method: 'DELETE' });
        toast.success(t('toast.adminTraderDeactivateSuccess'));
      } else if (deleteConfirm.type === 'plan') {
        await api(`/api/admin/plans?id=${deleteConfirm.id}`, { method: 'DELETE' });
        toast.success(t('toast.adminPlanDeactivateSuccess'));
      }
      setDeleteConfirm({ open: false, type: '', id: '', name: '' });
      fetchAdminData();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setAdminActionLoading(false);
    }
  };

  const handleAdminConfigSave = async (config: SystemConfig, newValue: string) => {
    try {
      await api('/api/admin/config', {
        method: 'POST',
        body: JSON.stringify({ key: config.key, value: newValue, type: config.type, description: config.description, category: config.category }),
      });
      toast.success(t('toast.adminConfigSaveSuccess'));
      fetchAdminData();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleBatchConfigSave = async (category: string) => {
    setConfigSaving(category);
    try {
      const catConfigs = adminConfigs.filter(c => c.category === category);
      const changedConfigs = catConfigs
        .filter(c => configEdits[c.key] !== undefined && configEdits[c.key] !== c.value)
        .map(c => ({
          key: c.key,
          value: configEdits[c.key] ?? c.value,
          type: c.type,
          description: c.description ?? undefined,
          category: c.category,
        }));

      if (changedConfigs.length === 0) {
        toast.info(t('toast.adminConfigNoChanges'));
        setConfigSaving(null);
        return;
      }

      await api('/api/admin/config', {
        method: 'PUT',
        body: JSON.stringify({ configs: changedConfigs }),
      });
      toast.success(t('toast.adminConfigBatchSuccess', { count: String(changedConfigs.length) }));
      // Clear edits for this category
      setConfigEdits(prev => {
        const next = { ...prev };
        catConfigs.forEach(c => delete next[c.key]);
        return next;
      });
      fetchAdminData();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setConfigSaving(null);
    }
  };

  const handleRegeneratePlans = async () => {
    setRemoveLoading(true);
    try {
      const data = await api<{ success: boolean; totalCreated: number; minersProcessed: number }>('/api/admin/copy-traders', { method: 'POST' });
      toast.success(t('toast.adminRegenerateSuccess', { count: String(data.totalCreated), copyTraders: String(data.plansProcessed) }));
      fetchAdminData();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setRemoveLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const currentPassword = (form.currentPassword as HTMLInputElement).value;
    const newPassword = (form.newPassword as HTMLInputElement).value;
    const confirmPassword = (form.confirmPassword as HTMLInputElement).value;
    if (newPassword !== confirmPassword) {
      toast.error(t('toast.passwordMismatch'));
      return;
    }
    try {
      await api('/api/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      toast.success(t('toast.passwordChangeSuccess'));
      setChangePasswordDialog(false);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleNotesAction = async () => {
    const { id, action, type } = notesDialog;
    try {
      if (type === 'deposit') {
        await api('/api/admin/deposits', {
          method: 'PUT',
          body: JSON.stringify({ id, action, adminNotes }),
        });
        toast.success(action === 'approve' ? t('toast.adminDepositApproveSuccess') : t('toast.adminDepositRejectSuccess'));
      } else {
        await api('/api/admin/withdrawals', {
          method: 'PUT',
          body: JSON.stringify({ id, action, adminNotes }),
        });
        toast.success(action === 'approve' ? t('toast.adminWithdrawApproveSuccess') : action === 'complete' ? t('toast.adminWithdrawCompleteSuccess') : t('toast.adminWithdrawRejectSuccess'));
      }
      setNotesDialog({ open: false, id: '', action: 'approve', type: 'deposit' });
      setAdminNotes('');
      fetchAdminData();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleAdminAffiliateLevelSave = async (levels: AffiliateLevel[]) => {
    try {
      await api('/api/admin/affiliates', { method: 'PUT', body: JSON.stringify(levels) });
      toast.success(t('toast.adminAffiliateLevelSuccess'));
      fetchAdminData();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleAdminRankSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setAdminActionLoading(true);
    try {
      const form = e.currentTarget;
      const body: any = {
        name: (form.name as HTMLInputElement).value,
        icon: (form.icon as HTMLInputElement).value,
        color: (form.color as HTMLInputElement).value,
        minReferrals: parseInt((form.minReferrals as HTMLInputElement).value) || 0,
        minEarnings: (form.minEarnings as HTMLInputElement).value || '0',
        bonusAmount: (form.bonusAmount as HTMLInputElement).value || '0',
        commissionBoost: (form.commissionBoost as HTMLInputElement).value || '0',
        perks: (form.perks as HTMLInputElement)?.value || null,
        sortOrder: parseInt((form.sortOrder as HTMLInputElement).value) || 0,
        isActive: (form.isActive as HTMLInputElement).checked,
      };
      if (rankDialog.rank) {
        body.id = rankDialog.rank.id;
        await api('/api/admin/affiliate-ranks', { method: 'PUT', body: JSON.stringify(body) });
      } else {
        await api('/api/admin/affiliate-ranks', { method: 'POST', body: JSON.stringify(body) });
      }
      toast.success(t('toast.adminActionSuccess'));
      setRankDialog({ open: false });
      fetchAdminData();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setAdminActionLoading(false);
    }
  };

  const handleAdminMilestoneSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setAdminActionLoading(true);
    try {
      const form = e.currentTarget;
      const body: any = {
        name: (form.name as HTMLInputElement).value,
        description: (form.description as HTMLInputElement)?.value || null,
        targetCount: parseInt((form.targetCount as HTMLInputElement).value) || 1,
        rewardType: (form.rewardType as HTMLSelectElement).value,
        rewardValue: (form.rewardValue as HTMLInputElement).value || '0',
        icon: (form.icon as HTMLInputElement).value || '🎯',
        sortOrder: parseInt((form.sortOrder as HTMLInputElement).value) || 0,
        isActive: (form.isActive as HTMLInputElement).checked,
      };
      if (milestoneDialog.milestone) {
        body.id = milestoneDialog.milestone.id;
        await api('/api/admin/affiliate-milestones', { method: 'PUT', body: JSON.stringify(body) });
      } else {
        await api('/api/admin/affiliate-milestones', { method: 'POST', body: JSON.stringify(body) });
      }
      toast.success(t('toast.adminActionSuccess'));
      setMilestoneDialog({ open: false });
      fetchAdminData();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setAdminActionLoading(false);
    }
  };

  const handleAdminContestSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setAdminActionLoading(true);
    try {
      const form = e.currentTarget;
      const body: any = {
        name: (form.name as HTMLInputElement).value,
        description: (form.description as HTMLInputElement)?.value || null,
        startDate: new Date((form.startDate as HTMLInputElement).value).toISOString(),
        endDate: new Date((form.endDate as HTMLInputElement).value).toISOString(),
        rewardPool: (form.rewardPool as HTMLInputElement).value || '0',
        metric: (form.metric as HTMLSelectElement).value,
        isActive: (form.isActive as HTMLInputElement).checked,
        isFeatured: (form.isFeatured as HTMLInputElement).checked,
      };
      if (contestDialog.contest) {
        body.id = contestDialog.contest.id;
        await api('/api/admin/affiliate-contests', { method: 'PUT', body: JSON.stringify(body) });
      } else {
        await api('/api/admin/affiliate-contests', { method: 'POST', body: JSON.stringify(body) });
      }
      toast.success(t('toast.adminActionSuccess'));
      setContestDialog({ open: false });
      fetchAdminData();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setAdminActionLoading(false);
    }
  };

  // Computed values
  const activeInvestments = useMemo(() => userInvestments.filter(r => r.status === 'active'), [userInvestments]);
  const balanceBRL = d(user?.balance) * usdtBrlRate;
  const affiliateBalanceBRL = d(user?.affiliateBalance) * usdtBrlRate;
  const voucherBalanceBRL = d(user?.voucherBalance) * usdtBrlRate;

  // ==========================================
  // PERSISTED EARNINGS CALCULATION
  // Calculates accumulated earnings since each investment started.
  // This is deterministic and survives page refreshes — no DB writes needed.
  // Formula: dailyReturn × (seconds_elapsed / 86400)
  // ==========================================
  const accumulatedEarnings = useMemo(() => {
    if (activeInvestments.length === 0) return 0;
    const now = Date.now();
    return activeInvestments.reduce((sum, r) => {
      const start = new Date(r.startDate).getTime();
      const elapsedSeconds = Math.max(0, (now - start) / 1000);
      const earned = d(r.dailyRoi) * (elapsedSeconds / 86400);
      return sum + earned;
    }, 0);
  }, [activeInvestments]);

  // Per-investment accumulated earnings (for individual trading bot cards)
  const rentalAccumulatedEarnings = useMemo(() => {
    if (activeInvestments.length === 0) return [];
    const now = Date.now();
    return activeInvestments.map(r => {
      const start = new Date(r.startDate).getTime();
      const elapsedSeconds = Math.max(0, (now - start) / 1000);
      return d(r.dailyRoi) * (elapsedSeconds / 86400);
    });
  }, [activeInvestments]);

  // ==========================================
  // LIVE TRADING OPERATION SIMULATION
  // Simulates real-time trading activity visuals
  // Updates every second for immersive experience
  // Must be placed AFTER activeInvestments useMemo to avoid TDZ error
  // The base earnings come from accumulatedEarnings (calculated, never resets)
  // The per-second tick adds real-time increments on top
  // ==========================================
  useEffect(() => {
    if (!mounted || !user || activeInvestments.length === 0) return;

    // Initialize per-investment state
    const initShares = activeInvestments.map(() => ({ valid: Math.floor(Math.random() * 5000) + 2000, invalid: Math.floor(Math.random() * 50) + 10 }));
    const initVolatility = activeInvestments.map(() => 15 + Math.random() * 30); // 15-45% volatility index
    const initWinRates = activeInvestments.map(r => {
      const base = parseFloat(r.plan?.winRate || '0');
      return base * (0.97 + Math.random() * 0.06); // ±3% fluctuation
    });
    setLiveShares(initShares);
    setLiveVolatility(initVolatility);
    setLiveWinRates(initWinRates);
    // Start from accumulated earnings (calculated from investment start dates — never resets)
    setLiveEarnings(accumulatedEarnings);
    setLiveEarningsFeed([]);
    setLiveEarningsCounter(0);
    setLiveBlocks(0);

    let feedIdCounter = 0;
    let blockCounter = 0;

    // Main 1-second tick for the live trading simulation
    const liveInterval = setInterval(() => {
      // Update cumulative earnings (daily rate / 86400 seconds)
      const totalDailyRate = activeInvestments.reduce((sum, r) => sum + d(r.dailyRoi), 0);
      const perSecond = totalDailyRate / 86400;
      setLiveEarnings(prev => prev + perSecond);

      // Fluctuate win rates slightly (±1%)
      setLiveWinRates(prev => prev.map((hr, i) => {
        const base = parseFloat(activeInvestments[i]?.plan?.dailyRoiPct || '0');
        if (base === 0) return hr;
        const fluctuated = hr + (Math.random() - 0.5) * base * 0.02;
        return Math.max(base * 0.94, Math.min(base * 1.06, fluctuated));
      }));

      // Fluctuate volatility slightly
      setLiveVolatility(prev => prev.map(t => {
        const delta = (Math.random() - 0.5) * 1.2;
        return Math.max(10, Math.min(50, t + delta));
      }));

      // Increment shares (each investment gets random shares per second)
      setLiveShares(prev => prev.map(s => ({
        valid: s.valid + Math.floor(Math.random() * 8) + 2,
        invalid: s.invalid + (Math.random() < 0.1 ? 1 : 0),
      })));

      // Random block found event (very rare: ~0.3% chance per tick per investment)
      const newBlocksFound = activeInvestments.reduce((count) => {
        return count + (Math.random() < 0.003 ? 1 : 0);
      }, 0);
      if (newBlocksFound > 0) {
        blockCounter += newBlocksFound;
        setLiveBlocks(blockCounter);
      }

      // Add micro-earning to feed (every ~3-8 seconds for each investment)
      feedIdCounter++;
      const shouldAddEarning = Math.random() < 0.35;
      if (shouldAddEarning && activeInvestments.length > 0) {
        const rentalIdx = Math.floor(Math.random() * activeInvestments.length);
        const investment = activeInvestments[rentalIdx];
        const microAmount = d(investment.dailyReturn) / 86400 * (3 + Math.random() * 5); // 3-8 seconds worth
        const now = new Date();
        const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

        setLiveEarningsFeed(prev => {
          const newEntry = { id: feedIdCounter, amount: microAmount, time: timeStr, coin: (investment as any).trader?.name || investment.plan?.name || 'ROI' };
          const updated = [newEntry, ...prev].slice(0, 20); // keep last 20
          return updated;
        });
      }

      setLiveEarningsCounter(feedIdCounter);
    }, 1000);

    return () => clearInterval(liveInterval);
  }, [mounted, user?.id, activeInvestments.length, accumulatedEarnings]);

  // Rental/investment calculation
  const rentalCalc = useMemo(() => {
    if (!investDialogPlan) return { totalPrice: 0, dailyReturn: 0, totalReturn: 0 };
    const selectedPlan = selectedPlanId ? investDialogPlan.plans?.find((p: any) => p.id === selectedPlanId) : null;
    
    // InvestmentPlan mode: user enters amount, plan has dailyRoiPct + durationDays
    if (selectedPlan && selectedPlan.dailyRoiPct !== undefined) {
      const amount = parseFloat(investAmount) || 0;
      const dailyRoiPct = d(selectedPlan.dailyRoiPct);
      const durationDays = selectedPlan.durationDays || selectedPlan.days || 35;
      const dailyReturn = amount * (dailyRoiPct / 100);
      const totalReturn = dailyReturn * durationDays;
      return { totalPrice: amount, dailyReturn, totalReturn };
    }
    
    // CopyTrader rental mode (legacy): pricePerDay * days
    const pricePerDay = d((investDialogPlan as any).pricePerDay);
    const dailyRevenue = d((investDialogPlan as any).dailyRevenue);
    const profitShare = d((investDialogPlan as any).profitSharePct);
    return {
      totalPrice: pricePerDay * investmentDuration,
      dailyReturn: dailyRevenue * (profitShare / 100),
      totalReturn: dailyRevenue * (profitShare / 100) * investmentDuration,
    };
  }, [investDialogPlan, investmentDuration, selectedPlanId, investAmount]);

  // ============================================================================
  // LOADING SKELETON
  // ============================================================================
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-cyan-500/30 border-t-emerald-500 rounded-full animate-spin" />
          <p className="text-zinc-400">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  // ============================================================================
  // NOT AUTHENTICATED → LANDING PAGE (DeFi Futuristic Design)
  // ============================================================================
  if (!user) {
    return (
      <div className="min-h-screen flex flex-col bg-[#0a0a0f] text-white">
        {/* ── Auth Dialog ── */}
        <Dialog open={showAuth} onOpenChange={setShowAuth}>
          <DialogContent className="glass-card border-white/10 text-white max-w-md w-[95vw] sm:w-full">
            <DialogHeader>
              <DialogTitle className="text-xl bg-gradient-to-r from-emerald-400 to-green-400 bg-clip-text text-transparent">
                {authMode === 'login' ? t('landing.auth.loginTitle') : t('landing.auth.registerTitle')}
              </DialogTitle>
              <DialogDescription className="text-zinc-400">
                {authMode === 'login' ? t('landing.auth.loginDesc') : t('landing.auth.registerDesc')}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={authMode === 'login' ? handleLogin : handleRegister} className="space-y-4">
              {authMode === 'register' && (
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-zinc-300">{t('landing.auth.name')}</Label>
                  <Input id="name" name="name" required minLength={2} className="bg-white/5 border-white/10 text-white focus:border-emerald-500/50" placeholder={t('landing.auth.namePlaceholder')} />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-zinc-300">{t('landing.auth.email')}</Label>
                <Input id="email" name="email" type="email" required className="bg-white/5 border-white/10 text-white focus:border-emerald-500/50" placeholder={t('landing.auth.emailPlaceholder')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-zinc-300">{t('landing.auth.password')}</Label>
                <Input id="password" name="password" type="password" required minLength={6} className="bg-white/5 border-white/10 text-white focus:border-emerald-500/50" placeholder={t('landing.auth.minPassword')} />
              </div>
              {authMode === 'register' && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword" className="text-zinc-300">{t('landing.auth.confirmPassword')}</Label>
                    <Input id="confirmPassword" name="confirmPassword" type="password" required className="bg-white/5 border-white/10 text-white focus:border-emerald-500/50" placeholder={t('landing.auth.confirmPassword')} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="referralCode" className="text-zinc-300">{t('landing.auth.referralCode')}</Label>
                    <Input id="referralCode" name="referralCode" className="bg-white/5 border-white/10 text-white focus:border-emerald-500/50" placeholder={t('landing.auth.referralCode')} />
                  </div>
                </>
              )}
              <Button type="submit" className="w-full bg-gradient-to-r from-emerald-600 to-green-500 hover:from-emerald-500 hover:to-green-400 text-white font-semibold" disabled={loginLoading}>
                {loginLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {authMode === 'login' ? t('landing.auth.loginBtn') : t('landing.auth.registerBtn')}
              </Button>
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
                  className="text-sm text-emerald-400 hover:underline"
                >
                  {authMode === 'login' ? <>{t('landing.auth.noAccount')} <span className="text-emerald-400 hover:underline">{t('landing.auth.createAccount')}</span></> : <>{t('landing.auth.hasAccount')} <span className="text-emerald-400 hover:underline">{t('landing.auth.loginInstead')}</span></>}
                </button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* ── Fixed Navigation ── */}
        <nav className="fixed top-0 left-0 right-0 z-50 glass-card border-b border-white/5">
          <div className="max-w-7xl mx-auto flex items-center justify-between px-3 sm:px-6 py-2.5 sm:py-3">
            <div className="flex items-center gap-2 sm:gap-2.5">
              <div className="relative">
                <TrendingUp className="h-5 w-5 sm:h-7 sm:w-7 text-emerald-400" />
                <div className="absolute -top-1 -right-1 w-2.5 h-2.5 sm:w-3 sm:h-3 bg-emerald-500 rounded-full animate-pulse" />
              </div>
              <span className="text-base sm:text-xl font-bold bg-gradient-to-r from-emerald-400 to-green-400 bg-clip-text text-transparent">
                {landingConfig?.siteName || 'PLATAFORMA ROI'}
              </span>
              <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[9px] sm:text-[10px] px-1 sm:px-1.5 py-0 hidden sm:inline-flex">{t('landing.badges.live')}</Badge>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-3">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="text-zinc-400 hover:text-white gap-1 px-1.5 sm:px-2 h-8">
                    <span className="text-base leading-none">{locales.find(l => l.code === locale)?.flag}</span>
                    <span className="hidden sm:inline text-xs font-medium">{locale.toUpperCase()}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="glass-card border-white/10" align="end">
                  {locales.map(l => (
                    <DropdownMenuItem key={l.code} onClick={() => setLocale(l.code)} className={`gap-2.5 cursor-pointer ${locale === l.code ? 'bg-emerald-500/10 text-emerald-400 font-medium' : 'text-zinc-300'}`}>
                      <span className="text-lg leading-none">{l.flag}</span>
                      <span className="text-sm">{l.label}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <Button variant="ghost" className="text-zinc-400 hover:text-white text-sm h-8 px-2 sm:px-3" onClick={() => { setAuthMode('login'); setShowAuth(true); }}>{t('landing.hero.login')}</Button>
              <Button className="bg-gradient-to-r from-emerald-600 to-green-500 hover:from-emerald-500 hover:to-green-400 text-white text-sm h-8 px-3 sm:px-4" onClick={() => { setAuthMode('register'); setShowAuth(true); }}>
                <span className="hidden sm:inline">{t('landing.hero.cta')}</span><span className="sm:hidden">{t('landing.hero.register')}</span> <ArrowUpRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </div>
        </nav>

        {/* ── Hero Section ── */}
        <header className="relative overflow-hidden pt-16">
          {/* Background Effects */}
          <div className="absolute inset-0 landing-grid pointer-events-none" />
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-20 left-10 w-72 h-72 bg-emerald-500/8 rounded-full blur-[100px] animate-orb" />
            <div className="absolute top-40 right-20 w-96 h-96 bg-cyan-500/6 rounded-full blur-[120px] animate-orb-delay" />
            <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-green-500/5 rounded-full blur-[100px] animate-orb" />
          </div>
          {/* Particles */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {[...Array(12)].map((_, i) => (
              <div key={i} className="particle" style={{ left: `${10 + i * 8}%`, animationDuration: `${8 + i * 2}s`, animationDelay: `${i * 0.5}s` }} />
            ))}
          </div>

          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 pt-20 sm:pt-24 pb-20 sm:pb-20">
            <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
              {/* Left: Text Content */}
              <motion.div initial={{ opacity: 0, x: -40 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.7 }}>
                <div className="inline-flex items-center gap-2 glass-card rounded-full px-3 sm:px-4 py-1.5 mb-4 sm:mb-6 text-xs sm:text-sm text-emerald-400 border-emerald-500/20">
                  <Activity className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span className="font-medium">{t('landing.badges.copyTrading')}</span>
                  <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                </div>
                <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold leading-tight mb-4 sm:mb-6">
                  <span className="bg-gradient-to-r from-emerald-400 via-green-300 to-emerald-500 bg-clip-text text-transparent">
                    {landingConfig?.siteName || 'PLATAFORMA ROI'}
                  </span>
                </h1>
                <p className="text-base sm:text-xl text-zinc-400 mb-6 sm:mb-8 max-w-lg">
                  {t('landing.hero.subtitle')}
                </p>
                <div className="flex flex-col sm:flex-row gap-3 mb-6 sm:mb-8">
                  <Button size="lg" className="bg-gradient-to-r from-emerald-600 to-green-500 hover:from-emerald-500 hover:to-green-400 text-white text-base sm:text-lg px-6 sm:px-8 py-5 sm:py-6 glow-emerald" onClick={() => { setAuthMode('register'); setShowAuth(true); }}>
                    {t('landing.hero.cta')} <ArrowUpRight className="ml-2 h-5 w-5" />
                  </Button>
                  <Button size="lg" variant="outline" className="border-white/10 text-zinc-300 hover:text-white hover:bg-white/5 text-base sm:text-lg px-6 sm:px-8 py-5 sm:py-6" onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}>
                    {t('landing.steps.title')}
                  </Button>
                </div>
                {/* Mini Stats */}
                <div className="flex gap-4 sm:gap-6 text-xs sm:text-sm">
                  <div><span className="text-xl sm:text-2xl font-bold text-white animate-count-glow">{landingStats?.totalUsers || 0}+</span><p className="text-zinc-500">{t('landing.stats.users')}</p></div>
                  <div><span className="text-xl sm:text-2xl font-bold text-emerald-400">{landingStats?.totalRoi ? `$${(landingStats.totalRoi / 1000).toFixed(0)}k+` : '$0'}</span><p className="text-zinc-500">{t('landing.stats.mined')}</p></div>
                  <div><span className="text-xl sm:text-2xl font-bold text-cyan-400">5%</span><p className="text-zinc-500">{t('common.perDay')}</p></div>
                </div>
              </motion.div>

              {/* Right: Dashboard Preview Card */}
              <motion.div initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.7, delay: 0.2 }}>
                <div className="glass-card gradient-border rounded-2xl p-5 sm:p-6 glow-emerald">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5 text-emerald-400" />
                      <span className="text-sm font-medium text-zinc-300">{t('landing.badges.liveDashboard')}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                      <span className="text-xs text-emerald-400">{t('landing.badges.live')}</span>
                    </div>
                  </div>
                  {/* Animated Chart SVG */}
                  <div className="bg-white/[0.02] rounded-xl p-4 mb-4 relative overflow-hidden">
                    <svg viewBox="0 0 400 120" className="w-full h-auto" fill="none">
                      <defs>
                        <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="rgba(16,185,129,0.3)" />
                          <stop offset="100%" stopColor="rgba(16,185,129,0)" />
                        </linearGradient>
                      </defs>
                      <path d="M0,90 L30,85 L60,80 L90,70 L120,75 L150,60 L180,55 L210,40 L240,45 L270,30 L300,25 L330,20 L360,15 L400,10 L400,120 L0,120Z" fill="url(#chartGrad)" />
                      <path d="M0,90 L30,85 L60,80 L90,70 L120,75 L150,60 L180,55 L210,40 L240,45 L270,30 L300,25 L330,20 L360,15 L400,10" stroke="#10b981" strokeWidth="2.5" className="chart-line-animated" />
                      <circle cx="400" cy="10" r="4" fill="#10b981">
                        <animate attributeName="r" values="4;6;4" dur="2s" repeatCount="indefinite" />
                      </circle>
                    </svg>
                    <div className="absolute top-3 right-3 text-right">
                      <div className="text-xs text-zinc-500">{t('landing.badges.portfolioValue')}</div>
                      <div className="text-lg font-bold text-emerald-400 animate-count-glow">+127.4%</div>
                    </div>
                  </div>
                  {/* Trading Stats */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-white/[0.03] rounded-lg p-3 text-center">
                      <div className="text-lg font-bold text-emerald-400">94.2%</div>
                      <div className="text-[10px] text-zinc-500 uppercase tracking-wider">{t('landing.badges.winRate')}</div>
                    </div>
                    <div className="bg-white/[0.03] rounded-lg p-3 text-center">
                      <div className="text-lg font-bold text-cyan-400">24/7</div>
                      <div className="text-[10px] text-zinc-500 uppercase tracking-wider">{t('landing.badges.trading')}</div>
                    </div>
                    <div className="bg-white/[0.03] rounded-lg p-3 text-center">
                      <div className="text-lg font-bold text-green-400">5%</div>
                      <div className="text-[10px] text-zinc-500 uppercase tracking-wider">{t('landing.badges.dailyRoi')}</div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </header>

        {/* ── Crypto Ticker Tape ── */}
        <div className="border-y border-white/5 bg-white/[0.01] py-3 overflow-hidden">
          <div className="ticker-tape flex items-center gap-8 whitespace-nowrap">
            {[
              { pair: 'BTC/USDT', price: '67,842.30', change: '+2.4%', up: true },
              { pair: 'ETH/USDT', price: '3,521.18', change: '+1.8%', up: true },
              { pair: 'SOL/USDT', price: '178.42', change: '-0.6%', up: false },
              { pair: 'BNB/USDT', price: '612.50', change: '+0.9%', up: true },
              { pair: 'XRP/USDT', price: '0.6324', change: '+3.1%', up: true },
              { pair: 'ADA/USDT', price: '0.4812', change: '-1.2%', up: false },
              { pair: 'DOGE/USDT', price: '0.1654', change: '+5.7%', up: true },
              { pair: 'DOT/USDT', price: '7.23', change: '-0.3%', up: false },
            ].concat([
              { pair: 'BTC/USDT', price: '67,842.30', change: '+2.4%', up: true },
              { pair: 'ETH/USDT', price: '3,521.18', change: '+1.8%', up: true },
              { pair: 'SOL/USDT', price: '178.42', change: '-0.6%', up: false },
              { pair: 'BNB/USDT', price: '612.50', change: '+0.9%', up: true },
              { pair: 'XRP/USDT', price: '0.6324', change: '+3.1%', up: true },
              { pair: 'ADA/USDT', price: '0.4812', change: '-1.2%', up: false },
              { pair: 'DOGE/USDT', price: '0.1654', change: '+5.7%', up: true },
              { pair: 'DOT/USDT', price: '7.23', change: '-0.3%', up: false },
            ]).map((tk, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <span className="text-zinc-300 font-medium">{tk.pair}</span>
                <span className="text-white">{tk.price}</span>
                <span className={tk.up ? 'text-emerald-400' : 'text-red-400'}>{tk.change}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Live Platform Stats ── */}
        <section className="py-16 sm:py-24 relative">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
              {[
                { label: t('landing.stats.users'), value: String(landingStats?.totalUsers || 0), icon: Users, glow: 'glow-emerald' },
                { label: t('landing.stats.investment'), value: String(landingStats?.activeInvestments || 0), icon: Activity, glow: 'glow-cyan' },
                { label: t('landing.stats.mined'), value: landingStats?.totalRoi ? (landingStats.totalRoi >= 1000000 ? `$${(landingStats.totalRoi / 1000000).toFixed(1)}M` : landingStats.totalRoi >= 1000 ? `$${(landingStats.totalRoi / 1000).toFixed(1)}k` : `$${landingStats.totalRoi.toFixed(0)}`) : '$0', icon: DollarSign, glow: 'glow-green' },
                { label: t('landing.stats.invested'), value: landingStats?.totalInvested ? (landingStats.totalInvested >= 1000000 ? `$${(landingStats.totalInvested / 1000000).toFixed(1)}M` : landingStats.totalInvested >= 1000 ? `$${(landingStats.totalInvested / 1000).toFixed(1)}k` : `$${landingStats.totalInvested.toFixed(0)}`) : '$0', icon: BarChart3, glow: 'glow-emerald' },
              ].map((s, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} viewport={{ once: true }} className="stat-card-hover">
                  <div className={`glass-card gradient-border rounded-xl p-5 sm:p-6 text-center ${s.glow}`}>
                    <s.icon className="h-7 w-7 text-emerald-400 mx-auto mb-3" />
                    <div className="text-2xl sm:text-3xl font-bold animate-count-glow mb-1">{s.value}</div>
                    <div className="text-xs sm:text-sm text-zinc-400">{s.label}</div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ── How It Works ── */}
        <section id="how-it-works" className="py-16 sm:py-24 relative">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/5 rounded-full blur-[120px]" />
          </div>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
              <span className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-medium px-4 py-1.5 rounded-full mb-4">
                <Zap className="h-4 w-4" /> {t('landing.badges.simplePowerful')}
              </span>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold">
                <span className="bg-gradient-to-r from-emerald-400 to-green-400 bg-clip-text text-transparent">{t('landing.steps.title')}</span>
              </h2>
            </motion.div>
            <div className="grid md:grid-cols-3 gap-6 sm:gap-8">
              {[
                { step: '01', title: t('landing.steps.step1.title'), desc: t('landing.steps.step1.desc'), icon: Search, grad: 'from-emerald-500 to-green-500' },
                { step: '02', title: t('landing.steps.step2.title'), desc: t('landing.steps.step2.desc'), icon: Zap, grad: 'from-cyan-500 to-emerald-500' },
                { step: '03', title: t('landing.steps.step3.title'), desc: t('landing.steps.step3.desc'), icon: Wallet, grad: 'from-green-500 to-emerald-500' },
              ].map((s, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.15 }} viewport={{ once: true }} className="stat-card-hover">
                  <div className="glass-card gradient-border rounded-2xl p-8 h-full text-center">
                    <div className={`w-16 h-16 bg-gradient-to-br ${s.grad} rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-500/20`}>
                      <s.icon className="h-8 w-8 text-white" />
                    </div>
                    <div className="text-emerald-400 font-mono text-sm mb-3 tracking-widest">{t('landing.badges.step')} {s.step}</div>
                    <h3 className="text-xl font-semibold mb-3">{s.title}</h3>
                    <p className="text-zinc-400 leading-relaxed">{s.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Traders Preview (Real Bitget Data) ── */}
        {(landingBitgetTraders.length > 0 || landingTraders.length > 0) && (
          <section className="py-16 sm:py-24 relative">
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute bottom-0 left-0 w-80 h-80 bg-cyan-500/5 rounded-full blur-[120px]" />
            </div>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
              <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
                <span className="inline-flex items-center gap-2 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-sm font-medium px-4 py-1.5 rounded-full mb-4">
                  <TrendingUp className="h-4 w-4" /> {t('landing.badges.topTraders')}
                </span>
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold">
                  <span className="bg-gradient-to-r from-cyan-400 to-emerald-400 bg-clip-text text-transparent">{t('landing.featured.title')}</span>
                </h2>
                <p className="text-zinc-400 text-sm mt-3 max-w-md mx-auto">{t('copyTraders.realDataDescription')}</p>
              </motion.div>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Real Bitget traders take priority */}
                {(landingBitgetTraders.length > 0 ? landingBitgetTraders : landingTraders).map((trader: any) => {
                  const isBitget = 'traderId' in trader;
                  const roiVal = isBitget ? parseFloat(trader.roi || '0') : parseFloat(trader.monthlyRoi || '0');
                  const pnlVal = isBitget ? parseFloat(trader.totalPnl || '0') : 0;
                  const aumVal = isBitget ? parseFloat(trader.aum || '0') : 0;
                  const name = isBitget ? trader.displayName : trader.name;
                  const followers = isBitget ? trader.followers : 0;
                  const grade = isBitget ? trader.grade?.name : '';

                  return (
                    <motion.div key={isBitget ? trader.traderId : trader.id} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="stat-card-hover">
                      <div className="glass-card gradient-border rounded-2xl p-5">
                        {/* Header */}
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            {isBitget && trader.avatar ? (
                              <img src={trader.avatar} alt={name} className="w-10 h-10 rounded-full object-cover border border-zinc-700" />
                            ) : (
                              <div className="w-10 h-10 bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 rounded-xl flex items-center justify-center text-lg font-bold text-emerald-400">
                                {name.charAt(0)}
                              </div>
                            )}
                            <div>
                              <div className="flex items-center gap-1.5">
                                <h3 className="font-semibold text-sm">{name}</h3>
                                <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" title="Live" />
                              </div>
                              <div className="flex items-center gap-1.5">
                                <p className="text-xs text-zinc-500">{isBitget ? (trader.labels?.[0]?.name || 'Futures') : (trader.specialty || 'Copy Trading')}</p>
                                {grade && <span className="text-[10px] text-amber-400">★ {grade}</span>}
                              </div>
                            </div>
                          </div>
                          {isBitget && (
                            <Badge className="text-[10px] bg-emerald-500/20 text-emerald-400 border-emerald-500/30" variant="outline">
                              {t('landing.badges.live')}
                            </Badge>
                          )}
                        </div>
                        {/* Mini Bar Chart */}
                        <div className="flex items-end gap-1 h-10 mb-4">
                          {[40, 65, 35, 80, 55, 90, 45, 70, 85, 50, 75, 95].map((h, i) => (
                            <div key={i} className="flex-1 rounded-t" style={{ height: `${h}%`, background: 'linear-gradient(to top, rgba(16,185,129,0.2), rgba(16,185,129,0.6))' }} />
                          ))}
                        </div>
                        {/* Stats Grid */}
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div className="bg-white/[0.03] rounded-lg p-2.5">
                            <div className="text-zinc-500">{isBitget ? 'ROI' : t('landing.featured.winRate')}</div>
                            <div className={`font-semibold ${roiVal >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                              {isBitget ? `${roiVal >= 0 ? '+' : ''}${roiVal.toFixed(0)}%` : `${trader.winRate}%`}
                            </div>
                          </div>
                          <div className="bg-white/[0.03] rounded-lg p-2.5">
                            <div className="text-zinc-500">{t('copyTraders.pnlLabel')}</div>
                            <div className="font-semibold text-cyan-400">
                              {isBitget ? `$${Math.abs(pnlVal) >= 1000 ? `${(pnlVal/1000).toFixed(1)}k` : pnlVal.toFixed(0)}` : `$${fmtUSDT(trader.monthlyRoi)}`}
                            </div>
                          </div>
                          <div className="bg-white/[0.03] rounded-lg p-2.5">
                            <div className="text-zinc-500">{t('copyTraders.aumLabel')}</div>
                            <div className="font-semibold text-cyan-400">
                              ${aumVal >= 1000 ? `${(aumVal/1000).toFixed(1)}k` : aumVal.toFixed(0)}
                            </div>
                          </div>
                        </div>
                        {isBitget && followers > 0 && (
                          <div className="mt-3 flex items-center justify-between text-xs">
                            <span className="text-zinc-500">{followers} {t('copyTraders.followers')}</span>
                            <span className="text-zinc-500">#{trader.rank}</span>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* ── 5% Daily ROI Advantage ── */}
        <section className="py-16 sm:py-24 relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-[150px] animate-orb" />
          </div>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
            <motion.div initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="flex justify-center mb-4">
              <span className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-medium px-4 py-1.5 rounded-full">
                <Zap className="h-4 w-4" />
                {t('landing.advantage.tag')}
              </span>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} viewport={{ once: true }} className="text-center mb-10 sm:mb-14">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-3">
                <span className="bg-gradient-to-r from-emerald-400 to-green-300 bg-clip-text text-transparent">{t('landing.advantage.title')}</span>
              </h2>
              <p className="text-zinc-400 text-lg max-w-2xl mx-auto">{t('landing.advantage.subtitle')}</p>
            </motion.div>
            <div className="grid lg:grid-cols-2 gap-8 sm:gap-12 items-center">
              <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} viewport={{ once: true }} className="space-y-5">
                <p className="text-zinc-300 text-base sm:text-lg leading-relaxed">{t('landing.advantage.desc1')}</p>
                <p className="text-zinc-400 text-base leading-relaxed">{t('landing.advantage.desc2')}</p>
                <Button size="lg" className="bg-gradient-to-r from-emerald-600 to-green-500 hover:from-emerald-500 hover:to-green-400 text-white mt-4 glow-emerald" onClick={() => { setAuthMode('register'); setShowAuth(true); }}>
                  {t('landing.advantage.cta')} <ArrowUpRight className="ml-2 h-5 w-5" />
                </Button>
              </motion.div>
              <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }} viewport={{ once: true }} className="grid grid-cols-3 gap-3 sm:gap-4">
                {[
                  { value: t('landing.advantage.stat1.value'), label: t('landing.advantage.stat1.label'), glow: 'glow-emerald' },
                  { value: t('landing.advantage.stat2.value'), label: t('landing.advantage.stat2.label'), glow: 'glow-cyan' },
                  { value: t('landing.advantage.stat3.value'), label: t('landing.advantage.stat3.label'), glow: 'glow-green' },
                ].map((s, i) => (
                  <div key={i} className={`glass-card gradient-border rounded-xl p-4 sm:p-6 text-center stat-card-hover ${s.glow}`}>
                    <div className="text-3xl sm:text-4xl font-bold text-emerald-400 mb-1 animate-count-glow">{s.value}</div>
                    <p className="text-xs sm:text-sm text-zinc-400">{s.label}</p>
                  </div>
                ))}
              </motion.div>
            </div>
          </div>
        </section>

        {/* ── Investment Tiers ── */}
        <section className="py-16 sm:py-24 relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-20 right-20 w-72 h-72 bg-emerald-500/5 rounded-full blur-[120px]" />
            <div className="absolute bottom-20 left-20 w-72 h-72 bg-cyan-500/5 rounded-full blur-[120px]" />
          </div>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-10 sm:mb-14">
              <span className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-medium px-4 py-1.5 rounded-full mb-4">
                <DollarSign className="h-4 w-4" /> {t('landing.badges.dailyRoiTag')}
              </span>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-3">
                <span className="bg-gradient-to-r from-emerald-400 to-green-300 bg-clip-text text-transparent">{t('landing.tiers.title')}</span>
              </h2>
              <p className="text-zinc-400 text-lg max-w-2xl mx-auto">{t('landing.tiers.subtitle')}</p>
            </motion.div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {[
                { amount: 10, daily: 0.50, doubles: 20, color: 'from-zinc-500 to-zinc-400', featured: false },
                { amount: 50, daily: 2.50, doubles: 100, color: 'from-amber-500 to-amber-400', featured: false },
                { amount: 100, daily: 5.00, doubles: 200, color: 'from-cyan-500 to-cyan-400', featured: true },
                { amount: 500, daily: 25.00, doubles: 1000, color: 'from-emerald-500 to-emerald-400', featured: false },
                { amount: 1500, daily: 75.00, doubles: 3000, color: 'from-purple-500 to-purple-400', featured: false },
              ].map((tier, i) => (
                <motion.div key={tier.amount} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} viewport={{ once: true }} className="stat-card-hover">
                  <div className={`glass-card rounded-2xl p-5 text-center h-full ${tier.featured ? 'tier-card-premium gradient-border glow-emerald' : 'border border-white/5'}`}>
                    {tier.featured && <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 mb-3 text-[10px]">{t('landing.badges.popular')}</Badge>}
                    <div className={`text-3xl font-bold bg-gradient-to-r ${tier.color} bg-clip-text text-transparent mb-2`}>${tier.amount}</div>
                    <div className="text-sm text-zinc-400 mb-3">{t('landing.tiers.investLabel')}</div>
                    <div className="bg-white/[0.03] rounded-lg p-3 mb-3">
                      <div className="text-lg font-semibold text-emerald-400">+${tier.daily.toFixed(2)}</div>
                      <div className="text-xs text-zinc-500">{t('landing.tiers.perDay')}</div>
                    </div>
                    <div className="flex items-center justify-center gap-1 text-green-400 text-sm font-medium">
                      <TrendingUp className="h-4 w-4" />
                      {t('common.doublesTo')} ${tier.doubles.toLocaleString()}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Unilevel 11 Levels ── */}
        <section className="py-16 sm:py-24 relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 left-1/2 w-96 h-96 bg-cyan-500/5 rounded-full blur-[150px]" />
          </div>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-10 sm:mb-14">
              <span className="inline-flex items-center gap-2 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-sm font-medium px-4 py-1.5 rounded-full mb-4">
                <Users className="h-4 w-4" /> {t('landing.badges.careerPlan')}
              </span>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-3">
                <span className="bg-gradient-to-r from-cyan-400 to-emerald-400 bg-clip-text text-transparent">{t('landing.unilevel.title')}</span>
              </h2>
              <p className="text-zinc-400 text-lg max-w-2xl mx-auto">{t('landing.unilevel.subtitle')}</p>
            </motion.div>
            {/* Visual Tree Layout */}
            <div className="max-w-3xl mx-auto space-y-4">
              {/* L1 - Highlighted */}
              <motion.div initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}>
                <div className="glass-card gradient-border glow-emerald rounded-xl p-5 text-center">
                  <div className="text-3xl font-bold text-emerald-400 animate-count-glow">
                    {landingAffiliateLevels.find(l => l.level === 1)?.percentage || '10'}%
                  </div>
                  <div className="text-sm text-emerald-400 font-medium mt-1">L1 — Direct</div>
                  <div className="text-xs text-zinc-500">Direct Referral Commission</div>
                </div>
              </motion.div>
              {/* L2-L5 Row */}
              <div className="grid grid-cols-4 gap-3">
                {[2, 3, 4, 5].map((lvl) => (
                  <motion.div key={lvl} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: lvl * 0.05 }} viewport={{ once: true }}>
                    <div className="glass-card rounded-xl p-3 text-center border border-white/5 stat-card-hover">
                      <div className="text-xl font-bold text-cyan-400">
                        {landingAffiliateLevels.find(l => l.level === lvl)?.percentage || ['','4','3','2','1.5'][lvl]}%
                      </div>
                      <div className="text-[10px] text-zinc-500 mt-0.5">{t('landing.unilevel.level')} {lvl}</div>
                    </div>
                  </motion.div>
                ))}
              </div>
              {/* L6-L11 Row */}
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                {[6, 7, 8, 9, 10, 11].map((lvl) => (
                  <motion.div key={lvl} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: lvl * 0.04 }} viewport={{ once: true }}>
                    <div className="glass-card rounded-xl p-3 text-center border border-white/5 stat-card-hover">
                      <div className="text-lg font-bold text-zinc-400">
                        {landingAffiliateLevels.find(l => l.level === lvl)?.percentage || ['1.5','1','1','0.5','0.5','1'][lvl - 6]}%
                      </div>
                      <div className="text-[10px] text-zinc-500">{t('landing.unilevel.level')} {lvl}</div>
                    </div>
                  </motion.div>
                ))}
              </div>
              {/* Progress Bar */}
              <div className="glass-card rounded-xl p-4 border border-white/5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-zinc-300">{t('landing.unilevel.total')}</span>
                  <span className="text-lg font-bold text-emerald-400">
                    {landingAffiliateLevels.length > 0
                      ? landingAffiliateLevels.reduce((sum, l) => sum + d(l.percentage), 0).toFixed(1)
                      : '28'}%
                  </span>
                </div>
                <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-emerald-500 to-green-400 rounded-full animate-shimmer" style={{ width: '100%' }} />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Team Bonuses ── */}
        <section className="py-16 sm:py-24 relative">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute bottom-0 right-0 w-80 h-80 bg-amber-500/5 rounded-full blur-[120px]" />
          </div>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-10 sm:mb-14">
              <span className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm font-medium px-4 py-1.5 rounded-full mb-4">
                <Trophy className="h-4 w-4" /> {t('landing.badges.teamRewards')}
              </span>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-3">
                <span className="bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">{t('landing.bonuses.title')}</span>
              </h2>
              <p className="text-zinc-400 text-lg max-w-2xl mx-auto">{t('landing.bonuses.subtitle')}</p>
            </motion.div>
            <div className="grid sm:grid-cols-3 gap-6 max-w-4xl mx-auto">
              {[
                { name: t('landing.bonuses.bronze.name'), bonus: '+1%', desc: t('landing.bonuses.bronze.requirement'), icon: Medal, grad: 'from-amber-700 to-amber-600', glow: 'glow-emerald', border: 'border-amber-700/30' },
                { name: t('landing.bonuses.silver.name'), bonus: '+2%', desc: t('landing.bonuses.silver.requirement'), icon: Award, grad: 'from-gray-300 to-gray-200', glow: 'glow-cyan', border: 'border-gray-500/30' },
                { name: t('landing.bonuses.gold.name'), bonus: '+3%', desc: t('landing.bonuses.gold.requirement'), icon: Crown, grad: 'from-yellow-500 to-yellow-300', glow: 'glow-green', border: 'border-yellow-600/30' },
              ].map((b, i) => (
                <motion.div key={b.name} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.15 }} viewport={{ once: true }} className="stat-card-hover">
                  <div className={`glass-card gradient-border rounded-2xl p-6 text-center ${b.glow}`}>
                    <div className={`w-14 h-14 bg-gradient-to-br ${b.grad} rounded-2xl flex items-center justify-center mx-auto mb-4`}>
                      <b.icon className="h-7 w-7 text-white" />
                    </div>
                    <h3 className={`text-xl font-bold bg-gradient-to-r ${b.grad} bg-clip-text text-transparent mb-2`}>{b.name}</h3>
                    <div className="text-3xl font-bold text-emerald-400 mb-2">{b.bonus}</div>
                    <div className="text-sm text-zinc-400">{t('landing.bonuses.extraDaily')}</div>
                    <div className="mt-3 text-xs text-zinc-500 bg-white/[0.03] rounded-full px-3 py-1.5 inline-block">{b.desc}</div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Affiliate Program ── */}
        <section className="py-16 sm:py-24 relative">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-10 sm:mb-14">
              <span className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-medium px-4 py-1.5 rounded-full mb-4">
                <Share2 className="h-4 w-4" /> {t('landing.badges.referralProgram')}
              </span>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-3">
                <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">{t('landing.affiliate.title')}</span>
              </h2>
              <p className="text-zinc-400 text-lg max-w-2xl mx-auto">{t('landing.affiliate.description')}</p>
            </motion.div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 sm:gap-4 mb-10 max-w-3xl mx-auto">
              {(landingAffiliateLevels.length > 0 ? landingAffiliateLevels : [
                { level: 1, percentage: '10' },
                { level: 2, percentage: '4' },
                { level: 3, percentage: '3' },
                { level: 4, percentage: '2' },
                { level: 5, percentage: '1.5' },
              ] as { level: number; percentage: string }[]).map((lvl) => (
                <motion.div key={lvl.level} initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} transition={{ delay: lvl.level * 0.05 }} viewport={{ once: true }} className="stat-card-hover">
                  <div className={`glass-card rounded-xl p-4 text-center ${lvl.level === 1 ? 'gradient-border glow-emerald' : 'border border-white/5'}`}>
                    <div className={`text-2xl font-bold ${lvl.level === 1 ? 'text-emerald-400 animate-count-glow' : 'text-cyan-400'}`}>{lvl.percentage}%</div>
                    <div className="text-xs text-zinc-500 mt-1">{t('landing.affiliate.level')} {lvl.level}</div>
                  </div>
                </motion.div>
              ))}
            </div>
            <div className="text-center">
              <Button size="lg" className="bg-gradient-to-r from-emerald-600 to-green-500 hover:from-emerald-500 hover:to-green-400 text-white glow-emerald" onClick={() => { setAuthMode('register'); setShowAuth(true); }}>
                {t('landing.affiliate.cta')} <ArrowUpRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section className="py-16 sm:py-24 relative">
          <div className="max-w-3xl mx-auto px-4 sm:px-6">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-10 sm:mb-14">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold">
                <span className="bg-gradient-to-r from-emerald-400 to-green-400 bg-clip-text text-transparent">{t('landing.faq.title')}</span>
              </h2>
            </motion.div>
            <Accordion type="single" collapsible className="space-y-3">
              {[
                { q: t('landing.faq.q1.q'), a: t('landing.faq.q1.a') },
                { q: t('landing.faq.q2.q'), a: t('landing.faq.q2.a') },
                { q: t('landing.faq.q3.q'), a: t('landing.faq.q3.a', { pix: landingConfig?.hasPix ? ' via PIX y' : '', pixWithdraw: landingConfig?.hasPix ? ' via PIX o' : '' }) },
                { q: t('landing.faq.q4.q'), a: t('landing.faq.q4.a') },
                { q: t('landing.faq.q5.q'), a: t('landing.faq.q5.a') },
              ].map((faq, i) => (
                <AccordionItem key={i} value={`faq-${i}`} className="glass-card rounded-xl px-5 border border-white/5">
                  <AccordionTrigger className="text-left hover:no-underline text-sm sm:text-base">{faq.q}</AccordionTrigger>
                  <AccordionContent className="text-zinc-400 text-sm">{faq.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

        {/* ── Final CTA ── */}
        <section className="py-16 sm:py-24 relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-[200px]" />
          </div>
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 text-center">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
              <span className="bg-gradient-to-r from-emerald-400 via-green-300 to-emerald-500 bg-clip-text text-transparent">
                {t('landing.hero.cta')}
              </span>
            </h2>
            <p className="text-zinc-400 text-lg mb-8 max-w-xl mx-auto">{t('landing.hero.subtitle')}</p>
            <Button size="lg" className="bg-gradient-to-r from-emerald-600 to-green-500 hover:from-emerald-500 hover:to-green-400 text-white text-lg px-10 py-7 glow-emerald" onClick={() => { setAuthMode('register'); setShowAuth(true); }}>
              {t('landing.hero.cta')} <ArrowUpRight className="ml-2 h-5 w-5" />
            </Button>
          </motion.div>
        </section>

        {/* ── Mobile Floating CTA Bar ── */}
        <div className="fixed bottom-0 left-0 right-0 z-50 sm:hidden bg-[#0a0a0f]/95 backdrop-blur-lg border-t border-white/10 safe-area-bottom">
          <div className="flex gap-3 p-3">
            <Button variant="outline" className="flex-1 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 h-12 text-base font-semibold" onClick={() => { setAuthMode('login'); setShowAuth(true); }}>
              {t('landing.hero.login')}
            </Button>
            <Button className="flex-1 bg-gradient-to-r from-emerald-600 to-green-500 hover:from-emerald-500 hover:to-green-400 text-white h-12 text-base font-semibold" onClick={() => { setAuthMode('register'); setShowAuth(true); }}>
              {t('landing.hero.register')} <ArrowUpRight className="ml-1.5 h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* ── Footer ── */}
        <footer className="mt-auto border-t border-white/5 bg-white/[0.01] py-12 pb-24 sm:pb-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8 mb-8">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="h-5 w-5 text-emerald-400" />
                  <span className="text-base font-bold bg-gradient-to-r from-emerald-400 to-green-400 bg-clip-text text-transparent">{landingConfig?.siteName || 'PLATAFORMA ROI'}</span>
                </div>
                <p className="text-sm text-zinc-500">{t('landing.hero.subtitle')}</p>
              </div>
              <div>
                <h4 className="font-semibold text-zinc-300 mb-3">{t('landing.footer.links.invest')}</h4>
                <ul className="space-y-2 text-sm text-zinc-500">
                  <li>{t('landing.footer.links.invest')}</li><li>{t('landing.footer.links.plans')}</li><li>{t('landing.footer.links.affiliates')}</li><li>{t('landing.footer.links.faq')}</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-zinc-300 mb-3">{t('landing.footer.legal')}</h4>
                <ul className="space-y-2 text-sm text-zinc-500">
                  <li>{t('landing.footer.terms')}</li><li>{t('landing.footer.privacy')}</li><li>{t('landing.footer.risk')}</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-zinc-300 mb-3">{t('landing.footer.support')}</h4>
                <ul className="space-y-2 text-sm text-zinc-500">
                  <li>{t('landing.footer.email')}</li><li>Telegram</li><li>Discord</li>
                </ul>
              </div>
            </div>
            <Separator className="bg-white/5 mb-8" />
            <div className="flex flex-col md:flex-row justify-between items-center text-sm text-zinc-600">
              <p>&copy; {new Date().getFullYear()} {landingConfig?.siteName || 'PLATAFORMA ROI'}. {t('landing.footer.rights')}</p>
            </div>
          </div>
        </footer>
      </div>
    );
  }


  // ============================================================================
  // AUTHENTICATED → DASHBOARD
  // ============================================================================
  // For admin users, show admin navigation directly instead of investor navigation
  const isAdmin = user.role === 'admin';

  const investorNavItems = [
    { id: 'home', label: t('sidebar.home'), icon: Home },
    { id: 'investir', label: t('sidebar.invest'), icon: TrendingUp },
    { id: 'alugueis', label: t('dashboard.activeInvestments'), icon: Clock },
    { id: 'faturas', label: 'Faturas', icon: Banknote },
    { id: 'saques', label: 'Saques', icon: HandCoins },
    { id: 'extrato', label: 'Extrato', icon: FileText },
    { id: 'historico', label: t('sidebar.history'), icon: History },
    { id: 'afiliados', label: t('sidebar.affiliates'), icon: Users },
    { id: 'perfil', label: t('sidebar.profile'), icon: User },
  ];

  const adminNavItems = [
    { id: 'overview', label: t('adminSidebar.overview'), icon: LayoutDashboard },
    { id: 'copyTraders', label: t('adminSidebar.plan'), icon: Bot },
    { id: 'plans', label: t('adminSidebar.plans'), icon: Coins },
    { id: 'users', label: t('adminSidebar.users'), icon: UserCog },
    { id: 'deposits', label: t('adminSidebar.deposits'), icon: Banknote },
    { id: 'withdrawals', label: t('adminSidebar.withdrawals'), icon: HandCoins },
    { id: 'nowpayments', label: 'NowPayments', icon: Globe },
    { id: 'affiliates', label: t('adminSidebar.affiliates'), icon: Link2 },
    { id: 'affiliateWithdrawals', label: t('adminSidebar.affiliateWithdrawals'), icon: Gift },
    { id: 'affiliateRanks', label: t('admin.affiliateRanks'), icon: Crown },
    { id: 'affiliateMilestones', label: t('admin.affiliateMilestones'), icon: Target },
    { id: 'affiliateContests', label: t('admin.affiliateContests'), icon: Trophy },
    { id: 'affiliateBadges', label: t('admin.affiliateBadges') || 'Badges', icon: Award },
    { id: 'vouchers', label: 'Vouchers', icon: Ticket },
    { id: 'config', label: t('adminSidebar.config'), icon: Settings },
    { id: 'marketing', label: 'Marketing', icon: Share2 },
    { id: 'logs', label: t('adminSidebar.logs'), icon: FileText },
  ];

  // Admin users can toggle between admin and investor views
  // When adminViewMode is 'investor', admin sees the investor menu
  const navItems = isAdmin
    ? (adminViewMode === 'admin' ? adminNavItems : investorNavItems)
    : investorNavItems;

  // Mobile bottom nav: show key items based on role and view mode
  const mobileNavIds = isAdmin
    ? (adminViewMode === 'admin'
        ? ['overview', 'users', 'deposits', 'nowpayments', 'config']
        : ['home', 'investir', 'extrato', 'afiliados', 'perfil'])
    : ['home', 'investir', 'extrato', 'afiliados', 'perfil'];

  return (
    <div className="min-h-screen flex flex-col bg-zinc-950 text-white">
      {/* HEADER */}
      <header className="sticky top-0 z-50 bg-[#0a0a0f]/80 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="lg:hidden text-zinc-400 hover:text-white hover:bg-white/[0.05]" onClick={() => setSidebarOpen(!sidebarOpen)}>
              <Menu className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <Bot className="h-6 w-6 text-emerald-400" />
                {/* Animated live dot */}
                <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
              </div>
              <span className="font-bold text-lg hidden sm:inline bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                {isAdmin ? (adminViewMode === 'admin' ? 'ADMIN PANEL' : 'PLATAFORMA ROI') : 'PLATAFORMA ROI'}
              </span>
            </div>
            {/* Admin View Mode Toggle */}
            {isAdmin && (
              <div className="flex items-center bg-white/[0.04] backdrop-blur-sm rounded-lg p-0.5 border border-white/[0.06]">
                <button
                  onClick={() => { setAdminViewMode('admin'); setActiveTab('overview'); }}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all duration-200 ${
                    adminViewMode === 'admin' ? 'bg-emerald-500/20 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.15)]' : 'text-zinc-500 hover:text-white hover:bg-white/[0.03]'
                  }`}
                >
                  <Shield className="h-3.5 w-3.5 inline mr-1" />Admin
                </button>
                <button
                  onClick={() => { setAdminViewMode('investor'); setActiveTab('home'); }}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all duration-200 ${
                    adminViewMode === 'investor' ? 'bg-emerald-500/20 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.15)]' : 'text-zinc-500 hover:text-white hover:bg-white/[0.03]'
                  }`}
                >
                  <TrendingUp className="h-3.5 w-3.5 inline mr-1" />Investidor
                </button>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Balance Pill with glass effect and emerald accent */}
            {(!isAdmin || adminViewMode === 'investor') && (
              <div className="flex items-center gap-1.5 bg-white/[0.04] backdrop-blur-sm rounded-lg px-3 py-1.5 border border-white/[0.06] text-sm">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.5)]" />
                <span className="font-semibold text-xs sm:text-sm">{fmtUSDT(user.balance)}</span>
                <span className="text-zinc-500 text-xs hidden sm:inline">USDT</span>
              </div>
            )}
            {/* Language Selector with glass dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white hover:bg-white/[0.05] gap-1 px-2 h-9">
                  <span className="text-base leading-none">{locales.find(l => l.code === locale)?.flag}</span>
                  <span className="hidden sm:inline text-xs font-medium">{locale.toUpperCase()}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-[#0a0a0f]/95 backdrop-blur-xl border-white/[0.06]" align="end">
                {locales.map(l => (
                  <DropdownMenuItem key={l.code} onClick={() => setLocale(l.code)} className={`gap-2.5 cursor-pointer hover:bg-white/[0.05] focus:bg-white/[0.05] ${locale === l.code ? 'bg-emerald-500/10 text-emerald-400 font-medium' : ''}`}>
                    <span className="text-lg leading-none">{l.flag}</span>
                    <span className="text-sm">{l.label}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            {/* Notification Bell with glow when unread */}
            <Popover open={notifOpen} onOpenChange={(open) => { setNotifOpen(open); if (open && unreadCount > 0) markAllRead(); }}>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className={`text-zinc-400 hover:text-white hover:bg-white/[0.05] relative ${unreadCount > 0 ? 'shadow-[0_0_12px_rgba(16,185,129,0.25)]' : ''}`}>
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-bold text-white px-1 shadow-[0_0_8px_rgba(16,185,129,0.5)]">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 sm:w-96 p-0 bg-[#0a0a0f]/95 backdrop-blur-xl border-white/[0.06] shadow-2xl" align="end" sideOffset={8}>
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
                  <h3 className="font-semibold text-sm">Notificações</h3>
                  <div className="flex items-center gap-2">
                    {notifications.length > 0 && (
                      <Button variant="ghost" size="sm" className="h-7 text-xs text-zinc-400 hover:text-white hover:bg-white/[0.05]" onClick={clearNotifications}>
                        Limpar tudo
                      </Button>
                    )}
                  </div>
                </div>
                <ScrollArea className="max-h-80">
                  {notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-zinc-500">
                      <Bell className="h-8 w-8 mb-2 opacity-30" />
                      <p className="text-sm">Nenhuma notificação</p>
                      <p className="text-xs mt-1">Notificações de ROI, depósitos e comissões aparecerão aqui</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-white/[0.04]">
                      {notifications.slice(0, 20).map(notif => {
                        const iconMap: Record<NotificationType, React.ReactNode> = {
                          trading: <Bot className="h-4 w-4 text-emerald-400" />,
                          deposit: <ArrowDownLeft className="h-4 w-4 text-emerald-400" />,
                          withdrawal: <ArrowUpRight className="h-4 w-4 text-amber-400" />,
                          affiliate: <Users className="h-4 w-4 text-cyan-400" />,
                          investment: <Cpu className="h-4 w-4 text-emerald-400" />,
                          system: <Info className="h-4 w-4 text-zinc-400" />,
                        };
                        const bgMap: Record<NotificationType, string> = {
                          trading: 'bg-emerald-500/10',
                          deposit: 'bg-emerald-500/10',
                          withdrawal: 'bg-amber-500/10',
                          affiliate: 'bg-cyan-500/10',
                          investment: 'bg-emerald-500/10',
                          system: 'bg-zinc-500/10',
                        };
                        return (
                          <div
                            key={notif.id}
                            className={`flex items-start gap-3 px-4 py-3 transition-colors ${!notif.read ? bgMap[notif.type] + ' border-l-2 border-emerald-500/40' : 'hover:bg-white/[0.02]'}`}
                          >
                            <div className="mt-0.5 shrink-0">{iconMap[notif.type]}</div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm ${!notif.read ? 'font-medium text-white' : 'text-zinc-300'}`}>{notif.title}</p>
                              <p className="text-xs text-zinc-400 mt-0.5 truncate">{notif.message}</p>
                              <p className="text-[10px] text-zinc-500 mt-1">{timeAgo(notif.timestamp)}</p>
                            </div>
                            {notif.amount && d(notif.amount) > 0 && (
                              <span className="text-xs font-semibold text-emerald-400 shrink-0">
                                +${d(notif.amount) > 1 ? d(notif.amount).toFixed(2) : d(notif.amount).toFixed(4)}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </ScrollArea>
              </PopoverContent>
            </Popover>
            {/* User avatar with emerald ring when has active investments */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2 hover:bg-white/[0.05]">
                  <div className={`relative ${activeInvestments.length > 0 ? 'ring-2 ring-emerald-500/50 rounded-full p-[2px] shadow-[0_0_10px_rgba(16,185,129,0.2)]' : ''}`}>
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="bg-emerald-500/15 text-emerald-400 text-sm border border-emerald-500/20">
                        {user.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  <span className="hidden sm:inline text-sm text-zinc-300">{user.name}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-[#0a0a0f]/95 backdrop-blur-xl border-white/[0.06]" align="end">
                {isAdmin && (
                  <>
                    <DropdownMenuItem onClick={() => { setAdminViewMode(adminViewMode === 'admin' ? 'investor' : 'admin'); setActiveTab(adminViewMode === 'admin' ? 'home' : 'overview'); }} className="hover:bg-white/[0.05] focus:bg-white/[0.05]">
                      {adminViewMode === 'admin' ? <TrendingUp className="mr-2 h-4 w-4 text-emerald-400" /> : <Shield className="mr-2 h-4 w-4 text-emerald-400" />}
                      {adminViewMode === 'admin' ? 'Modo Investidor' : 'Modo Admin'}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-white/[0.06]" />
                  </>
                )}
                {(!isAdmin || adminViewMode === 'investor') && (
                  <DropdownMenuItem onClick={() => setActiveTab('perfil')} className="hover:bg-white/[0.05] focus:bg-white/[0.05]">
                    <User className="mr-2 h-4 w-4" /> {t('sidebar.profile')}
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator className="bg-white/[0.06]" />
                <DropdownMenuItem onClick={handleLogout} className="text-red-400 hover:bg-white/[0.05] focus:bg-white/[0.05]">
                  <LogOut className="mr-2 h-4 w-4" /> {t('dashboard.logout')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <div className="flex-1 flex">
        {/* DESKTOP SIDEBAR */}
        <aside className="hidden lg:flex w-60 bg-[#0a0a0f]/90 backdrop-blur-xl border-r border-white/[0.06] flex-col">
          {/* Quick Stats at top */}
          {(!isAdmin || adminViewMode === 'investor') && (
            <div className="p-4 border-b border-white/[0.06]">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.5)]" />
                <span className="text-[10px] text-zinc-500 uppercase tracking-widest">Portfolio</span>
              </div>
              <div className="space-y-2">
                <div className="bg-white/[0.03] rounded-lg p-3 border border-white/[0.04]">
                  <div className="text-[10px] text-zinc-500 uppercase tracking-wider">{t('dashboard.balance')}</div>
                  <div className="text-lg font-bold text-white mt-0.5">${fmtUSDT(user.balance)}</div>
                  <div className="text-[10px] text-zinc-500">≈ {t('common.brl')} {fmtBRL(balanceBRL)}</div>
                </div>
                <div className="bg-white/[0.03] rounded-lg p-3 border border-white/[0.04]">
                  <div className="text-[10px] text-zinc-500 uppercase tracking-wider">{t('trading.todayEarnings')}</div>
                  <div className="text-base font-bold text-emerald-400 mt-0.5">+${fmtUSDT(todayEarnings)}</div>
                </div>
              </div>
            </div>
          )}
          {isAdmin && adminViewMode === 'admin' && (
            <div className="p-4 border-b border-white/[0.06]">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-emerald-400" />
                <span className="text-[10px] text-zinc-500 uppercase tracking-widest">Admin Panel</span>
              </div>
            </div>
          )}
          <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
            {navItems.map(item => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-r-lg text-sm transition-all duration-200 ${
                  activeTab === item.id
                    ? 'bg-emerald-500/10 text-emerald-400 font-medium border-l-2 border-emerald-400'
                    : 'text-zinc-500 hover:text-white hover:bg-white/[0.03] border-l-2 border-transparent'
                }`}
              >
                <item.icon className={`h-[18px] w-[18px] ${activeTab === item.id ? 'text-emerald-400' : ''}`} />
                {item.label}
              </button>
            ))}
          </nav>
          {(!isAdmin || adminViewMode === 'investor') && (
            <div className="p-4 border-t border-white/[0.06]">
              <div className="bg-white/[0.03] rounded-lg p-3 border border-white/[0.04]">
                <div className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-emerald-500/15 text-emerald-400 text-xs border border-emerald-500/20">
                      {user.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-white truncate">{user.name}</div>
                    <div className="text-[10px] text-zinc-500">{t('dashboard.totalRoi')}: <span className="text-emerald-400">${fmtUSDT(user.totalRoi)}</span></div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </aside>

        {/* MOBILE SIDEBAR OVERLAY */}
        <AnimatePresence>
          {sidebarOpen && (
            <>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.6 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
              <motion.aside initial={{ x: -300 }} animate={{ x: 0 }} exit={{ x: -300 }} transition={{ type: 'spring', damping: 25, stiffness: 250 }} className="fixed left-0 top-0 bottom-0 w-72 max-w-[80vw] bg-[#0a0a0f]/95 backdrop-blur-xl border-r border-white/[0.06] z-50 lg:hidden flex flex-col">
                {/* User Profile at Top */}
                <div className="p-4 border-b border-white/[0.06]">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2.5">
                      <div className="relative">
                        <Bot className="h-6 w-6 text-emerald-400" />
                        <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                      </div>
                      <span className="font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                        {isAdmin ? (adminViewMode === 'admin' ? 'ADMIN' : 'PLATAFORMA ROI') : 'PLATAFORMA ROI'}
                      </span>
                    </div>
                    <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-white hover:bg-white/[0.05] h-8 w-8" onClick={() => setSidebarOpen(false)}><X className="h-4 w-4" /></Button>
                  </div>
                  {(!isAdmin || adminViewMode === 'investor') && (
                    <div className="bg-white/[0.03] rounded-lg p-3 border border-white/[0.04]">
                      <div className="flex items-center gap-3">
                        <div className={`relative ${activeInvestments.length > 0 ? 'ring-2 ring-emerald-500/50 rounded-full p-[2px]' : ''}`}>
                          <Avatar className="h-10 w-10">
                            <AvatarFallback className="bg-emerald-500/15 text-emerald-400 text-sm border border-emerald-500/20">
                              {user.name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-white truncate">{user.name}</div>
                          <div className="text-xs text-emerald-400 font-semibold">${fmtUSDT(user.balance)} USDT</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                {/* Navigation */}
                <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
                  {navItems.map(item => (
                    <button key={item.id} onClick={() => { setActiveTab(item.id); setSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-r-lg text-sm transition-all duration-200 ${activeTab === item.id ? 'bg-emerald-500/10 text-emerald-400 font-medium border-l-2 border-emerald-400' : 'text-zinc-500 hover:text-white hover:bg-white/[0.03] border-l-2 border-transparent'}`}>
                      <item.icon className={`h-[18px] w-[18px] ${activeTab === item.id ? 'text-emerald-400' : ''}`} />{item.label}
                    </button>
                  ))}
                </nav>
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        {/* MAIN CONTENT */}
        <main className="flex-1 overflow-auto pb-24 lg:pb-4">
          <div className="max-w-7xl mx-auto px-4 py-6">
            <AnimatePresence mode="wait">
              <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>

                {/* ====== HOME TAB ====== */}
                {activeTab === 'home' && (
                  <div className="space-y-5">
                    {/* Header with live indicator */}
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between flex-wrap gap-2">
                      <h2 className="text-xl sm:text-2xl font-bold truncate">{t('dashboard.welcome')}, {user.name.split(' ')[0]}! 👋</h2>
                      <div className="flex items-center gap-3">
                        {mounted && isLivePolling && (
                          <div className="glass-card rounded-full px-3 py-1.5 flex items-center gap-2 text-xs text-cyan-400">
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
                            </span>
                            ROI {t('trading.live')}
                          </div>
                        )}
                      </div>
                    </motion.div>

                    {/* Earnings Flash Notification */}
                    <AnimatePresence>
                      {mounted && roiFlash !== null && roiFlash > 0 && (
                        <motion.div
                          initial={{ opacity: 0, y: -20, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -20, scale: 0.95 }}
                          className="glass-card gradient-border rounded-xl p-4 flex items-center gap-3"
                        >
                          <div className="w-10 h-10 bg-emerald-500/20 rounded-full flex items-center justify-center">
                            <TrendingUp className="h-5 w-5 text-emerald-400 animate-bounce" />
                          </div>
                          <div>
                            <div className="font-semibold text-emerald-400">+${roiFlash.toFixed(2)} USDT</div>
                            <div className="text-sm text-zinc-400">{t('trading.newEarnings')}</div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* ====== PORTFOLIO HERO CARD ====== */}
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                      <div className="glass-card gradient-border rounded-2xl relative overflow-hidden stat-card-hover">
                        {/* Animated background glow */}
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-48 bg-gradient-to-b from-emerald-500/10 via-cyan-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />
                        <div className="absolute bottom-0 right-0 w-64 h-32 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none animate-orb" />

                        <div className="relative p-5 sm:p-7">
                          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            {/* Total Balance */}
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Wallet className="h-4 w-4 text-zinc-400" />
                                <span className="text-xs sm:text-sm text-zinc-400 uppercase tracking-wider">{t('dashboard.balance')} USDT</span>
                                <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/25 text-[10px]" variant="outline">
                                  <span className="flex h-1.5 w-1.5 mr-1"><span className="animate-ping absolute inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400 opacity-75"></span><span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span></span>
                                  Ativo
                                </Badge>
                              </div>
                              <div className="text-3xl sm:text-4xl lg:text-5xl font-bold animate-count-glow tracking-tight">
                                ${fmtUSDT(user.balance)}
                              </div>
                              <div className="text-sm text-zinc-400 mt-1">≈ {t('common.brl')} {fmtBRL(balanceBRL)}</div>

                              {/* Shimmer effect on balance when earnings come in */}
                              {mounted && roiFlash !== null && roiFlash > 0 && (
                                <motion.div
                                  initial={{ x: '-100%' }}
                                  animate={{ x: '200%' }}
                                  transition={{ duration: 1.5, ease: 'easeInOut' }}
                                  className="absolute inset-0 bg-gradient-to-r from-transparent via-emerald-400/10 to-transparent pointer-events-none"
                                />
                              )}
                            </div>

                            {/* Right side - Quick stats */}
                            <div className="grid grid-cols-2 gap-3 w-full sm:w-auto">
                              <div className="bg-white/[0.03] rounded-xl p-3 border border-white/[0.04] min-w-[120px]">
                                <div className="text-[10px] sm:text-xs text-zinc-500 uppercase tracking-wider">{t('dashboard.affiliateBalance')}</div>
                                <div className="text-base sm:text-lg font-bold truncate">${fmtUSDT(user.affiliateBalance)}</div>
                                <div className="text-[10px] sm:text-xs text-zinc-500">≈ R$ {fmtBRL(affiliateBalanceBRL)}</div>
                              </div>
                              <div className="bg-white/[0.03] rounded-xl p-3 border border-purple-500/10 min-w-[120px]">
                                <div className="text-[10px] sm:text-xs text-purple-400/70 uppercase tracking-wider flex items-center gap-1">🎫 Voucher</div>
                                <div className="text-base sm:text-lg font-bold text-purple-400 truncate">${fmtUSDT(user.voucherBalance)}</div>
                                <div className="text-[10px] sm:text-xs text-zinc-500">≈ R$ {fmtBRL(voucherBalanceBRL)}</div>
                              </div>
                              <div className="bg-white/[0.03] rounded-xl p-3 border border-white/[0.04] min-w-[120px]">
                                <div className="text-[10px] sm:text-xs text-zinc-500 uppercase tracking-wider">{t('dashboard.totalRoi')}</div>
                                <div className="text-base sm:text-lg font-bold text-cyan-400 truncate">${fmtUSDT(user.totalRoi)}</div>
                                <div className="text-[10px] sm:text-xs text-zinc-500">{t('dashboard.totalInvested')}: ${fmtUSDT(user.totalInvested)}</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>

                    {/* ====== NEW USER ONBOARDING CTA ====== */}
                    {mounted && d(user.balance) === 0 && activeInvestments.length === 0 && (
                      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                        <div className="glass-card rounded-2xl relative overflow-hidden stat-card-hover border border-emerald-500/20">
                          {/* Animated gradient bg */}
                          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-cyan-500/5 pointer-events-none" />
                          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent" />
                          
                          <div className="relative p-6 sm:p-8 text-center">
                            <div className="w-16 h-16 bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-emerald-500/20 shadow-lg shadow-emerald-500/10">
                              <Wallet className="h-8 w-8 text-emerald-400" />
                            </div>
                            <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">Comece a Investir Agora</h3>
                            <p className="text-zinc-400 text-sm max-w-md mx-auto mb-6">
                              Deposite USDT na sua conta e comece a ganhar <span className="text-emerald-400 font-semibold">5% de ROI diário</span> automaticamente. O processo é simples e rápido!
                            </p>
                            
                            {/* Steps */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6 max-w-lg mx-auto">
                              <div className="bg-white/[0.03] rounded-xl p-3 border border-white/[0.04]">
                                <div className="w-8 h-8 bg-emerald-500/15 rounded-lg flex items-center justify-center mx-auto mb-2">
                                  <ArrowDownLeft className="h-4 w-4 text-emerald-400" />
                                </div>
                                <div className="text-xs font-semibold text-white mb-0.5">1. Deposite</div>
                                <div className="text-[10px] text-zinc-500">USDT via crypto ou PIX</div>
                              </div>
                              <div className="bg-white/[0.03] rounded-xl p-3 border border-white/[0.04]">
                                <div className="w-8 h-8 bg-cyan-500/15 rounded-lg flex items-center justify-center mx-auto mb-2">
                                  <Target className="h-4 w-4 text-cyan-400" />
                                </div>
                                <div className="text-xs font-semibold text-white mb-0.5">2. Escolha um Plano</div>
                                <div className="text-[10px] text-zinc-500">A partir de $10 USDT</div>
                              </div>
                              <div className="bg-white/[0.03] rounded-xl p-3 border border-white/[0.04]">
                                <div className="w-8 h-8 bg-amber-500/15 rounded-lg flex items-center justify-center mx-auto mb-2">
                                  <TrendingUp className="h-4 w-4 text-amber-400" />
                                </div>
                                <div className="text-xs font-semibold text-white mb-0.5">3. Ganhe 5%/dia</div>
                                <div className="text-[10px] text-zinc-500">ROI diário automático</div>
                              </div>
                            </div>
                            
                            <Button
                              className="bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-white font-semibold rounded-xl px-8 py-3 text-base shadow-lg shadow-emerald-500/20"
                              onClick={() => setDepositDialog(true)}
                            >
                              <Wallet className="mr-2 h-5 w-5" /> Depositar Agora
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {/* ====== ROI EARNINGS LIVE CARD ====== */}
                    {mounted && activeInvestments.length > 0 && (
                      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                        <div className="glass-card gradient-border rounded-2xl relative overflow-hidden stat-card-hover">
                          {/* Green glow effect */}
                          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-40 bg-emerald-500/8 rounded-full blur-3xl pointer-events-none" />

                          <div className="relative p-5 sm:p-6">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                              {/* Today's Earnings */}
                              <div className="flex items-center gap-4 flex-1">
                                <div className="w-12 h-12 bg-emerald-500/15 rounded-xl flex items-center justify-center border border-emerald-500/20">
                                  <DollarSign className="h-6 w-6 text-emerald-400" />
                                </div>
                                <div>
                                  <div className="text-xs text-zinc-400 uppercase tracking-wider">{t('trading.todayEarnings')}</div>
                                  <div className="text-2xl sm:text-3xl font-bold text-emerald-400 animate-count-glow">
                                    +${fmtUSDT(todayEarnings)} <span className="text-sm font-normal text-zinc-500">USDT</span>
                                  </div>
                                  <div className="text-xs text-zinc-500 mt-0.5">
                                    {activeInvestments.length} {activeInvestments.length === 1 ? 'investimento ativo' : 'investimentos ativos'}
                                  </div>
                                </div>
                              </div>

                              {/* Real-time earnings counter */}
                              <div className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.04] w-full sm:w-auto">
                                <div className="text-xs text-zinc-400 uppercase tracking-wider mb-2">{t('trading.earningsRate')}</div>
                                <div className="text-xl sm:text-2xl font-bold text-cyan-400 font-mono">
                                  +${(activeInvestments.reduce((sum, r) => sum + d(r.dailyRoi), 0) / 86400).toFixed(6)}
                                  <span className="text-xs font-normal text-zinc-500 ml-1">{t('trading.perSecond')}</span>
                                </div>
                                <div className="text-[10px] sm:text-xs text-zinc-500 mt-1 font-mono">
                                  ${(activeInvestments.reduce((sum, r) => sum + d(r.dailyRoi), 0) / 3600).toFixed(4)}{t('trading.perHour')} &bull;
                                  ${fmtUSDT(activeInvestments.reduce((sum, r) => sum + d(r.dailyRoi), 0).toString())}{t('trading.perDay')}
                                </div>
                              </div>
                            </div>

                            {/* Earnings Progress + Countdown */}
                            <div className="mt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                              {/* Cumulative earnings progress */}
                              <div className="flex-1 w-full sm:w-auto">
                                <div className="flex items-center justify-between mb-1.5">
                                  <span className="text-xs text-zinc-400">{t('trading.earningsStream')}</span>
                                  <span className="text-sm font-bold text-emerald-400 font-mono">+${liveEarnings.toFixed(6)} USDT</span>
                                </div>
                                <div className="w-full bg-white/[0.04] rounded-full h-2 overflow-hidden">
                                  {(() => {
                                    const totalReturn = activeInvestments.reduce((sum, r) => sum + d(r.totalRoi), 0);
                                    const progress = totalReturn > 0 ? Math.min(100, (liveEarnings / totalReturn) * 100) : 0;
                                    return <div className="bg-gradient-to-r from-emerald-500 to-cyan-400 h-2 rounded-full transition-all duration-1000 relative overflow-hidden" style={{ width: `${Math.max(2, progress)}%` }}>
                                      <div className="animate-shimmer absolute inset-0" />
                                    </div>;
                                  })()}
                                </div>
                                <div className="flex items-center justify-between mt-1">
                                  <span className="text-[10px] text-zinc-500">{t('trading.totalAccumulated')}</span>
                                  <span className="text-[10px] text-zinc-500">{(() => {
                                    const totalReturn = activeInvestments.reduce((sum, r) => sum + d(r.totalRoi), 0);
                                    const pct = totalReturn > 0 ? ((liveEarnings / totalReturn) * 100).toFixed(1) : '0';
                                    return `${pct}% de ${fmtUSDT(totalReturn.toString())} USDT`;
                                  })()}</span>
                                </div>
                              </div>

                              {/* Next Distribution Countdown */}
                              {nextDistribution && (
                                <div className="flex items-center gap-2 flex-shrink-0">
                                  <Clock4 className="h-4 w-4 text-zinc-500" />
                                  <span className="text-xs text-zinc-400">{t('trading.nextDistribution')}:</span>
                                  <div className="flex gap-1 font-mono text-sm">
                                    <span className="glass-card px-2 py-1 rounded-md text-cyan-400 text-xs">{String(nextDistribution.hours).padStart(2, '0')}</span>
                                    <span className="text-zinc-500">:</span>
                                    <span className="glass-card px-2 py-1 rounded-md text-cyan-400 text-xs">{String(nextDistribution.minutes).padStart(2, '0')}</span>
                                    <span className="text-zinc-500">:</span>
                                    <span className="glass-card px-2 py-1 rounded-md text-cyan-400 text-xs">{String(nextDistribution.seconds).padStart(2, '0')}</span>
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Live Operation Stats Bar */}
                            <div className="grid grid-cols-3 gap-3 mt-4">
                              <div className="bg-white/[0.03] rounded-lg p-2.5 text-center border border-white/[0.04]">
                                <div className="text-[10px] sm:text-xs text-zinc-500 uppercase tracking-wider">ROI Total</div>
                                <div className="text-sm font-semibold text-emerald-400 font-mono">
                                  {activeInvestments.reduce((sum, r, i) => sum + (liveWinRates[i] || parseFloat(r.plan?.dailyRoiPct || '0')), 0).toFixed(1)}%
                                </div>
                              </div>
                              <div className="bg-white/[0.03] rounded-lg p-2.5 text-center border border-white/[0.04]">
                                <div className="text-[10px] sm:text-xs text-zinc-500 uppercase tracking-wider">{t('trading.totalCapital')}</div>
                                <div className="text-sm font-semibold text-white font-mono">
                                  {activeInvestments.reduce((sum, r) => sum + d(r.amount), 0).toFixed(2)}
                                </div>
                              </div>
                              <div className="bg-white/[0.03] rounded-lg p-2.5 text-center border border-white/[0.04]">
                                <div className="text-[10px] sm:text-xs text-zinc-500 uppercase tracking-wider">{t('trading.tradesAccepted')}</div>
                                <div className="text-sm font-semibold text-cyan-400 font-mono">
                                  {liveShares.reduce((sum, s) => sum + (s?.valid || 0), 0).toLocaleString()}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {/* ====== QUICK ACTION BUTTONS ====== */}
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <button
                          onClick={() => setDepositDialog(true)}
                          className="glass-card gradient-border rounded-xl p-4 stat-card-hover flex items-center gap-3 group cursor-pointer"
                        >
                          <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg flex items-center justify-center shadow-lg shadow-emerald-500/20">
                            <ArrowDownLeft className="h-5 w-5 text-white" />
                          </div>
                          <div className="text-left">
                            <div className="text-sm font-semibold text-white group-hover:text-emerald-400 transition-colors">{t('dashboard.deposit')}</div>
                            <div className="text-[10px] text-zinc-500">USDT</div>
                          </div>
                        </button>

                        <button
                          onClick={() => { setWithdrawDialog(true); fetchWithdrawalBreakdown(); }}
                          className="glass-card rounded-xl p-4 stat-card-hover flex items-center gap-3 border border-white/[0.06] group cursor-pointer"
                        >
                          <div className="w-10 h-10 bg-white/[0.05] rounded-lg flex items-center justify-center border border-white/[0.08]">
                            <ArrowUpRight className="h-5 w-5 text-cyan-400" />
                          </div>
                          <div className="text-left">
                            <div className="text-sm font-semibold text-white group-hover:text-cyan-400 transition-colors">{t('dashboard.withdraw')}</div>
                            <div className="text-[10px] text-zinc-500">Saques</div>
                          </div>
                        </button>

                        <button
                          onClick={() => setActiveTab('investir')}
                          className="glass-card gradient-border rounded-xl p-4 stat-card-hover flex items-center gap-3 group cursor-pointer"
                        >
                          <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-lg flex items-center justify-center shadow-lg shadow-cyan-500/20">
                            <TrendingUp className="h-5 w-5 text-white" />
                          </div>
                          <div className="text-left">
                            <div className="text-sm font-semibold text-white group-hover:text-cyan-400 transition-colors">{t('dashboard.investNow')}</div>
                            <div className="text-[10px] text-zinc-500">5% ROI/dia</div>
                          </div>
                        </button>

                        <button
                          onClick={() => setActiveTab('afiliados')}
                          className="glass-card rounded-xl p-4 stat-card-hover flex items-center gap-3 border border-white/[0.06] group cursor-pointer"
                        >
                          <div className="w-10 h-10 bg-white/[0.05] rounded-lg flex items-center justify-center border border-white/[0.08]">
                            <Users className="h-5 w-5 text-emerald-400" />
                          </div>
                          <div className="text-left">
                            <div className="text-sm font-semibold text-white group-hover:text-emerald-400 transition-colors">Afiliados</div>
                            <div className="text-[10px] text-zinc-500">11 níveis</div>
                          </div>
                        </button>
                      </div>
                    </motion.div>

                    {/* ====== INVESTMENT PLANS PREVIEW ====== */}
                    {copyTraders.length > 0 && (
                      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-lg font-bold flex items-center gap-2">
                            <BarChart3 className="h-5 w-5 text-cyan-400" />
                            Planos de Investimento
                          </h3>
                          <button onClick={() => setActiveTab('investir')} className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-1">
                            Ver todos <ChevronRight className="h-3 w-3" />
                          </button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          {copyTraders.slice(0, 3).map((trader, idx) => {
                            const accentColors = [
                              { border: 'from-emerald-500/40 to-emerald-600/10', glow: 'shadow-emerald-500/10', text: 'text-emerald-400', bg: 'from-emerald-500/15 to-emerald-600/5' },
                              { border: 'from-cyan-500/40 to-cyan-600/10', glow: 'shadow-cyan-500/10', text: 'text-cyan-400', bg: 'from-cyan-500/15 to-cyan-600/5' },
                              { border: 'from-purple-500/40 to-purple-600/10', glow: 'shadow-purple-500/10', text: 'text-purple-400', bg: 'from-purple-500/15 to-purple-600/5' },
                            ];
                            const accent = accentColors[idx % 3];
                            const plan = trader.plans?.[0];
                            return (
                              <div key={trader.id} className={`glass-card rounded-xl relative overflow-hidden stat-card-hover group`}>
                                <div className={`absolute inset-0 bg-gradient-to-br ${accent.bg} opacity-50 pointer-events-none`} />
                                <div className={`absolute top-0 left-0 right-0 h-px bg-gradient-to-r ${accent.border}`} />
                                <div className="relative p-4">
                                  <div className="flex items-center gap-2 mb-3">
                                    <div className={`w-8 h-8 bg-gradient-to-br ${accent.bg} rounded-lg flex items-center justify-center border border-white/[0.06]`}>
                                      <span className="text-sm font-bold text-white">{assetIcon(trader.name || 'USDT')}</span>
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <div className="text-sm font-semibold truncate">{trader.name}</div>
                                      <div className="text-[10px] text-zinc-500">{trader.specialty}</div>
                                    </div>
                                  </div>
                                  <div className="space-y-1.5 mb-3">
                                    <div className="flex items-center justify-between">
                                      <span className="text-xs text-zinc-400">ROI Diário</span>
                                      <span className={`text-sm font-bold ${accent.text}`}>{plan?.dailyRoiPct || trader.winRate}%</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                      <span className="text-xs text-zinc-400">Mínimo</span>
                                      <span className="text-xs text-white">${plan?.minAmount || '10'} USDT</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                      <span className="text-xs text-zinc-400">Duração</span>
                                      <span className="text-xs text-white">{plan?.days || plan?.durationDays || '30'} dias</span>
                                    </div>
                                  </div>
                                  <button
                                    onClick={() => { setInvestDialogPlan(trader); setSelectedPlanId(plan?.id || undefined); }}
                                    className={`w-full bg-gradient-to-r ${accent.bg} hover:opacity-80 border border-white/[0.06] rounded-lg py-2 text-xs font-medium text-white transition-all`}
                                  >
                                    Começar a investir
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}

                    {/* ====== TEAM BONUS PROGRESS ====== */}
                    {affiliateData && (
                      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                        <div className="glass-card gradient-border rounded-2xl relative overflow-hidden stat-card-hover">
                          <div className="absolute inset-0 opacity-5" style={{ background: `linear-gradient(135deg, ${affiliateData.currentRank?.color || '#22c55e'} 0%, transparent 60%)` }} />
                          <div className="relative p-5 sm:p-6">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                              {/* Current Rank */}
                              <div className="flex items-center gap-4">
                                <div className="w-14 h-14 bg-white/[0.05] rounded-xl flex items-center justify-center border border-white/[0.08]" style={{ boxShadow: `0 0 20px ${affiliateData.currentRank?.color || '#22c55e'}20` }}>
                                  <span className="text-2xl sm:text-3xl">{affiliateData.currentRank?.icon || '🌱'}</span>
                                </div>
                                <div>
                                  <div className="text-xs text-zinc-400 uppercase tracking-wider">Rank Atual</div>
                                  <div className="text-xl font-bold" style={{ color: affiliateData.currentRank?.color || '#22c55e' }}>
                                    {affiliateData.currentRank?.name || 'Iniciante'}
                                  </div>
                                  {affiliateData.currentRank && d(affiliateData.currentRank.commissionBoost) > 0 && (
                                    <div className="text-xs text-emerald-400 mt-0.5">+{affiliateData.currentRank.commissionBoost}% bônus diário</div>
                                  )}
                                </div>
                              </div>

                              {/* Stats */}
                              <div className="grid grid-cols-2 gap-3">
                                <div className="bg-white/[0.03] rounded-lg p-3 border border-white/[0.04] text-center">
                                  <div className="text-[10px] sm:text-xs text-zinc-500 uppercase tracking-wider">Indicações</div>
                                  <div className="text-lg font-bold text-white">{affiliateData.directReferrals ?? (affiliateData.referralTree?.[1]?.length || 0)}</div>
                                </div>
                                <div className="bg-white/[0.03] rounded-lg p-3 border border-white/[0.04] text-center">
                                  <div className="text-[10px] sm:text-xs text-zinc-500 uppercase tracking-wider">Ganhos Time</div>
                                  <div className="text-lg font-bold text-emerald-400">${affiliateData.totalEarnings.toFixed(2)}</div>
                                </div>
                              </div>
                            </div>

                            {/* Progress to next rank */}
                            {affiliateData.nextRank && (
                              <div className="mt-4">
                                <div className="flex items-center justify-between mb-1.5">
                                  <span className="text-xs text-zinc-400">Próximo: <span style={{ color: affiliateData.nextRank.color }} className="font-medium">{affiliateData.nextRank.name}</span></span>
                                  <span className="text-xs text-zinc-500">{affiliateData.nextRankReferralsNeeded || 0} indicações restantes</span>
                                </div>
                                <div className="w-full bg-white/[0.04] rounded-full h-2 overflow-hidden">
                                  {(() => {
                                    const currentRefs = affiliateData.directReferrals ?? (affiliateData.referralTree?.[1]?.length || 0);
                                    const minRefs = d(affiliateData.currentRank?.minReferrals?.toString() || '0');
                                    const nextRefs = d(affiliateData.nextRank.minReferrals?.toString() || '1');
                                    const progress = nextRefs > minRefs ? Math.min(100, ((currentRefs - minRefs) / (nextRefs - minRefs)) * 100) : (currentRefs >= nextRefs ? 100 : 0);
                                    return <div className="h-2 rounded-full transition-all duration-700 relative overflow-hidden" style={{ width: `${Math.max(2, progress)}%`, background: `linear-gradient(90deg, ${affiliateData.currentRank?.color || '#22c55e'}, ${affiliateData.nextRank?.color || '#06b6d4'})` }}>
                                      <div className="animate-shimmer absolute inset-0" />
                                    </div>;
                                  })()}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {/* ====== ACTIVE INVESTMENTS SUMMARY ====== */}
                    {mounted && activeInvestments.length > 0 ? (
                      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <h3 className="text-lg font-bold flex items-center gap-2">
                              <Zap className="h-5 w-5 text-emerald-400" />
                              Investimentos Ativos
                              <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/25" variant="outline">{activeInvestments.length}</Badge>
                            </h3>
                          </div>

                          <div className="max-h-96 overflow-y-auto space-y-3 custom-scrollbar pr-1">
                            {activeInvestments.map((r, idx) => {
                              const baseWinRate = parseFloat((r.plan as any)?.winRate || r.plan?.dailyRoiPct || '0');
                              const currentWR = liveWinRates[idx] || baseWinRate;
                              const teamBonus = d(r.teamBonusPct);
                              return (
                                <div key={r.id} className="glass-card rounded-xl relative overflow-hidden stat-card-hover">
                                  {/* Animated top indicator bar */}
                                  <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent animate-pulse" />

                                  <div className="p-4">
                                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                                      {/* Investment Icon + Info */}
                                      <div className="flex items-center gap-3 flex-1 min-w-0">
                                        <div className="relative w-11 h-11 flex-shrink-0">
                                          <div className="w-11 h-11 bg-gradient-to-br from-emerald-500/15 to-cyan-500/10 rounded-xl flex items-center justify-center border border-white/[0.06]">
                                            <span className="text-base font-bold text-cyan-400">{assetIcon(r.plan?.name || 'USDT')}</span>
                                          </div>
                                          <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-zinc-900 rounded-full border border-white/[0.08] flex items-center justify-center">
                                            <div className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-pulse" />
                                          </div>
                                        </div>
                                        <div className="min-w-0">
                                          <div className="text-sm font-semibold truncate">{r.plan?.name || t('plans.plan')}</div>
                                          <div className="flex items-center gap-2 mt-0.5">
                                            <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/25 text-[10px]" variant="outline">
                                              {t('status.active')}
                                            </Badge>
                                            {teamBonus > 0 && (
                                              <Badge className="bg-cyan-500/15 text-cyan-400 border-cyan-500/25 text-[10px]" variant="outline">
                                                +{teamBonus}% bônus
                                              </Badge>
                                            )}
                                          </div>
                                        </div>
                                      </div>

                                      {/* Key Metrics */}
                                      <div className="grid grid-cols-3 gap-2 w-full sm:w-auto">
                                        <div className="bg-white/[0.03] rounded-lg p-2 text-center border border-white/[0.04]">
                                          <div className="text-[10px] text-zinc-500">Valor</div>
                                          <div className="text-xs font-semibold text-white font-mono">${d(r.amount).toFixed(2)}</div>
                                        </div>
                                        <div className="bg-white/[0.03] rounded-lg p-2 text-center border border-white/[0.04]">
                                          <div className="text-[10px] text-zinc-500">ROI/dia</div>
                                          <div className="text-xs font-semibold text-emerald-400 font-mono">${d(r.dailyRoi).toFixed(2)}</div>
                                        </div>
                                        <div className="bg-white/[0.03] rounded-lg p-2 text-center border border-white/[0.04]">
                                          <div className="text-[10px] text-zinc-500">{t('trading.earned')}</div>
                                          <div className="text-xs font-semibold text-cyan-400 font-mono">+${(rentalAccumulatedEarnings[idx] || 0).toFixed(2)}</div>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Progress bar */}
                                    <div className="mt-3">
                                      <div className="flex items-center justify-between text-[10px] text-zinc-500 mb-1">
                                        <span>{fmtDate(r.startDate)}</span>
                                        <span>{(() => {
                                          const start = new Date(r.startDate).getTime();
                                          const end = new Date(r.endDate).getTime();
                                          const now = Date.now();
                                          const daysElapsed = Math.floor((now - start) / (1000 * 60 * 60 * 24));
                                          return `${daysElapsed}d / ${r.plan?.durationDays || '?'}d`;
                                        })()}</span>
                                        <span>{fmtDate(r.endDate)}</span>
                                      </div>
                                      <div className="w-full bg-white/[0.04] rounded-full h-1.5 overflow-hidden">
                                        {(() => {
                                          const start = new Date(r.startDate).getTime();
                                          const end = new Date(r.endDate).getTime();
                                          const now = Date.now();
                                          const progress = Math.min(100, Math.max(0, ((now - start) / (end - start)) * 100));
                                          return <div className="bg-gradient-to-r from-emerald-500 to-cyan-400 h-1.5 rounded-full transition-all duration-1000 relative overflow-hidden" style={{ width: `${progress}%` }}>
                                            <div className="animate-shimmer absolute inset-0" />
                                          </div>;
                                        })()}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {/* Live Earnings Feed */}
                          <div className="glass-card rounded-xl">
                            <div className="px-4 pt-3 pb-2 flex items-center gap-2">
                              <Coins className="h-4 w-4 text-cyan-400" />
                              <span className="text-sm font-medium">{t('trading.earningsStream')}</span>
                              <span className="relative flex h-2 w-2 ml-1">
                                <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
                              </span>
                            </div>
                            <div className="px-4 pb-3">
                              <div className="max-h-36 overflow-y-auto space-y-1.5 custom-scrollbar">
                                {liveEarningsFeed.length === 0 ? (
                                  <div className="text-xs text-zinc-500 text-center py-3">{t('trading.operatingNow')}...</div>
                                ) : (
                                  liveEarningsFeed.map(entry => (
                                    <motion.div
                                      key={entry.id}
                                      initial={{ opacity: 0, x: -20 }}
                                      animate={{ opacity: 1, x: 0 }}
                                      className="flex items-center justify-between bg-white/[0.03] rounded-lg px-3 py-1.5 border border-white/[0.04]"
                                    >
                                      <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-bold text-cyan-400">{assetIcon(entry.coin)}</span>
                                        <span className="text-[10px] text-zinc-400 font-mono">{entry.time}</span>
                                      </div>
                                      <span className="text-xs font-medium text-emerald-400 font-mono">+${entry.amount.toFixed(6)}</span>
                                    </motion.div>
                                  ))
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
                        <div className="glass-card gradient-border rounded-2xl p-8 text-center">
                          <div className="w-16 h-16 bg-white/[0.04] rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/[0.06]">
                            <TrendingUp className="h-8 w-8 text-zinc-600" />
                          </div>
                          <p className="text-zinc-400 mb-1 text-lg font-medium">Nenhum investimento ativo</p>
                          <p className="text-zinc-500 text-sm mb-4">Comece a investir e veja seus lucros em tempo real</p>
                          <Button className="bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white border-0" onClick={() => setActiveTab('investir')}>
                            <TrendingUp className="mr-2 h-4 w-4" /> {t('dashboard.investNow')}
                          </Button>
                        </div>
                      </motion.div>
                    )}

                    {/* ====== RECENT TRANSACTIONS ====== */}
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                      <div className="glass-card rounded-2xl overflow-hidden">
                        <div className="px-5 pt-4 pb-2 flex items-center justify-between">
                          <h3 className="text-lg font-bold flex items-center gap-2">
                            <History className="h-5 w-5 text-cyan-400" />
                            {t('dashboard.recentActivity')}
                          </h3>
                        </div>
                        <div className="px-5 pb-4">
                          {transactions.length === 0 ? (
                            <p className="text-zinc-500 text-center py-6">{t('dashboard.noTransactions')}</p>
                          ) : (
                            <div className="max-h-64 overflow-y-auto space-y-2 custom-scrollbar">
                              {transactions.slice(0, 5).map(tx => {
                                const Icon = txTypeIcon(tx.type);
                                const isPositive = ['deposit', 'roi_profit', 'affiliate_commission'].includes(tx.type);
                                return (
                                  <div key={tx.id} className="flex items-center justify-between gap-3 bg-white/[0.02] rounded-lg px-3 py-2.5 border border-white/[0.03] hover:border-white/[0.06] transition-colors">
                                    <div className="flex items-center gap-3 min-w-0 flex-1">
                                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isPositive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                                        <Icon className="h-4 w-4" />
                                      </div>
                                      <div className="min-w-0">
                                        <div className="text-sm font-medium truncate">{tx.description}</div>
                                        <div className="text-[10px] text-zinc-500">{fmtDateTime(tx.createdAt)}</div>
                                      </div>
                                    </div>
                                    <div className="text-right flex-shrink-0">
                                      <div className={`text-sm font-medium font-mono ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                                        {isPositive ? '+' : '-'}${fmtUSDT(tx.amount)}
                                      </div>
                                      <Badge className={`${statusColor(tx.status)} text-[10px]`} variant="outline">{statusLabel(tx.status)}</Badge>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  </div>
                )}


                {/* ====== INVESTIR TAB — DeFi-STYLE INVESTMENT PAGE ====== */}
                {activeTab === 'investir' && (
                  <div className="space-y-6">
                    {/* ── HEADER ── */}
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 flex items-center justify-center">
                          <TrendingUp className="h-5 w-5 text-emerald-400" />
                        </div>
                        <div>
                          <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">{t('sidebar.invest')}</h2>
                          <p className="text-zinc-500 text-sm">Plataforma ROI — {t('copyTraders.realData')}</p>
                        </div>
                      </div>
                    </motion.div>

                    {/* ── 1. INVESTMENT SIMULATOR ── */}
                    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}>
                      <div className="glass-card gradient-border rounded-2xl overflow-hidden">
                        <div className="p-5 sm:p-6">
                          <div className="flex items-center gap-2 mb-5">
                            <Calculator className="h-5 w-5 text-emerald-400" />
                            <h3 className="text-lg font-bold text-white">Simulador de Investimento</h3>
                          </div>
                          {/* Amount Input */}
                          <div className="mb-5">
                            <label className="text-sm text-zinc-400 mb-2 block">Quanto você quer investir?</label>
                            <div className="relative">
                              <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-emerald-400" />
                              <Input
                                type="number"
                                min="10"
                                step="10"
                                value={simulatorAmount}
                                onChange={e => setSimulatorAmount(e.target.value)}
                                className="bg-zinc-800/80 border-emerald-500/30 focus:border-emerald-400 pl-11 h-13 text-lg font-semibold text-white rounded-xl"
                                placeholder="100.00"
                              />
                              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-emerald-400">USDT</span>
                            </div>
                          </div>
                          {/* Calculations */}
                          {(() => {
                            const simAmt = Math.max(0, parseFloat(simulatorAmount) || 0);
                            const dailyRoi = simAmt * 0.05;
                            const weeklyRoi = dailyRoi * 7;
                            const monthlyRoi = dailyRoi * 30;
                            const daysToDouble = simAmt > 0 ? Math.ceil(simAmt / dailyRoi) : 0;
                            return (
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 text-center stat-card-hover">
                                  <div className="text-[10px] sm:text-xs text-emerald-400/70 mb-1 flex items-center justify-center gap-1"><Clock4 className="h-3 w-3" /> Diário</div>
                                  <div className="text-lg sm:text-xl font-bold text-emerald-400 animate-count-glow">${fmtUSDT(dailyRoi)}</div>
                                </div>
                                <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-xl p-3 text-center stat-card-hover">
                                  <div className="text-[10px] sm:text-xs text-cyan-400/70 mb-1 flex items-center justify-center gap-1"><BarChart3 className="h-3 w-3" /> Semanal</div>
                                  <div className="text-lg sm:text-xl font-bold text-cyan-400">${fmtUSDT(weeklyRoi)}</div>
                                </div>
                                <div className="bg-teal-500/10 border border-teal-500/20 rounded-xl p-3 text-center stat-card-hover">
                                  <div className="text-[10px] sm:text-xs text-teal-400/70 mb-1 flex items-center justify-center gap-1"><TrendingUp className="h-3 w-3" /> Mensal</div>
                                  <div className="text-lg sm:text-xl font-bold text-teal-400">${fmtUSDT(monthlyRoi)}</div>
                                </div>
                                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-center stat-card-hover">
                                  <div className="text-[10px] sm:text-xs text-amber-400/70 mb-1 flex items-center justify-center gap-1"><Zap className="h-3 w-3" /> Dobra em</div>
                                  <div className="text-lg sm:text-xl font-bold text-amber-400">{daysToDouble} dias</div>
                                </div>
                              </div>
                            );
                          })()}
                          {/* Team Bonus Calculator */}
                          <div className="mt-4 p-3 rounded-xl bg-zinc-800/50 border border-zinc-700/50">
                            <div className="flex items-center gap-2 mb-3">
                              <Crown className="h-4 w-4 text-amber-400" />
                              <span className="text-sm font-medium text-zinc-300">Bônus de Equipe (ROI Extra)</span>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                              {[
                                { rank: 'Bronze', bonus: 1, color: 'text-orange-400', border: 'border-orange-500/20', bg: 'bg-orange-500/10', icon: Medal },
                                { rank: 'Prata', bonus: 2, color: 'text-zinc-300', border: 'border-zinc-400/20', bg: 'bg-zinc-400/10', icon: Award },
                                { rank: 'Ouro', bonus: 3, color: 'text-amber-400', border: 'border-amber-500/20', bg: 'bg-amber-500/10', icon: Crown },
                              ].map(tier => {
                                const simAmt = Math.max(0, parseFloat(simulatorAmount) || 0);
                                const extraDaily = simAmt * 0.05 * (tier.bonus / 100);
                                return (
                                  <div key={tier.rank} className={`${tier.bg} border ${tier.border} rounded-lg p-2.5 text-center stat-card-hover`}>
                                    <tier.icon className={`h-4 w-4 ${tier.color} mx-auto mb-1`} />
                                    <div className="text-[10px] text-zinc-400">{tier.rank}</div>
                                    <div className={`text-xs font-bold ${tier.color}`}>+{tier.bonus}%</div>
                                    <div className="text-[10px] text-zinc-500 mt-0.5">+${fmtUSDT(extraDaily)}/dia</div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>

                    {/* ── 2. INVESTMENT STATS BAR ── */}
                    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.15 }}>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="glass-card gradient-border rounded-xl p-3 sm:p-4 text-center stat-card-hover">
                          <div className="text-[10px] sm:text-xs text-zinc-500 mb-1 flex items-center justify-center gap-1"><Coins className="h-3 w-3" /> Total Investido</div>
                          <div className="text-base sm:text-lg font-bold text-emerald-400">${fmtUSDT(d(user?.totalInvested || '0'))}</div>
                        </div>
                        <div className="glass-card gradient-border rounded-xl p-3 sm:p-4 text-center stat-card-hover">
                          <div className="text-[10px] sm:text-xs text-zinc-500 mb-1 flex items-center justify-center gap-1"><Percent className="h-3 w-3" /> ROI Médio/Dia</div>
                          <div className="text-base sm:text-lg font-bold text-cyan-400">5.00%</div>
                        </div>
                        <div className="glass-card gradient-border rounded-xl p-3 sm:p-4 text-center stat-card-hover">
                          <div className="text-[10px] sm:text-xs text-zinc-500 mb-1 flex items-center justify-center gap-1"><Users className="h-3 w-3" /> Investidores</div>
                          <div className="text-base sm:text-lg font-bold text-teal-400">{activeInvestments.length}</div>
                        </div>
                      </div>
                    </motion.div>

                    {/* ── 3. INVESTMENT PLANS CARDS ── */}
                    <motion.div id="investment-plans-section" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}>
                      <div className="flex items-center gap-2 mb-4">
                        <Target className="h-5 w-5 text-emerald-400" />
                        <h3 className="text-lg font-bold text-white">{t('plans.title')}</h3>
                      </div>
                      {(() => {
                        // Collect unique plans from all copy traders
                        const allPlans = copyTraders
                          .filter(t => t.isActive)
                          .flatMap(t => (t.plans || []).map(p => ({ ...p, traderName: t.name, traderId: t.id })))
                          .filter(p => p.isActive);
                        const uniquePlanIds = [...new Set(allPlans.map(p => p.id))];
                        const uniquePlans = uniquePlanIds.map(id => allPlans.find(p => p.id === id)!);

                        if (uniquePlans.length === 0) {
                          // Show default platform plans when no DB plans exist
                          const defaultPlans = [
                            { id: 'starter', name: 'Starter', dailyRoiPct: '5', minAmount: '10', maxAmount: '499', durationDays: 40, totalReturn: '200', isFeatured: false, description: 'Ideal para começar' },
                            { id: 'growth', name: 'Growth', dailyRoiPct: '5', minAmount: '500', maxAmount: '1999', durationDays: 35, totalReturn: '175', isFeatured: true, description: 'O mais popular' },
                            { id: 'premium', name: 'Premium', dailyRoiPct: '5', minAmount: '2000', maxAmount: '9999', durationDays: 30, totalReturn: '150', isFeatured: false, description: 'Para investidores sérios' },
                            { id: 'elite', name: 'Elite', dailyRoiPct: '5', minAmount: '10000', maxAmount: '999999', durationDays: 25, totalReturn: '125', isFeatured: false, description: 'Retorno acelerado' },
                          ];
                          return (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                              {defaultPlans.map((plan, idx) => (
                                <motion.div
                                  key={plan.id}
                                  initial={{ opacity: 0, y: 20 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ duration: 0.5, delay: 0.25 + idx * 0.1 }}
                                >
                                  <div className={`glass-card rounded-2xl overflow-hidden stat-card-hover relative plan-card-gradient ${plan.isFeatured ? 'gradient-border plan-card-featured' : 'border border-zinc-800'}`}>
                                    {/* Featured badge */}
                                    {plan.isFeatured && (
                                      <div className="absolute top-0 right-0 bg-gradient-to-l from-emerald-500 to-cyan-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl z-10">
                                        ⭐ {t('plans.popular')}
                                      </div>
                                    )}
                                    {/* Animated gradient bg */}
                                    <div className="absolute inset-0 opacity-5 animate-shimmer pointer-events-none" />
                                    <div className="relative p-5">
                                      {/* Plan Name */}
                                      <h4 className="text-base font-bold text-white mb-1">{plan.name}</h4>
                                      <p className="text-xs text-zinc-500 mb-4">{plan.description}</p>
                                      {/* Daily ROI - Large & Prominent */}
                                      <div className="text-center mb-4">
                                        <div className="text-3xl sm:text-4xl font-black text-emerald-400 animate-count-glow">
                                          {d(plan.dailyRoiPct).toFixed(0)}%
                                        </div>
                                        <div className="text-xs text-zinc-500 mt-1">{t('plans.dailyRoi')}</div>
                                      </div>
                                      {/* Plan Details */}
                                      <div className="space-y-2 mb-4">
                                        <div className="flex justify-between text-sm">
                                          <span className="text-zinc-500">{t('plans.minimum')}</span>
                                          <span className="text-zinc-300 font-medium">${fmtUSDT(plan.minAmount)}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                          <span className="text-zinc-500">{t('plans.maximum')}</span>
                                          <span className="text-zinc-300 font-medium">${fmtUSDT(plan.maxAmount)}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                          <span className="text-zinc-500">{t('plans.durationLabel')}</span>
                                          <span className="text-zinc-300 font-medium">{plan.durationDays} {t('plans.days')}</span>
                                        </div>
                                        <Separator className="bg-zinc-800" />
                                        <div className="flex justify-between text-sm">
                                          <span className="text-zinc-400">{t('plans.totalReturnLabel')}</span>
                                          <span className="text-emerald-400 font-bold">{d(plan.totalReturn).toFixed(0)}%</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                          <span className="text-zinc-400">{t('plans.capitalDoublesIn')}</span>
                                          <span className="text-amber-400 font-bold">{Math.ceil(100 / d(plan.dailyRoiPct))} {t('plans.days')}</span>
                                        </div>
                                      </div>
                                      {/* CTA Button */}
                                      <Button
                                        className={`w-full font-semibold rounded-xl ${
                                          plan.isFeatured
                                            ? 'bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-white shadow-lg shadow-emerald-500/20'
                                            : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                                        }`}
                                        onClick={() => {
                                          setInvestDialogPlan({
                                            id: plan.id,
                                            name: plan.name,
                                            avatar: null,
                                            specialty: plan.description || 'Copy Trading',
                                            winRate: '85',
                                            monthlyRoi: String(d(plan.dailyRoiPct) * 30),
                                            totalPnl: plan.totalReturn,
                                            riskLevel: 'low',
                                            isActive: true,
                                            isFeatured: plan.isFeatured,
                                            sortOrder: idx,
                                            createdAt: new Date().toISOString(),
                                            updatedAt: new Date().toISOString(),
                                            plans: [{
                                              id: plan.id,
                                              name: plan.name,
                                              description: plan.description || null,
                                              minAmount: plan.minAmount,
                                              maxAmount: plan.maxAmount,
                                              dailyRoiPct: plan.dailyRoiPct,
                                              durationDays: plan.durationDays,
                                              days: plan.durationDays,
                                              totalReturn: plan.totalReturn,
                                              isActive: true,
                                              isFeatured: plan.isFeatured,
                                              sortOrder: idx,
                                              createdAt: new Date().toISOString(),
                                              updatedAt: new Date().toISOString(),
                                            }],
                                          } as CopyTrader);
                                          setSelectedPlanId(plan.id);
                                          setInvestmentDuration(plan.durationDays);
                                          setInvestAmount(String(d(plan.minAmount) || 10));
                                        }}
                                      >
                                        <Zap className="mr-2 h-4 w-4" /> {t('plans.investNow')}
                                      </Button>
                                      {/* Voucher activation checkbox — shown if user has active vouchers */}
                                      {userVouchers.filter((v: any) => v.status === 'active').length > 0 && (
                                        <div className="mt-2 flex items-center gap-2 p-2 rounded-lg bg-purple-500/10 border border-purple-500/20">
                                          <input
                                            type="checkbox"
                                            id={`voucher-default-${plan.id}`}
                                            checked={false}
                                            onChange={(e) => {
                                              if (e.target.checked) {
                                                setInvestDialogPlan({
                                                  id: plan.id,
                                                  name: plan.name,
                                                  avatar: null,
                                                  specialty: plan.description || 'Copy Trading',
                                                  winRate: '85',
                                                  monthlyRoi: String(d(plan.dailyRoiPct) * 30),
                                                  totalPnl: plan.totalReturn,
                                                  riskLevel: 'low',
                                                  isActive: true,
                                                  isFeatured: plan.isFeatured,
                                                  sortOrder: idx,
                                                  createdAt: new Date().toISOString(),
                                                  updatedAt: new Date().toISOString(),
                                                  plans: [{
                                                    id: plan.id,
                                                    name: plan.name,
                                                    description: plan.description || null,
                                                    minAmount: plan.minAmount,
                                                    maxAmount: plan.maxAmount,
                                                    dailyRoiPct: plan.dailyRoiPct,
                                                    durationDays: plan.durationDays,
                                                    days: plan.durationDays,
                                                    totalReturn: plan.totalReturn,
                                                    isActive: true,
                                                    isFeatured: plan.isFeatured,
                                                    sortOrder: idx,
                                                    createdAt: new Date().toISOString(),
                                                    updatedAt: new Date().toISOString(),
                                                  }],
                                                } as CopyTrader);
                                                setSelectedPlanId(plan.id);
                                                setInvestmentDuration(plan.durationDays);
                                                setInvestAmount(String(d(plan.minAmount) || 10));
                                                setUseVoucherForInvest(true);
                                                const firstActive = userVouchers.find((v: any) => v.status === 'active');
                                                if (firstActive) setSelectedVoucherId(firstActive.id);
                                              }
                                            }}
                                            className="rounded accent-purple-500"
                                          />
                                          <Label htmlFor={`voucher-default-${plan.id}`} className="text-purple-400 text-xs font-medium cursor-pointer">
                                            🎫 {t('plans.activateWithVoucher')}
                                          </Label>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </motion.div>
                              ))}
                            </div>
                          );
                        }

                        // Render DB plans from copy traders
                        return (
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {uniquePlans.map((plan, idx) => {
                              const traderForPlan = copyTraders.find(t => t.isActive && (t.plans || []).some(p => p.id === plan.id));
                              return (
                                <motion.div
                                  key={plan.id}
                                  initial={{ opacity: 0, y: 20 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ duration: 0.5, delay: 0.25 + idx * 0.1 }}
                                >
                                  <div className={`glass-card rounded-2xl overflow-hidden stat-card-hover relative plan-card-gradient ${plan.isFeatured ? 'gradient-border plan-card-featured' : 'border border-zinc-800'}`}>
                                    {plan.isFeatured && (
                                      <div className="absolute top-0 right-0 bg-gradient-to-l from-emerald-500 to-cyan-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl z-10">
                                        ⭐ {t('plans.featured')}
                                      </div>
                                    )}
                                    <div className="absolute inset-0 opacity-5 animate-shimmer pointer-events-none" />
                                    <div className="relative p-5">
                                      <h4 className="text-base font-bold text-white mb-1">{plan.name}</h4>
                                      {plan.description && <p className="text-xs text-zinc-500 mb-4">{plan.description}</p>}
                                      <div className="text-center mb-4">
                                        <div className="text-3xl sm:text-4xl font-black text-emerald-400 animate-count-glow">
                                          {d(plan.dailyRoiPct).toFixed(0)}%
                                        </div>
                                        <div className="text-xs text-zinc-500 mt-1">{t('plans.dailyRoi')}</div>
                                      </div>
                                      <div className="space-y-2 mb-4">
                                        <div className="flex justify-between text-sm">
                                          <span className="text-zinc-500">{t('plans.minimum')}</span>
                                          <span className="text-zinc-300 font-medium">${fmtUSDT(plan.minAmount)}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                          <span className="text-zinc-500">{t('plans.maximum')}</span>
                                          <span className="text-zinc-300 font-medium">${fmtUSDT(plan.maxAmount)}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                          <span className="text-zinc-500">{t('plans.durationLabel')}</span>
                                          <span className="text-zinc-300 font-medium">{plan.durationDays} {t('plans.days')}</span>
                                        </div>
                                        <Separator className="bg-zinc-800" />
                                        <div className="flex justify-between text-sm">
                                          <span className="text-zinc-400">{t('plans.totalReturnLabel')}</span>
                                          <span className="text-emerald-400 font-bold">{d(plan.totalReturn).toFixed(0)}%</span>
                                        </div>
                                      </div>
                                      <Button
                                        className={`w-full font-semibold rounded-xl ${
                                          plan.isFeatured
                                            ? 'bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-white shadow-lg shadow-emerald-500/20'
                                            : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                                        }`}
                                        onClick={() => {
                                          if (traderForPlan) {
                                            setInvestDialogPlan(traderForPlan);
                                            setSelectedPlanId(plan.id);
                                            setInvestmentDuration(plan.durationDays);
                                            setInvestAmount(String(d(plan.minAmount) || 10));
                                          }
                                        }}
                                      >
                                        <Zap className="mr-2 h-4 w-4" /> {t('plans.investNow')}
                                      </Button>
                                      {/* Voucher activation checkbox — shown if user has active vouchers */}
                                      {userVouchers.filter((v: any) => v.status === 'active').length > 0 && (
                                        <div className="mt-2 flex items-center gap-2 p-2 rounded-lg bg-purple-500/10 border border-purple-500/20">
                                          <input
                                            type="checkbox"
                                            id={`voucher-db-${plan.id}`}
                                            checked={false}
                                            onChange={(e) => {
                                              if (e.target.checked && traderForPlan) {
                                                setInvestDialogPlan(traderForPlan);
                                                setSelectedPlanId(plan.id);
                                                setInvestmentDuration(plan.durationDays);
                                                setInvestAmount(String(d(plan.minAmount) || 10));
                                                setUseVoucherForInvest(true);
                                                const firstActive = userVouchers.find((v: any) => v.status === 'active');
                                                if (firstActive) setSelectedVoucherId(firstActive.id);
                                              }
                                            }}
                                            className="rounded accent-purple-500"
                                          />
                                          <Label htmlFor={`voucher-db-${plan.id}`} className="text-purple-400 text-xs font-medium cursor-pointer">
                                            🎫 {t('plans.activateWithVoucher')}
                                          </Label>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </motion.div>
                              );
                            })}
                          </div>
                        );
                      })()}
                    </motion.div>

                    {/* ── 4. COPY TRADERS SECTION ── */}
                    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }}>
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <Bot className="h-5 w-5 text-cyan-400" />
                          <h3 className="text-lg font-bold text-white">{t('copyTraders.title')}</h3>
                          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                            <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                            <span className="text-[10px] text-emerald-400 font-medium">LIVE</span>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-zinc-500 hover:text-white"
                          onClick={() => fetchBitgetTraders(bitgetRanking, bitgetSearch)}
                        >
                          <RefreshCw className={`h-4 w-4 ${bitgetLoading ? 'animate-spin' : ''}`} />
                        </Button>
                      </div>

                      {/* Platform explanation */}
                      <div className="glass-card rounded-xl p-3 mb-4 border border-emerald-500/10 bg-emerald-500/[0.03]">
                        <div className="flex items-start gap-2">
                          <Info className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
                          <p className="text-xs text-zinc-400 leading-relaxed">{t('copyTraders.platformUsesTraders')}</p>
                        </div>
                      </div>

                      {/* Search and Filter Bar */}
                      <div className="flex flex-col sm:flex-row gap-3 mb-4">
                        <div className="relative flex-1">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                          <Input
                            className="bg-zinc-800/50 border-zinc-700/50 pl-10 rounded-xl"
                            placeholder={t('copyTraders.searchPlaceholder')}
                            value={bitgetSearch}
                            onChange={e => setBitgetSearch(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') { fetchBitgetTraders(bitgetRanking, bitgetSearch); } }}
                          />
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          {[
                            { code: 'profit_rate', label: t('copyTraders.filterROI') },
                            { code: 'total_income', label: t('copyTraders.filterPnL') },
                            { code: 'total_follow_profit', label: t('copyTraders.filterFollowers') },
                            { code: 'trader_pro', label: t('copyTraders.filterPro') },
                          ].map(f => (
                            <button
                              key={f.code}
                              onClick={() => { setBitgetRanking(f.code); fetchBitgetTraders(f.code, bitgetSearch); }}
                              className={`px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition-colors ${
                                bitgetRanking === f.code
                                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20'
                                  : 'bg-zinc-800/50 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200'
                              }`}
                            >
                              {f.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Loading State */}
                      {bitgetLoading && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {[1, 2, 3].map(i => (
                            <Card key={i} className="glass-card border-zinc-800">
                              <CardContent className="p-4">
                                <div className="flex items-center gap-3 mb-4">
                                  <Skeleton className="h-12 w-12 rounded-full" />
                                  <div className="space-y-2 flex-1">
                                    <Skeleton className="h-4 w-24" />
                                    <Skeleton className="h-3 w-32" />
                                  </div>
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                  <Skeleton className="h-16 rounded-lg" />
                                  <Skeleton className="h-16 rounded-lg" />
                                  <Skeleton className="h-16 rounded-lg" />
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      )}

                      {/* Empty State */}
                      {!bitgetLoading && bitgetTraders.length === 0 && copyTraders.filter(m => m.isActive).length === 0 && (
                        <Card className="glass-card border-zinc-800">
                          <CardContent className="py-12 text-center">
                            <TrendingUp className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
                            <p className="text-zinc-500">{t('copyTraders.noTraders')}</p>
                            <Button className="mt-4 bg-emerald-600 hover:bg-emerald-700" onClick={() => fetchBitgetTraders(bitgetRanking)}>
                              <RefreshCw className="mr-2 h-4 w-4" /> {t('common.refresh')}
                            </Button>
                          </CardContent>
                        </Card>
                      )}

                      {/* Real Bitget Copy Traders Grid */}
                      {!bitgetLoading && bitgetTraders.length > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {bitgetTraders.map((trader, idx) => {
                            let chartPoints: number[] = [];
                            try {
                              // V2: Use dailyProfitRateList for chart
                              if (trader.dailyProfitRateList && Array.isArray(trader.dailyProfitRateList) && trader.dailyProfitRateList.length > 1) {
                                chartPoints = trader.dailyProfitRateList.map((p: any) => parseFloat(p?.rate || 0)).filter(v => !isNaN(v));
                              } else if (trader.klineProfit) {
                                const parsed = typeof trader.klineProfit === 'string' ? JSON.parse(trader.klineProfit) : trader.klineProfit;
                                if (Array.isArray(parsed)) {
                                  chartPoints = parsed.map((p: any) => parseFloat(p?.profitRate || p?.roi || p || 0)).filter(v => !isNaN(v));
                                }
                              }
                            } catch {}

                            const roiVal = parseFloat(trader.roi) || 0;
                            const pnlVal = parseFloat(trader.totalPnl) || 0;
                            const aumVal = parseFloat(trader.aum) || 0;
                            const drawdownVal = parseFloat(trader.maxDrawdown) || 0;
                            const winRateVal = trader.winRate ? parseFloat(trader.winRate) : null;
                            const tradeDaysVal = trader.tradeDays ? parseInt(trader.tradeDays, 10) : null;
                            const symbolLabels = (trader.topSymbols || []).slice(0, 3).map(s => s.replace('USDT_UMCBL', '').replace('USDT', ''));
                            const isFeatured = trader.grade?.name === 'Diamond' || trader.grade?.name === 'Platinum';

                            return (
                              <motion.div
                                key={trader.traderId}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.4, delay: 0.05 * idx }}
                              >
                                <div className={`glass-card rounded-2xl overflow-hidden stat-card-hover relative ${isFeatured ? 'gradient-border' : 'border border-zinc-800'}`}>
                                  <div className="absolute inset-0 opacity-[0.02] animate-shimmer" />
                                  <div className="relative p-4 sm:p-5">
                                    {/* Header */}
                                    <div className="flex items-start gap-3 mb-3">
                                      <div className="relative">
                                        {trader.avatar ? (
                                          <img src={trader.avatar} alt={trader.displayName} className="w-11 h-11 rounded-full object-cover border-2 border-zinc-700" />
                                        ) : (
                                          <div className="w-11 h-11 bg-gradient-to-br from-cyan-500/20 to-emerald-500/20 rounded-full flex items-center justify-center text-base font-bold text-cyan-400">
                                            {trader.displayName.charAt(0)}
                                          </div>
                                        )}
                                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 rounded-full border-2 border-zinc-900 animate-pulse" />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                          <h3 className="font-semibold text-sm truncate">{trader.displayName}</h3>
                                          {trader.grade?.name && (
                                            <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-[10px] px-1.5 py-0" variant="outline">
                                              <Star className="h-2.5 w-2.5 mr-0.5" />{trader.grade.name}
                                            </Badge>
                                          )}
                                        </div>
                                        <div className="flex items-center gap-2 mt-0.5">
                                          <span className="text-xs text-zinc-500">#{trader.rank}</span>
                                          <span className="text-zinc-700">•</span>
                                          <span className="text-xs text-zinc-500">{trader.followers} {t('copyTraders.followers')}</span>
                                          {trader.source === 'bitget_v2' && (
                                            <span className="px-1.5 py-0 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[9px] text-emerald-400 font-medium flex items-center gap-1">
                                              <div className="w-1 h-1 bg-emerald-400 rounded-full animate-pulse" />LIVE
                                            </span>
                                          )}
                                          {trader.isCached && (
                                            <span className="px-1.5 py-0 rounded-full bg-amber-500/10 border border-amber-500/20 text-[9px] text-amber-400 font-medium">
                                              CACHE
                                            </span>
                                          )}
                                          {trader.isDemo && (
                                            <span className="px-1.5 py-0 rounded-full bg-zinc-500/10 border border-zinc-500/20 text-[9px] text-zinc-400 font-medium">
                                              DEMO
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </div>

                                    {/* Labels */}
                                    {trader.labels?.length > 0 && (
                                      <div className="flex flex-wrap gap-1 mb-3">
                                        {trader.labels.slice(0, 3).map((label, i) => (
                                          <Badge key={i} className="bg-zinc-800/50 text-zinc-400 border-zinc-700/50 text-[10px] px-1.5 py-0" variant="outline">
                                            {label.name}
                                          </Badge>
                                        ))}
                                      </div>
                                    )}

                                    {/* Mini Chart */}
                                    {chartPoints.length > 1 && (
                                      <div className="flex items-end gap-px h-10 mb-3 bg-zinc-800/30 rounded-lg p-1.5">
                                        {chartPoints.slice(-20).map((val, i) => {
                                          const maxVal = Math.max(...chartPoints.slice(-20).map(Math.abs), 1);
                                          const height = Math.max(Math.abs(val) / maxVal * 100, 4);
                                          const isPositive = val >= 0;
                                          return (
                                            <div
                                              key={i}
                                              className="flex-1 rounded-t"
                                              style={{
                                                height: `${height}%`,
                                                background: isPositive
                                                  ? 'linear-gradient(to top, rgba(16,185,129,0.3), rgba(16,185,129,0.7))'
                                                  : 'linear-gradient(to top, rgba(239,68,68,0.3), rgba(239,68,68,0.7))',
                                              }}
                                            />
                                          );
                                        })}
                                      </div>
                                    )}

                                    {/* Stats Grid - V2 enriched with winRate & tradeDays */}
                                    <div className={`grid gap-2 mb-3 ${winRateVal !== null || tradeDaysVal !== null ? 'grid-cols-4' : 'grid-cols-3'}`}>
                                      <div className="bg-zinc-800/40 rounded-lg p-2 text-center">
                                        <div className="text-[10px] text-zinc-500 mb-0.5">{t('copyTraders.roiLabel')}</div>
                                        <div className={`font-bold text-xs ${roiVal >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                          {roiVal >= 0 ? '+' : ''}{roiVal.toFixed(1)}%
                                        </div>
                                      </div>
                                      <div className="bg-zinc-800/40 rounded-lg p-2 text-center">
                                        <div className="text-[10px] text-zinc-500 mb-0.5">{t('copyTraders.pnlLabel')}</div>
                                        <div className={`font-bold text-xs ${pnlVal >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                          ${Math.abs(pnlVal) >= 1000 ? `${(pnlVal/1000).toFixed(1)}k` : pnlVal.toFixed(0)}
                                        </div>
                                      </div>
                                      <div className="bg-zinc-800/40 rounded-lg p-2 text-center">
                                        <div className="text-[10px] text-zinc-500 mb-0.5">{t('copyTraders.aumLabel')}</div>
                                        <div className="font-bold text-xs text-cyan-400">
                                          ${aumVal >= 1000 ? `${(aumVal/1000).toFixed(1)}k` : aumVal.toFixed(0)}
                                        </div>
                                      </div>
                                      {winRateVal !== null && (
                                        <div className="bg-zinc-800/40 rounded-lg p-2 text-center">
                                          <div className="text-[10px] text-zinc-500 mb-0.5">Win%</div>
                                          <div className={`font-bold text-xs ${winRateVal >= 60 ? 'text-emerald-400' : winRateVal >= 40 ? 'text-amber-400' : 'text-red-400'}`}>
                                            {winRateVal.toFixed(1)}%
                                          </div>
                                        </div>
                                      )}
                                      {tradeDaysVal !== null && winRateVal === null && (
                                        <div className="bg-zinc-800/40 rounded-lg p-2 text-center">
                                          <div className="text-[10px] text-zinc-500 mb-0.5">Dias</div>
                                          <div className="font-bold text-xs text-zinc-300">
                                            {tradeDaysVal}d
                                          </div>
                                        </div>
                                      )}
                                    </div>

                                    {/* Drawdown + Symbols + Trade Days */}
                                    <div className="flex items-center justify-between mb-3">
                                      <div className="text-xs flex items-center gap-2">
                                        <span>
                                          <span className="text-zinc-500">{t('copyTraders.drawdown')}: </span>
                                          <span className={`font-medium ${drawdownVal > 50 ? 'text-red-400' : drawdownVal > 20 ? 'text-amber-400' : 'text-emerald-400'}`}>
                                            {drawdownVal.toFixed(1)}%
                                          </span>
                                        </span>
                                        {tradeDaysVal !== null && winRateVal !== null && (
                                          <span>
                                            <span className="text-zinc-700">•</span>
                                            <span className="text-zinc-500"> {tradeDaysVal}d</span>
                                          </span>
                                        )}
                                      </div>
                                      {symbolLabels.length > 0 && (
                                        <div className="flex gap-1">
                                          {symbolLabels.map((s, i) => (
                                            <Badge key={i} className="bg-cyan-500/10 text-cyan-400 border-cyan-500/20 text-[10px] px-1.5 py-0" variant="outline">
                                              {s}
                                            </Badge>
                                          ))}
                                        </div>
                                      )}
                                    </div>

                                    {/* View Plans Button - informational: shows this trader's strategy powers the platform */}
                                    <Button
                                      className={`w-full font-semibold rounded-xl ${
                                        isFeatured
                                          ? 'bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 hover:from-emerald-500/30 hover:to-cyan-500/30 text-emerald-400 border border-emerald-500/30'
                                          : 'bg-white/[0.04] hover:bg-white/[0.08] text-emerald-400 border border-white/[0.08]'
                                      }`}
                                      onClick={() => {
                                        // Scroll to the plans section above
                                        const plansSection = document.getElementById('investment-plans-section');
                                        if (plansSection) {
                                          plansSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                        }
                                      }}
                                    >
                                      <Eye className="mr-2 h-4 w-4" /> Ver Planos
                                    </Button>
                                  </div>
                                </div>
                              </motion.div>
                            );
                          })}
                        </div>
                      )}

                      {/* Fallback: DB Copy Traders when Bitget is unavailable */}
                      {!bitgetLoading && bitgetTraders.length === 0 && copyTraders.filter(m => m.isActive).length > 0 && (
                        <div className="space-y-4">
                          <div className="flex items-center gap-2 text-zinc-400 text-sm">
                            <AlertTriangle className="h-4 w-4 text-amber-400" />
                            <span>{t('copyTraders.bitgetUnavailable')}</span>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {copyTraders.filter(m => m.isActive).map((trader, idx) => (
                              <motion.div
                                key={trader.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.4, delay: 0.05 * idx }}
                              >
                                <div className={`glass-card rounded-2xl overflow-hidden stat-card-hover relative ${trader.isFeatured ? 'gradient-border' : 'border border-zinc-800'}`}>
                                  <div className="absolute inset-0 opacity-[0.02] animate-shimmer" />
                                  <div className="relative p-4">
                                    {/* Header */}
                                    <div className="flex items-center gap-3 mb-3">
                                      <div className="relative">
                                        <div className="w-10 h-10 bg-gradient-to-br from-cyan-500/20 to-emerald-500/20 rounded-full flex items-center justify-center text-lg font-bold text-cyan-400">
                                          {trader.name.charAt(0)}
                                        </div>
                                        <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-zinc-900" />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <h3 className="font-semibold text-sm">{trader.name}</h3>
                                        <p className="text-xs text-zinc-400">{trader.specialty} • {trader.winRate}%</p>
                                      </div>
                                      <Badge className={trader.riskLevel === 'high' ? 'bg-red-500/20 text-red-400' : trader.riskLevel === 'low' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'} variant="outline">
                                        {trader.riskLevel}
                                      </Badge>
                                    </div>
                                    {/* Stats */}
                                    <div className="grid grid-cols-3 gap-2 mb-3">
                                      <div className="bg-zinc-800/40 rounded-lg p-2 text-center">
                                        <div className="text-[10px] text-zinc-500">{t('copyTraders.roiLabel')}</div>
                                        <div className="font-bold text-sm text-emerald-400">+{trader.monthlyRoi}%</div>
                                      </div>
                                      <div className="bg-zinc-800/40 rounded-lg p-2 text-center">
                                        <div className="text-[10px] text-zinc-500">{t('copyTraders.pnlLabel')}</div>
                                        <div className="font-bold text-sm text-cyan-400">${fmtUSDT(trader.totalPnl)}</div>
                                      </div>
                                      <div className="bg-zinc-800/40 rounded-lg p-2 text-center">
                                        <div className="text-[10px] text-zinc-500">{t('copyTraders.performance')}</div>
                                        <div className="font-bold text-sm">{trader.winRate}%</div>
                                      </div>
                                    </div>
                                    {/* Plans linked to this trader */}
                                    {(trader.plans || []).length > 0 && (
                                      <div className="mb-3 p-2 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                                        <div className="text-[10px] text-emerald-400/70 mb-1">Planos disponíveis:</div>
                                        <div className="flex flex-wrap gap-1">
                                          {(trader.plans || []).slice(0, 3).map(p => (
                                            <Badge key={p.id} className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px] px-1.5 py-0" variant="outline">
                                              {p.name} ({d(p.dailyRoiPct).toFixed(0)}%/dia)
                                            </Badge>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                    <Button
                                      className="w-full bg-white/[0.04] hover:bg-white/[0.08] text-emerald-400 border border-white/[0.08] font-semibold rounded-xl"
                                      onClick={() => {
                                        // Scroll to the plans section above
                                        const plansSection = document.getElementById('investment-plans-section');
                                        if (plansSection) {
                                          plansSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                        }
                                      }}
                                    >
                                      <Eye className="mr-2 h-4 w-4" /> Ver Planos — {trader.name}
                                    </Button>
                                  </div>
                                </div>
                              </motion.div>
                            ))}
                          </div>
                        </div>
                      )}
                    </motion.div>

                    {/* ── REFRESH BUTTON ── */}
                    {!bitgetLoading && bitgetTraders.length > 0 && (
                      <div className="flex justify-center">
                        <Button
                          variant="outline"
                          className="border-zinc-700/50 text-zinc-400 hover:text-white hover:border-emerald-500/50 rounded-xl"
                          onClick={() => fetchBitgetTraders(bitgetRanking, bitgetSearch)}
                        >
                          <RefreshCw className="mr-2 h-4 w-4" /> {t('common.refresh')}
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {/* ====== ALUGUÉIS TAB ====== */}
                {activeTab === 'alugueis' && (
                  <div className="space-y-6">
                    <h2 className="text-xl sm:text-2xl font-bold">{t('dashboard.activeInvestments')}</h2>
                    {userInvestments.length === 0 ? (
                      <Card className="bg-zinc-900 border-zinc-800">
                        <CardContent className="py-12 text-center">
                          <Bot className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
                          <p className="text-zinc-500">{t('dashboard.noRentals')}</p>
                          <Button className="mt-4 bg-emerald-600 hover:bg-cyan-700" onClick={() => setActiveTab('investir')}>{t('dashboard.viewTraders')}</Button>
                        </CardContent>
                      </Card>
                    ) : (
                      <>
                        <h3 className="text-lg font-semibold text-cyan-400">{t('status.active')} ({activeInvestments.length})</h3>
                        <div className="space-y-3">
                          {activeInvestments.map(r => (
                            <Card key={r.id} className="bg-zinc-900 border-zinc-800">
                              <CardContent className="p-4">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                  <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-cyan-500/10 rounded-lg flex items-center justify-center text-lg font-bold text-cyan-400">{assetIcon(r.plan?.name || 'USDT')}</div>
                                    <div>
                                      <div className="font-medium">{r.plan?.name || t('plans.plan')}</div>
                                      <div className="text-sm text-zinc-400">{r.plan?.name || '-'} • {r.plan?.name || 'USDT'}</div>
                                    </div>
                                  </div>
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs sm:text-sm">
                                    <div><span className="text-zinc-400 block text-xs">Início</span>{fmtDate(r.startDate)}</div>
                                    <div><span className="text-zinc-400 block text-xs">Fim</span>{fmtDate(r.endDate)}</div>
                                    <div><span className="text-zinc-400 block text-xs">{t('copyTraders.dailyReturn')}</span><span className="text-cyan-400">${fmtUSDT(r.dailyRoi)}</span></div>
                                    <div><span className="text-zinc-400 block text-xs">{t('plans.totalPrice')}</span><span className="text-cyan-400">${fmtUSDT(r.totalRoi)}</span></div>
                                  </div>
                                  <Badge className={statusColor(r.status)} variant="outline">{statusLabel(r.status)}</Badge>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                        {userInvestments.filter(r => r.status !== 'active').length > 0 && (
                          <>
                            <h3 className="text-lg font-semibold text-zinc-400 mt-6">{t('status.completed')}</h3>
                            <div className="space-y-3">
                              {userInvestments.filter(r => r.status !== 'active').map(r => (
                                <Card key={r.id} className="bg-zinc-900 border-zinc-800 opacity-70">
                                  <CardContent className="p-4">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                      <div className="flex items-center gap-3 min-w-0">
                                        <div className="w-10 h-10 bg-zinc-800 rounded-lg flex items-center justify-center text-lg font-bold text-zinc-500 flex-shrink-0">{assetIcon(r.plan?.name || 'USDT')}</div>
                                        <div className="min-w-0">
                                          <div className="font-medium truncate">{r.plan?.name || t('plans.plan')}</div>
                                          <div className="text-sm text-zinc-400">{fmtDate(r.startDate)} - {fmtDate(r.endDate)}</div>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-3 flex-shrink-0">
                                        <span className="text-sm">${fmtUSDT(r.amount)} {t('common.paid')}</span>
                                        <Badge className={statusColor(r.status)} variant="outline">{statusLabel(r.status)}</Badge>
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                              ))}
                            </div>
                          </>
                        )}
                      </>
                    )}
                  </div>
                )}

                {/* ====== FATURAS (DEPÓSITOS) TAB ====== */}
                {activeTab === 'faturas' && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h2 className="text-xl sm:text-2xl font-bold">Faturas de Depósito</h2>
                      <div className="flex items-center gap-2">
                        <Select value={depositFilter} onValueChange={setDepositFilter}>
                          <SelectTrigger className="w-[130px] h-9 text-xs bg-zinc-900 border-zinc-800">
                            <SelectValue placeholder="Filtrar" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Todas</SelectItem>
                            <SelectItem value="pending">Pendentes</SelectItem>
                            <SelectItem value="confirmed">Confirmadas</SelectItem>
                            <SelectItem value="rejected">Rejeitadas</SelectItem>
                            <SelectItem value="cancelled">Canceladas</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button className="bg-emerald-600 hover:bg-cyan-700" onClick={() => setDepositDialog(true)}>
                          <ArrowDownLeft className="h-4 w-4 mr-2" /> Novo Depósito
                        </Button>
                      </div>
                    </div>

                    {/* Summary Cards */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                      <Card className="bg-zinc-900 border-zinc-800">
                        <CardContent className="p-4">
                          <p className="text-zinc-400 text-xs">Total Depositado</p>
                          <p className="text-cyan-400 font-bold text-lg">${fmtUSDT(userDepositStats?.totalDeposited?.toString() || user?.totalInvested || '0')}</p>
                        </CardContent>
                      </Card>
                      <Card className="bg-zinc-900 border-zinc-800">
                        <CardContent className="p-4">
                          <p className="text-zinc-400 text-xs">Pendente</p>
                          <p className="text-amber-400 font-bold text-lg">${(userDepositStats?.pendingAmount || 0).toFixed(2)}</p>
                        </CardContent>
                      </Card>
                      <Card className="bg-zinc-900 border-zinc-800">
                        <CardContent className="p-4">
                          <p className="text-zinc-400 text-xs">Confirmadas</p>
                          <p className="text-white font-bold text-lg">{userDepositStats?.confirmedCount || 0}</p>
                        </CardContent>
                      </Card>
                      <Card className="bg-zinc-900 border-zinc-800">
                        <CardContent className="p-4">
                          <p className="text-zinc-400 text-xs">Total Faturas</p>
                          <p className="text-white font-bold text-lg">{userDepositStats?.totalInvoices || 0}</p>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Deposits List */}
                    <Card className="bg-zinc-900 border-zinc-800">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base">Todas as Faturas</CardTitle>
                          <Button variant="ghost" size="sm" onClick={fetchUserDeposits} disabled={depositsLoading}>
                            <RefreshCw className={`h-4 w-4 ${depositsLoading ? 'animate-spin' : ''}`} />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="p-0">
                        {depositsLoading ? (
                          <div className="space-y-3 p-4">
                            {[1,2,3].map(i => <Skeleton key={i} className="h-20 w-full bg-zinc-800" />)}
                          </div>
                        ) : userDeposits.length === 0 ? (
                          <div className="text-center py-12">
                            <Banknote className="h-12 w-12 text-zinc-600 mx-auto mb-3" />
                            <p className="text-zinc-400">Nenhuma fatura encontrada</p>
                            <p className="text-zinc-500 text-sm mt-1">Faça seu primeiro depósito para começar a investir</p>
                          </div>
                        ) : (
                          <div className="divide-y divide-zinc-800 max-h-[600px] overflow-y-auto">
                            {userDeposits.map((dep: any) => (
                              <div key={dep.id} className="p-3 sm:p-4 hover:bg-zinc-800/30">
                                <div className="flex items-center justify-between gap-3">
                                  <div className="flex items-center gap-3 min-w-0 flex-1">
                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                      dep.status === 'confirmed' || dep.status === 'approved' ? 'bg-cyan-500/10 text-cyan-400' :
                                      dep.status === 'pending' ? 'bg-amber-500/10 text-amber-400' :
                                      dep.status === 'rejected' ? 'bg-red-500/10 text-red-400' :
                                      dep.status === 'cancelled' ? 'bg-orange-500/10 text-orange-400' :
                                      'bg-zinc-500/10 text-zinc-400'
                                    }`}>
                                      <ArrowDownLeft className="h-5 w-5" />
                                    </div>
                                    <div className="min-w-0">
                                      <div className="font-medium text-sm truncate">{dep.description || 'Depósito'}</div>
                                      <div className="text-xs text-zinc-400 flex items-center gap-2 flex-wrap">
                                        <span>{fmtDateTime(dep.createdAt)}</span>
                                        {dep.method && (
                                          <Badge className="text-[10px] px-1.5 py-0 bg-zinc-800 text-zinc-300 border-zinc-700" variant="outline">
                                            {dep.method === 'usdttrc20' ? 'USDT TRC20' :
                                             dep.method === 'usdtmatic' ? 'USDT Polygon' :
                                             dep.method === 'pix' ? 'PIX' : dep.method.toUpperCase()}
                                          </Badge>
                                        )}
                                        {dep.network && (
                                          <Badge className="text-[10px] px-1.5 py-0 bg-sky-500/10 text-sky-400 border-sky-500/30" variant="outline">
                                            {dep.network}
                                          </Badge>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="text-right flex-shrink-0">
                                    <div className="text-cyan-400 font-semibold text-sm">+${fmtUSDT(dep.amount)}</div>
                                    <Badge className={`text-[10px] px-1.5 py-0 ${
                                      dep.status === 'confirmed' || dep.status === 'approved' ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' :
                                      dep.status === 'pending' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
                                      dep.status === 'rejected' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                                      dep.status === 'cancelled' ? 'bg-orange-500/20 text-orange-400 border-orange-500/30' :
                                      'bg-zinc-500/20 text-zinc-400 border-zinc-500/30'
                                    }`} variant="outline">
                                      {dep.status === 'confirmed' || dep.status === 'approved' ? 'Confirmado' :
                                       dep.status === 'pending' ? 'Pendente' :
                                       dep.status === 'rejected' ? 'Rejeitado' :
                                       dep.status === 'cancelled' ? 'Cancelado' :
                                       dep.status}
                                    </Badge>
                                  </div>
                                </div>
                                {/* NowPayments details */}
                                {dep.nowpayments && (
                                  <div className="mt-3 p-3 bg-zinc-800/50 rounded-lg space-y-2">
                                    <div className="flex items-center gap-2 text-xs">
                                      <Globe className="h-3 w-3 text-sky-400" />
                                      <span className="text-zinc-400">NowPayments</span>
                                      <Badge className={`text-[10px] px-1.5 py-0 ${
                                        dep.nowpayments.paymentStatus === 'finished' || dep.nowpayments.paymentStatus === 'confirmed' ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' :
                                        dep.nowpayments.paymentStatus === 'waiting' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
                                        dep.nowpayments.paymentStatus === 'expired' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                                        'bg-blue-500/20 text-blue-400 border-blue-500/30'
                                      }`} variant="outline">
                                        {dep.nowpayments.paymentStatus}
                                      </Badge>
                                      {dep.nowpayments.splitProcessed && (
                                        <Badge className="text-[10px] px-1.5 py-0 bg-purple-500/20 text-purple-400 border-purple-500/30" variant="outline">
                                          Split {dep.nowpayments.splitTotalPct}%
                                        </Badge>
                                      )}
                                    </div>
                                    {dep.nowpayments.payAddress && (
                                      <div className="flex items-center gap-2 text-xs">
                                        <Wallet className="h-3 w-3 text-zinc-400" />
                                        <span className="text-zinc-500 font-mono truncate max-w-[200px] sm:max-w-[350px]">{dep.nowpayments.payAddress}</span>
                                        <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => {
                                          navigator.clipboard.writeText(dep.nowpayments.payAddress);
                                          toast.success('Endereço copiado!');
                                        }}>
                                          <Copy className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    )}
                                    {dep.nowpayments.payAmount && (
                                      <div className="flex items-center gap-2 text-xs">
                                        <Coins className="h-3 w-3 text-zinc-400" />
                                        <span className="text-zinc-400">Pagar: </span>
                                        <span className="text-white">{dep.nowpayments.payAmount} {dep.nowpayments.payCurrency?.toUpperCase()}</span>
                                      </div>
                                    )}
                                    {dep.nowpayments.expiresAt && dep.status === 'pending' && (
                                      <div className="flex items-center gap-2 text-xs">
                                        <Clock4 className="h-3 w-3 text-amber-400" />
                                        <span className="text-zinc-400">Expira: </span>
                                        <span className={`${
                                          new Date(dep.nowpayments.expiresAt) < new Date() ? 'text-red-400' : 'text-amber-400'
                                        }`}>
                                          {new Date(dep.nowpayments.expiresAt) < new Date() ? 'Expirado' : fmtDateTime(dep.nowpayments.expiresAt)}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* ====== SAQUES TAB ====== */}
                {activeTab === 'saques' && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h2 className="text-xl sm:text-2xl font-bold">Saques</h2>
                      <div className="flex items-center gap-2">
                        <Select value={payoutFilter} onValueChange={setPayoutFilter}>
                          <SelectTrigger className="w-[130px] h-9 text-xs bg-zinc-900 border-zinc-800">
                            <SelectValue placeholder="Filtrar" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Todos</SelectItem>
                            <SelectItem value="pending">Pendentes</SelectItem>
                            <SelectItem value="confirmed">Concluídos</SelectItem>
                            <SelectItem value="rejected">Rejeitados</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button className="bg-emerald-600 hover:bg-cyan-700" onClick={() => { setWithdrawDialog(true); fetchWithdrawalBreakdown(); }} disabled={d(user?.balance || '0') < 10}>
                          <ArrowUpRight className="h-4 w-4 mr-2" /> Solicitar Saque
                        </Button>
                      </div>
                    </div>

                    {/* Summary Cards */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                      <Card className="bg-zinc-900 border-zinc-800">
                        <CardContent className="p-4">
                          <p className="text-zinc-400 text-xs">Total Sacado</p>
                          <p className="text-red-400 font-bold text-lg">${fmtUSDT(userPayoutStats?.totalWithdrawn?.toString() || user?.totalWithdrawn || '0')}</p>
                        </CardContent>
                      </Card>
                      <Card className="bg-zinc-900 border-zinc-800">
                        <CardContent className="p-4">
                          <p className="text-zinc-400 text-xs">Pendente</p>
                          <p className="text-amber-400 font-bold text-lg">${(userPayoutStats?.pendingAmount || 0).toFixed(2)}</p>
                        </CardContent>
                      </Card>
                      <Card className="bg-zinc-900 border-zinc-800">
                        <CardContent className="p-4">
                          <p className="text-zinc-400 text-xs">Saldo Disponível</p>
                          <p className="text-cyan-400 font-bold text-lg">${fmtUSDT(user?.balance || '0')}</p>
                        </CardContent>
                      </Card>
                      <Card className="bg-zinc-900 border-zinc-800">
                        <CardContent className="p-4">
                          <p className="text-zinc-400 text-xs">Total Saques</p>
                          <p className="text-white font-bold text-lg">{userPayoutStats?.totalWithdrawals || 0}</p>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Withdrawals List */}
                    <Card className="bg-zinc-900 border-zinc-800">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base">Histórico de Saques</CardTitle>
                          <Button variant="ghost" size="sm" onClick={fetchUserPayouts} disabled={payoutsLoading}>
                            <RefreshCw className={`h-4 w-4 ${payoutsLoading ? 'animate-spin' : ''}`} />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="p-0">
                        {payoutsLoading ? (
                          <div className="space-y-3 p-4">
                            {[1,2,3].map(i => <Skeleton key={i} className="h-20 w-full bg-zinc-800" />)}
                          </div>
                        ) : userPayouts.length === 0 ? (
                          <div className="text-center py-12">
                            <HandCoins className="h-12 w-12 text-zinc-600 mx-auto mb-3" />
                            <p className="text-zinc-400">Nenhum saque realizado</p>
                            <p className="text-zinc-500 text-sm mt-1">Solicite um saque quando tiver saldo disponível</p>
                          </div>
                        ) : (
                          <div className="divide-y divide-zinc-800 max-h-[600px] overflow-y-auto">
                            {userPayouts.map((wd: any) => (
                              <div key={wd.id} className="p-3 sm:p-4 hover:bg-zinc-800/30">
                                <div className="flex items-center justify-between gap-3">
                                  <div className="flex items-center gap-3 min-w-0 flex-1">
                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                      wd.status === 'confirmed' || wd.status === 'approved' ? 'bg-cyan-500/10 text-cyan-400' :
                                      wd.status === 'pending' ? 'bg-amber-500/10 text-amber-400' :
                                      wd.status === 'rejected' ? 'bg-red-500/10 text-red-400' :
                                      'bg-zinc-500/10 text-zinc-400'
                                    }`}>
                                      <ArrowUpRight className="h-5 w-5" />
                                    </div>
                                    <div className="min-w-0">
                                      <div className="font-medium text-sm truncate">{wd.description || 'Saque'}</div>
                                      <div className="text-xs text-zinc-400 flex items-center gap-2 flex-wrap">
                                        <span>{fmtDateTime(wd.createdAt)}</span>
                                        {wd.method && (
                                          <Badge className="text-[10px] px-1.5 py-0 bg-zinc-800 text-zinc-300 border-zinc-700" variant="outline">
                                            {wd.method === 'usdt_trc20' ? 'USDT TRC20' :
                                             wd.method === 'usdt_polygon' ? 'USDT Polygon' :
                                             wd.method === 'pix' ? 'PIX' : wd.method.toUpperCase()}
                                          </Badge>
                                        )}
                                        {wd.destination && (
                                          <span className="text-zinc-500 font-mono truncate max-w-[120px]">{wd.destination}</span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="text-right flex-shrink-0">
                                    <div className="text-red-400 font-semibold text-sm">-${fmtUSDT(wd.amount)}</div>
                                    <Badge className={`text-[10px] px-1.5 py-0 ${
                                      wd.status === 'confirmed' || wd.status === 'approved' ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' :
                                      wd.status === 'pending' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
                                      wd.status === 'rejected' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                                      wd.status === 'processing' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
                                      'bg-zinc-500/20 text-zinc-400 border-zinc-500/30'
                                    }`} variant="outline">
                                      {wd.status === 'confirmed' || wd.status === 'approved' ? 'Concluído' :
                                       wd.status === 'pending' ? 'Pendente' :
                                       wd.status === 'rejected' ? 'Rejeitado' :
                                       wd.status === 'processing' ? 'Processando' : wd.status}
                                    </Badge>
                                  </div>
                                </div>
                                {/* NowPayments payout details */}
                                {wd.nowpayments && (
                                  <div className="mt-3 p-3 bg-zinc-800/50 rounded-lg space-y-2">
                                    <div className="flex items-center gap-2 text-xs">
                                      <Globe className="h-3 w-3 text-sky-400" />
                                      <span className="text-zinc-400">NowPayments Payout</span>
                                      <Badge className={`text-[10px] px-1.5 py-0 ${
                                        wd.nowpayments.payoutStatus === 'FINISHED' ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' :
                                        wd.nowpayments.payoutStatus === 'FAILED' || wd.nowpayments.payoutStatus === 'REJECTED' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                                        'bg-blue-500/20 text-blue-400 border-blue-500/30'
                                      }`} variant="outline">
                                        {wd.nowpayments.payoutStatus}
                                      </Badge>
                                    </div>
                                    {wd.nowpayments.destinationAddress && (
                                      <div className="flex items-center gap-2 text-xs">
                                        <Wallet className="h-3 w-3 text-zinc-400" />
                                        <span className="text-zinc-500 font-mono truncate max-w-[200px] sm:max-w-[350px]">{wd.nowpayments.destinationAddress}</span>
                                      </div>
                                    )}
                                    {wd.nowpayments.txHash && (
                                      <div className="flex items-center gap-2 text-xs">
                                        <ExternalLink className="h-3 w-3 text-zinc-400" />
                                        <span className="text-zinc-400">TX: </span>
                                        <span className="text-white font-mono truncate max-w-[200px]">{wd.nowpayments.txHash}</span>
                                      </div>
                                    )}
                                    {wd.nowpayments.fee && d(wd.nowpayments.fee) > 0 && (
                                      <div className="flex items-center gap-2 text-xs">
                                        <Percent className="h-3 w-3 text-zinc-400" />
                                        <span className="text-zinc-400">Taxa: </span>
                                        <span className="text-white">{wd.nowpayments.fee} {wd.nowpayments.currency?.toUpperCase()}</span>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* ====== EXTRATO TAB ====== */}
                {activeTab === 'extrato' && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h2 className="text-xl sm:text-2xl font-bold">Extrato</h2>
                      <div className="flex items-center gap-2">
                        <Select value={statementFilter} onValueChange={setStatementFilter}>
                          <SelectTrigger className="w-[150px] h-9 text-xs bg-zinc-900 border-zinc-800">
                            <SelectValue placeholder="Filtrar tipo" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Todos</SelectItem>
                            <SelectItem value="deposit">Depósitos</SelectItem>
                            <SelectItem value="withdrawal">Saques</SelectItem>
                            <SelectItem value="roi_profit">Lucros</SelectItem>
                            <SelectItem value="affiliate_commission">Comissões</SelectItem>
                            <SelectItem value="investment">Aluguéis</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button variant="ghost" size="sm" onClick={fetchStatement} disabled={statementLoading}>
                          <RefreshCw className={`h-4 w-4 ${statementLoading ? 'animate-spin' : ''}`} />
                        </Button>
                      </div>
                    </div>

                    {/* Balance Overview */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <Card className="bg-gradient-to-br from-emerald-900/30 to-zinc-900 border-cyan-500/20">
                        <CardContent className="p-5">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                              <TrendingUp className="h-4 w-4 text-cyan-400" />
                            </div>
                            <span className="text-zinc-400 text-sm">Entradas</span>
                          </div>
                          <p className="text-cyan-400 font-bold text-2xl">
                            +${(statementSummary?.totalIncome || 0).toFixed(2)}
                          </p>
                          <p className="text-zinc-500 text-xs mt-1">Depósitos + Lucros + Comissões</p>
                        </CardContent>
                      </Card>
                      <Card className="bg-gradient-to-br from-red-900/30 to-zinc-900 border-red-500/20">
                        <CardContent className="p-5">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center">
                              <TrendingDown className="h-4 w-4 text-red-400" />
                            </div>
                            <span className="text-zinc-400 text-sm">Saídas</span>
                          </div>
                          <p className="text-red-400 font-bold text-2xl">
                            -${(statementSummary?.totalExpense || 0).toFixed(2)}
                          </p>
                          <p className="text-zinc-500 text-xs mt-1">Saques + Aluguéis</p>
                        </CardContent>
                      </Card>
                      <Card className="bg-gradient-to-br from-zinc-800 to-zinc-900 border-zinc-700">
                        <CardContent className="p-5">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                              <DollarSign className="h-4 w-4 text-white" />
                            </div>
                            <span className="text-zinc-400 text-sm">Saldo Atual</span>
                          </div>
                          <p className="text-white font-bold text-2xl">${fmtUSDT(statementSummary?.currentBalance?.toString() || user?.balance || '0')}</p>
                          <p className="text-zinc-500 text-xs mt-1">≈ R$ {((statementSummary?.currentBalance || d(user?.balance || '0')) * usdtBrlRate).toFixed(2)}</p>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Detailed Balance Breakdown */}
                    <Card className="bg-zinc-900 border-zinc-800">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base">Resumo Financeiro</CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 space-y-3">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <ArrowDownLeft className="h-4 w-4 text-cyan-400" />
                            <span className="text-zinc-300 text-sm">Total Depositado</span>
                          </div>
                          <span className="text-cyan-400 font-semibold">${fmtUSDT(statementSummary?.totalInvested?.toString() || user?.totalInvested || '0')}</span>
                        </div>
                        <Separator className="bg-zinc-800" />
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-cyan-400" />
                            <span className="text-zinc-300 text-sm">Total Minado (Lucros)</span>
                          </div>
                          <span className="text-cyan-400 font-semibold">${fmtUSDT(statementSummary?.totalRoi?.toString() || user?.totalRoi || '0')}</span>
                        </div>
                        <Separator className="bg-zinc-800" />
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-blue-400" />
                            <span className="text-zinc-300 text-sm">Comissões Afiliado</span>
                          </div>
                          <span className="text-blue-400 font-semibold">${fmtUSDT(statementSummary?.totalAffiliateEarnings?.toString() || user?.totalAffiliateEarnings || '0')}</span>
                        </div>
                        <Separator className="bg-zinc-800" />
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <ArrowUpRight className="h-4 w-4 text-red-400" />
                            <span className="text-zinc-300 text-sm">Total Sacado</span>
                          </div>
                          <span className="text-red-400 font-semibold">${fmtUSDT(statementSummary?.totalWithdrawn?.toString() || user?.totalWithdrawn || '0')}</span>
                        </div>
                        <Separator className="bg-zinc-800" />
                        <div className="flex justify-between items-center pt-1">
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-white" />
                            <span className="text-white font-medium">Saldo Disponível</span>
                          </div>
                          <span className="text-white font-bold text-lg">${fmtUSDT(statementSummary?.currentBalance?.toString() || user?.balance || '0')}</span>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Full Transaction Statement with Running Balance */}
                    <Card className="bg-zinc-900 border-zinc-800">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base">Extrato Completo</CardTitle>
                          <Badge variant="outline" className="border-zinc-700 text-zinc-400">{statementData.length} movimentações</Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="p-0">
                        {statementLoading ? (
                          <div className="space-y-3 p-4">
                            {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-16 w-full bg-zinc-800" />)}
                          </div>
                        ) : statementData.length === 0 ? (
                          <div className="text-center py-12">
                            <FileText className="h-12 w-12 text-zinc-600 mx-auto mb-3" />
                            <p className="text-zinc-400">Nenhuma movimentação registrada</p>
                          </div>
                        ) : (
                          <div className="divide-y divide-zinc-800 max-h-[600px] overflow-y-auto">
                            {statementData.map((entry: any) => {
                              const isPositive = entry.category === 'income';
                              const IconComp = isPositive
                                ? (entry.type === 'deposit' ? ArrowDownLeft :
                                   entry.type === 'roi_profit' ? Bot :
                                   entry.type === 'affiliate_commission' ? Users : TrendingUp)
                                : (entry.type === 'withdrawal' ? ArrowUpRight : Clock);
                              return (
                                <div key={entry.id} className="flex items-center justify-between gap-3 p-3 sm:p-4 hover:bg-zinc-800/30">
                                  <div className="flex items-center gap-3 min-w-0 flex-1">
                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${isPositive ? 'bg-cyan-500/10 text-cyan-400' : 'bg-red-500/10 text-red-400'}`}>
                                      <IconComp className="h-5 w-5" />
                                    </div>
                                    <div className="min-w-0">
                                      <div className="font-medium text-sm truncate">{entry.description}</div>
                                      <div className="text-xs text-zinc-400 flex items-center gap-2 flex-wrap">
                                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                          entry.type === 'deposit' ? 'bg-cyan-500/10 text-cyan-400' :
                                          entry.type === 'roi_profit' ? 'bg-blue-500/10 text-blue-400' :
                                          entry.type === 'affiliate_commission' ? 'bg-purple-500/10 text-purple-400' :
                                          entry.type === 'withdrawal' ? 'bg-red-500/10 text-red-400' :
                                          entry.type === 'investment' ? 'bg-amber-500/10 text-amber-400' :
                                          'bg-zinc-500/10 text-zinc-400'
                                        }`}>
                                          {entry.type === 'deposit' ? 'Depósito' :
                                           entry.type === 'roi_profit' ? 'Lucro ROI' :
                                           entry.type === 'affiliate_commission' ? 'Comissão' :
                                           entry.type === 'withdrawal' ? 'Saque' :
                                           entry.type === 'investment' ? 'Aluguel' :
                                           entry.type}
                                        </span>
                                        <span>{fmtDateTime(entry.date)}</span>
                                        {entry.method && (
                                          <span className="text-zinc-500">{entry.method}</span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="text-right flex-shrink-0">
                                    <div className={`font-semibold text-sm ${isPositive ? 'text-cyan-400' : 'text-red-400'}`}>
                                      {isPositive ? '+' : '-'}${fmtUSDT(entry.amount)}
                                    </div>
                                    <div className="text-[10px] text-zinc-500">
                                      Saldo: ${fmtUSDT(entry.runningBalance?.toString() || '0')}
                                    </div>
                                    <Badge className={`text-[10px] px-1.5 py-0 ${
                                      entry.status === 'approved' || entry.status === 'completed' || entry.status === 'confirmed' ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' :
                                      entry.status === 'pending' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
                                      entry.status === 'rejected' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                                      'bg-zinc-500/20 text-zinc-400 border-zinc-500/30'
                                    }`} variant="outline">
                                      {entry.status === 'approved' || entry.status === 'completed' || entry.status === 'confirmed' ? 'Confirmado' :
                                       entry.status === 'pending' ? 'Pendente' :
                                       entry.status === 'rejected' ? 'Rejeitado' : entry.status}
                                    </Badge>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* ====== HISTÓRICO TAB ====== */}
                {activeTab === 'historico' && (
                  <div className="space-y-6">
                    <h2 className="text-xl sm:text-2xl font-bold">{t('history.title')}</h2>
                    <Card className="bg-zinc-900 border-zinc-800">
                      <CardContent className="p-0">
                        {transactions.length === 0 ? (
                          <p className="text-zinc-500 text-center py-12">{t('history.noTransactions')}</p>
                        ) : (
                          <div className="divide-y divide-zinc-800">
                            {transactions.map(tx => {
                              const Icon = txTypeIcon(tx.type);
                              const isPositive = ['deposit', 'roi_profit', 'affiliate_commission'].includes(tx.type);
                              return (
                                <div key={tx.id} className="flex items-center justify-between gap-3 p-3 sm:p-4 hover:bg-zinc-800/30">
                                  <div className="flex items-center gap-3 min-w-0 flex-1">
                                    <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${isPositive ? 'bg-cyan-500/10 text-cyan-400' : 'bg-red-500/10 text-red-400'}`}>
                                      <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                                    </div>
                                    <div className="min-w-0">
                                      <div className="font-medium text-sm truncate">{tx.description}</div>
                                      <div className="text-xs text-zinc-400">{txTypeLabel(tx.type)} • {fmtDateTime(tx.createdAt)}</div>
                                    </div>
                                  </div>
                                  <div className="text-right flex-shrink-0">
                                    <div className={`font-semibold text-sm ${isPositive ? 'text-cyan-400' : 'text-red-400'}`}>
                                      {isPositive ? '+' : '-'}${fmtUSDT(tx.amount)}
                                    </div>
                                    <Badge className={statusColor(tx.status)} variant="outline">{statusLabel(tx.status)}</Badge>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* ====== AFILIADOS TAB (DeFi Redesign) ====== */}
                {activeTab === 'afiliados' && (
                  <div className="space-y-6">
                    {/* Section Title */}
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                        <Users className="h-6 w-6 text-emerald-400" />
                      </div>
                      <div>
                        <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">{t('affiliates.title')}</h2>
                        <p className="text-xs text-zinc-500">Unilevel 11 Níveis · Bônus de Equipe · Saque Diário</p>
                      </div>
                    </motion.div>

                    {/* ═══════════════ 1. AFFILIATE HERO SECTION ═══════════════ */}
                    {affiliateLoading && !affiliateData ? (
                      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                        <div className="glass-card gradient-border rounded-2xl p-5 sm:p-6 glow-emerald relative overflow-hidden">
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
                            {[1,2,3,4].map(i => (
                              <div key={i} className="glass-card rounded-xl p-4 text-center border border-white/5">
                                <div className="animate-pulse bg-zinc-700/50 h-5 w-5 mx-auto mb-2 rounded" />
                                <div className="animate-pulse bg-zinc-700/50 h-8 w-16 mx-auto mb-1 rounded" />
                                <div className="animate-pulse bg-zinc-700/50 h-3 w-12 mx-auto rounded" />
                              </div>
                            ))}
                          </div>
                          <div className="flex flex-col sm:flex-row items-stretch gap-4">
                            <div className="flex items-center gap-3 glass-card rounded-xl p-3 sm:p-4 border border-white/5 flex-1">
                              <div className="animate-pulse bg-zinc-700/50 h-12 w-12 rounded-xl" />
                              <div className="space-y-2">
                                <div className="animate-pulse bg-zinc-700/50 h-3 w-20 rounded" />
                                <div className="animate-pulse bg-zinc-700/50 h-5 w-28 rounded" />
                              </div>
                            </div>
                            <div className="flex-1 glass-card rounded-xl p-3 sm:p-4 border border-white/5">
                              <div className="space-y-2">
                                <div className="animate-pulse bg-zinc-700/50 h-3 w-24 rounded" />
                                <div className="animate-pulse bg-zinc-700/50 h-8 w-full rounded" />
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ) : !affiliateData?.linkUnlocked ? (
                      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                        <div className="glass-card gradient-border rounded-2xl p-8 text-center glow-emerald">
                          <div className="text-6xl mb-4">🔗</div>
                          <h3 className="text-xl font-bold text-white mb-2">{t('affiliates.unlockDesc')}</h3>
                          <p className="text-sm text-zinc-400 mb-6">Invista para desbloquear seu link de afiliado e comece a ganhar comissões</p>
                          {user.hasInvested ? (
                            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 h-12 text-base" onClick={handleUnlockAffiliate}>
                              <Zap className="mr-2 h-5 w-5" /> {t('affiliates.unlockBtn')}
                            </Button>
                          ) : (
                            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 h-12 text-base" onClick={() => setActiveTab('investir')}>
                              <TrendingUp className="mr-2 h-5 w-5" /> {t('dashboard.investNow')}
                            </Button>
                          )}
                        </div>
                      </motion.div>
                    ) : (
                      <>
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
                          <div className="glass-card gradient-border rounded-2xl p-5 sm:p-6 glow-emerald relative overflow-hidden">
                            <div className="absolute inset-0 opacity-[0.03]" style={{ background: 'radial-gradient(ellipse at top right, #10b981, transparent 60%)' }} />
                            <div className="relative z-10">
                              {/* Top row: Stats */}
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
                                <div className="stat-card-hover">
                                  <div className="glass-card rounded-xl p-4 text-center border border-emerald-500/10">
                                    <DollarSign className="h-5 w-5 text-emerald-400 mx-auto mb-1" />
                                    <div className="text-2xl sm:text-3xl font-bold text-emerald-400" style={{ textShadow: '0 0 20px rgba(16,185,129,0.3)' }}>${fmtUSDT(affiliateData?.totalEarnings || 0)}</div>
                                    <div className="text-[11px] text-zinc-500 mt-1">{t('affiliates.totalEarnings')}</div>
                                  </div>
                                </div>
                                <div className="stat-card-hover">
                                  <div className="glass-card rounded-xl p-4 text-center border border-cyan-500/10">
                                    <Users className="h-5 w-5 text-cyan-400 mx-auto mb-1" />
                                    <div className="text-2xl sm:text-3xl font-bold text-cyan-400">{affiliateData?.directReferrals ?? (affiliateData?.referralTree?.[1]?.length || 0)}</div>
                                    <div className="text-[11px] text-zinc-500 mt-1">{t('affiliates.directReferrals')}</div>
                                  </div>
                                </div>
                                <div className="stat-card-hover">
                                  <div className="glass-card rounded-xl p-4 text-center border border-emerald-500/10">
                                    <Globe className="h-5 w-5 text-emerald-300 mx-auto mb-1" />
                                    <div className="text-2xl sm:text-3xl font-bold text-emerald-300">{affiliateData?.totalReferrals || 0}</div>
                                    <div className="text-[11px] text-zinc-500 mt-1">{t('affiliates.totalReferrals')}</div>
                                  </div>
                                </div>
                                <div className="stat-card-hover">
                                  <div className="glass-card rounded-xl p-4 text-center border border-amber-500/10">
                                    <Wallet className="h-5 w-5 text-amber-400 mx-auto mb-1" />
                                    <div className="text-2xl sm:text-3xl font-bold text-amber-400">${fmtUSDT(affiliateData?.affiliateBalance || 0)}</div>
                                    <div className="text-[11px] text-zinc-500 mt-1">{t('affiliates.availableBalance')}</div>
                                  </div>
                                </div>
                              </div>

                              {/* Bottom row: Rank badge + Referral link */}
                              <div className="flex flex-col sm:flex-row items-stretch gap-4">
                                {/* Current Rank Badge */}
                                <div className="flex items-center gap-3 glass-card rounded-xl p-3 sm:p-4 border border-white/5 flex-1">
                                  <div className="text-4xl sm:text-5xl" style={{ filter: `drop-shadow(0 0 16px ${(affiliateData?.currentRank?.color || '#22c55e')}50)` }}>
                                    {affiliateData?.currentRank?.icon || '🌱'}
                                  </div>
                                  <div>
                                    <div className="text-[10px] uppercase tracking-wider text-zinc-500">{t('affiliates.currentRank')}</div>
                                    <div className="text-lg font-bold" style={{ color: affiliateData?.currentRank?.color || '#22c55e' }}>
                                      {affiliateData?.currentRank?.name || 'Iniciante'}
                                    </div>
                                    {affiliateData?.currentRank && d(affiliateData.currentRank.commissionBoost) > 0 && (
                                      <div className="text-xs text-emerald-400">+{affiliateData.currentRank.commissionBoost}% bônus ROI diário</div>
                                    )}
                                  </div>
                                </div>

                                {/* Referral Link + Share */}
                                <div className="glass-card rounded-xl p-3 sm:p-4 border border-white/5 flex-1">
                                  <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-2">{t('affiliates.yourLink')}</div>
                                  <div className="flex items-center gap-2 mb-2">
                                    <code className="bg-zinc-800/80 px-3 py-1.5 rounded-lg text-emerald-400 font-mono text-xs sm:text-sm flex-1 min-w-0 truncate">
                                      {typeof window !== 'undefined' ? `${window.location.origin}?ref=${affiliateData?.code || user.affiliateCode}` : ''}
                                    </code>
                                    <CopyButton text={typeof window !== 'undefined' ? `${window.location.origin}?ref=${affiliateData?.code || user.affiliateCode}` : ''} t={t} />
                                  </div>
                                  <div className="flex flex-wrap gap-1.5">
                                    {typeof window !== 'undefined' && (() => {
                                      const link = `${window.location.origin}?ref=${affiliateData?.code || user.affiliateCode}`;
                                      const text = encodeURIComponent('🚀 Invista com PLATAFORMA ROI! Use meu link e comece a ganhar:');
                                      return (
                                        <>
                                          <a href={`https://wa.me/?text=${text}%20${encodeURIComponent(link)}`} target="_blank" rel="noopener noreferrer">
                                            <Button size="sm" variant="outline" className="border-green-600/50 text-green-400 hover:bg-green-500/10 gap-1 h-8 text-xs">
                                              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.136.558 4.143 1.534 5.886L.057 23.64l5.888-1.545A11.95 11.95 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.82c-1.98 0-3.826-.544-5.41-1.49l-.387-.23-4.007 1.05 1.07-3.903-.253-.4A9.794 9.794 0 012.18 12c0-5.422 4.398-9.82 9.82-9.82 5.422 0 9.82 4.398 9.82 9.82 0 5.422-4.398 9.82-9.82 9.82z"/></svg>
                                              WhatsApp
                                            </Button>
                                          </a>
                                          <a href={`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${text}`} target="_blank" rel="noopener noreferrer">
                                            <Button size="sm" variant="outline" className="border-sky-600/50 text-sky-400 hover:bg-sky-500/10 gap-1 h-8 text-xs">
                                              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
                                              Telegram
                                            </Button>
                                          </a>
                                          <a href={`https://twitter.com/intent/tweet?text=${text}&url=${encodeURIComponent(link)}`} target="_blank" rel="noopener noreferrer">
                                            <Button size="sm" variant="outline" className="border-zinc-600/50 text-zinc-300 hover:bg-zinc-500/10 gap-1 h-8 text-xs">
                                              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                                              X
                                            </Button>
                                          </a>
                                        </>
                                      );
                                    })()}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </motion.div>

                        {/* ═══════════════ 2. TEAM BONUS RANKS VISUALIZATION ═══════════════ */}
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                          <div className="glass-card gradient-border rounded-2xl p-5 sm:p-6">
                            <div className="flex items-center gap-2 mb-5">
                              <Crown className="h-5 w-5 text-amber-400" />
                              <h3 className="text-lg font-bold text-white">Team Bonus Ranks</h3>
                              <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 ml-auto" variant="outline">Bônus Extra ROI Diário</Badge>
                            </div>

                            {/* Rank Cards Row */}
                            <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-5">
                              {(() => {
                                const directRefs = affiliateData?.directReferrals ?? (affiliateData?.referralTree?.[1]?.length || 0);
                                const rankDefs = [
                                  { name: 'Bronze', medal: '🥉', minRef: 10, bonusPct: 1, color: '#cd7f32', glow: 'rgba(205,127,50,0.3)', borderColor: 'border-amber-700/40', bgColor: 'bg-amber-900/10' },
                                  { name: 'Prata', medal: '🥈', minRef: 20, bonusPct: 2, color: '#c0c0c0', glow: 'rgba(192,192,192,0.3)', borderColor: 'border-zinc-400/40', bgColor: 'bg-zinc-500/10' },
                                  { name: 'Ouro', medal: '🥇', minRef: 30, bonusPct: 3, color: '#ffd700', glow: 'rgba(255,215,0,0.3)', borderColor: 'border-yellow-500/40', bgColor: 'bg-yellow-500/10' },
                                ];
                                const currentRankName = affiliateData?.currentRank?.name || 'Iniciante';
                                return rankDefs.map((rank) => {
                                  const isCurrentRank = currentRankName.toLowerCase() === rank.name.toLowerCase();
                                  const isUnlocked = directRefs >= rank.minRef;
                                  const isNext = !isUnlocked && (
                                    (rank.name === 'Bronze' && directRefs < 10) ||
                                    (rank.name === 'Prata' && directRefs >= 10 && directRefs < 20) ||
                                    (rank.name === 'Ouro' && directRefs >= 20 && directRefs < 30)
                                  );
                                  const progressPct = Math.min(100, (directRefs / rank.minRef) * 100);
                                  return (
                                    <div key={rank.name} className={`stat-card-hover relative rounded-xl border p-4 text-center transition-all ${
                                      isCurrentRank ? `${rank.borderColor} ${rank.bgColor}` :
                                      isUnlocked ? 'border-emerald-500/30 bg-emerald-500/5' :
                                      isNext ? 'border-amber-500/20 bg-amber-500/5' :
                                      'border-zinc-800/50 bg-zinc-900/30 opacity-50'
                                    }`}>
                                      {isCurrentRank && (
                                        <div className="absolute inset-0 rounded-xl pointer-events-none" style={{ boxShadow: `0 0 25px ${rank.glow}, inset 0 0 25px ${rank.glow}` }} />
                                      )}
                                      <div className="relative z-10">
                                        <div className="text-4xl sm:text-5xl mb-2" style={isCurrentRank ? { filter: `drop-shadow(0 0 12px ${rank.glow})` } : !isUnlocked ? { filter: 'grayscale(0.8) brightness(0.5)' } : {}}>
                                          {rank.medal}
                                        </div>
                                        <div className="text-sm font-bold" style={{ color: isUnlocked || isCurrentRank ? rank.color : undefined }}>{rank.name}</div>
                                        <div className="text-[10px] text-zinc-500 mt-0.5">{rank.minRef} indicações</div>
                                        <div className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                          <TrendingUp className="h-3 w-3" /> +{rank.bonusPct}% ROI
                                        </div>
                                        {!isUnlocked && !isCurrentRank && (
                                          <div className="mt-2">
                                            <Progress value={progressPct} className="h-1.5 bg-zinc-800 [&>[data-slot=indicator]]:bg-amber-500" />
                                            <div className="text-[9px] text-zinc-600 mt-0.5">{directRefs}/{rank.minRef}</div>
                                          </div>
                                        )}
                                        {isCurrentRank && (
                                          <div className="mt-2 text-[10px] text-emerald-400 font-medium">✓ Rank Atual</div>
                                        )}
                                        {isUnlocked && !isCurrentRank && (
                                          <div className="mt-2 text-[10px] text-cyan-400 font-medium">✓ Desbloqueado</div>
                                        )}
                                      </div>
                                    </div>
                                  );
                                });
                              })()}
                            </div>

                            {/* Progress to Next Rank */}
                            {affiliateData?.nextRank && (
                              <div className="glass-card rounded-xl p-4 border border-amber-500/15">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <Target className="h-4 w-4 text-amber-400" />
                                    <span className="text-sm font-medium text-zinc-300">Próximo: <span style={{ color: affiliateData.nextRank.color }}>{affiliateData.nextRank.icon} {affiliateData.nextRank.name}</span></span>
                                  </div>
                                  <span className="text-xs text-zinc-500">
                                    {affiliateData.nextRankReferralsNeeded! > 0 && <span>+{affiliateData.nextRankReferralsNeeded} referrals</span>}
                                    {affiliateData.nextRankReferralsNeeded! > 0 && affiliateData.nextRankEarningsNeeded! > 0 && <span> · </span>}
                                    {affiliateData.nextRankEarningsNeeded! > 0 && <span>+${fmtUSDT(affiliateData.nextRankEarningsNeeded)} earnings</span>}
                                  </span>
                                </div>
                                <Progress
                                  value={Math.max(0, 100 - ((affiliateData.nextRankReferralsNeeded! + affiliateData.nextRankEarningsNeeded!) / (affiliateData.nextRank.minReferrals + d(affiliateData.nextRank.minEarnings)) * 100))}
                                  className="h-2 bg-zinc-800 [&>[data-slot=indicator]]:bg-gradient-to-r [&>[data-slot=indicator]]:from-emerald-500 [&>[data-slot=indicator]]:to-cyan-500"
                                />
                              </div>
                            )}
                            {!affiliateData?.nextRank && affiliateData?.currentRank && (
                              <div className="glass-card rounded-xl p-4 border border-amber-500/20 text-center">
                                <div className="text-2xl mb-1">👑</div>
                                <div className="text-sm font-bold text-amber-400">{t('affiliates.maxRank')}</div>
                              </div>
                            )}
                          </div>
                        </motion.div>

                        {/* ═══════════════ 3. 11-LEVEL UNILEVEL VISUALIZATION ═══════════════ */}
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                          <div className="glass-card gradient-border rounded-2xl p-5 sm:p-6">
                            <div className="flex items-center gap-2 mb-4">
                              <Activity className="h-5 w-5 text-cyan-400" />
                              <h3 className="text-lg font-bold text-white">Unilevel 11 Níveis</h3>
                              {affiliateData?.commissionMode && (
                                <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30 ml-auto text-[10px]" variant="outline">
                                  {affiliateData.commissionMode === 'system_margin' ? 'System Margin' : affiliateData.commissionMode === 'investment_profit' ? 'Trading Profit' : 'Revenue Pool'}
                                </Badge>
                              )}
                            </div>

                            {/* L1 - Direct (highlighted) */}
                            {(() => {
                              const lvl1Refs = affiliateData?.referralTree?.[1] || [];
                              const lvl1Comm = affiliateData?.commissionByLevel?.find(c => c.level === 1);
                              const lvl1Pct = affiliateData?.affiliateLevels?.find(l => l.level === 1);
                              const lvl1Active = lvl1Refs.length > 0;
                              return (
                                <div className={`glass-card rounded-xl p-4 mb-3 border transition-all ${lvl1Active ? 'border-emerald-500/30 glow-emerald' : 'border-white/5'}`}>
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                      <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-emerald-500/20 border border-emerald-500/30">
                                        <span className="text-sm font-bold text-emerald-400">L1</span>
                                      </div>
                                      <div>
                                        <div className="flex items-center gap-2">
                                          <span className="text-lg font-bold text-emerald-400">{lvl1Pct?.percentage || '10'}%</span>
                                          <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[9px]" variant="outline">DIRECT</Badge>
                                        </div>
                                        <div className="text-xs text-zinc-500">{lvl1Refs.length} {t('common.referrals')}</div>
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <div className="text-lg font-bold text-emerald-400" style={lvl1Active ? { textShadow: '0 0 12px rgba(16,185,129,0.4)' } : {}}>${fmtUSDT(lvl1Comm?._sum?.commissionAmount || 0)}</div>
                                      <div className="text-[10px] text-zinc-500">{t('common.earned')}</div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })()}

                            {/* L2-L5 Row */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
                              {[2, 3, 4, 5].map((level) => {
                                const refs = affiliateData?.referralTree?.[level] || [];
                                const comm = affiliateData?.commissionByLevel?.find(c => c.level === level);
                                const levelPct = affiliateData?.affiliateLevels?.find(l => l.level === level);
                                const isActive = refs.length > 0;
                                return (
                                  <div key={level} className={`stat-card-hover glass-card rounded-xl p-3 border transition-all ${isActive ? 'border-cyan-500/20' : 'border-white/5 opacity-50'}`}>
                                    <div className="flex items-center gap-2 mb-1">
                                      <div className={`flex items-center justify-center w-7 h-7 rounded-md text-xs font-bold ${isActive ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'bg-zinc-800 text-zinc-500 border border-zinc-700'}`}>
                                        L{level}
                                      </div>
                                      <span className={`text-base font-bold ${isActive ? 'text-cyan-400' : 'text-zinc-500'}`}>{levelPct?.percentage || '?'}%</span>
                                    </div>
                                    <div className="text-[10px] text-zinc-500">{refs.length} {t('common.referrals')}</div>
                                    <div className={`text-sm font-semibold mt-1 ${isActive ? 'text-cyan-400' : 'text-zinc-600'}`}>${fmtUSDT(comm?._sum?.commissionAmount || 0)}</div>
                                  </div>
                                );
                              })}
                            </div>

                            {/* L6-L11 Row */}
                            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                              {[6, 7, 8, 9, 10, 11].map((level) => {
                                const refs = affiliateData?.referralTree?.[level] || [];
                                const comm = affiliateData?.commissionByLevel?.find(c => c.level === level);
                                const levelPct = affiliateData?.affiliateLevels?.find(l => l.level === level);
                                const isActive = refs.length > 0;
                                return (
                                  <div key={level} className={`stat-card-hover glass-card rounded-lg p-2.5 border transition-all ${isActive ? 'border-emerald-500/20' : 'border-white/5 opacity-40'}`}>
                                    <div className="flex items-center justify-center gap-1 mb-0.5">
                                      <span className={`text-[10px] font-bold ${isActive ? 'text-emerald-400' : 'text-zinc-600'}`}>L{level}</span>
                                      <span className={`text-sm font-bold ${isActive ? 'text-emerald-300' : 'text-zinc-600'}`}>{levelPct?.percentage || '?'}%</span>
                                    </div>
                                    <div className="text-[9px] text-zinc-600 text-center">{refs.length} ref</div>
                                    <div className={`text-xs font-semibold text-center mt-0.5 ${isActive ? 'text-emerald-400' : 'text-zinc-700'}`}>${fmtUSDT(comm?._sum?.commissionAmount || 0)}</div>
                                  </div>
                                );
                              })}
                            </div>

                            {/* Total */}
                            <div className="mt-3 flex items-center justify-between px-2 py-2 rounded-lg bg-zinc-800/30 border border-zinc-700/30">
                              <span className="text-xs text-zinc-400">Total Unilevel</span>
                              <span className="text-sm font-bold text-emerald-400">
                                {affiliateData?.affiliateLevels?.length ? affiliateData.affiliateLevels.reduce((sum, l) => sum + d(l.percentage), 0).toFixed(1) : '28'}% · ${fmtUSDT(affiliateData?.commissionByLevel?.reduce((sum, c) => sum + (c._sum?.commissionAmount || 0), 0) || 0)}
                              </span>
                            </div>

                            {affiliateData?.commissionMode === 'investment_profit' && (
                              <div className="mt-2 p-3 bg-zinc-800/30 rounded-lg border border-zinc-700/30">
                                <div className="text-xs text-zinc-400">
                                  <span className="text-cyan-400 font-medium">💡 {t('affiliates.howItWorks')}:</span>{' '}
                                  {t('affiliates.tradingProfitExplanation')}
                                </div>
                              </div>
                            )}
                          </div>
                        </motion.div>

                        {/* ═══════════════ 4. REFERRAL TREE (Collapsible) ═══════════════ */}
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                          <Accordion type="single" collapsible defaultValue="referral-tree" className="space-y-0">
                            <AccordionItem value="referral-tree" className="border-0">
                              <AccordionTrigger className="glass-card gradient-border rounded-2xl px-5 py-4 hover:no-underline hover:bg-white/[0.02] [&[data-state=open]]:rounded-b-none">
                                <div className="flex items-center gap-2">
                                  <Users className="h-5 w-5 text-cyan-400" />
                                  <h3 className="text-lg font-bold text-white">Árvore de Indicações</h3>
                                  <Badge className="bg-zinc-700 text-zinc-300 text-[10px]" variant="outline">{affiliateData?.totalReferrals || 0}</Badge>
                                </div>
                              </AccordionTrigger>
                              <AccordionContent className="glass-card rounded-b-2xl border-t-0 border border-white/5 p-4">
                                {/* Search */}
                                <div className="relative mb-4">
                                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                                  <Input
                                    placeholder="Buscar afiliado..."
                                    value={affiliateSearch}
                                    onChange={(e) => setAffiliateSearch(e.target.value)}
                                    className="bg-zinc-800/50 border-zinc-700/50 pl-9 h-9 text-sm"
                                  />
                                </div>
                                {/* Direct Referrals List */}
                                <div className="max-h-80 overflow-y-auto space-y-2 pr-1" style={{ scrollbarWidth: 'thin', scrollbarColor: '#27272a transparent' }}>
                                  {(() => {
                                    const allRefs = Object.entries(affiliateData?.referralTree || {}).flatMap(([level, refs]) =>
                                      refs.map(r => ({ ...r, level: parseInt(level) }))
                                    );
                                    const filtered = affiliateSearch
                                      ? allRefs.filter(r => r.name.toLowerCase().includes(affiliateSearch.toLowerCase()) || r.email.toLowerCase().includes(affiliateSearch.toLowerCase()))
                                      : allRefs.filter(r => r.level <= 3); // Show first 3 levels by default, search shows all
                                    if (filtered.length === 0) {
                                      return (
                                        <div className="text-center py-8 text-zinc-500 text-sm">
                                          <Users className="h-8 w-8 mx-auto mb-2 opacity-30" />
                                          {affiliateSearch ? 'Nenhum resultado encontrado' : 'Nenhuma indicação ainda'}
                                        </div>
                                      );
                                    }
                                    return filtered.map((ref) => (
                                      <div key={ref.id} className="flex items-center justify-between bg-zinc-800/40 rounded-lg p-3 hover:bg-zinc-800/60 transition-colors">
                                        <div className="flex items-center gap-3">
                                          <Avatar className="h-8 w-8">
                                            <AvatarFallback className="bg-zinc-700 text-zinc-300 text-xs">{ref.name.charAt(0).toUpperCase()}</AvatarFallback>
                                          </Avatar>
                                          <div>
                                            <div className="text-sm font-medium text-zinc-200">{ref.name}</div>
                                            <div className="text-[10px] text-zinc-500">{fmtDate(ref.createdAt)}</div>
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                          <div className="text-right">
                                            <div className="text-sm font-semibold text-zinc-300">${fmtUSDT(ref.totalInvested)}</div>
                                            <div className="text-[10px] text-zinc-500">investido</div>
                                          </div>
                                          <Badge variant="outline" className={`text-[9px] ${ref.level === 1 ? 'border-emerald-500/30 text-emerald-400' : ref.level === 2 ? 'border-cyan-500/30 text-cyan-400' : 'border-zinc-600 text-zinc-400'}`}>
                                            L{ref.level}
                                          </Badge>
                                        </div>
                                      </div>
                                    ));
                                  })()}
                                </div>
                              </AccordionContent>
                            </AccordionItem>
                          </Accordion>
                        </motion.div>

                        {/* ═══════════════ 5. RECENT COMMISSIONS FEED ═══════════════ */}
                        {affiliateData?.recentCommissions && affiliateData.recentCommissions.length > 0 && (
                          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
                            <div className="glass-card gradient-border rounded-2xl p-5 sm:p-6">
                              <div className="flex items-center gap-2 mb-4">
                                <Clock4 className="h-5 w-5 text-cyan-400" />
                                <h3 className="text-lg font-bold text-white">Comissões Recentes</h3>
                              </div>
                              <div className="max-h-64 overflow-y-auto space-y-2 pr-1" style={{ scrollbarWidth: 'thin', scrollbarColor: '#27272a transparent' }}>
                                {affiliateData.recentCommissions.map((comm) => {
                                  const levelColors: Record<number, string> = {
                                    1: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
                                    2: 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10',
                                    3: 'text-teal-400 border-teal-500/30 bg-teal-500/10',
                                    4: 'text-blue-400 border-blue-500/30 bg-blue-500/10',
                                    5: 'text-indigo-400 border-indigo-500/30 bg-indigo-500/10',
                                  };
                                  const colorClass = levelColors[comm.level] || 'text-zinc-400 border-zinc-500/30 bg-zinc-500/10';
                                  return (
                                    <div key={comm.id} className="flex items-center justify-between bg-zinc-800/30 rounded-lg p-3 hover:bg-zinc-800/50 transition-colors">
                                      <div className="flex items-center gap-3">
                                        <Badge variant="outline" className={`text-[9px] font-bold ${colorClass}`}>L{comm.level}</Badge>
                                        <div>
                                          <div className="text-sm text-zinc-300">{comm.user?.name || '***'}</div>
                                          <div className="text-[10px] text-zinc-500">{comm.percentage}% de ${fmtUSDT(comm.baseAmount)}</div>
                                        </div>
                                      </div>
                                      <div className="text-right">
                                        <div className="text-sm font-bold text-emerald-400">+${fmtUSDT(comm.commissionAmount)}</div>
                                        <div className="text-[10px] text-zinc-600">{relativeTime(comm.createdAt)}</div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </motion.div>
                        )}

                        {/* ═══════════════ BADGES / CONQUISTAS ═══════════════ */}
                        {affiliateData.badges && affiliateData.badges.length > 0 && (
                          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }}>
                            <div className="glass-card rounded-2xl p-5 sm:p-6 border border-white/5">
                              <div className="flex items-center gap-2 mb-4">
                                <Award className="h-5 w-5 text-amber-400" />
                                <h3 className="text-lg font-bold text-white">{t('affiliates.badges')}</h3>
                              </div>
                              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                                {affiliateData.badges.map((badge) => (
                                  <div
                                    key={badge.id}
                                    className={`relative flex flex-col items-center text-center p-2 rounded-xl border transition-all ${
                                      badge.earned
                                        ? 'bg-zinc-800/80 border-zinc-600/50 hover:border-zinc-500/50'
                                        : badge.isClose
                                          ? 'bg-zinc-800/30 border-amber-500/20 hover:border-amber-500/40'
                                          : 'bg-zinc-900/50 border-zinc-800/50 opacity-40'
                                    }`}
                                    title={badge.description || badge.name}
                                  >
                                    <div className={`text-2xl sm:text-3xl mb-1 ${badge.earned ? '' : 'grayscale'}`} style={badge.earned ? { filter: `drop-shadow(0 0 6px ${badge.color}40)` } : {}}>
                                      {badge.icon}
                                    </div>
                                    <div className="text-[10px] sm:text-xs font-medium leading-tight truncate w-full">{badge.name}</div>
                                    {!badge.earned && badge.progress > 0 && (
                                      <div className="w-full mt-1">
                                        <Progress value={badge.progress} className="h-1" />
                                      </div>
                                    )}
                                    {badge.earned && (
                                      <CheckCircle2 className="absolute -top-1 -right-1 h-4 w-4 text-cyan-400" />
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          </motion.div>
                        )}

                        {/* ═══════════════ MILESTONES ═══════════════ */}
                        {affiliateData.milestones && affiliateData.milestones.length > 0 && (
                          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                            <div className="glass-card rounded-2xl p-5 sm:p-6 border border-white/5">
                              <div className="flex items-center gap-2 mb-4">
                                <Target className="h-5 w-5 text-cyan-400" />
                                <h3 className="text-lg font-bold text-white">{t('affiliates.milestones')}</h3>
                              </div>
                              <div className="space-y-3">
                                {affiliateData.milestones.map((m) => {
                                  const directRefs = affiliateData.directReferrals ?? (affiliateData.referralTree?.[1]?.length || 0);
                                  const progress = Math.min(100, (directRefs / m.targetCount) * 100);
                                  return (
                                    <div key={m.id} className={`rounded-lg p-3 border ${m.claimed ? 'bg-cyan-500/5 border-cyan-500/20' : m.canClaim ? 'bg-amber-500/5 border-amber-500/20' : 'bg-zinc-800/50 border-zinc-700/50'}`}>
                                      <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                          <span className="text-xl">{m.icon}</span>
                                          <div>
                                            <span className="font-medium text-sm">{m.name}</span>
                                            {m.description && <div className="text-xs text-zinc-500">{m.description}</div>}
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          {m.rewardType === 'cash' && d(m.rewardValue) > 0 && (
                                            <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30" variant="outline">+${fmtUSDT(m.rewardValue)}</Badge>
                                          )}
                                          {m.claimed ? (
                                            <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30" variant="outline"><CheckCircle2 className="h-3 w-3 mr-1" />{t('affiliates.claimed')}</Badge>
                                          ) : m.canClaim ? (
                                            <Button size="sm" className="h-7 text-xs bg-emerald-600 hover:bg-cyan-700" onClick={() => handleClaimMilestone(m.id)}>{t('affiliates.claimBonus')}</Button>
                                          ) : null}
                                        </div>
                                      </div>
                                      <Progress value={progress} className="h-1.5" />
                                      <div className="text-xs text-zinc-500 mt-1">{directRefs}/{m.targetCount} {t('common.referrals')}</div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </motion.div>
                        )}

                        {/* ═══════════════ CONTESTS ═══════════════ */}
                        {affiliateData.contests && affiliateData.contests.length > 0 && (
                          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.32 }}>
                            <div className="glass-card rounded-2xl p-5 sm:p-6 border border-amber-500/10">
                              <div className="flex items-center gap-2 mb-4">
                                <Trophy className="h-5 w-5 text-amber-400" />
                                <h3 className="text-lg font-bold text-white">{t('affiliates.activeContests')}</h3>
                              </div>
                              <div className="space-y-3">
                                {affiliateData.contests.map((c) => (
                                  <div key={c.id} className="bg-gradient-to-r from-amber-500/5 to-cyan-500/5 border border-amber-500/20 rounded-lg p-4">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                      <div>
                                        <div className="font-semibold">{c.name}</div>
                                        {c.description && <div className="text-sm text-zinc-400 mt-0.5">{c.description}</div>}
                                        <div className="text-xs text-zinc-500 mt-1">{t('affiliates.contestEnds')}: {fmtDateTime(c.endDate)}</div>
                                      </div>
                                      <div className="text-right">
                                        <div className="text-lg font-bold text-amber-400">${fmtUSDT(c.rewardPool)}</div>
                                        <div className="text-xs text-zinc-400">{t('affiliates.contestReward')}</div>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </motion.div>
                        )}

                        {/* ═══════════════ LEADERBOARD ═══════════════ */}
                        {affiliateData.leaderboard && affiliateData.leaderboard.length > 0 && (
                          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.34 }}>
                            <div className="glass-card rounded-2xl p-5 sm:p-6 border border-white/5">
                              <div className="flex items-center gap-2 mb-4">
                                <Medal className="h-5 w-5 text-amber-400" />
                                <h3 className="text-lg font-bold text-white">{t('affiliates.leaderboardTitle')}</h3>
                              </div>
                              <div className="space-y-2">
                                {affiliateData.leaderboard.map((entry, idx) => (
                                  <div key={idx} className={`flex items-center justify-between rounded-lg p-3 ${idx === 0 ? 'bg-amber-500/10 border border-amber-500/20' : idx === 1 ? 'bg-zinc-400/5 border border-zinc-500/20' : idx === 2 ? 'bg-amber-700/5 border border-amber-700/20' : 'bg-zinc-800/50'}`}>
                                    <div className="flex items-center gap-3">
                                      <span className={`text-lg font-bold w-8 text-center ${idx === 0 ? 'text-amber-400' : idx === 1 ? 'text-zinc-300' : idx === 2 ? 'text-amber-600' : 'text-zinc-500'}`}>#{entry.rank}</span>
                                      <Avatar className="h-8 w-8"><AvatarFallback className="bg-zinc-700 text-zinc-300 text-xs">{entry.nameInitial}</AvatarFallback></Avatar>
                                      <div>
                                        <div className="text-sm font-medium">{entry.nameInitial}***</div>
                                        <div className="text-xs text-zinc-500">{entry.totalReferrals} {t('common.referrals')}</div>
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <div className="text-sm font-semibold text-cyan-400">${fmtUSDT(entry.totalEarnings)}</div>
                                      {entry.currentRankName && <div className="text-xs text-zinc-500">{entry.currentRankName}</div>}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </motion.div>
                        )}

                        {/* ═══════════════ 6. AFFILIATE WITHDRAWAL SECTION ═══════════════ */}
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.36 }}>
                          <div className="glass-card gradient-border rounded-2xl p-5 sm:p-6">
                            <div className="flex items-center gap-2 mb-4">
                              <HandCoins className="h-5 w-5 text-emerald-400" />
                              <h3 className="text-lg font-bold text-white">{t('affiliates.withdraw')}</h3>
                              <div className="ml-auto flex items-center gap-2">
                                <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30" variant="outline">Saque Diário</Badge>
                                <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30" variant="outline">0% Taxa</Badge>
                              </div>
                            </div>

                            {/* Balance Display */}
                            <div className="flex items-center justify-between mb-5 p-4 rounded-xl bg-zinc-800/40 border border-zinc-700/30">
                              <div>
                                <div className="text-xs text-zinc-500">{t('affiliates.availableBalance')}</div>
                                <div className="text-3xl font-bold text-emerald-400" style={{ textShadow: '0 0 20px rgba(16,185,129,0.3)' }}>${fmtUSDT(user.affiliateBalance)}</div>
                              </div>
                              <div className="text-5xl opacity-20">💰</div>
                            </div>

                            {d(user.affiliateBalance) > 0 ? (
                              <form onSubmit={handleAffiliateWithdraw} className="space-y-4">
                                <div className="grid sm:grid-cols-3 gap-4">
                                  <div>
                                    <Label className="text-zinc-400 text-sm">{t('deposit.amount')}</Label>
                                    <Input name="amount" type="number" step="0.01" min="1" max={d(user.affiliateBalance)} required className="bg-zinc-800/50 border-zinc-700/50 mt-1 h-10" placeholder="0.00" />
                                  </div>
                                  <div>
                                    <Label className="text-zinc-400 text-sm">{t('deposit.method')}</Label>
                                    <Select name="method" defaultValue="usdt_trc20">
                                      <SelectTrigger className="bg-zinc-800/50 border-zinc-700/50 mt-1 h-10"><SelectValue /></SelectTrigger>
                                      <SelectContent className="bg-zinc-800">
                                        <SelectItem value="usdt_trc20">USDT TRC20</SelectItem>
                                        <SelectItem value="pix">PIX</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div>
                                    <Label className="text-zinc-400 text-sm">{t('affiliates.destination')}</Label>
                                    <Input name="destination" required className="bg-zinc-800/50 border-zinc-700/50 mt-1 h-10" placeholder={t('withdrawal.destinationPlaceholder')} />
                                  </div>
                                </div>
                                <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white h-11 w-full sm:w-auto px-8">
                                  <ArrowUpRight className="mr-2 h-4 w-4" /> {t('affiliates.withdraw')}
                                </Button>
                              </form>
                            ) : (
                              <div className="text-center py-4 text-zinc-500 text-sm">
                                <Wallet className="h-8 w-8 mx-auto mb-2 opacity-30" />
                                Saldo insuficiente para saque
                              </div>
                            )}
                          </div>
                        </motion.div>
                      </>
                    )}

                    {/* ═══════════════ VOUCHER DASHBOARD FOR LEADERS ═══════════════ */}
                    {userVouchersLoading && userVouchers.length === 0 ? (
                      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="text-lg font-semibold flex items-center gap-2"><Ticket className="h-5 w-5 text-purple-400" /> {t('copyTraders.myVouchers')}</h3>
                              <p className="text-sm text-zinc-500 mt-1">{t('copyTraders.voucherDesc')}</p>
                            </div>
                          </div>
                          {[1,2].map(i => (
                            <Card key={i} className="border-2 border-purple-500/20 bg-purple-500/5">
                              <CardContent className="p-5">
                                <div className="flex items-center justify-between mb-3">
                                  <div className="flex items-center gap-2">
                                    <div className="animate-pulse bg-zinc-700/50 h-5 w-16 rounded" />
                                    <div className="animate-pulse bg-zinc-700/50 h-5 w-20 rounded" />
                                  </div>
                                  <div className="animate-pulse bg-zinc-700/50 h-4 w-20 rounded" />
                                </div>
                                <div className="grid grid-cols-3 gap-4 mb-4">
                                  {[1,2,3].map(j => (
                                    <div key={j} className="text-center p-3 rounded-lg bg-zinc-800/50">
                                      <div className="animate-pulse bg-zinc-700/50 h-3 w-16 mx-auto rounded mb-1" />
                                      <div className="animate-pulse bg-zinc-700/50 h-6 w-20 mx-auto rounded" />
                                    </div>
                                  ))}
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </motion.div>
                    ) : userVouchers.length > 0 && (
                      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="text-lg font-semibold flex items-center gap-2"><Ticket className="h-5 w-5 text-purple-400" /> {t('copyTraders.myVouchers')}</h3>
                              <p className="text-sm text-zinc-500 mt-1">{t('copyTraders.voucherDesc')}</p>
                            </div>
                            <Button variant="outline" className="border-zinc-700 text-purple-400 hover:bg-purple-500/10" onClick={recalculateVoucherProgress} disabled={voucherProgressLoading}>
                              <RefreshCw className={`mr-2 h-4 w-4 ${voucherProgressLoading ? 'animate-spin' : ''}`} /> {t('copyTraders.refresh')}
                            </Button>
                          </div>

                          {userVouchers.map((v: any) => {
                            const available = d(v.amount) - d(v.usedAmount);
                            const goalTarget = d(v.goalNetworkMultiple) * d(v.amount);
                            const referralPct = v.goalDirectReferrals > 0 ? Math.round((v.qualifyingReferrals / v.goalDirectReferrals) * 100) : 0;
                            const networkPct = goalTarget > 0 ? Math.round((d(v.currentNetworkInvestment) / goalTarget) * 100) : 0;
                            const unlockPct = d(v.withdrawalUnlockPct);
                            const daysLeft = v.status === 'active' ? Math.max(0, Math.ceil((new Date(v.deadline).getTime() - Date.now()) / 86400000)) : 0;

                            return (
                              <Card key={v.id} className={`border-2 ${v.status === 'active' ? 'border-purple-500/40 bg-purple-500/5' : v.status === 'completed' ? 'border-cyan-500/40 bg-cyan-500/5' : 'border-zinc-700 bg-zinc-900'}`}>
                                <CardContent className="p-5">
                                  <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                      <Badge className={v.status === 'active' ? 'bg-purple-500/20 text-purple-400 border-purple-500/30' : v.status === 'completed' ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' : 'bg-red-500/20 text-red-400 border-red-500/30'} variant="outline">
                                        {v.status === 'active' ? '🟢 Ativo' : v.status === 'completed' ? '✅ Completo' : v.status === 'expired' ? '⏰ Expirado' : '🚫 Revogado'}
                                      </Badge>
                                      <Badge className="bg-zinc-700 text-zinc-300" variant="outline">
                                        {v.type === 'basic' ? t('copyTraders.planBasic') : v.type === 'premium' ? t('copyTraders.planPremium') : t('copyTraders.planCustom')}
                                      </Badge>
                                    </div>
                                    {v.status === 'active' && (
                                      <div className={`text-sm font-medium ${daysLeft <= 7 ? 'text-red-400' : 'text-zinc-400'}`}>
                                        ⏰ {daysLeft} {t('copyTraders.daysRemaining')}
                                      </div>
                                    )}
                                  </div>

                                  {/* Balance Section */}
                                  <div className="grid grid-cols-3 gap-4 mb-4">
                                    <div className="text-center p-3 rounded-lg bg-zinc-800/50">
                                      <div className="text-xs text-zinc-500 mb-1">{t('copyTraders.voucherTotal')}</div>
                                      <div className="text-lg font-bold text-white">{fmtUSDT(v.amount)} USDT</div>
                                    </div>
                                    <div className="text-center p-3 rounded-lg bg-zinc-800/50">
                                      <div className="text-xs text-zinc-500 mb-1">{t('copyTraders.voucherAvailable')}</div>
                                      <div className="text-lg font-bold text-cyan-400">{fmtUSDT(available)} USDT</div>
                                    </div>
                                    <div className="text-center p-3 rounded-lg bg-zinc-800/50">
                                      <div className="text-xs text-zinc-500 mb-1">{t('copyTraders.withdrawalUnlock')}</div>
                                      <div className={`text-lg font-bold ${unlockPct >= 100 ? 'text-cyan-400' : unlockPct > 0 ? 'text-amber-400' : 'text-red-400'}`}>{unlockPct}%</div>
                                    </div>
                                  </div>

                                  {/* Goals Progress */}
                                  {v.status === 'active' && (
                                    <div className="space-y-3">
                                      <div className="text-sm font-medium text-zinc-300 mb-2">📊 {t('copyTraders.goalsProgress')}</div>
                                      <div>
                                        <div className="flex justify-between text-xs mb-1">
                                          <span className="text-zinc-400">🤝 Indicações qualificadas (que investiram ≥ {fmtUSDT(v.goalMinReferralInvest)} USDT)</span>
                                          <span className="font-medium">{v.qualifyingReferrals}/{v.goalDirectReferrals}</span>
                                        </div>
                                        <Progress value={Math.min(100, referralPct)} className="h-3 bg-zinc-800 [&>[data-slot=indicator]]:bg-cyan-500" />
                                      </div>
                                      <div>
                                        <div className="flex justify-between text-xs mb-1">
                                          <span className="text-zinc-400">💰 Investimento total da rede</span>
                                          <span className="font-medium">{fmtUSDT(v.currentNetworkInvestment)}/{fmtUSDT(goalTarget)} USDT</span>
                                        </div>
                                        <Progress value={Math.min(100, networkPct)} className="h-3 bg-zinc-800 [&>[data-slot=indicator]]:bg-blue-500" />
                                      </div>

                                      {/* Gradual Unlock Timeline */}
                                      <div className="mt-4 p-3 rounded-lg bg-zinc-800/50">
                                        <div className="text-xs font-medium text-zinc-300 mb-2">🔓 {t('copyTraders.gradualUnlock')}</div>
                                        <div className="flex items-center gap-1">
                                          <div className={`flex-1 h-3 rounded-l-full ${unlockPct >= 25 ? 'bg-cyan-500' : 'bg-zinc-700'}`} />
                                          <div className={`flex-1 h-3 ${unlockPct >= 50 ? 'bg-cyan-500' : 'bg-zinc-700'}`} />
                                          <div className={`flex-1 h-3 ${unlockPct >= 75 ? 'bg-cyan-500' : 'bg-zinc-700'}`} />
                                          <div className={`flex-1 h-3 rounded-r-full ${unlockPct >= 100 ? 'bg-cyan-500' : 'bg-zinc-700'}`} />
                                        </div>
                                        <div className="flex justify-between text-[10px] mt-1 text-zinc-500">
                                          <span className={unlockPct >= 25 ? 'text-cyan-400' : ''}>25%</span>
                                          <span className={unlockPct >= 50 ? 'text-cyan-400' : ''}>50%</span>
                                          <span className={unlockPct >= 75 ? 'text-cyan-400' : ''}>75%</span>
                                          <span className={unlockPct >= 100 ? 'text-cyan-400' : ''}>100%</span>
                                        </div>
                                        <div className="mt-2 space-y-1 text-[10px] text-zinc-500">
                                          <div className={unlockPct >= 25 ? 'text-cyan-400' : ''}>✓ 25% — Trazer 50% das indicações necessárias</div>
                                          <div className={unlockPct >= 50 ? 'text-cyan-400' : ''}>✓ 50% — 75% das indicações + 50% do investimento da rede</div>
                                          <div className={unlockPct >= 75 ? 'text-cyan-400' : ''}>✓ 75% — 100% das indicações + 75% do investimento</div>
                                          <div className={unlockPct >= 100 ? 'text-cyan-400' : ''}>✓ 100% — Todas as metas completas</div>
                                        </div>
                                      </div>

                                      {unlockPct === 0 && (
                                        <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                                          <div className="text-sm text-amber-400 font-medium">⚠️ Lucros de voucher bloqueados</div>
                                          <div className="text-xs text-zinc-400 mt-1">Seus recursos próprios (depósitos + lucros próprios) estão sempre liberados para saque. Apenas os lucros de investimentos feitos com voucher ficam bloqueados até cumprir as metas.</div>
                                        </div>
                                      )}
                                      {unlockPct > 0 && unlockPct < 100 && (
                                        <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                                          <div className="text-sm text-amber-400 font-medium">⚠️ Lucros de voucher parcialmente desbloqueados ({unlockPct}%)</div>
                                          <div className="text-xs text-zinc-400 mt-1">Recursos próprios sempre liberados. Lucros de voucher desbloqueados: {unlockPct}%. Continue cumprindo as metas para desbloquear mais.</div>
                                        </div>
                                      )}
                                      {unlockPct >= 100 && (
                                        <div className="p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
                                          <div className="text-sm text-cyan-400 font-medium">✅ Saques totalmente desbloqueados!</div>
                                          <div className="text-xs text-zinc-400 mt-1">Parabéns! Todas as metas foram cumpridas. Você pode sacar normalmente.</div>
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  {/* Usage History */}
                                  {v.usages && v.usages.length > 0 && (
                                    <div className="mt-4">
                                      <div className="text-sm font-medium text-zinc-300 mb-2">📝 Histórico de Uso</div>
                                      <div className="space-y-1">
                                        {v.usages.map((u: any) => (
                                          <div key={u.id} className="flex justify-between text-xs bg-zinc-800/50 rounded p-2">
                                            <span className="text-zinc-400">{(u as any).investment?.trader?.name || (u as any).investment?.plan?.name || 'Investimento'} — {fmtDate(u.createdAt)}</span>
                                            <span className="text-amber-400">-{fmtUSDT(u.amount)} USDT</span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </CardContent>
                              </Card>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}

                  </div>
                )}

                {/* ====== PERFIL TAB ====== */}
                {activeTab === 'perfil' && (
                  <div className="space-y-6">
                    <h2 className="text-xl sm:text-2xl font-bold">{t('profile.title')}</h2>
                    <div className="grid lg:grid-cols-2 gap-6">
                      <Card className="bg-zinc-900 border-zinc-800">
                        <CardHeader><CardTitle>{t('profile.title')}</CardTitle></CardHeader>
                        <CardContent>
                          <form onSubmit={handleProfileUpdate} className="space-y-4">
                            <div><Label className="text-zinc-400">{t('profile.name')}</Label><Input name="name" defaultValue={user.name} required className="bg-zinc-800 border-zinc-700 mt-1" /></div>
                            <div><Label className="text-zinc-400">{t('profile.email')}</Label><Input value={user.email} disabled className="bg-zinc-800 border-zinc-700 mt-1 text-zinc-500" /></div>
                            <div><Label className="text-zinc-400">{t('admin.role')}</Label><Input value={user.role === 'admin' ? t('admin.admin') : t('admin.user')} disabled className="bg-zinc-800 border-zinc-700 mt-1 text-zinc-500" /></div>
                            <Button type="submit" className="bg-emerald-600 hover:bg-cyan-700">{t('profile.save')}</Button>
                          </form>
                        </CardContent>
                      </Card>
                      <div className="space-y-6">
                        <Card className="bg-zinc-900 border-zinc-800">
                          <CardHeader><CardTitle>{t('profile.walletAddress')}</CardTitle></CardHeader>
                          <CardContent>
                            <form onSubmit={handleProfileUpdate} className="space-y-4">
                              <div><Label className="text-zinc-400">{t('profile.walletAddress')}</Label><Input name="walletAddress" defaultValue={user.walletAddress || ''} className="bg-zinc-800 border-zinc-700 mt-1" placeholder="T..." /></div>
                              <Button type="submit" variant="outline" className="border-zinc-700">{t('profile.save')}</Button>
                            </form>
                          </CardContent>
                        </Card>
                        <Card className="bg-zinc-900 border-zinc-800">
                          <CardHeader><CardTitle>{t('profile.pixKey')}</CardTitle></CardHeader>
                          <CardContent>
                            <form onSubmit={handleProfileUpdate} className="space-y-4">
                              <div><Label className="text-zinc-400">{t('profile.pixKey')}</Label><Input name="pixKey" defaultValue={user.pixKey || ''} className="bg-zinc-800 border-zinc-700 mt-1" placeholder={t('profile.pixKeyPlaceholder')} /></div>
                              <Button type="submit" variant="outline" className="border-zinc-700">{t('profile.save')}</Button>
                            </form>
                          </CardContent>
                        </Card>
                        <Card className="bg-zinc-900 border-zinc-800">
                          <CardHeader><CardTitle>{t('admin.overview')}</CardTitle></CardHeader>
                          <CardContent className="space-y-2 text-sm">
                            <div className="flex justify-between"><span className="text-zinc-400">{t('dashboard.totalInvested')}</span><span>${fmtUSDT(user.totalInvested)}</span></div>
                            <div className="flex justify-between"><span className="text-zinc-400">{t('dashboard.totalRoi')}</span><span className="text-cyan-400">${fmtUSDT(user.totalRoi)}</span></div>
                            <div className="flex justify-between"><span className="text-zinc-400">{t('admin.withdrawals')}</span><span>${fmtUSDT(user.totalWithdrawn)}</span></div>
                            <div className="flex justify-between"><span className="text-zinc-400">{t('profile.memberSince')}</span><span>{fmtDate(user.createdAt)}</span></div>
                          </CardContent>
                        </Card>
                      </div>
                    </div>
                  </div>
                )}

                {/* ====== ADMIN TAB ====== */}
                {isAdminUser && isAdminTab && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2"><Shield className="h-7 w-7 text-cyan-400" /> {t('sidebar.admin')}</h2>
                      <Button variant="outline" size="sm" className="border-zinc-700 min-h-[44px]" onClick={fetchAdminData}>
                        <RefreshCw className="mr-2 h-4 w-4" /> {t('common.refresh')}
                      </Button>
                    </div>
                    {/* Admin Sub-nav (only visible on mobile where sidebar isn't shown) */}
                    <div className="relative lg:hidden">
                    <div className="flex gap-2 overflow-x-auto pb-2">
                      {adminNavItems.map(item => (
                        <Button key={item.id} variant={activeTab === item.id ? 'default' : 'outline'} size="sm" className={`whitespace-nowrap min-h-[44px] ${activeTab === item.id ? 'bg-emerald-600 hover:bg-cyan-700' : 'border-zinc-700'}`} onClick={() => setActiveTab(item.id)}>
                          <item.icon className="mr-2 h-4 w-4" />{item.label}
                        </Button>
                      ))}
                    </div>
                    <div className="absolute right-0 top-0 bottom-2 w-8 bg-gradient-to-l from-zinc-950 to-transparent pointer-events-none lg:hidden" />
                    </div>

                    {/* Admin Overview */}
                    {adminTab === 'overview' && adminLoading && !adminStats ? (
                      <div className="space-y-6">
                        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                          {[1,2,3,4].map(i => (
                            <Card key={i} className="bg-zinc-900 border-zinc-800">
                              <CardContent className="p-5">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="animate-pulse bg-zinc-700/50 h-4 w-20 rounded" />
                                  <div className="animate-pulse bg-zinc-700/50 h-5 w-5 rounded" />
                                </div>
                                <div className="animate-pulse bg-zinc-700/50 h-7 w-24 rounded mb-1" />
                                <div className="animate-pulse bg-zinc-700/50 h-3 w-32 rounded" />
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                        <div className="grid sm:grid-cols-2 gap-4">
                          {[1,2].map(i => (
                            <Card key={i} className="bg-zinc-900 border-zinc-800">
                              <CardContent className="p-5">
                                <div className="animate-pulse bg-zinc-700/50 h-4 w-28 rounded mb-2" />
                                <div className="animate-pulse bg-zinc-700/50 h-7 w-20 rounded mb-1" />
                                <div className="animate-pulse bg-zinc-700/50 h-3 w-36 rounded" />
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </div>
                    ) : adminTab === 'overview' && adminStats && (
                      <div className="space-y-6">
                        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                          {[
                            { label: t('admin.users'), value: adminStats.users.total, sub: `${adminStats.users.active} ${t('status.active').toLowerCase()} • ${adminStats.users.newToday} ${t('admin.newToday').toLowerCase()}`, icon: Users, color: 'text-blue-400' },
                            { label: t('admin.deposits'), value: `$${fmtUSDT(adminStats.deposits.confirmedAmount)}`, sub: `${adminStats.deposits.pendingCount} ${t('admin.pending')} ($${fmtUSDT(adminStats.deposits.pendingAmount)})`, icon: Banknote, color: 'text-cyan-400' },
                            { label: t('admin.withdrawals'), value: `$${fmtUSDT(adminStats.withdrawals.confirmedAmount)}`, sub: `${adminStats.withdrawals.pendingCount} ${t('admin.pending')} ($${fmtUSDT(adminStats.withdrawals.pendingAmount)})`, icon: HandCoins, color: 'text-amber-400' },
                            { label: t('adminSidebar.plan'), value: adminStats.investment?.active, sub: `${adminStats.investment?.total} ${t('admin.total')} \u2022 $${fmtUSDT(adminStats.investment?.revenue)}`, icon: Bot, color: 'text-purple-400' },
                          ].map((s, i) => (
                            <Card key={i} className="bg-zinc-900 border-zinc-800">
                              <CardContent className="p-5">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-sm text-zinc-400">{s.label}</span>
                                  <s.icon className={`h-5 w-5 ${s.color}`} />
                                </div>
                                <div className="text-2xl font-bold">{s.value}</div>
                                <div className="text-xs text-zinc-500 mt-1">{s.sub}</div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                        <div className="grid sm:grid-cols-2 gap-4">
                          <Card className="bg-zinc-900 border-zinc-800">
                            <CardContent className="p-5">
                              <span className="text-sm text-zinc-400">{t('dashboard.totalRoi')}</span>
                              <div className="text-2xl font-bold text-cyan-400">${fmtUSDT(adminStats.trading?.totalRoi || 0)}</div>
                              <div className="text-xs text-zinc-500 mt-1">{t('dashboard.totalInvested')}: ${fmtUSDT(adminStats.trading?.totalInvested || 0)}</div>
                            </CardContent>
                          </Card>
                          <Card className="bg-zinc-900 border-zinc-800">
                            <CardContent className="p-5">
                              <span className="text-sm text-zinc-400">{t('admin.affiliateCommissions')}</span>
                              <div className="text-2xl font-bold text-amber-400">${fmtUSDT(adminStats.affiliates.totalAmount)}</div>
                              <div className="text-xs text-zinc-500 mt-1">{adminStats.affiliates.totalCommissions} {t('admin.affiliateCommissions').toLowerCase()}</div>
                            </CardContent>
                          </Card>
                        </div>
                      </div>
                    )}

                    {/* Admin Copy Traders */}
                    {adminTab === 'copyTraders' && (
                      <div className="space-y-4">
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" className="border-zinc-700 text-cyan-400 hover:bg-cyan-500/10" onClick={handleRegeneratePlans} disabled={removeLoading}>
                            {removeLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                            {t('admin.regeneratePlans')}
                          </Button>
                          <Button className="bg-emerald-600 hover:bg-cyan-700" onClick={() => setTraderDialog({ open: true })}><Plus className="mr-2 h-4 w-4" /> {t('admin.newPlan')}</Button>
                        </div>
                        <Card className="bg-zinc-900 border-zinc-800">
                          <CardContent className="p-0 overflow-x-auto">
                            <Table className="min-w-[700px]">
                              <TableHeader><TableRow className="border-zinc-800 hover:bg-transparent">
                                <TableHead className="text-zinc-400">{t('admin.name')}</TableHead><TableHead className="text-zinc-400">{t('admin.model')}</TableHead>
                                <TableHead className="text-zinc-400">{t('admin.coin')}</TableHead><TableHead className="text-zinc-400">{t('admin.dailyRevenue')}</TableHead>
                                <TableHead className="text-zinc-400">{t('admin.pricePerDay')}</TableHead><TableHead className="text-zinc-400">{t('admin.profitShare')}</TableHead>
                                <TableHead className="text-zinc-400">{t('admin.status')}</TableHead><TableHead className="text-zinc-400">{t('admin.action')}</TableHead>
                              </TableRow></TableHeader>
                              <TableBody>
                                {adminCopyTraders.map(m => (
                                  <TableRow key={m.id} className="border-zinc-800">
                                    <TableCell className="font-medium">{m.name}</TableCell>
                                    <TableCell>{m.model}</TableCell>
                                    <TableCell><span className={assetColor(m.coin)}>{m.coin}</span></TableCell>
                                    <TableCell>${fmtUSDT(m.dailyRevenue)}</TableCell>
                                    <TableCell>${fmtUSDT(m.pricePerDay)}</TableCell>
                                    <TableCell>{m.profitSharePct}%</TableCell>
                                    <TableCell><Badge className={statusColor(m.status)} variant="outline">{statusLabel(m.status)}</Badge></TableCell>
                                    <TableCell>
                                      <div className="flex gap-1">
                                        <Button variant="ghost" size="icon" className="h-10 w-10" onClick={() => setTraderDialog({ open: true, trader: m })}><Pencil className="h-4 w-4" /></Button>
                                        <Button variant="ghost" size="icon" className="h-10 w-10 text-red-400" onClick={() => setDeleteConfirm({ open: true, type: 'trader', id: m.id, name: m.name })}><Trash2 className="h-4 w-4" /></Button>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </CardContent>
                        </Card>
                      </div>
                    )}

                    {/* Admin Plans */}
                    {adminTab === 'plans' && (
                      <div className="space-y-4">
                        <div className="flex justify-end">
                          <Button className="bg-emerald-600 hover:bg-cyan-700" onClick={() => setPlanDialog({ open: true })}><Plus className="mr-2 h-4 w-4" /> {t('admin.newPlan')}</Button>
                        </div>
                        <Card className="bg-zinc-900 border-zinc-800">
                          <CardContent className="p-0 overflow-x-auto">
                            <Table className="min-w-[700px]">
                              <TableHeader><TableRow className="border-zinc-800 hover:bg-transparent">
                                <TableHead className="text-zinc-400">{t('admin.name')}</TableHead><TableHead className="text-zinc-400">{t('admin.plan')}</TableHead>
                                <TableHead className="text-zinc-400">{t('admin.days')}</TableHead><TableHead className="text-zinc-400">{t('admin.discountPct')}</TableHead>
                                <TableHead className="text-zinc-400">{t('admin.totalPrice')}</TableHead><TableHead className="text-zinc-400">{t('admin.dailyRevenue')}</TableHead>
                                <TableHead className="text-zinc-400">{t('admin.active')}</TableHead><TableHead className="text-zinc-400">{t('admin.action')}</TableHead>
                              </TableRow></TableHeader>
                              <TableBody>
                                {adminPlans.map(p => (
                                  <TableRow key={p.id} className="border-zinc-800">
                                    <TableCell className="font-medium">{p.name}</TableCell>
                                    <TableCell>{(p as any).trader?.name || '-'}</TableCell>
                                    <TableCell>{p.durationDays || (p as any).days || '-'}</TableCell>
                                    <TableCell>{(p as any).discountPct || 0}%</TableCell>
                                    <TableCell>${fmtUSDT((p as any).totalPrice || p.maxAmount || 0)}</TableCell>
                                    <TableCell>${fmtUSDT((p as any).dailyReturn || p.dailyRoiPct || 0)}</TableCell>
                                    <TableCell>{p.isActive ? <CheckCircle2 className="h-4 w-4 text-cyan-400" /> : <XCircle className="h-4 w-4 text-red-400" />}</TableCell>
                                    <TableCell>
                                      <div className="flex gap-1">
                                        <Button variant="ghost" size="icon" className="h-10 w-10" onClick={() => setPlanDialog({ open: true, plan: p })}><Pencil className="h-4 w-4" /></Button>
                                        <Button variant="ghost" size="icon" className="h-10 w-10 text-red-400" onClick={() => setDeleteConfirm({ open: true, type: 'plan', id: p.id, name: p.name })}><Trash2 className="h-4 w-4" /></Button>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </CardContent>
                        </Card>
                      </div>
                    )}

                    {/* Admin Users */}
                    {adminTab === 'users' && (
                      <Card className="bg-zinc-900 border-zinc-800">
                        <CardContent className="p-0 overflow-x-auto">
                          <Table className="min-w-[700px]">
                            <TableHeader><TableRow className="border-zinc-800 hover:bg-transparent">
                              <TableHead className="text-zinc-400">{t('admin.name')}</TableHead><TableHead className="text-zinc-400">{t('admin.email')}</TableHead>
                              <TableHead className="text-zinc-400">{t('admin.role')}</TableHead><TableHead className="text-zinc-400">{t('admin.balance')}</TableHead>
                              <TableHead className="text-zinc-400">{t('dashboard.totalInvested')}</TableHead><TableHead className="text-zinc-400">{t('admin.active')}</TableHead>
                              <TableHead className="text-zinc-400">{t('admin.action')}</TableHead>
                            </TableRow></TableHeader>
                            <TableBody>
                              {adminUsers.map(u => (
                                <TableRow key={u.id} className="border-zinc-800">
                                  <TableCell className="font-medium">{u.name}</TableCell>
                                  <TableCell className="text-zinc-400 text-sm">{u.email}</TableCell>
                                  <TableCell><Badge variant="outline" className={u.role === 'admin' ? 'border-amber-500/30 text-amber-400' : 'border-zinc-600'}>{u.role}</Badge></TableCell>
                                  <TableCell>${fmtUSDT(u.balance)}</TableCell>
                                  <TableCell>${fmtUSDT(u.totalInvested)}</TableCell>
                                  <TableCell>{u.isActive ? <CheckCircle2 className="h-4 w-4 text-cyan-400" /> : <XCircle className="h-4 w-4 text-red-400" />}</TableCell>
                                  <TableCell><Button variant="ghost" size="icon" className="h-10 w-10" onClick={() => setUserDialog({ open: true, user: u })}><Pencil className="h-4 w-4" /></Button></TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </CardContent>
                      </Card>
                    )}

                    {/* Admin Deposits */}
                    {adminTab === 'deposits' && (
                      <Card className="bg-zinc-900 border-zinc-800">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-lg flex items-center gap-2"><Banknote className="h-5 w-5 text-cyan-400" /> {t('admin.deposits')}</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0 overflow-x-auto">
                          <Table className="min-w-[800px]">
                            <TableHeader><TableRow className="border-zinc-800 hover:bg-transparent">
                              <TableHead className="text-zinc-400">{t('admin.user')}</TableHead><TableHead className="text-zinc-400">{t('admin.amount')}</TableHead>
                              <TableHead className="text-zinc-400">{t('admin.method')}</TableHead><TableHead className="text-zinc-400">{t('admin.status')}</TableHead>
                              <TableHead className="text-zinc-400">{t('admin.date')}</TableHead><TableHead className="text-zinc-400">{t('admin.action')}</TableHead>
                            </TableRow></TableHeader>
                            <TableBody>
                              {adminDeposits.map(dep => (
                                <TableRow key={dep.id} className="border-zinc-800">
                                  <TableCell>
                                    <div className="font-medium">{dep.user?.name || '-'}</div>
                                    <div className="text-xs text-zinc-500">{dep.user?.email}</div>
                                  </TableCell>
                                  <TableCell>
                                    <div className="font-medium">${fmtUSDT(dep.amount)}</div>
                                    {dep.method === 'pix' && dep.brlAmount && <div className="text-xs text-green-400">R$ {fmtBRL(d(dep.brlAmount))}</div>}
                                  </TableCell>
                                  <TableCell>{methodBadge(dep.method)}</TableCell>
                                  <TableCell><Badge className={statusColor(dep.status)} variant="outline">{statusLabel(dep.status)}</Badge></TableCell>
                                  <TableCell>
                                    <div className="text-sm">{relativeTime(dep.createdAt)}</div>
                                    <div className="text-xs text-zinc-500">{fmtDateTime(dep.createdAt)}</div>
                                  </TableCell>
                                  <TableCell>
                                    {dep.status === 'pending' && (
                                      <div className="flex flex-col sm:flex-row gap-1">
                                        <Button size="sm" className="h-9 text-xs bg-emerald-600 hover:bg-cyan-700" onClick={() => handleAdminDepositAction(dep.id, 'approve')}>{t('admin.approve')}</Button>
                                        <Button size="sm" variant="destructive" className="h-9 text-xs" onClick={() => handleAdminDepositAction(dep.id, 'reject')}>{t('admin.reject')}</Button>
                                      </div>
                                    )}
                                    {dep.adminNotes && <div className="text-xs text-zinc-500 mt-1 max-w-[120px] truncate" title={dep.adminNotes}>📝 {dep.adminNotes}</div>}
                                  </TableCell>
                                </TableRow>
                              ))}
                              {adminDeposits.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-zinc-500 py-8">{t('admin.deposits')}</TableCell></TableRow>}
                            </TableBody>
                          </Table>
                        </CardContent>
                      </Card>
                    )}

                    {/* Admin Withdrawals */}
                    {adminTab === 'withdrawals' && (
                      <Card className="bg-zinc-900 border-zinc-800">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-lg flex items-center gap-2"><HandCoins className="h-5 w-5 text-amber-400" /> {t('admin.withdrawals')}</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0 overflow-x-auto">
                          <Table className="min-w-[800px]">
                            <TableHeader><TableRow className="border-zinc-800 hover:bg-transparent">
                              <TableHead className="text-zinc-400">{t('admin.user')}</TableHead><TableHead className="text-zinc-400">{t('admin.amount')}</TableHead>
                              <TableHead className="text-zinc-400">{t('admin.method')}</TableHead><TableHead className="text-zinc-400">{t('withdrawal.destination')}</TableHead>
                              <TableHead className="text-zinc-400">{t('admin.status')}</TableHead><TableHead className="text-zinc-400">{t('admin.date')}</TableHead>
                              <TableHead className="text-zinc-400">{t('admin.action')}</TableHead>
                            </TableRow></TableHeader>
                            <TableBody>
                              {adminWithdrawals.map(wd => (
                                <TableRow key={wd.id} className="border-zinc-800">
                                  <TableCell>
                                    <div className="font-medium">{wd.user?.name || '-'}</div>
                                    <div className="text-xs text-zinc-500">{wd.user?.email}</div>
                                  </TableCell>
                                  <TableCell>
                                    <div className="font-medium">${fmtUSDT(wd.amount)}</div>
                                    {wd.method === 'pix' && wd.brlAmount && <div className="text-xs text-green-400">R$ {fmtBRL(d(wd.brlAmount))}</div>}
                                  </TableCell>
                                  <TableCell>{methodBadge(wd.method)}</TableCell>
                                  <TableCell className="text-sm text-zinc-400 max-w-[120px] truncate">{wd.destination || wd.user?.walletAddress || wd.user?.pixKey || '-'}</TableCell>
                                  <TableCell><Badge className={statusColor(wd.status)} variant="outline">{statusLabel(wd.status)}</Badge></TableCell>
                                  <TableCell>
                                    <div className="text-sm">{relativeTime(wd.createdAt)}</div>
                                    <div className="text-xs text-zinc-500">{fmtDateTime(wd.createdAt)}</div>
                                  </TableCell>
                                  <TableCell>
                                    {wd.status === 'pending' && (
                                      <div className="flex flex-col sm:flex-row gap-1">
                                        <Button size="sm" className="h-9 text-xs bg-emerald-600 hover:bg-cyan-700" onClick={() => handleAdminWithdrawalAction(wd.id, 'approve')}>{t('admin.approve')}</Button>
                                        <Button size="sm" variant="destructive" className="h-9 text-xs" onClick={() => handleAdminWithdrawalAction(wd.id, 'reject')}>{t('admin.reject')}</Button>
                                      </div>
                                    )}
                                    {wd.status === 'confirmed' && (
                                      <Button size="sm" className="h-9 text-xs bg-blue-600 hover:bg-blue-700" onClick={() => handleAdminWithdrawalAction(wd.id, 'complete')}>{t('admin.complete')}</Button>
                                    )}
                                    {wd.adminNotes && <div className="text-xs text-zinc-500 mt-1 max-w-[120px] truncate" title={wd.adminNotes}>📝 {wd.adminNotes}</div>}
                                  </TableCell>
                                </TableRow>
                              ))}
                              {adminWithdrawals.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-zinc-500 py-8">{t('admin.withdrawals')}</TableCell></TableRow>}
                            </TableBody>
                          </Table>
                        </CardContent>
                      </Card>
                    )}

                    {/* Admin NowPayments */}
                    {adminTab === 'nowpayments' && (
                      <div className="space-y-6">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-bold">{t('nowpayments.title')}</h3>
                          <Button variant="ghost" size="sm" onClick={fetchAdminNpData} disabled={adminNpLoading}>
                            <RefreshCw className={`h-4 w-4 ${adminNpLoading ? 'animate-spin' : ''}`} />
                          </Button>
                        </div>

                        {/* Connection Status & Test */}
                        <Card className="bg-zinc-900 border-zinc-800">
                          <CardHeader className="pb-3">
                            <CardTitle className="text-sm">{t('nowpayments.credentialsEnv')}</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                              <div className="flex items-center gap-1.5">
                                <div className={`w-2 h-2 rounded-full ${npEnvStatus?.hasApiKey ? 'bg-emerald-400' : 'bg-zinc-600'}`} />
                                <span className={npEnvStatus?.hasApiKey ? 'text-emerald-400' : 'text-zinc-400'}>API Key</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <div className={`w-2 h-2 rounded-full ${npEnvStatus?.hasEmail ? 'bg-emerald-400' : 'bg-zinc-600'}`} />
                                <span className={npEnvStatus?.hasEmail ? 'text-emerald-400' : 'text-zinc-400'}>E-mail</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <div className={`w-2 h-2 rounded-full ${npEnvStatus?.hasPassword ? 'bg-emerald-400' : 'bg-zinc-600'}`} />
                                <span className={npEnvStatus?.hasPassword ? 'text-emerald-400' : 'text-zinc-400'}>Senha</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <div className={`w-2 h-2 rounded-full ${npEnvStatus?.hasIpnSecret ? 'bg-emerald-400' : 'bg-zinc-600'}`} />
                                <span className={npEnvStatus?.hasIpnSecret ? 'text-emerald-400' : 'text-zinc-400'}>IPN Secret</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <div className={`w-2 h-2 rounded-full ${npEnvStatus?.has2FA ? 'bg-emerald-400' : 'bg-zinc-600'}`} />
                                <span className={npEnvStatus?.has2FA ? 'text-emerald-400' : 'text-zinc-400'}>2FA TOTP</span>
                              </div>
                            </div>
                            <p className="text-zinc-500 text-xs">
                              {npEnvStatus?.configured
                                ? t('nowpayments.configured')
                                : t('nowpayments.notConfigured')}
                            </p>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                className="bg-emerald-600 hover:bg-cyan-700"
                                onClick={testNpConnection}
                                disabled={npTestingConnection}
                              >
                                {npTestingConnection && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {t('nowpayments.testConnection')}
                              </Button>
                            </div>
                            {npConnectionTest && (
                              <div className={`p-3 rounded-lg text-sm ${npConnectionTest.connected ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border border-red-500/20 text-red-400'}`}>
                                <div className="flex items-center gap-2 font-medium">
                                  {npConnectionTest.connected ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                                  {npConnectionTest.connected ? t('nowpayments.connectionOk') : t('nowpayments.connectionFailed')}
                                </div>
                                {npConnectionTest.error && <p className="text-xs mt-1 opacity-80">{npConnectionTest.error}</p>}
                                {npConnectionTest.authWorks && <p className="text-xs mt-1">✓ Auth OK</p>}
                                {npConnectionTest.apiKeyWorks && <p className="text-xs">✓ API Key OK</p>}
                                {npConnectionTest.subPartnerWorks && <p className="text-xs">✓ Sub-Partner OK</p>}
                                {npConnectionTest.merchantCoinsWorks && <p className="text-xs">✓ Merchant Coins OK</p>}
                                {npConnectionTest.connected && !npConnectionTest.merchantCoinsWorks && <p className="text-xs text-amber-400">⚠ Merchant Coins falhou — verifique moedas no painel NowPayments</p>}
                              </div>
                            )}
                          </CardContent>
                        </Card>

                        {/* Stats Cards */}
                        {adminNpStats && (
                          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                            <Card className="bg-zinc-900 border-zinc-800">
                              <CardContent className="p-4">
                                <p className="text-zinc-400 text-xs">{t('nowpayments.totalDeposited')}</p>
                                <p className="text-cyan-400 font-bold text-lg">${(adminNpStats.totalDeposited || 0).toFixed(2)}</p>
                              </CardContent>
                            </Card>
                            <Card className="bg-zinc-900 border-zinc-800">
                              <CardContent className="p-4">
                                <p className="text-zinc-400 text-xs">{t('nowpayments.totalPaidOut')}</p>
                                <p className="text-red-400 font-bold text-lg">${(adminNpStats.totalPaidOut || 0).toFixed(2)}</p>
                              </CardContent>
                            </Card>
                            <Card className="bg-zinc-900 border-zinc-800">
                              <CardContent className="p-4">
                                <p className="text-zinc-400 text-xs">{t('nowpayments.splitReceived')}</p>
                                <p className="text-purple-400 font-bold text-lg">${(adminNpStats.totalSplitReceived || 0).toFixed(2)}</p>
                              </CardContent>
                            </Card>
                            <Card className="bg-zinc-900 border-zinc-800">
                              <CardContent className="p-4">
                                <p className="text-zinc-400 text-xs">{t('nowpayments.pendingItems')}</p>
                                <p className="text-amber-400 font-bold text-lg">{adminNpStats.pendingDepositCount || 0} deps / {adminNpStats.pendingPayoutCount || 0} payouts</p>
                              </CardContent>
                            </Card>
                          </div>
                        )}

                        {/* Section Tabs */}
                        <div className="flex gap-2 flex-wrap">
                          {['deposits', 'payouts', 'split', 'wallets', 'webhooks'].map(section => (
                            <Button key={section} variant={adminNpSection === section ? 'default' : 'outline'} size="sm"
                              className={adminNpSection === section ? 'bg-emerald-600 hover:bg-cyan-700' : 'border-zinc-700'}
                              onClick={() => setAdminNpSection(section)}>
                              {section === 'deposits' ? t('admin.deposits') :
                               section === 'payouts' ? t('admin.withdrawals') :
                               section === 'split' ? 'Sócios & Split' :
                               section === 'wallets' ? t('admin.walletAddress') : 'Webhooks'}
                            </Button>
                          ))}
                        </div>

                        {/* Deposits Section */}
                        {adminNpSection === 'deposits' && (
                          <Card className="bg-zinc-900 border-zinc-800">
                            <CardHeader className="pb-3">
                              <CardTitle className="text-base">Depósitos NowPayments ({adminNpDeposits.length})</CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                              {adminNpDeposits.length === 0 ? (
                                <div className="text-center py-8 text-zinc-500">Nenhum depósito via NowPayments</div>
                              ) : (
                                <div className="overflow-x-auto">
                                  <Table>
                                    <TableHeader>
                                      <TableRow className="border-zinc-800">
                                        <TableHead className="text-zinc-400">Usuário</TableHead>
                                        <TableHead className="text-zinc-400">Valor</TableHead>
                                        <TableHead className="text-zinc-400">{t('withdrawal.currency')}</TableHead>
                                        <TableHead className="text-zinc-400">Status</TableHead>
                                        <TableHead className="text-zinc-400">Endereço</TableHead>
                                        <TableHead className="text-zinc-400">Split</TableHead>
                                        <TableHead className="text-zinc-400">Data</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {adminNpDeposits.map((dep: any) => (
                                        <TableRow key={dep.id} className="border-zinc-800">
                                          <TableCell className="text-xs">
                                            <div className="font-medium">{dep.user?.name || 'N/A'}</div>
                                            <div className="text-zinc-500">{dep.user?.email}</div>
                                          </TableCell>
                                          <TableCell className="text-xs text-cyan-400 font-semibold">${fmtUSDT(dep.priceAmount)}</TableCell>
                                          <TableCell className="text-xs">{dep.payCurrency?.toUpperCase()}</TableCell>
                                          <TableCell>
                                            <Badge className={`text-[10px] px-1.5 py-0 ${
                                              dep.paymentStatus === 'finished' || dep.paymentStatus === 'confirmed' ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' :
                                              dep.paymentStatus === 'waiting' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
                                              dep.paymentStatus === 'expired' || dep.paymentStatus === 'failed' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                                              'bg-blue-500/20 text-blue-400 border-blue-500/30'
                                            }`} variant="outline">{dep.paymentStatus}</Badge>
                                          </TableCell>
                                          <TableCell className="text-xs font-mono max-w-[120px] truncate">{dep.payAddress || '-'}</TableCell>
                                          <TableCell className="text-xs">
                                            {dep.splitProcessed ? (
                                              <span className="text-purple-400">{dep.splitTotalPct}% (${fmtUSDT(dep.splitTotalAmount)})</span>
                                            ) : (
                                              <span className="text-zinc-500">-</span>
                                            )}
                                          </TableCell>
                                          <TableCell className="text-xs text-zinc-400">{fmtDateTime(dep.createdAt)}</TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        )}

                        {/* Payouts Section */}
                        {adminNpSection === 'payouts' && (
                          <Card className="bg-zinc-900 border-zinc-800">
                            <CardHeader className="pb-3">
                              <CardTitle className="text-base">Pagamentos NowPayments ({adminNpPayouts.length})</CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                              {adminNpPayouts.length === 0 ? (
                                <div className="text-center py-8 text-zinc-500">Nenhum pagamento via NowPayments</div>
                              ) : (
                                <div className="overflow-x-auto">
                                  <Table>
                                    <TableHeader>
                                      <TableRow className="border-zinc-800">
                                        <TableHead className="text-zinc-400">Usuário</TableHead>
                                        <TableHead className="text-zinc-400">Valor</TableHead>
                                        <TableHead className="text-zinc-400">{t('withdrawal.currency')}</TableHead>
                                        <TableHead className="text-zinc-400">Status</TableHead>
                                        <TableHead className="text-zinc-400">Destino</TableHead>
                                        <TableHead className="text-zinc-400">TX Hash</TableHead>
                                        <TableHead className="text-zinc-400">Data</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {adminNpPayouts.map((pay: any) => (
                                        <TableRow key={pay.id} className="border-zinc-800">
                                          <TableCell className="text-xs">
                                            <div className="font-medium">{pay.user?.name || 'N/A'}</div>
                                            <div className="text-zinc-500">{pay.user?.email}</div>
                                          </TableCell>
                                          <TableCell className="text-xs text-red-400 font-semibold">${fmtUSDT(pay.amount)}</TableCell>
                                          <TableCell className="text-xs">{pay.currency?.toUpperCase()}</TableCell>
                                          <TableCell>
                                            <Badge className={`text-[10px] px-1.5 py-0 ${
                                              pay.payoutStatus === 'FINISHED' ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' :
                                              pay.payoutStatus === 'FAILED' || pay.payoutStatus === 'REJECTED' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                                              'bg-blue-500/20 text-blue-400 border-blue-500/30'
                                            }`} variant="outline">{pay.payoutStatus}</Badge>
                                          </TableCell>
                                          <TableCell className="text-xs font-mono max-w-[120px] truncate">{pay.destinationAddress}</TableCell>
                                          <TableCell className="text-xs font-mono max-w-[120px] truncate">{pay.txHash || '-'}</TableCell>
                                          <TableCell className="text-xs text-zinc-400">{fmtDateTime(pay.createdAt)}</TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        )}

                        {/* Split Section — Sócios & Split */}
                        {adminNpSection === 'split' && (
                          <div className="space-y-4">
                            {/* Summary Cards */}
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                              <Card className="bg-zinc-900 border-zinc-800">
                                <CardContent className="p-4">
                                  <p className="text-zinc-400 text-xs">Sócios Ativos</p>
                                  <p className="text-white font-bold text-lg">{splitSummary?.activeCount || 0}</p>
                                </CardContent>
                              </Card>
                              <Card className="bg-zinc-900 border-zinc-800">
                                <CardContent className="p-4">
                                  <p className="text-zinc-400 text-xs">% Total Alocado</p>
                                  <p className={`font-bold text-lg ${(splitSummary?.totalPctAllocated || 0) > 100 ? 'text-red-400' : 'text-emerald-400'}`}>
                                    {splitSummary?.totalPctAllocated?.toFixed(1) || 0}%
                                    {(splitSummary?.totalPctAllocated || 0) > 100 && <span className="text-xs ml-1">⚠️</span>}
                                  </p>
                                </CardContent>
                              </Card>
                              <Card className="bg-zinc-900 border-zinc-800">
                                <CardContent className="p-4">
                                  <p className="text-zinc-400 text-xs">Total Acumulado</p>
                                  <p className="text-amber-400 font-bold text-lg">${(splitSummary?.totalAccumulated || 0).toFixed(2)}</p>
                                </CardContent>
                              </Card>
                              <Card className="bg-zinc-900 border-zinc-800">
                                <CardContent className="p-4">
                                  <p className="text-zinc-400 text-xs">Total Já Enviado</p>
                                  <p className="text-purple-400 font-bold text-lg">${(splitSummary?.totalSent || 0).toFixed(2)}</p>
                                </CardContent>
                              </Card>
                            </div>

                            {/* Info Banner */}
                            <div className="p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-xs text-cyan-300">
                              💡 O investidor SEMPRE recebe 100% do valor no saldo interno. O split sai da conta custódia do NowPayments, não do saldo do usuário.
                            </div>

                            {/* Add New Recipient */}
                            <Card className="bg-zinc-900 border-zinc-800">
                              <CardHeader className="pb-3">
                                <div className="flex items-center justify-between">
                                  <CardTitle className="text-base">Adicionar Sócio</CardTitle>
                                  <Button size="sm" className="bg-emerald-600 hover:bg-cyan-700" onClick={async () => {
                                    if (!splitNewRecipient.name || !splitNewRecipient.walletAddress || !splitNewRecipient.percentage) {
                                      toast.error('Preencha nome, carteira e percentual');
                                      return;
                                    }
                                    try {
                                      await api('/api/admin/split-recipients', {
                                        method: 'POST',
                                        body: JSON.stringify(splitNewRecipient),
                                      });
                                      setSplitNewRecipient({ name: '', role: 'partner', walletAddress: '', currency: 'usdttrc20', percentage: '', minPayout: '50', autoPayout: true });
                                      fetchSplitData();
                                      toast.success('Sócio adicionado com sucesso!');
                                    } catch (e: any) {
                                      toast.error(e.message || 'Erro ao adicionar sócio');
                                    }
                                  }}>+ Adicionar</Button>
                                </div>
                              </CardHeader>
                              <CardContent>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                                  <input className="bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-sm text-white placeholder-zinc-500" placeholder="Nome" value={splitNewRecipient.name} onChange={e => setSplitNewRecipient({ ...splitNewRecipient, name: e.target.value })} />
                                  <input className="bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-sm text-white placeholder-zinc-500 font-mono" placeholder="Carteira (endereço)" value={splitNewRecipient.walletAddress} onChange={e => setSplitNewRecipient({ ...splitNewRecipient, walletAddress: e.target.value })} />
                                  <input className="bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-sm text-white placeholder-zinc-500" placeholder="Percentual %" type="number" step="0.1" value={splitNewRecipient.percentage} onChange={e => setSplitNewRecipient({ ...splitNewRecipient, percentage: e.target.value })} />
                                  <select className="bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-sm text-white" value={splitNewRecipient.role} onChange={e => setSplitNewRecipient({ ...splitNewRecipient, role: e.target.value })}>
                                    <option value="partner">Sócio</option>
                                    <option value="marketing">Marketing</option>
                                    <option value="operations">Operações</option>
                                    <option value="reserve">Reserva</option>
                                  </select>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
                                  <input className="bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-sm text-white placeholder-zinc-500" placeholder="Mín. Payout USDT" type="number" value={splitNewRecipient.minPayout} onChange={e => setSplitNewRecipient({ ...splitNewRecipient, minPayout: e.target.value })} />
                                  <select className="bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-sm text-white" value={splitNewRecipient.currency} onChange={e => setSplitNewRecipient({ ...splitNewRecipient, currency: e.target.value })}>
                                    <option value="usdttrc20">USDT TRC20</option>
                                    <option value="usdtmatic">USDT Polygon</option>
                                    <option value="btc">BTC</option>
                                    <option value="eth">ETH</option>
                                  </select>
                                  <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer">
                                    <input type="checkbox" checked={splitNewRecipient.autoPayout} onChange={e => setSplitNewRecipient({ ...splitNewRecipient, autoPayout: e.target.checked })} className="rounded" />
                                    Auto-payout ao atingir mínimo
                                  </label>
                                </div>
                              </CardContent>
                            </Card>

                            {/* Recipients Table */}
                            <Card className="bg-zinc-900 border-zinc-800">
                              <CardHeader className="pb-3">
                                <div className="flex items-center justify-between">
                                  <CardTitle className="text-base">Sócios ({splitRecipients.length})</CardTitle>
                                  <Button variant="ghost" size="sm" onClick={fetchSplitData} disabled={splitLoading}>
                                    <RefreshCw className={`h-4 w-4 ${splitLoading ? 'animate-spin' : ''}`} />
                                  </Button>
                                </div>
                              </CardHeader>
                              <CardContent className="p-0">
                                {splitLoading && splitRecipients.length === 0 ? (
                                  <div className="text-center py-8">
                                    <div className="animate-spin h-8 w-8 border-2 border-emerald-500 border-t-transparent rounded-full mx-auto"></div>
                                    <p className="text-zinc-500 mt-2">Carregando sócios...</p>
                                  </div>
                                ) : splitRecipients.length === 0 ? (
                                  <div className="text-center py-8 text-zinc-500">Nenhum sócio configurado. Adicione o primeiro acima.</div>
                                ) : (
                                  <div className="overflow-x-auto">
                                    <Table>
                                      <TableHeader>
                                        <TableRow className="border-zinc-800">
                                          <TableHead className="text-zinc-400">Nome / Função</TableHead>
                                          <TableHead className="text-zinc-400">Carteira</TableHead>
                                          <TableHead className="text-zinc-400">%</TableHead>
                                          <TableHead className="text-zinc-400">Acumulado</TableHead>
                                          <TableHead className="text-zinc-400">Mín. Payout</TableHead>
                                          <TableHead className="text-zinc-400">Total Enviado</TableHead>
                                          <TableHead className="text-zinc-400">Status</TableHead>
                                          <TableHead className="text-zinc-400">Ações</TableHead>
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {splitRecipients.map((r: any) => (
                                          <TableRow key={r.id} className={`border-zinc-800 ${!r.isActive ? 'opacity-50' : ''}`}>
                                            <TableCell>
                                              <div className="font-medium text-white">{r.name}</div>
                                              <div className="text-xs text-zinc-500 capitalize">{r.role === 'partner' ? 'Sócio' : r.role === 'marketing' ? 'Marketing' : r.role === 'operations' ? 'Operações' : 'Reserva'}</div>
                                            </TableCell>
                                            <TableCell className="text-xs font-mono max-w-[120px] truncate" title={r.walletAddress}>{r.walletAddress}</TableCell>
                                            <TableCell className="text-sm font-semibold text-emerald-400">{r.percentage}%</TableCell>
                                            <TableCell className="text-sm text-amber-400 font-semibold">${fmtUSDT(r.accumulatedBalance)}</TableCell>
                                            <TableCell className="text-xs text-zinc-400">${fmtUSDT(r.minPayout)}</TableCell>
                                            <TableCell className="text-sm text-purple-400">${fmtUSDT(r.totalSent)}</TableCell>
                                            <TableCell>
                                              <Badge className={`text-[10px] px-1.5 py-0 ${r.isActive ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-red-500/20 text-red-400 border-red-500/30'}`} variant="outline">
                                                {r.isActive ? 'Ativo' : 'Inativo'}
                                              </Badge>
                                              {r.autoPayout && <span className="text-[9px] text-cyan-400 ml-1">🔄</span>}
                                            </TableCell>
                                            <TableCell>
                                              <div className="flex gap-1">
                                                <Button size="sm" variant="ghost" className="h-7 text-xs text-blue-400 hover:text-blue-300" onClick={() => { setSplitEditRecipient(r); setSplitEditDialog(true); }}>✏️</Button>
                                                <Button size="sm" variant="ghost" className="h-7 text-xs text-emerald-400 hover:text-emerald-300" disabled={d(r.accumulatedBalance) <= 0} onClick={async () => {
                                                  setSplitPayoutLoading(true);
                                                  try {
                                                    const res = await api('/api/admin/split-payout', { method: 'POST', body: JSON.stringify({ recipientId: r.id, force: true }) });
                                                    fetchSplitData();
                                                    toast.success(`Payout forçado: $${res.summary?.totalPaid?.toFixed(2) || '0'}`);
                                                  } catch (e: any) {
                                                    toast.error(e.message || 'Erro no payout');
                                                  } finally {
                                                    setSplitPayoutLoading(false);
                                                  }
                                                }}>💸</Button>
                                                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={async () => {
                                                  try {
                                                    await api('/api/admin/split-recipients', { method: 'PUT', body: JSON.stringify({ id: r.id, isActive: !r.isActive }) });
                                                    fetchSplitData();
                                                    toast.success(r.isActive ? 'Sócio desativado' : 'Sócio reativado');
                                                  } catch (e: any) {
                                                    toast.error(e.message || 'Erro');
                                                  }
                                                }}>{r.isActive ? '❌' : '✅'}</Button>
                                              </div>
                                            </TableCell>
                                          </TableRow>
                                        ))}
                                      </TableBody>
                                    </Table>
                                  </div>
                                )}
                              </CardContent>
                            </Card>

                            {/* Recent Split Logs */}
                            {splitLogs.length > 0 && (
                              <Card className="bg-zinc-900 border-zinc-800">
                                <CardHeader className="pb-3">
                                  <CardTitle className="text-base">Histórico Recente</CardTitle>
                                </CardHeader>
                                <CardContent className="p-0">
                                  <div className="max-h-64 overflow-y-auto">
                                    <Table>
                                      <TableHeader>
                                        <TableRow className="border-zinc-800">
                                          <TableHead className="text-zinc-400">Sócio</TableHead>
                                          <TableHead className="text-zinc-400">Valor</TableHead>
                                          <TableHead className="text-zinc-400">%</TableHead>
                                          <TableHead className="text-zinc-400">Status</TableHead>
                                          <TableHead className="text-zinc-400">Data</TableHead>
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {splitLogs.map((log: any) => (
                                          <TableRow key={log.id} className="border-zinc-800">
                                            <TableCell className="text-xs text-white">{log.recipient?.name || '-'}</TableCell>
                                            <TableCell className="text-xs text-cyan-400">${fmtUSDT(log.amount)}</TableCell>
                                            <TableCell className="text-xs text-emerald-400">{log.percentage}%</TableCell>
                                            <TableCell>
                                              <Badge className={`text-[10px] px-1.5 py-0 ${
                                                log.status === 'paid' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
                                                log.status === 'accumulated' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
                                                'bg-red-500/20 text-red-400 border-red-500/30'
                                              }`} variant="outline">
                                                {log.status === 'paid' ? 'Pago' : log.status === 'accumulated' ? 'Acumulado' : 'Falhou'}
                                              </Badge>
                                            </TableCell>
                                            <TableCell className="text-xs text-zinc-500">{fmtDateTime(log.createdAt)}</TableCell>
                                          </TableRow>
                                        ))}
                                      </TableBody>
                                    </Table>
                                  </div>
                                </CardContent>
                              </Card>
                            )}

                            {/* Process Auto-Payouts Button */}
                            <div className="flex justify-end">
                              <Button className="bg-purple-600 hover:bg-purple-700" disabled={splitPayoutLoading} onClick={async () => {
                                setSplitPayoutLoading(true);
                                try {
                                  const res = await api('/api/admin/split-payout', { method: 'POST', body: JSON.stringify({}) });
                                  fetchSplitData();
                                  toast.success(`${res.summary?.processed || 0} payout(s) processado(s) — $${res.summary?.totalPaid?.toFixed(2) || '0'}`);
                                } catch (e: any) {
                                  toast.error(e.message || 'Erro');
                                } finally {
                                  setSplitPayoutLoading(false);
                                }
                              }}>
                                💸 Processar Auto-Payouts
                              </Button>
                            </div>
                          </div>
                        )}

                        {/* Wallets Section */}
                        {adminNpSection === 'wallets' && (
                          <Card className="bg-zinc-900 border-zinc-800">
                            <CardHeader className="pb-3">
                              <CardTitle className="text-base">Carteiras Sub-Contas ({adminNpWallets.length})</CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                              {adminNpWallets.length === 0 ? (
                                <div className="text-center py-8 text-zinc-500">Nenhuma sub-conta cadastrada</div>
                              ) : (
                                <div className="overflow-x-auto">
                                  <Table>
                                    <TableHeader>
                                      <TableRow className="border-zinc-800">
                                        <TableHead className="text-zinc-400">Usuário</TableHead>
                                        <TableHead className="text-zinc-400">NP User ID</TableHead>
                                        <TableHead className="text-zinc-400">BTC</TableHead>
                                        <TableHead className="text-zinc-400">USDT TRC20</TableHead>
                                        <TableHead className="text-zinc-400">USDT Polygon</TableHead>
                                        <TableHead className="text-zinc-400">Saldo</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {adminNpWallets.map((w: any) => (
                                        <TableRow key={w.id} className="border-zinc-800">
                                          <TableCell className="text-xs">
                                            <div className="font-medium">{w.user?.name || 'N/A'}</div>
                                            <div className="text-zinc-500">{w.user?.email}</div>
                                          </TableCell>
                                          <TableCell className="text-xs font-mono">{w.nowpaymentsUserId}</TableCell>
                                          <TableCell className="text-xs font-mono max-w-[100px] truncate">{w.depositAddressBtc || '-'}</TableCell>
                                          <TableCell className="text-xs font-mono max-w-[100px] truncate">{w.depositAddressUsdt || '-'}</TableCell>
                                          <TableCell className="text-xs font-mono max-w-[100px] truncate">{w.depositAddressUsdtPolygon || '-'}</TableCell>
                                          <TableCell className="text-xs">
                                            <span className="text-cyan-400">${fmtUSDT(w.user?.balance || '0')}</span>
                                            <span className="text-zinc-500 ml-1">invest: ${fmtUSDT(w.user?.totalInvested || '0')}</span>
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        )}

                        {/* Webhooks Section */}
                        {adminNpSection === 'webhooks' && (
                          <Card className="bg-zinc-900 border-zinc-800">
                            <CardHeader className="pb-3">
                              <CardTitle className="text-base">Webhook Logs ({adminNpWebhooks.length})</CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                              {adminNpWebhooks.length === 0 ? (
                                <div className="text-center py-8 text-zinc-500">Nenhum webhook recebido</div>
                              ) : (
                                <div className="divide-y divide-zinc-800 max-h-[500px] overflow-y-auto">
                                  {adminNpWebhooks.map((wh: any) => (
                                    <div key={wh.id} className="p-3 sm:p-4">
                                      <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-2">
                                          <Badge className={`text-[10px] px-1.5 py-0 ${
                                            wh.processed ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' :
                                            'bg-amber-500/20 text-amber-400 border-amber-500/30'
                                          }`} variant="outline">
                                            {wh.processed ? 'Processado' : 'Pendente'}
                                          </Badge>
                                          <Badge className="text-[10px] px-1.5 py-0 bg-zinc-700 text-zinc-300" variant="outline">
                                            {wh.eventType}
                                          </Badge>
                                          {wh.signatureValid !== null && (
                                            <Badge className={`text-[10px] px-1.5 py-0 ${
                                              wh.signatureValid ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' :
                                              'bg-red-500/20 text-red-400 border-red-500/30'
                                            }`} variant="outline">
                                              {wh.signatureValid ? 'Assinatura OK' : 'Assinatura Inválida'}
                                            </Badge>
                                          )}
                                        </div>
                                        <span className="text-xs text-zinc-500">{fmtDateTime(wh.createdAt)}</span>
                                      </div>
                                      {wh.paymentId && (
                                        <div className="text-xs text-zinc-400 mt-1">Payment ID: {wh.paymentId}</div>
                                      )}
                                      {wh.processingError && (
                                        <div className="text-xs text-red-400 mt-1">Erro: {wh.processingError}</div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        )}
                      </div>
                    )}

                    {/* Admin Affiliates */}
                    {adminTab === 'affiliates' && (
                      <div className="space-y-6">
                        {adminAffiliates && (
                          <div className="grid sm:grid-cols-3 gap-4">
                            <Card className="bg-zinc-900 border-zinc-800"><CardContent className="p-5"><div className="text-sm text-zinc-400">{t('affiliates.commissionByLevel')}</div><div className="text-2xl font-bold">${fmtUSDT(adminAffiliates.totalCommissionAmount)}</div></CardContent></Card>
                            <Card className="bg-zinc-900 border-zinc-800"><CardContent className="p-5"><div className="text-sm text-zinc-400">{t('status.paid')}</div><div className="text-2xl font-bold text-cyan-400">${fmtUSDT(adminAffiliates.totalPaidAmount)}</div></CardContent></Card>
                            <Card className="bg-zinc-900 border-zinc-800"><CardContent className="p-5"><div className="text-sm text-zinc-400">{t('status.pending')}</div><div className="text-2xl font-bold text-amber-400">${fmtUSDT(adminAffiliates.totalPendingAmount)}</div></CardContent></Card>
                          </div>
                        )}
                        {/* Commission Mode Selector */}
                        {(() => {
                          const modeConfig = adminConfigs.find(c => c.key === 'affiliate_commission_mode');
                          const marginConfig = adminConfigs.find(c => c.key === 'affiliate_system_margin_pct');
                          const poolConfig = adminConfigs.find(c => c.key === 'affiliate_pool_revenue_pct');
                          const currentMode = configEdits['affiliate_commission_mode'] ?? modeConfig?.value ?? 'system_margin';
                          return (
                        <Card className="bg-zinc-900 border-zinc-800">
                          <CardHeader>
                            <div className="flex items-center justify-between">
                              <CardTitle className="text-lg flex items-center gap-2"><Settings className="h-5 w-5 text-cyan-400" /> {t('admin.affiliateCommissionMode')}</CardTitle>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-zinc-400 hover:text-cyan-400 hover:bg-cyan-500/10">
                                    <Info className="h-4 w-4" />
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[520px] bg-zinc-800 border-zinc-700 p-0 z-50" side="left" align="end">
                                  <div className="p-4">
                                    <h4 className="font-semibold text-sm text-cyan-400 mb-3 flex items-center gap-2">
                                      <Activity className="h-4 w-4" />
                                      De onde sai o dinheiro para pagar afiliados?
                                    </h4>
                                    <div className="space-y-3">
                                      <div className={`rounded-lg p-3 border ${currentMode === 'system_margin' ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-zinc-700 bg-zinc-900'}`}>
                                        <div className="flex items-center gap-2 mb-1.5">
                                          <span className="font-semibold text-sm">✅ Margem do Sistema</span>
                                          {currentMode === 'system_margin' && <Badge className="text-[9px] bg-emerald-500/10 text-emerald-400" variant="outline">Ativo</Badge>}
                                        </div>
                                        <div className="text-xs text-zinc-300 space-y-1">
                                          <p><span className="text-zinc-400 font-medium">De onde vem:</span> Do lucro que o sistema retém</p>
                                          <p><span className="text-zinc-400 font-medium">Exemplo:</span> Investimento de $100 → margem de 30% = $30 → afiliado N1 ganha 10% de $30 = <span className="text-emerald-400 font-semibold">$3</span></p>
                                          <p><span className="text-zinc-400 font-medium">Sustentabilidade:</span> <span className="text-emerald-400">Mais seguro</span> — o dinheiro sai do lucro do sistema, não dos ganhos dos usuários</p>
                                        </div>
                                      </div>
                                      <div className={`rounded-lg p-3 border ${currentMode === 'investment_profit' ? 'border-amber-500/50 bg-amber-500/5' : 'border-zinc-700 bg-zinc-900'}`}>
                                        <div className="flex items-center gap-2 mb-1.5">
                                          <span className="font-semibold text-sm">⚠️ Lucro de Investimento</span>
                                          {currentMode === 'investment_profit' && <Badge className="text-[9px] bg-amber-500/10 text-amber-400" variant="outline">Ativo</Badge>}
                                        </div>
                                        <div className="text-xs text-zinc-300 space-y-1">
                                          <p><span className="text-zinc-400 font-medium">De onde vem:</span> Dos ganhos de ROI do referido</p>
                                          <p><span className="text-zinc-400 font-medium">Exemplo:</span> Referido ganha $10 de ROI → afiliado N1 ganha 10% = <span className="text-amber-400 font-semibold">$1</span> + bônus de 2% no investimento</p>
                                          <p><span className="text-zinc-400 font-medium">Sustentabilidade:</span> <span className="text-amber-400">Mais arriscado</span> — aumenta o custo do sistema, paga dos ganhos de trading</p>
                                        </div>
                                      </div>
                                      <div className={`rounded-lg p-3 border ${currentMode === 'revenue_pool' ? 'border-cyan-500/50 bg-cyan-500/5' : 'border-zinc-700 bg-zinc-900'}`}>
                                        <div className="flex items-center gap-2 mb-1.5">
                                          <span className="font-semibold text-sm">✅ Pool de Receita</span>
                                          {currentMode === 'revenue_pool' && <Badge className="text-[9px] bg-cyan-500/10 text-cyan-400" variant="outline">Ativo</Badge>}
                                        </div>
                                        <div className="text-xs text-zinc-300 space-y-1">
                                          <p><span className="text-zinc-400 font-medium">De onde vem:</span> Da receita total de investimentos</p>
                                          <p><span className="text-zinc-400 font-medium">Exemplo:</span> 5% de toda receita → pool dividido por nível. Investimento de $100 → $5 pro pool → N1 ganha 10% de $5 = <span className="text-cyan-400 font-semibold">$0.50</span></p>
                                          <p><span className="text-zinc-400 font-medium">Sustentabilidade:</span> <span className="text-cyan-400">Previsível</span> — nunca excede X% da receita total</p>
                                        </div>
                                      </div>
                                    </div>
                                    <div className="mt-3 pt-3 border-t border-zinc-700">
                                      <p className="text-[10px] text-zinc-500">💡 Recomendação: Use <span className="text-emerald-400">Margem do Sistema</span> para máxima sustentabilidade. O sistema sempre retém 15% de reserva mínima.</p>
                                    </div>
                                  </div>
                                </PopoverContent>
                              </Popover>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-4">
                              <>
                                    <div>
                                      <Label className="text-zinc-400 mb-2 block">{t('admin.affiliateCommissionMode')}</Label>
                                      <Select value={currentMode} onValueChange={(val) => setConfigEdits(prev => ({ ...prev, affiliate_commission_mode: val }))}>
                                        <SelectTrigger className="bg-zinc-800 border-zinc-700">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="bg-zinc-800">
                                          <SelectItem value="system_margin">
                                            <div className="flex flex-col items-start">
                                              <span className="font-medium">✅ {t('admin.modeSystemMargin')}</span>
                                              <span className="text-xs text-zinc-400">Do lucro do sistema — mais sustentável</span>
                                            </div>
                                          </SelectItem>
                                          <SelectItem value="investment_profit">
                                            <div className="flex flex-col items-start">
                                              <span className="font-medium">⚠️ {t('admin.modeInvestmentProfit')}</span>
                                              <span className="text-xs text-zinc-400">Dos ganhos de ROI — mais arriscado</span>
                                            </div>
                                          </SelectItem>
                                          <SelectItem value="revenue_pool">
                                            <div className="flex flex-col items-start">
                                              <span className="font-medium">✅ {t('admin.modeRevenuePool')}</span>
                                              <span className="text-xs text-zinc-400">% fixo da receita — previsível</span>
                                            </div>
                                          </SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    {/* Mode descriptions */}
                                    <div className="bg-zinc-800/50 rounded-lg p-4 space-y-2">
                                      {currentMode === 'system_margin' && (
                                        <>
                                          <div className="flex items-start gap-2">
                                            <Activity className="h-4 w-4 text-cyan-400 mt-0.5 shrink-0" />
                                            <div className="text-sm text-zinc-300">{t('affiliates.modeDescriptionSystemMargin')}</div>
                                          </div>
                                          <div>
                                            <Label className="text-zinc-400 text-xs">{t('admin.affiliateSystemMarginPct')}</Label>
                                            <Input
                                              type="number"
                                              value={configEdits['affiliate_system_margin_pct'] ?? marginConfig?.value ?? '30'}
                                              onChange={e => setConfigEdits(prev => ({ ...prev, affiliate_system_margin_pct: e.target.value }))}
                                              className="bg-zinc-800 border-zinc-700 h-8 mt-1 w-full sm:w-32"
                                            />
                                          </div>
                                        </>
                                      )}
                                      {currentMode === 'investment_profit' && (
                                        <>
                                          <div className="flex items-start gap-2">
                                            <Bot className="h-4 w-4 text-cyan-400 mt-0.5 shrink-0" />
                                            <div className="text-sm text-zinc-300">{t('affiliates.modeDescriptionTradingProfit')}</div>
                                          </div>
                                          <div>
                                            <Label className="text-zinc-400 text-xs">Bônus de Locação (%) - comissão imediata</Label>
                                            <Input
                                              type="number"
                                              value={configEdits['affiliate_investment_bonus_pct'] ?? (adminConfigs.find(c => c.key === 'affiliate_investment_bonus_pct')?.value ?? '2')}
                                              onChange={e => setConfigEdits(prev => ({ ...prev, affiliate_investment_bonus_pct: e.target.value }))}
                                              className="bg-zinc-800 border-zinc-700 h-8 mt-1 w-full sm:w-32"
                                            />
                                            <div className="text-xs text-zinc-500 mt-1">% do valor do aluguel dado como bônus imediato ao afiliado</div>
                                          </div>
                                        </>
                                      )}
                                      {currentMode === 'revenue_pool' && (
                                        <>
                                          <div className="flex items-start gap-2">
                                            <Coins className="h-4 w-4 text-cyan-400 mt-0.5 shrink-0" />
                                            <div className="text-sm text-zinc-300">{t('affiliates.modeDescriptionRevenuePool')}</div>
                                          </div>
                                          <div>
                                            <Label className="text-zinc-400 text-xs">{t('admin.affiliatePoolRevenuePct')}</Label>
                                            <Input
                                              type="number"
                                              value={configEdits['affiliate_pool_revenue_pct'] ?? poolConfig?.value ?? '5'}
                                              onChange={e => setConfigEdits(prev => ({ ...prev, affiliate_pool_revenue_pct: e.target.value }))}
                                              className="bg-zinc-800 border-zinc-700 h-8 mt-1 w-full sm:w-32"
                                            />
                                          </div>
                                        </>
                                      )}
                                    </div>
                                    {/* Additional affiliate settings */}
                                    <div className="border-t border-zinc-700 pt-4 mt-4">
                                      <h4 className="text-sm font-medium text-zinc-300 mb-3">Limites e Taxas de Saque</h4>
                                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        <div>
                                          <Label className="text-zinc-400 text-xs">{t('admin.affiliateDailyCap')}</Label>
                                          <div className="flex items-center gap-2 mt-1">
                                            <Input
                                              type="number"
                                              value={configEdits['affiliate_daily_cap_usd'] ?? (adminConfigs.find(c => c.key === 'affiliate_daily_cap_usd')?.value ?? '0')}
                                              onChange={e => setConfigEdits(prev => ({ ...prev, affiliate_daily_cap_usd: e.target.value }))}
                                              className="bg-zinc-800 border-zinc-700 h-8"
                                            />
                                            <span className="text-xs text-zinc-500 shrink-0">USDT</span>
                                          </div>
                                          <div className="text-xs text-zinc-500 mt-1">0 = sem limite</div>
                                        </div>
                                        <div>
                                          <Label className="text-zinc-400 text-xs">{t('admin.minAffiliateWithdrawal')}</Label>
                                          <div className="flex items-center gap-2 mt-1">
                                            <Input
                                              type="number"
                                              value={configEdits['min_affiliate_withdrawal'] ?? (adminConfigs.find(c => c.key === 'min_affiliate_withdrawal')?.value ?? '10')}
                                              onChange={e => setConfigEdits(prev => ({ ...prev, min_affiliate_withdrawal: e.target.value }))}
                                              className="bg-zinc-800 border-zinc-700 h-8"
                                            />
                                            <span className="text-xs text-zinc-500 shrink-0">USDT</span>
                                          </div>
                                        </div>
                                        <div>
                                          <Label className="text-zinc-400 text-xs">{t('admin.affiliateWithdrawalFeePct')}</Label>
                                          <div className="flex items-center gap-2 mt-1">
                                            <Input
                                              type="number"
                                              value={configEdits['affiliate_withdrawal_fee_pct'] ?? (adminConfigs.find(c => c.key === 'affiliate_withdrawal_fee_pct')?.value ?? '0')}
                                              onChange={e => setConfigEdits(prev => ({ ...prev, affiliate_withdrawal_fee_pct: e.target.value }))}
                                              className="bg-zinc-800 border-zinc-700 h-8"
                                            />
                                            <span className="text-xs text-zinc-500 shrink-0">%</span>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                    {/* Save button */}
                                    <div className="flex justify-end">
                                      <Button
                                        className="bg-emerald-600 hover:bg-cyan-700"
                                        onClick={async () => {
                                          const modeVal = configEdits['affiliate_commission_mode'] ?? modeConfig?.value ?? 'investment_profit';
                                          const marginVal = configEdits['affiliate_system_margin_pct'] ?? marginConfig?.value ?? '30';
                                          const poolVal = configEdits['affiliate_pool_revenue_pct'] ?? poolConfig?.value ?? '5';
                                          const bonusVal = configEdits['affiliate_investment_bonus_pct'] ?? (adminConfigs.find(c => c.key === 'affiliate_investment_bonus_pct')?.value ?? '2');
                                          const capVal = configEdits['affiliate_daily_cap_usd'] ?? (adminConfigs.find(c => c.key === 'affiliate_daily_cap_usd')?.value ?? '0');
                                          const minWithdrawVal = configEdits['min_affiliate_withdrawal'] ?? (adminConfigs.find(c => c.key === 'min_affiliate_withdrawal')?.value ?? '10');
                                          const feeVal = configEdits['affiliate_withdrawal_fee_pct'] ?? (adminConfigs.find(c => c.key === 'affiliate_withdrawal_fee_pct')?.value ?? '0');
                                          try {
                                            const configsToSave = [
                                              { key: 'affiliate_commission_mode', value: modeVal, type: 'string', description: 'Modo de comissão: system_margin, investment_profit, revenue_pool', category: 'affiliate' },
                                              { key: 'affiliate_system_margin_pct', value: marginVal, type: 'number', description: 'Margem do sistema (%) para modo system_margin', category: 'affiliate' },
                                              { key: 'affiliate_pool_revenue_pct', value: poolVal, type: 'number', description: '% da receita para pool de afiliados (modo revenue_pool)', category: 'affiliate' },
                                              { key: 'affiliate_investment_bonus_pct', value: bonusVal, type: 'number', description: 'Bônus de investimento (%) - comissão imediata quando referido investe (modo investment_profit)', category: 'affiliate' },
                                              { key: 'affiliate_daily_cap_usd', value: capVal, type: 'number', description: 'Cap diário de comissões em USDT (0 = sem limite)', category: 'affiliate' },
                                              { key: 'min_affiliate_withdrawal', value: minWithdrawVal, type: 'number', description: 'Valor mínimo para saque de comissões em USDT', category: 'affiliate' },
                                              { key: 'affiliate_withdrawal_fee_pct', value: feeVal, type: 'number', description: 'Percentual cobrado em saques de afiliado', category: 'affiliate' },
                                            ];
                                            await api('/api/admin/config', {
                                              method: 'PUT',
                                              body: JSON.stringify({ configs: configsToSave }),
                                            });
                                            toast.success(t('toast.adminConfigSaveSuccess'));
                                            fetchAdminData();
                                          } catch (err: any) {
                                            toast.error(err.message);
                                          }
                                        }}
                                      >
                                        {t('admin.save')}
                                      </Button>
                                    </div>
                                  </>
                            </div>
                          </CardContent>
                        </Card>
                          );
                        })()}
                        {/* Affiliate Levels Management */}
                        <Card className="bg-zinc-900 border-zinc-800">
                          <CardHeader><CardTitle className="text-lg">{t('admin.affiliateLevels')}</CardTitle></CardHeader>
                          <CardContent>
                            <div className="space-y-4">
                              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(level => {
                                const existing = affiliateLevels.find(l => l.level === level);
                                return (
                                  <AffiliateLevelEditor
                                    key={level}
                                    level={level}
                                    defaultPercentage={existing?.percentage || ['10', '4', '3', '2', '1.5', '1', '0.8', '0.5', '0.4', '0.3', '0.5'][level - 1]}
                                    defaultActive={existing?.isActive ?? true}
                                    existingId={existing?.id}
                                    t={t}
                                    onSave={async (percentage, isActive) => {
                                      const items = [...affiliateLevels];
                                      const idx = items.findIndex(l => l.level === level);
                                      const newItem = { level, percentage, isActive, description: `Nível ${level}` };
                                      if (idx >= 0) items[idx] = { ...items[idx], ...newItem } as AffiliateLevel;
                                      // Just save the single level
                                      await handleAdminAffiliateLevelSave([newItem as any]);
                                    }}
                                  />
                                );
                              })}
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    )}

                    {/* Admin Affiliate Withdrawals */}
                    {adminTab === 'affiliateWithdrawals' && (
                      <div className="space-y-6">
                        <Card className="bg-zinc-900 border-zinc-800">
                          <CardHeader><CardTitle className="text-lg">{t('admin.affiliateWithdrawals')}</CardTitle></CardHeader>
                          <CardContent>
                            <div className="overflow-x-auto">
                              <Table className="min-w-[800px]">
                                <TableHeader>
                                  <TableRow className="border-zinc-800 hover:bg-zinc-800/50">
                                    <TableHead className="text-zinc-400">ID</TableHead>
                                    <TableHead className="text-zinc-400">{t('admin.user')}</TableHead>
                                    <TableHead className="text-zinc-400">{t('admin.amount')}</TableHead>
                                    <TableHead className="text-zinc-400">{t('admin.fee')}</TableHead>
                                    <TableHead className="text-zinc-400">{t('admin.netAmount')}</TableHead>
                                    <TableHead className="text-zinc-400">{t('admin.method')}</TableHead>
                                    <TableHead className="text-zinc-400">{t('admin.status')}</TableHead>
                                    <TableHead className="text-zinc-400">{t('admin.date')}</TableHead>
                                    <TableHead className="text-zinc-400">{t('admin.action')}</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {adminAffiliateWithdrawals.map((w: any) => (
                                    <TableRow key={w.id} className="border-zinc-800 hover:bg-zinc-800/50">
                                      <TableCell className="text-xs text-zinc-500 font-mono">{w.id.slice(0, 8)}</TableCell>
                                      <TableCell className="text-sm">{w.user?.name || '\u2014'}</TableCell>
                                      <TableCell className="text-sm font-medium">${fmtUSDT(w.amount)}</TableCell>
                                      <TableCell className="text-sm text-zinc-400">${fmtUSDT(w.fee)}</TableCell>
                                      <TableCell className="text-sm text-cyan-400">${fmtUSDT(w.netAmount)}</TableCell>
                                      <TableCell className="text-sm">{w.method === 'pix' ? 'PIX' : 'USDT'}</TableCell>
                                      <TableCell><Badge className={statusColor(w.status)} variant="outline">{statusLabel(w.status)}</Badge></TableCell>
                                      <TableCell className="text-xs text-zinc-500">{fmtDateTime(w.createdAt)}</TableCell>
                                      <TableCell>
                                        <div className="flex flex-col sm:flex-row gap-1">
                                          {w.status === 'pending' && (
                                            <>
                                              <Button size="sm" variant="outline" className="h-9 text-xs border-emerald-600 text-cyan-400 hover:bg-cyan-500/10" onClick={() => handleAdminAffWithdrawalAction(w.id, 'approve')}>{t('admin.approve')}</Button>
                                              <Button size="sm" variant="outline" className="h-9 text-xs border-red-600 text-red-400 hover:bg-red-500/10" onClick={() => handleAdminAffWithdrawalAction(w.id, 'reject')}>{t('admin.reject')}</Button>
                                            </>
                                          )}
                                          {w.status === 'approved' && (
                                            <>
                                              <Button size="sm" variant="outline" className="h-9 text-xs border-emerald-600 text-cyan-400 hover:bg-cyan-500/10" onClick={() => handleAdminAffWithdrawalAction(w.id, 'complete')}>{t('admin.complete')}</Button>
                                              <Button size="sm" variant="outline" className="h-9 text-xs border-red-600 text-red-400 hover:bg-red-500/10" onClick={() => handleAdminAffWithdrawalAction(w.id, 'reject')}>{t('admin.reject')}</Button>
                                            </>
                                          )}
                                          {w.status === 'completed' && <span className="text-xs text-cyan-400">\u2713</span>}
                                          {w.status === 'rejected' && <span className="text-xs text-red-400">\u2717</span>}
                                        </div>
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                  {adminAffiliateWithdrawals.length === 0 && (
                                    <TableRow><TableCell colSpan={9} className="text-center text-zinc-500 py-8">{t('common.noData')}</TableCell></TableRow>
                                  )}
                                </TableBody>
                              </Table>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    )}

                    {/* Admin Affiliate Ranks */}
                    {adminTab === 'affiliateRanks' && (
                      <div className="space-y-6">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-semibold">{t('admin.affiliateRanks')}</h3>
                          <Button className="bg-emerald-600 hover:bg-cyan-700 min-h-[44px]" onClick={() => setRankDialog({ open: true, rank: null })}><Plus className="mr-2 h-4 w-4" />{t('admin.newRank')}</Button>
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                          {adminRanks.sort((a, b) => a.sortOrder - b.sortOrder).map(rank => (
                            <Card key={rank.id} className="bg-zinc-900 border-zinc-800">
                              <CardContent className="p-4">
                                <div className="flex items-center gap-3 mb-3">
                                  <span className="text-3xl" style={{ filter: `drop-shadow(0 0 8px ${rank.color}40)` }}>{rank.icon}</span>
                                  <div>
                                    <div className="font-semibold" style={{ color: rank.color }}>{rank.name}</div>
                                    <div className="text-xs text-zinc-500">{rank.sortOrder}</div>
                                  </div>
                                </div>
                                <div className="space-y-1 text-sm">
                                  <div className="flex justify-between"><span className="text-zinc-400">{t('admin.minReferrals')}</span><span>{rank.minReferrals}</span></div>
                                  <div className="flex justify-between"><span className="text-zinc-400">{t('admin.minEarnings')}</span><span>${fmtUSDT(rank.minEarnings)}</span></div>
                                  <div className="flex justify-between"><span className="text-zinc-400">{t('admin.bonusAmount')}</span><span className="text-cyan-400">${fmtUSDT(rank.bonusAmount)}</span></div>
                                  <div className="flex justify-between"><span className="text-zinc-400">{t('admin.commissionBoost')}</span><span>+{rank.commissionBoost}%</span></div>
                                </div>
                                <div className="flex gap-2 mt-3">
                                  <Button size="sm" variant="outline" className="flex-1 border-zinc-700 min-h-[44px]" onClick={() => setRankDialog({ open: true, rank })}><Pencil className="h-3.5 w-3.5 mr-1" />{t('admin.edit')}</Button>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Admin Affiliate Milestones */}
                    {adminTab === 'affiliateMilestones' && (
                      <div className="space-y-6">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-semibold">{t('admin.affiliateMilestones')}</h3>
                          <Button className="bg-emerald-600 hover:bg-cyan-700 min-h-[44px]" onClick={() => setMilestoneDialog({ open: true, milestone: null })}><Plus className="mr-2 h-4 w-4" />{t('admin.newMilestone')}</Button>
                        </div>
                        <div className="grid gap-4">
                          {adminMilestones.sort((a, b) => a.sortOrder - b.sortOrder).map(m => (
                            <Card key={m.id} className="bg-zinc-900 border-zinc-800">
                              <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <span className="text-2xl">{m.icon}</span>
                                    <div>
                                      <div className="font-semibold">{m.name}</div>
                                      {m.description && <div className="text-xs text-zinc-500">{m.description}</div>}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <div className="text-right text-sm">
                                      <div>{m.targetCount} {t('common.referrals')}</div>
                                      {m.rewardType === 'cash' && <div className="text-cyan-400">${fmtUSDT(m.rewardValue)}</div>}
                                      {m.rewardType === 'boost' && <div className="text-cyan-400">+{m.rewardValue}%</div>}
                                    </div>
                                    <Button size="sm" variant="outline" className="border-zinc-700 min-h-[44px]" onClick={() => setMilestoneDialog({ open: true, milestone: m })}><Pencil className="h-3.5 w-3.5" /></Button>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Admin Affiliate Contests */}
                    {adminTab === 'affiliateContests' && (
                      <div className="space-y-6">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-semibold">{t('admin.affiliateContests')}</h3>
                          <Button className="bg-emerald-600 hover:bg-cyan-700 min-h-[44px]" onClick={() => setContestDialog({ open: true, contest: null })}><Plus className="mr-2 h-4 w-4" />{t('admin.newContest')}</Button>
                        </div>
                        <div className="overflow-x-auto">
                          <Table className="min-w-[700px]">
                            <TableHeader>
                              <TableRow className="border-zinc-800">
                                <TableHead className="text-zinc-400">{t('admin.contestName')}</TableHead>
                                <TableHead className="text-zinc-400">{t('admin.rewardPool')}</TableHead>
                                <TableHead className="text-zinc-400">{t('admin.contestMetric')}</TableHead>
                                <TableHead className="text-zinc-400">{t('admin.startDate')}</TableHead>
                                <TableHead className="text-zinc-400">{t('admin.endDate')}</TableHead>
                                <TableHead className="text-zinc-400">{t('admin.status')}</TableHead>
                                <TableHead className="text-zinc-400">{t('admin.action')}</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {adminContests.map(c => (
                                <TableRow key={c.id} className="border-zinc-800">
                                  <TableCell className="font-medium">{c.name}</TableCell>
                                  <TableCell className="text-cyan-400">${fmtUSDT(c.rewardPool)}</TableCell>
                                  <TableCell className="text-sm">{c.metric}</TableCell>
                                  <TableCell className="text-sm">{fmtDate(c.startDate)}</TableCell>
                                  <TableCell className="text-sm">{fmtDate(c.endDate)}</TableCell>
                                  <TableCell><Badge className={c.isActive ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' : 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30'} variant="outline">{c.isActive ? t('status.active') : t('status.offline')}</Badge></TableCell>
                                  <TableCell><Button size="sm" variant="outline" className="border-zinc-700 min-h-[44px]" onClick={() => setContestDialog({ open: true, contest: c })}><Pencil className="h-3.5 w-3.5" /></Button></TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    )}

                    {/* Admin Badges */}
                    {adminTab === 'affiliateBadges' && (
                      <div className="space-y-6">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-semibold">{t('admin.affiliateBadges') || 'Badges / Conquistas'}</h3>
                          <Button className="bg-emerald-600 hover:bg-cyan-700 min-h-[44px]" onClick={() => setBadgeDialog({ open: true, badge: null })}><Plus className="mr-2 h-4 w-4" />Novo Badge</Button>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                          {adminBadges.map((b: any) => (
                            <Card key={b.id} className={`bg-zinc-900 border-zinc-800 ${!b.isActive ? 'opacity-50' : ''}`}>
                              <CardContent className="p-4 text-center">
                                <div className="text-4xl mb-2" style={{ filter: `drop-shadow(0 0 8px ${b.color}40)` }}>{b.icon}</div>
                                <div className="font-medium text-sm mb-1">{b.name}</div>
                                <div className="text-xs text-zinc-500 mb-2">{b.category}</div>
                                <Badge className={b.isActive ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' : 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30'} variant="outline">
                                  {b.isActive ? t('status.active') : t('status.offline')}
                                </Badge>
                                {b._count?.awards > 0 && <div className="text-xs text-zinc-500 mt-1">{b._count.awards} conquistaram</div>}
                                <div className="mt-2 flex gap-1 justify-center">
                                  <Button size="sm" variant="outline" className="border-zinc-700 h-8 w-8 p-0" onClick={() => setBadgeDialog({ open: true, badge: b })}><Pencil className="h-3.5 w-3.5" /></Button>
                                  <Button size="sm" variant="outline" className="border-red-700 text-red-400 h-8 w-8 p-0" onClick={async () => { await api(`/api/admin/affiliate-badges?id=${b.id}`, { method: 'DELETE' }); fetchAdminData(); }}><Trash2 className="h-3.5 w-3.5" /></Button>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Admin Vouchers */}
                    {adminTab === 'vouchers' && (
                      <div className="space-y-6">
                        <div className="flex items-center justify-between flex-wrap gap-3">
                          <div>
                            <h3 className="text-lg font-semibold">Vouchers para Líderes</h3>
                            <p className="text-sm text-zinc-500 mt-1">Dê crédito para líderes trazerem redes. Eles só podem usar para investir em planos de copy trading. Saques são desbloqueados gradualmente conforme cumprem metas.</p>
                          </div>
                          <div className="flex gap-2">
                            <Select value={voucherFilter} onValueChange={setVoucherFilter} disabled={adminLoading}>
                              <SelectTrigger className="w-36 bg-zinc-800 border-zinc-700">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">Todos</SelectItem>
                                <SelectItem value="active">Ativos</SelectItem>
                                <SelectItem value="completed">Completos</SelectItem>
                                <SelectItem value="expired">Expirados</SelectItem>
                                <SelectItem value="revoked">Revogados</SelectItem>
                              </SelectContent>
                            </Select>
                            <Button className="bg-emerald-600 hover:bg-cyan-700 min-h-[44px]" onClick={() => setVoucherDialog({ open: true, voucher: null })} disabled={adminLoading}><Plus className="mr-2 h-4 w-4" />Novo Voucher</Button>
                          </div>
                        </div>

                        {/* Stats Cards — show skeleton while loading */}
                        {adminLoading && adminVouchers.length === 0 ? (
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {[1,2,3,4].map(i => (
                              <Card key={i} className="bg-zinc-900 border-zinc-800">
                                <CardContent className="p-4">
                                  <div className="animate-pulse bg-zinc-700/50 h-4 w-24 rounded mb-2" />
                                  <div className="animate-pulse bg-zinc-700/50 h-7 w-16 rounded" />
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <Card className="bg-zinc-900 border-zinc-800">
                              <CardContent className="p-4">
                                <div className="text-sm text-zinc-500">Vouchers Ativos</div>
                                <div className="text-2xl font-bold text-cyan-400">{adminVouchers.filter(v => v.status === 'active').length}</div>
                              </CardContent>
                            </Card>
                            <Card className="bg-zinc-900 border-zinc-800">
                              <CardContent className="p-4">
                                <div className="text-sm text-zinc-500">Total em Vouchers</div>
                                <div className="text-2xl font-bold text-white">{fmtUSDT(adminVouchers.filter(v => v.status === 'active').reduce((sum: number, v: any) => sum + d(v.amount), 0))} USDT</div>
                              </CardContent>
                            </Card>
                            <Card className="bg-zinc-900 border-zinc-800">
                              <CardContent className="p-4">
                                <div className="text-sm text-zinc-500">Já Utilizado</div>
                                <div className="text-2xl font-bold text-amber-400">{fmtUSDT(adminVouchers.filter(v => v.status === 'active').reduce((sum: number, v: any) => sum + d(v.usedAmount), 0))} USDT</div>
                              </CardContent>
                            </Card>
                            <Card className="bg-zinc-900 border-zinc-800">
                              <CardContent className="p-4">
                                <div className="text-sm text-zinc-500">Completos</div>
                                <div className="text-2xl font-bold text-blue-400">{adminVouchers.filter(v => v.status === 'completed').length}</div>
                              </CardContent>
                            </Card>
                          </div>
                        )}

                        {/* Vouchers List */}
                        <div className="space-y-3">
                          {adminLoading && adminVouchers.length === 0 ? (
                            <>
                              {[1,2,3].map(i => (
                                <Card key={i} className="bg-zinc-900 border-zinc-800">
                                  <CardContent className="p-4">
                                    <div className="flex flex-col md:flex-row md:items-start gap-4">
                                      <div className="flex-1 min-w-0 space-y-3">
                                        <div className="flex items-center gap-2">
                                          <div className="animate-pulse bg-zinc-700/50 h-5 w-16 rounded" />
                                          <div className="animate-pulse bg-zinc-700/50 h-5 w-20 rounded" />
                                        </div>
                                        <div className="animate-pulse bg-zinc-700/50 h-5 w-32 rounded" />
                                        <div className="animate-pulse bg-zinc-700/50 h-4 w-48 rounded" />
                                        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                                          <div className="animate-pulse bg-zinc-700/50 h-4 w-28 rounded" />
                                          <div className="animate-pulse bg-zinc-700/50 h-4 w-24 rounded" />
                                        </div>
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                              ))}
                            </>
                          ) : adminVouchers
                            .filter(v => voucherFilter === 'all' || v.status === voucherFilter)
                            .map((v: any) => {
                              const available = d(v.amount) - d(v.usedAmount);
                              const goalTarget = d(v.goalNetworkMultiple) * d(v.amount);
                              const referralPct = v.goalDirectReferrals > 0 ? Math.round((v.qualifyingReferrals / v.goalDirectReferrals) * 100) : 0;
                              const networkPct = goalTarget > 0 ? Math.round((d(v.currentNetworkInvestment) / goalTarget) * 100) : 0;
                              const daysLeft = v.status === 'active' ? Math.max(0, Math.ceil((new Date(v.deadline).getTime() - Date.now()) / 86400000)) : 0;
                              const unlockPct = d(v.withdrawalUnlockPct);
                              
                              const statusBadge: Record<string, string> = {
                                active: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
                                completed: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
                                expired: 'bg-red-500/20 text-red-400 border-red-500/30',
                                revoked: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
                              };
                              const statusLabel: Record<string, string> = {
                                active: 'Ativo', completed: 'Completo', expired: 'Expirado', revoked: 'Revogado',
                              };
                              const typeLabel: Record<string, string> = {
                                basic: 'Básico', premium: 'Premium', custom: 'Personalizado',
                              };

                              return (
                                <Card key={v.id} className="bg-zinc-900 border-zinc-800">
                                  <CardContent className="p-4">
                                    <div className="flex flex-col md:flex-row md:items-start gap-4">
                                      {/* Left: User & Voucher Info */}
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-2">
                                          <Badge className={statusBadge[v.status] || ''} variant="outline">{statusLabel[v.status] || v.status}</Badge>
                                          <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30" variant="outline">{typeLabel[v.type] || v.type}</Badge>
                                          {v.extendedDays > 0 && <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30" variant="outline">+{v.extendedDays}d extensão</Badge>}
                                        </div>
                                        <div className="font-semibold text-lg">{v.user?.name || 'Usuário'}</div>
                                        <div className="text-sm text-zinc-500">{v.user?.email}</div>
                                        
                                        <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                                          <div><span className="text-zinc-500">Valor:</span> <span className="text-white font-medium">{fmtUSDT(v.amount)} USDT</span></div>
                                          <div><span className="text-zinc-500">Disponível:</span> <span className="text-cyan-400 font-medium">{fmtUSDT(available)} USDT</span></div>
                                          <div><span className="text-zinc-500">Usado:</span> <span className="text-amber-400">{fmtUSDT(v.usedAmount)} USDT</span></div>
                                          <div><span className="text-zinc-500">Desbloqueio saque:</span> <span className={unlockPct >= 100 ? 'text-cyan-400' : unlockPct > 0 ? 'text-amber-400' : 'text-red-400'}>{unlockPct}%</span></div>
                                        </div>

                                        {/* Progress Section */}
                                        <div className="mt-4 space-y-3">
                                          <div>
                                            <div className="flex justify-between text-xs mb-1">
                                              <span className="text-zinc-400">🤝 Indicações qualificadas: {v.qualifyingReferrals}/{v.goalDirectReferrals}</span>
                                              <span className="text-zinc-500">{referralPct}%</span>
                                            </div>
                                            <Progress value={Math.min(100, referralPct)} className="h-2 bg-zinc-800 [&>[data-slot=indicator]]:bg-cyan-500" />
                                          </div>
                                          <div>
                                            <div className="flex justify-between text-xs mb-1">
                                              <span className="text-zinc-400">💰 Investimento da rede: {fmtUSDT(v.currentNetworkInvestment)}/{fmtUSDT(goalTarget)} USDT</span>
                                              <span className="text-zinc-500">{networkPct}%</span>
                                            </div>
                                            <Progress value={Math.min(100, networkPct)} className="h-2 bg-zinc-800 [&>[data-slot=indicator]]:bg-blue-500" />
                                          </div>
                                          <div>
                                            <div className="flex justify-between text-xs mb-1">
                                              <span className="text-zinc-400">🔓 Desbloqueio gradual de saque</span>
                                              <span className="text-zinc-500">{unlockPct}%</span>
                                            </div>
                                            <Progress value={unlockPct} className="h-2 bg-zinc-800 [&>[data-slot=indicator]]:bg-purple-500" />
                                          </div>
                                        </div>

                                        {/* Unlock Tiers */}
                                        <div className="mt-3 flex flex-wrap gap-2 text-xs">
                                          <span className={`px-2 py-1 rounded-full ${unlockPct >= 25 ? 'bg-cyan-500/20 text-cyan-400' : 'bg-zinc-800 text-zinc-500'}`}>25% - 50% das indicações</span>
                                          <span className={`px-2 py-1 rounded-full ${unlockPct >= 50 ? 'bg-cyan-500/20 text-cyan-400' : 'bg-zinc-800 text-zinc-500'}`}>50% - 75% refs + 50% rede</span>
                                          <span className={`px-2 py-1 rounded-full ${unlockPct >= 75 ? 'bg-cyan-500/20 text-cyan-400' : 'bg-zinc-800 text-zinc-500'}`}>75% - 100% refs + 75% rede</span>
                                          <span className={`px-2 py-1 rounded-full ${unlockPct >= 100 ? 'bg-cyan-500/20 text-cyan-400' : 'bg-zinc-800 text-zinc-500'}`}>100% - Metas completas</span>
                                        </div>
                                      </div>

                                      {/* Right: Actions & Meta */}
                                      <div className="flex flex-col items-end gap-2 shrink-0">
                                        {v.status === 'active' && (
                                          <div className="text-right">
                                            <div className="text-xs text-zinc-500 mb-1">Prazo</div>
                                            <div className={`text-sm font-medium ${daysLeft <= 7 ? 'text-red-400' : 'text-white'}`}>
                                              {daysLeft > 0 ? `${daysLeft} dias restantes` : 'Expirado!'}
                                            </div>
                                            <div className="text-xs text-zinc-600">{fmtDate(v.deadline)}</div>
                                          </div>
                                        )}
                                        {v.completedAt && (
                                          <div className="text-right">
                                            <div className="text-xs text-zinc-500">Completado em</div>
                                            <div className="text-sm text-blue-400">{fmtDate(v.completedAt)}</div>
                                          </div>
                                        )}
                                        
                                        {v.status === 'active' && (
                                          <div className="flex flex-col gap-1 mt-2">
                                            <Button size="sm" variant="outline" className="border-amber-600 text-amber-400 hover:bg-amber-500/10 min-h-[36px]" onClick={() => setVoucherActionDialog({ open: true, action: 'extend', voucher: v })}>
                                              <Clock4 className="mr-1 h-3.5 w-3.5" /> Estender Prazo
                                            </Button>
                                            <Button size="sm" variant="outline" className="border-blue-600 text-blue-400 hover:bg-blue-500/10 min-h-[36px]" onClick={() => setVoucherActionDialog({ open: true, action: 'complete', voucher: v })}>
                                              <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Marcar Completo
                                            </Button>
                                            <Button size="sm" variant="outline" className="border-red-600 text-red-400 hover:bg-red-500/10 min-h-[36px]" onClick={() => setVoucherActionDialog({ open: true, action: 'revoke', voucher: v })}>
                                              <XCircle className="mr-1 h-3.5 w-3.5" /> Revogar
                                            </Button>
                                          </div>
                                        )}
                                        {v.adminNotes && (
                                          <div className="text-xs text-zinc-500 mt-2 max-w-[200px] text-right">
                                            <span className="font-medium">Notas:</span> {v.adminNotes}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                              );
                            })}
                          {adminVouchers.filter(v => voucherFilter === 'all' || v.status === voucherFilter).length === 0 && (
                            <Card className="bg-zinc-900 border-zinc-800">
                              <CardContent className="p-8 text-center text-zinc-500">
                                <Ticket className="h-12 w-12 mx-auto mb-3 opacity-30" />
                                <p>Nenhum voucher encontrado</p>
                                <p className="text-sm mt-1">Crie um novo voucher para um líder de rede</p>
                              </CardContent>
                            </Card>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Admin Config */}
                    {adminTab === 'config' && (
                      <div className="space-y-4">
                        <div className="flex justify-between items-center flex-wrap gap-2">
                          <div className="flex gap-2">
                            <Button variant="outline" className="border-zinc-700 text-cyan-400 hover:bg-cyan-500/10" onClick={() => setChangePasswordDialog(true)}>
                              <Shield className="mr-2 h-4 w-4" /> Alterar Senha
                            </Button>
                            <Button variant="outline" className="border-zinc-700 text-amber-400 hover:bg-amber-500/10" onClick={async () => {
                              try {
                                const data = await api<{ message: string; created: number }>('/api/admin/migrate-config', { method: 'POST' });
                                toast.success(data.message);
                                fetchAdminData();
                              } catch (err: any) {
                                toast.error(err.message);
                              }
                            }}>
                              <RefreshCw className="mr-2 h-4 w-4" /> Migrar Configs
                            </Button>
                          </div>
                          <Button className="bg-emerald-600 hover:bg-cyan-700" onClick={() => setNewConfigDialog(true)}>
                            <Plus className="mr-2 h-4 w-4" /> Nova Config
                          </Button>
                        </div>
                        {['branding', 'general', 'deposit', 'withdrawal', 'trading', 'nowpayments'].map(cat => {
                          const catConfigs = adminConfigs.filter(c => c.category === cat && !HIDDEN_CONFIG_KEYS.has(c.key));
                          if (catConfigs.length === 0) return null;
                          const CatIcon = categoryIcon(cat);
                          const hasChanges = catConfigs.some(c => configEdits[c.key] !== undefined && configEdits[c.key] !== c.value);
                          const catDesc = categoryDescription[cat] || '';
                          return (
                            <Card key={cat} className="bg-zinc-900 border-zinc-800">
                              <CardHeader className="pb-3">
                                <div className="flex items-center justify-between gap-2 flex-wrap">
                                  <div>
                                    <CardTitle className="text-base sm:text-lg flex items-center gap-2 min-w-0">
                                      <CatIcon className="h-5 w-5 text-emerald-400 shrink-0" />
                                      <span className="truncate">{categoryLabel(cat)}</span>
                                      <Badge variant="outline" className="text-xs border-zinc-700 text-zinc-400 shrink-0">{catConfigs.length}</Badge>
                                    </CardTitle>
                                    {catDesc && <p className="text-xs text-zinc-500 mt-1 ml-7">{catDesc}</p>}
                                  </div>
                                  <Button size="sm" className={`h-9 text-xs shrink-0 ${hasChanges ? 'bg-emerald-600 hover:bg-cyan-700' : 'bg-zinc-700 hover:bg-zinc-600'}`} disabled={!hasChanges || configSaving === cat} onClick={() => handleBatchConfigSave(cat)}>
                                    {configSaving === cat && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                                    Salvar
                                  </Button>
                                </div>
                              </CardHeader>
                              <CardContent>
                                {/* Branding: Logo preview */}
                                {cat === 'branding' && (() => {
                                  const logoVal = configEdits['site_logo'] ?? adminConfigs.find(c => c.key === 'site_logo')?.value ?? '';
                                  const faviconVal = configEdits['site_favicon'] ?? adminConfigs.find(c => c.key === 'site_favicon')?.value ?? '';
                                  return (
                                    <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                                      <div className="bg-zinc-800/60 rounded-lg p-4 flex flex-col items-center gap-2 border border-zinc-700">
                                        <span className="text-xs text-zinc-400">Prévia do Logo</span>
                                        {logoVal ? (
                                          <img src={logoVal} alt="Logo" className="max-h-12 object-contain" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                                        ) : (
                                          <div className="h-12 w-32 bg-zinc-700/50 rounded flex items-center justify-center text-zinc-500 text-xs">Sem logo</div>
                                        )}
                                        <span className="text-[10px] text-zinc-600">Recomendado: PNG ou SVG, fundo transparente, 200×60px</span>
                                      </div>
                                      <div className="bg-zinc-800/60 rounded-lg p-4 flex flex-col items-center gap-2 border border-zinc-700">
                                        <span className="text-xs text-zinc-400">Prévia do Favicon</span>
                                        {faviconVal ? (
                                          <img src={faviconVal} alt="Favicon" className="h-8 w-8 object-contain" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                                        ) : (
                                          <div className="h-8 w-8 bg-zinc-700/50 rounded flex items-center justify-center text-zinc-500 text-xs">—</div>
                                        )}
                                        <span className="text-[10px] text-zinc-600">Recomendado: ICO ou PNG, 32×32px ou 64×64px</span>
                                      </div>
                                    </div>
                                  );
                                })()}
                                {/* NowPayments: Connection test */}
                                {cat === 'nowpayments' && (
                                  <div className="mb-4 flex items-center gap-3 flex-wrap">
                                    <Button size="sm" variant="outline" className="h-8 text-xs border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
                                      onClick={async () => {
                                        try {
                                          const data = await api<{ connected: boolean; status: string; message: string }>('/api/nowpayments/test-connection', { method: 'POST' });
                                          if (data.connected) {
                                            toast.success(data.message);
                                          } else {
                                            toast.warning(data.message);
                                          }
                                        } catch (err: any) {
                                          toast.error(err.message || 'Erro ao testar conexão');
                                        }
                                      }}>
                                      <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Testar Conexão
                                    </Button>
                                    <div className="flex items-center gap-2 text-xs text-zinc-400">
                                      <Info className="h-3.5 w-3.5 text-sky-400" />
                                      <span>O split de pagamentos é gerenciado na aba NowPayments → Sócios & Split</span>
                                    </div>
                                  </div>
                                )}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  {catConfigs.map(cfg => {
                                    const meta = CONFIG_LABELS[cfg.key];
                                    const fieldType = meta?.type || cfg.type;
                                    const isChanged = configEdits[cfg.key] !== undefined && configEdits[cfg.key] !== cfg.value;
                                    const isSecret = fieldType === 'secret';
                                    const isSelect = fieldType === 'select';
                                    const unit = meta?.unit;
                                    const currentValue = configEdits[cfg.key] ?? cfg.value;
                                    return (
                                      <div key={cfg.id} className={`bg-zinc-800/40 rounded-lg p-3 ${isChanged ? 'ring-1 ring-amber-500/30' : ''}`}>
                                        <div className="flex items-center justify-between mb-1.5">
                                          <Label className="text-sm font-medium text-zinc-300 flex items-center gap-1.5">
                                            {isSecret && <Lock className="h-3.5 w-3.5 text-amber-400" />}
                                            {meta?.label || cfg.key}
                                          </Label>
                                          {isChanged && (
                                            <div className="flex items-center gap-1">
                                              <span className="text-[10px] text-amber-400">modificado</span>
                                              <Button variant="ghost" size="icon" className="h-5 w-5 text-zinc-500 hover:text-white"
                                                onClick={() => setConfigEdits(prev => { const next = { ...prev }; delete next[cfg.key]; return next; })}>
                                                <X className="h-3 w-3" />
                                              </Button>
                                            </div>
                                          )}
                                        </div>
                                        <p className="text-xs text-zinc-500 mb-2">{meta?.description || cfg.description || ''}</p>

                                        {fieldType === 'boolean' ? (
                                          <div className="flex items-center gap-3">
                                            <Switch
                                              checked={currentValue === 'true'}
                                              onCheckedChange={(checked) => setConfigEdits(prev => ({ ...prev, [cfg.key]: checked ? 'true' : 'false' }))}
                                            />
                                            <span className={`text-sm font-medium ${currentValue === 'true' ? 'text-emerald-400' : 'text-zinc-500'}`}>
                                              {currentValue === 'true' ? 'Ativado' : 'Desativado'}
                                            </span>
                                          </div>
                                        ) : fieldType === 'select' && meta?.options ? (
                                          <Select
                                            value={currentValue}
                                            onValueChange={(val) => setConfigEdits(prev => ({ ...prev, [cfg.key]: val }))}
                                          >
                                            <SelectTrigger className="bg-zinc-800 border-zinc-700 text-sm h-8">
                                              <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent className="bg-zinc-800">
                                              {meta.options.map(opt => (
                                                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                              ))}
                                            </SelectContent>
                                          </Select>
                                        ) : fieldType === 'number' ? (
                                          <div className="relative">
                                            <Input
                                              type="number"
                                              value={currentValue}
                                              onChange={e => setConfigEdits(prev => ({ ...prev, [cfg.key]: e.target.value }))}
                                              className={`bg-zinc-800 border-zinc-700 text-sm h-8 ${unit ? 'pr-16' : ''}`}
                                            />
                                            {unit && (
                                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500 pointer-events-none">{unit}</span>
                                            )}
                                          </div>
                                        ) : isSecret ? (
                                          <div className="relative">
                                            <Input
                                              type={secretVisible[cfg.key] ? 'text' : 'password'}
                                              value={currentValue}
                                              onChange={e => setConfigEdits(prev => ({ ...prev, [cfg.key]: e.target.value }))}
                                              className="bg-zinc-800 border-zinc-700 text-sm h-8 pr-10"
                                              placeholder="••••••••"
                                            />
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 text-zinc-500 hover:text-white"
                                              onClick={() => setSecretVisible(prev => ({ ...prev, [cfg.key]: !prev[cfg.key] }))}
                                            >
                                              {secretVisible[cfg.key] ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                                            </Button>
                                          </div>
                                        ) : (
                                          <Input
                                            value={currentValue}
                                            onChange={e => setConfigEdits(prev => ({ ...prev, [cfg.key]: e.target.value }))}
                                            className="bg-zinc-800 border-zinc-700 text-sm h-8"
                                          />
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                        {adminConfigs.length === 0 && <p className="text-zinc-500 text-center py-8">Nenhuma configuração encontrada</p>}
                      </div>
                    )}

                    {/* Marketing - WhatsApp Creative */}
                    {adminTab === 'marketing' && (
                      <div className="space-y-6">
                        {/* Header */}
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-10 h-10 bg-green-500/10 rounded-xl flex items-center justify-center">
                            <Share2 className="h-5 w-5 text-green-400" />
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold">Criativo WhatsApp</h3>
                            <p className="text-sm text-zinc-400">Material de divulgação para atrair investidores</p>
                          </div>
                        </div>

                        {/* Promotional Image */}
                        <Card className="bg-zinc-900 border-zinc-800 overflow-hidden">
                          <CardContent className="p-0">
                            <div className="relative">
                              <img
                                src="/whatsapp-creative.png"
                                alt="PLATAFORMA ROI - Banner Promocional"
                                className="w-full h-auto object-cover"
                              />
                              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-zinc-900 to-transparent h-20" />
                              <Badge className="absolute top-3 right-3 bg-green-500/20 text-green-400 border-green-500/30">Download ↓</Badge>
                            </div>
                          </CardContent>
                        </Card>

                        {/* Affiliate Network Image */}
                        <Card className="bg-zinc-900 border-zinc-800 overflow-hidden">
                          <CardContent className="p-0">
                            <div className="relative">
                              <img
                                src="/whatsapp-affiliate.png"
                                alt="PLATAFORMA ROI - Rede de Afiliados"
                                className="w-full h-auto object-cover"
                              />
                              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-zinc-900 to-transparent h-20" />
                              <Badge className="absolute top-3 right-3 bg-cyan-500/20 text-cyan-400 border-cyan-500/30">Rede de Afiliados</Badge>
                            </div>
                          </CardContent>
                        </Card>

                        {/* WhatsApp Creative Text */}
                        <Card className="bg-zinc-900 border-zinc-800">
                          <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                              <CardTitle className="text-base flex items-center gap-2">
                                <span className="text-green-400">📱</span> Texto para WhatsApp
                              </CardTitle>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="border-zinc-700 text-zinc-300 hover:text-white gap-1"
                                  onClick={() => {
                                    const text = `⚡ *PLATAFORMA ROI* ⚡
*A Plataforma #1 de Copy Trading e Investimentos em Cripto*

📈 O que é a PLATAFORMA ROI?

É a plataforma de copy trading mais avançada do mercado. Nossos traders profissionais operam 24/7 com estratégias validadas, garantindo máxima lucratividade para você!

💰 Como funciona?

1️⃣ Cadastre-se e deposite USDT (via PIX ou cripto)
2️⃣ Escolha seu plano de copy trading
3️⃣ Receba lucros diários direto na sua carteira!

📊 Nossos Planos de Investimento:
• Trader Iniciante — A partir de $50
• Trader Intermediário — A partir de $200
• Trader Avançado — A partir de $500
• Trader Elite — A partir de $2000

✅ ROI diário garantido em USDT
✅ Até 70% do lucro das operações é seu
✅ Pagamento via PIX ou USDT (TRC20/Polygon)
✅ Copy trading 24/7 sem preocupação

🔥 *PROGRAMA DE AFILIADOS — 11 NÍVEIS!*

Ganhe comissões sobre TUDO que sua rede ganha:

🥇 Nível 1 (Indicação direta): 8%
🥈 Nível 2: 3%
🥉 Nível 3: 1.5%
4️⃣ Nível 4: 0.5%
5️⃣ Nível 5: 0.25%
6️⃣ Nível 6 ao 11: 0.1% cada

💡 Isso significa: Convide 10 pessoas, cada uma convida mais 10... Sua rede cresce exponencialmente e você ganha em TODOS os níveis!

🏆 Bônus de Equipe!
• Bronze: Volume de equipe $10.000+
• Prata: Volume de equipe $50.000+
• Ouro: Volume de equipe $200.000+

📊 *Exemplo prático:*
Seus 10 indicados diretos investem $100/dia cada:
→ Você ganha 8% = $80/dia só no Nível 1!
→ Se cada um indicar 10 pessoas (Nível 2 = 100 pessoas):
→ Você ganha 3% dos lucros delas também!
→ E assim por diante até o Nível 11...

🚀 Comece agora mesmo!
👉 Cadastre-se e comece a investir em copy trading hoje!

*PLATAFORMA ROI — Invista no futuro.* 💎`;
                                    navigator.clipboard.writeText(text);
                                    toast.success('Texto copiado! Cole no WhatsApp');
                                  }}
                                >
                                  <Copy className="h-3.5 w-3.5" /> Copiar
                                </Button>
                                <Button
                                  size="sm"
                                  className="bg-green-600 hover:bg-green-700 text-white gap-1"
                                  onClick={() => {
                                    const text = encodeURIComponent(`⚡ *PLATAFORMA ROI* ⚡\n*A Plataforma #1 de Copy Trading e Investimentos em Cripto*\n\n📈 O que é a PLATAFORMA ROI?\n\nÉ a plataforma de copy trading mais avançada do mercado. Nossos traders profissionais operam 24/7 com estratégias validadas, garantindo máxima lucratividade para você!\n\n💰 Como funciona?\n\n1️⃣ Cadastre-se e deposite USDT (via PIX ou cripto)\n2️⃣ Escolha seu plano de copy trading\n3️⃣ Receba lucros diários direto na sua carteira!\n\n📊 Nossos Planos de Investimento:\n• Trader Iniciante — A partir de $50\n• Trader Intermediário — A partir de $200\n• Trader Avançado — A partir de $500\n• Trader Elite — A partir de $2000\n\n✅ ROI diário garantido em USDT\n✅ Até 70% do lucro das operações é seu\n✅ Pagamento via PIX ou USDT (TRC20/Polygon)\n✅ Copy trading 24/7 sem preocupação\n\n🔥 *PROGRAMA DE AFILIADOS — 11 NÍVEIS!*\n\nGanhe comissões sobre TUDO que sua rede ganha:\n\n🥇 Nível 1 (Indicação direta): 8%\n🥈 Nível 2: 3%\n🥉 Nível 3: 1.5%\n4️⃣ Nível 4: 0.5%\n5️⃣ Nível 5: 0.25%\n6️⃣ Nível 6 ao 11: 0.1% cada\n\n💡 Isso significa: Convide 10 pessoas, cada uma convida mais 10... Sua rede cresce exponencialmente e você ganha em TODOS os níveis!\n\n🏆 Bônus de Equipe!\n• Bronze: Volume de equipe $10.000+\n• Prata: Volume de equipe $50.000+\n• Ouro: Volume de equipe $200.000+\n\n📊 *Exemplo prático:*\nSeus 10 indicados diretos investem $100/dia cada:\n→ Você ganha 8% = $80/dia só no Nível 1!\n→ Se cada um indicar 10 pessoas (Nível 2 = 100 pessoas):\n→ Você ganha 3% dos lucros delas também!\n→ E assim por diante até o Nível 11...\n\n🚀 Comece agora mesmo!\n👉 Cadastre-se e comece a investir em copy trading hoje!\n\n*PLATAFORMA ROI — Invista no futuro.* 💎`);
                                    window.open(`https://wa.me/?text=${text}`, '_blank');
                                  }}
                                >
                                  <Share2 className="h-3.5 w-3.5" /> WhatsApp
                                </Button>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="bg-green-900/20 border border-green-500/20 rounded-xl p-4 sm:p-6 font-whatsapp text-sm sm:text-base leading-relaxed whitespace-pre-wrap text-zinc-200 max-h-[600px] overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
{`⚡ *PLATAFORMA ROI* ⚡
*A Plataforma #1 de Copy Trading e Investimentos em Cripto*

📈 O que é a PLATAFORMA ROI?

É a plataforma de copy trading mais avançada do mercado. Nossos traders profissionais operam 24/7 com estratégias validadas, garantindo máxima lucratividade para você!

💰 Como funciona?

1️⃣ Cadastre-se e deposite USDT (via PIX ou cripto)
2️⃣ Escolha seu plano de copy trading
3️⃣ Receba lucros diários direto na sua carteira!

📊 Nossos Planos de Investimento:
• Trader Iniciante — A partir de $50
• Trader Intermediário — A partir de $200
• Trader Avançado — A partir de $500
• Trader Elite — A partir de $2000

✅ ROI diário garantido em USDT
✅ Até 70% do lucro das operações é seu
✅ Pagamento via PIX ou USDT (TRC20/Polygon)
✅ Copy trading 24/7 sem preocupação

🔥 *PROGRAMA DE AFILIADOS — 11 NÍVEIS!*

Ganhe comissões sobre TUDO que sua rede ganha:

🥇 Nível 1 (Indicação direta): 8%
🥈 Nível 2: 3%
🥉 Nível 3: 1.5%
4️⃣ Nível 4: 0.5%
5️⃣ Nível 5: 0.25%
6️⃣ Nível 6 ao 11: 0.1% cada

💡 Isso significa: Convide 10 pessoas, cada uma convida mais 10... Sua rede cresce exponencialmente e você ganha em TODOS os níveis!

🏆 Bônus de Equipe!
• Bronze: Volume de equipe $10.000+
• Prata: Volume de equipe $50.000+
• Ouro: Volume de equipe $200.000+

📊 *Exemplo prático:*
Seus 10 indicados diretos investem $100/dia cada:
→ Você ganha 8% = $80/dia só no Nível 1!
→ Se cada um indicar 10 pessoas (Nível 2 = 100 pessoas):
→ Você ganha 3% dos lucros delas também!
→ E assim por diante até o Nível 11...

🚀 Comece agora mesmo!
👉 Cadastre-se e comece a investir em copy trading hoje!

*PLATAFORMA ROI — Invista no futuro.* 💎`}
                            </div>
                          </CardContent>
                        </Card>

                        {/* Database Analysis Section */}
                        <Card className="bg-zinc-900 border-zinc-800">
                          <CardHeader className="pb-3">
                            <CardTitle className="text-base flex items-center gap-2">
                              <Database className="h-4 w-4 text-cyan-400" />
                              Análise da Configuração do Sistema (Banco de Dados)
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-4 text-sm">
                              {/* Affiliate Levels from DB */}
                              <div className="bg-zinc-800/50 rounded-lg p-4">
                                <h4 className="font-semibold text-cyan-400 mb-3">📊 Níveis de Afiliados (Tabela AffiliateLevel)</h4>
                                <div className="grid grid-cols-5 gap-2">
                                  {(affiliateLevels.length > 0 ? affiliateLevels : [
                                    { level: 1, percentage: '10', description: 'Nível 1 - Indicação direta', isActive: true },
                                    { level: 2, percentage: '4', description: 'Nível 2', isActive: true },
                                    { level: 3, percentage: '3', description: 'Nível 3', isActive: true },
                                    { level: 4, percentage: '2', description: 'Nível 4', isActive: true },
                                    { level: 5, percentage: '1.5', description: 'Nível 5', isActive: true },
                                    { level: 6, percentage: '1', description: 'Nível 6', isActive: true },
                                    { level: 7, percentage: '0.8', description: 'Nível 7', isActive: true },
                                    { level: 8, percentage: '0.5', description: 'Nível 8', isActive: true },
                                    { level: 9, percentage: '0.4', description: 'Nível 9', isActive: true },
                                    { level: 10, percentage: '0.3', description: 'Nível 10', isActive: true },
                                    { level: 11, percentage: '0.5', description: 'Nível 11', isActive: true },
                                  ]).map((lvl) => (
                                    <div key={lvl.level} className="bg-zinc-900 rounded-lg p-3 text-center border border-zinc-700">
                                      <div className="text-xl font-bold text-cyan-400">{lvl.percentage}%</div>
                                      <div className="text-xs text-zinc-400 mt-1">Nível {lvl.level}</div>
                                      <div className="text-[10px] text-zinc-500 mt-0.5">{lvl.description || ''}</div>
                                      {lvl.isActive && <Badge className="mt-1 text-[9px] bg-cyan-500/10 text-cyan-400 border-cyan-500/20" variant="outline">Ativo</Badge>}
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* Commission Mode */}
                              <div className="bg-zinc-800/50 rounded-lg p-4">
                                <h4 className="font-semibold text-cyan-400 mb-3">⚙️ Modo de Comissão</h4>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                  <div className={`rounded-lg p-3 border ${adminConfigs.find(c => c.key === 'affiliate_commission_mode')?.value === 'system_margin' ? 'border-cyan-500/50 bg-cyan-500/5' : 'border-zinc-700 bg-zinc-900'}`}>
                                    <div className="font-semibold text-sm">Margem do Sistema</div>
                                    <div className="text-xs text-zinc-400 mt-1">Comissão sobre a margem de lucro do sistema (30%). Mais sustentável — o dinheiro vem do lucro que o sistema retém, não dos ganhos dos usuários.</div>
                                    {adminConfigs.find(c => c.key === 'affiliate_commission_mode')?.value === 'system_margin' && <Badge className="mt-1 text-[9px] bg-cyan-500/10 text-cyan-400" variant="outline">Ativo</Badge>}
                                  </div>
                                  <div className={`rounded-lg p-3 border ${adminConfigs.find(c => c.key === 'affiliate_commission_mode')?.value === 'investment_profit' ? 'border-cyan-500/50 bg-cyan-500/5' : 'border-zinc-700 bg-zinc-900'}`}>
                                    <div className="font-semibold text-sm">Lucro de Investimento</div>
                                    <div className="text-xs text-zinc-400 mt-1">Comissão sobre lucro de ROI + bônus de investimento (2%). O dinheiro vem dos ganhos de trading — mais arriscado.</div>
                                    {adminConfigs.find(c => c.key === 'affiliate_commission_mode')?.value === 'investment_profit' && <Badge className="mt-1 text-[9px] bg-cyan-500/10 text-cyan-400" variant="outline">Ativo</Badge>}
                                  </div>
                                  <div className={`rounded-lg p-3 border ${adminConfigs.find(c => c.key === 'affiliate_commission_mode')?.value === 'revenue_pool' ? 'border-cyan-500/50 bg-cyan-500/5' : 'border-zinc-700 bg-zinc-900'}`}>
                                    <div className="font-semibold text-sm">Pool de Receita</div>
                                    <div className="text-xs text-zinc-400 mt-1">5% da receita total → pool distribuído por nível. Previsível e limitado — nunca excede X% da receita.</div>
                                    {adminConfigs.find(c => c.key === 'affiliate_commission_mode')?.value === 'revenue_pool' && <Badge className="mt-1 text-[9px] bg-cyan-500/10 text-cyan-400" variant="outline">Ativo</Badge>}
                                  </div>
                                </div>
                              </div>

                              {/* Key System Configs */}
                              <div className="bg-zinc-800/50 rounded-lg p-4">
                                <h4 className="font-semibold text-cyan-400 mb-3">🔧 Configurações-Chave do Sistema</h4>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                  {[
                                    { label: 'Depósito Mínimo', key: 'min_deposit_usdt', suffix: ' USDT' },
                                    { label: 'Saque Mínimo', key: 'min_withdrawal_usdt', suffix: ' USDT' },
                                    { label: 'Taxa de Saque', key: 'withdrawal_fee_pct', suffix: '%' },
                                    { label: 'Share de Lucro', key: 'default_profit_share_pct', suffix: '%' },
                                    { label: 'Variação ROI', key: 'mining_variance_pct', suffix: '%' },
                                    { label: 'Margem Sistema', key: 'affiliate_system_margin_pct', suffix: '%' },
                                    { label: 'Cap Diário Afiliado', key: 'affiliate_daily_cap_usd', suffix: ' USDT' },
                                    { label: 'Taxa Saque Afiliado', key: 'affiliate_withdrawal_fee_pct', suffix: '%' },
                                    { label: 'Reserva Mínima', key: 'system_min_reserve', suffix: '%' },
                                  ].map(cfg => {
                                    const config = adminConfigs.find(c => c.key === cfg.key);
                                    return (
                                      <div key={cfg.key} className="bg-zinc-900 rounded-lg p-2.5 border border-zinc-700">
                                        <div className="text-[10px] text-zinc-500">{cfg.label}</div>
                                        <div className="font-semibold text-sm">{config ? config.value + cfg.suffix : '—'}{!config && cfg.key === 'default_profit_share_pct' && '70%'}{!config && cfg.key === 'mining_variance_pct' && '5%'}</div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>

                              {/* Copy Traders from DB */}
                              <div className="bg-zinc-800/50 rounded-lg p-4">
                                <h4 className="font-semibold text-cyan-400 mb-3">📊 Traders Configurados</h4>
                                <div className="overflow-x-auto">
                                  <Table className="min-w-[500px]">
                                    <TableHeader>
                                      <TableRow className="border-zinc-700">
                                        <TableHead className="text-zinc-400 text-xs">Trader</TableHead>
                                        <TableHead className="text-zinc-400 text-xs">Coin</TableHead>
                                        <TableHead className="text-zinc-400 text-xs">Win Rate</TableHead>
                                        <TableHead className="text-zinc-400 text-xs">Receita/Dia</TableHead>
                                        <TableHead className="text-zinc-400 text-xs">Preço/Dia</TableHead>
                                        <TableHead className="text-zinc-400 text-xs">Share</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {adminCopyTraders.map(m => (
                                        <TableRow key={m.id} className="border-zinc-700">
                                          <TableCell className="text-xs font-medium">{m.name}</TableCell>
                                          <TableCell className="text-xs"><Badge className={`${assetColor(m.coin)} bg-zinc-800 border-zinc-700 text-[10px]`} variant="outline">{m.coin}</Badge></TableCell>
                                          <TableCell className="text-xs">{m.winRate}</TableCell>
                                          <TableCell className="text-xs text-cyan-400">${fmtUSDT(m.dailyRevenue)}</TableCell>
                                          <TableCell className="text-xs">${fmtUSDT(m.pricePerDay)}</TableCell>
                                          <TableCell className="text-xs">{m.profitSharePct}%</TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </div>
                              </div>

                              {/* Sustainability Info */}
                              <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-4">
                                <h4 className="font-semibold text-amber-400 mb-2">🛡️ Salvaguardas de Sustentabilidade</h4>
                                <ul className="text-xs text-zinc-400 space-y-1">
                                  <li>• Reserva mínima do sistema: 15% dos depósitos totais</li>
                                  <li>• Cap diário de comissões afiliados: configurável (0 = sem limite)</li>
                                  <li>• Calificación obligatoria: inversor + enlace desbloqueado para recibir comisiones</li>
                                  <li>• Profundidade máxima: 5 níveis de afiliados</li>
                                  <li>• Variação diária de ROI: ±5% (simula flutuação real)</li>
                                  <li>• 3 modos de comissão para equilibrar atratividade e sustentabilidade</li>
                                </ul>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    )}

                    {/* Admin Logs */}
                    {adminTab === 'logs' && (
                      <Card className="bg-zinc-900 border-zinc-800">
                        <CardContent className="p-0 overflow-x-auto">
                          <Table className="min-w-[600px]">
                            <TableHeader><TableRow className="border-zinc-800 hover:bg-transparent">
                              <TableHead className="text-zinc-400">{t('admin.date')}</TableHead><TableHead className="text-zinc-400">{t('admin.admin')}</TableHead>
                              <TableHead className="text-zinc-400">{t('admin.action')}</TableHead><TableHead className="text-zinc-400">{t('admin.entity')}</TableHead>
                              <TableHead className="text-zinc-400">{t('admin.description')}</TableHead>
                            </TableRow></TableHeader>
                            <TableBody>
                              {adminLogs.map(log => (
                                <TableRow key={log.id} className="border-zinc-800">
                                  <TableCell className="text-sm text-zinc-400 whitespace-nowrap">{fmtDateTime(log.createdAt)}</TableCell>
                                  <TableCell className="text-sm">{log.admin?.name || '-'}</TableCell>
                                  <TableCell><Badge variant="outline" className={`text-xs ${
                                    log.action === 'create' ? 'border-cyan-500/30 text-cyan-400' :
                                    log.action === 'update' ? 'border-blue-500/30 text-blue-400' :
                                    log.action === 'delete' ? 'border-red-500/30 text-red-400' :
                                    log.action === 'approve' ? 'border-cyan-500/30 text-cyan-400' :
                                    'border-amber-500/30 text-amber-400'
                                  }`}>{log.action}</Badge></TableCell>
                                  <TableCell className="text-sm">{log.entity}</TableCell>
                                  <TableCell className="text-sm text-zinc-400 max-w-[300px] truncate">{log.description}</TableCell>
                                </TableRow>
                              ))}
                              {adminLogs.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-zinc-500 py-8">{t('admin.logs')}</TableCell></TableRow>}
                            </TableBody>
                          </Table>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>

      {/* MOBILE BOTTOM NAV */}
      <nav className="fixed bottom-0 left-0 right-0 bg-[#0a0a0f]/90 backdrop-blur-xl border-t border-white/[0.06] lg:hidden z-50 safe-area-bottom">
        <div className="flex justify-around py-1.5 px-1 pb-[max(0.375rem,env(safe-area-inset-bottom))]">
          {/* Show only 5 key items on mobile: Home, Investir, Extrato, Afiliados, Perfil */}
          {navItems
            .filter(item => mobileNavIds.includes(item.id))
            .slice(0, 5)
            .map(item => (
              <button key={item.id} onClick={() => setActiveTab(item.id)} className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-lg text-[10px] whitespace-nowrap min-w-[52px] transition-all duration-200 ${activeTab === item.id ? 'text-emerald-400' : 'text-zinc-500 active:text-zinc-300'}`}>
                <item.icon className={`h-5 w-5 ${activeTab === item.id ? 'drop-shadow-[0_0_4px_rgba(16,185,129,0.5)]' : ''}`} />
                <span className="font-medium">{item.id === 'home' ? t('sidebar.home') : item.label}</span>
              </button>
            ))}
        </div>
      </nav>

      {/* ====== DIALOGS ====== */}

      {/* Invest in Plan Dialog */}
      <Dialog open={!!investDialogPlan} onOpenChange={() => { setInvestDialogPlan(null); setInvestAmount(''); setUseVoucherForInvest(false); setSelectedVoucherId(''); }}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-md w-[95vw] sm:w-full">
          <DialogHeader>
            <DialogTitle>{t('copyTraders.invest')} — {investDialogPlan?.name}</DialogTitle>
            <DialogDescription className="text-zinc-400">
              {investDialogPlan?.specialty || t('copyTraders.copyTrader')} • {investDialogPlan?.plans?.[0]?.dailyRoiPct || 5}% {t('landing.badges.dailyRoi')}/{t('copyTraders.days').replace('dias','dia').replace('días','día')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Plan selection (if multiple plans) */}
            {investDialogPlan && (investDialogPlan.plans || []).length > 1 && (
              <div>
                <Label className="text-zinc-300 text-sm">{t('copyTraders.selectPlan')}</Label>
                <Select value={selectedPlanId || ''} onValueChange={v => { setSelectedPlanId(v); const p = (investDialogPlan.plans || []).find(pp => pp.id === v); if (p) { setInvestmentDuration(p.days || p.durationDays); setInvestAmount(String(d(p.minAmount) || 10)); } }}>
                  <SelectTrigger className="bg-zinc-800 border-zinc-700 mt-1"><SelectValue placeholder={t('copyTraders.selectPlan')} /></SelectTrigger>
                  <SelectContent className="bg-zinc-800">
                    {(investDialogPlan.plans || []).map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.name} - {p.durationDays || p.days || '?'} {t('copyTraders.days')}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Investment Amount Input */}
            {(() => {
              const plan = selectedPlanId ? investDialogPlan?.plans?.find((p: any) => p.id === selectedPlanId) : investDialogPlan?.plans?.[0];
              const minAmt = d(plan?.minAmount) || 10;
              const maxAmt = d(plan?.maxAmount) || 100000;
              const durationDays = plan?.durationDays || plan?.days || 35;
              return (
                <div>
                  <Label className="text-zinc-300 text-sm">{t('copyTraders.totalInvestment')} (USDT)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min={minAmt}
                    max={maxAmt}
                    value={investAmount}
                    onChange={e => setInvestAmount(e.target.value)}
                    className="bg-zinc-800 border-zinc-700 mt-1"
                    placeholder={`${minAmt} - ${maxAmt}`}
                  />
                  <div className="text-xs text-zinc-500 mt-1">
                    {t('copyTraders.minMax', { min: String(minAmt), max: String(maxAmt) })} • {durationDays} {t('copyTraders.days')}
                  </div>
                </div>
              );
            })()}

            {/* Summary */}
            <div className="bg-zinc-800 rounded-lg p-4 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-zinc-400">{t('copyTraders.totalInvestment')}</span><span className="font-medium">${fmtUSDT(rentalCalc.totalPrice)} USDT</span></div>
              <div className="flex justify-between"><span className="text-zinc-400">{t('copyTraders.dailyProfit')}</span><span className="text-cyan-400 font-medium">${fmtUSDT(rentalCalc.dailyReturn)} USDT</span></div>
              <div className="flex justify-between"><span className="text-zinc-400">{t('copyTraders.totalProfit')}</span><span className="text-cyan-400 font-medium">${fmtUSDT(rentalCalc.totalReturn)} USDT</span></div>
              <Separator className="bg-zinc-700" />
              <div className="flex justify-between"><span className="text-zinc-400">{t('copyTraders.yourBalance')}</span><span className={d(user.balance) >= rentalCalc.totalPrice ? 'text-cyan-400' : 'text-red-400'}>${fmtUSDT(user.balance)} USDT</span></div>
            </div>

            {/* Insufficient balance warning */}
            {d(user.balance) < rentalCalc.totalPrice && !useVoucherForInvest && rentalCalc.totalPrice > 0 && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2 text-red-400 text-sm font-medium">
                  <AlertTriangle className="h-4 w-4" /> {t('dashboard.insufficientBalance')}
                </div>
                <p className="text-zinc-400 text-xs">{t('copyTraders.needDeposit', { amount: fmtUSDT(rentalCalc.totalPrice) })}</p>
                <Button
                  className="w-full bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-white font-semibold rounded-xl shadow-lg shadow-emerald-500/20"
                  onClick={() => { setInvestDialogPlan(null); setDepositDialog(true); }}
                >
                  <Wallet className="mr-2 h-4 w-4" /> {t('dashboard.deposit')}
                </Button>
              </div>
            )}

            {/* Payment Method Selection - Voucher */}
            {userVouchers.filter(v => v.status === 'active').length > 0 && (
              <div className="space-y-2 p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
                <div className="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    id="useVoucher" 
                    checked={useVoucherForInvest} 
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setUseVoucherForInvest(checked);
                      // Auto-fill amount from plan minAmount if current amount is empty or 0
                      if (checked && (!investAmount || parseFloat(investAmount) <= 0)) {
                        const plan = selectedPlanId
                          ? investDialogPlan?.plans?.find((p: any) => p.id === selectedPlanId)
                          : investDialogPlan?.plans?.[0];
                        if (plan) {
                          const minAmt = d(plan.minAmount) || 10;
                          setInvestAmount(String(minAmt));
                        }
                      }
                      // Auto-select first available voucher
                      if (checked && !selectedVoucherId) {
                        const firstActive = userVouchers.find((v: any) => v.status === 'active');
                        if (firstActive) setSelectedVoucherId(firstActive.id);
                      }
                    }} 
                    className="rounded accent-purple-500"
                  />
                  <Label htmlFor="useVoucher" className="text-purple-400 text-sm font-medium cursor-pointer">
                    🎫 {t('copyTraders.useVoucherBalance')}
                  </Label>
                </div>
                {useVoucherForInvest && (
                  <div className="space-y-2 pl-6">
                    <Select value={selectedVoucherId} onValueChange={setSelectedVoucherId}>
                      <SelectTrigger className="bg-zinc-800 border-zinc-700 mt-1">
                        <SelectValue placeholder={t('copyTraders.selectVoucher')} />
                      </SelectTrigger>
                      <SelectContent>
                        {userVouchers
                          .filter(v => v.status === 'active')
                          .map(v => {
                            const avail = d(v.amount) - d(v.usedAmount);
                            const plan = selectedPlanId
                              ? investDialogPlan?.plans?.find((p: any) => p.id === selectedPlanId)
                              : investDialogPlan?.plans?.[0];
                            const minAmt = plan ? d(plan.minAmount) || 10 : 10;
                            return (
                              <SelectItem key={v.id} value={v.id} disabled={avail < minAmt}>
                                {v.type === 'basic' ? t('copyTraders.planBasic') : v.type === 'premium' ? t('copyTraders.planPremium') : t('copyTraders.planCustom')} — {fmtUSDT(avail)} USDT
                              </SelectItem>
                            );
                          })}
                      </SelectContent>
                    </Select>
                    <div className="text-xs text-zinc-500">
                      {t('copyTraders.voucherOnlyInvest')}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Total & Pay Button */}
            <div className="space-y-2 bg-zinc-800/50 p-3 rounded-lg">
              <div className="flex justify-between text-sm">
                <span className="text-zinc-400">{t('plans.totalPrice')}:</span>
                <span className="font-medium">{fmtUSDT(rentalCalc.totalPrice)} USDT</span>
              </div>
              {useVoucherForInvest ? (
                <div className="flex justify-between text-sm">
                  <span className="text-purple-400">{t('copyTraders.paymentVia')}:</span>
                  <span className="text-purple-400 font-medium">{t('copyTraders.voucherBalance')} 🎫</span>
                </div>
              ) : (
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">{t('copyTraders.yourBalance')}:</span>
                  <span className={d(user?.balance || '0') >= rentalCalc.totalPrice ? 'text-cyan-400' : 'text-red-400'}>{fmtUSDT(user?.balance || '0')} USDT</span>
                </div>
              )}
            </div>

            <Button 
              className="bg-emerald-600 hover:bg-cyan-700 w-full" 
              onClick={handleRent} 
              disabled={investLoading || rentalCalc.totalPrice <= 0 || (
                useVoucherForInvest 
                  ? (!selectedVoucherId || d(userVouchers.find(v => v.id === selectedVoucherId)?.amount || '0') - d(userVouchers.find(v => v.id === selectedVoucherId)?.usedAmount || '0') < rentalCalc.totalPrice)
                  : d(user?.balance || '0') < rentalCalc.totalPrice
              )}
            >
              {investLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {useVoucherForInvest ? t('copyTraders.investWithVoucher') : t('copyTraders.confirmInvest')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Deposit Dialog */}
      <Dialog open={depositDialog} onOpenChange={(open) => { setDepositDialog(open); if (!open) resetNpDeposit(); }}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-lg w-[95vw] sm:w-full">
          <DialogHeader>
            <DialogTitle>{t('dashboard.deposit')}</DialogTitle>
            <DialogDescription className="text-zinc-400">
              {siteConfig.nowpaymentsEnabled && siteConfig.manualDepositEnabled
                ? t('deposit.nowpaymentsOrManual')
                : siteConfig.nowpaymentsEnabled
                  ? t('deposit.nowpaymentsTitle')
                  : siteConfig.manualDepositEnabled
                    ? t('deposit.manualOnly')
                    : t('deposit.unavailable')}
            </DialogDescription>
          </DialogHeader>

          {!npDepositAddress ? (
            <div className="space-y-4">
              {/* NowPayments Auto Deposit — ONLY if enabled in admin settings */}
              {siteConfig.nowpaymentsEnabled && (
                <>
                  <div><Label className="text-zinc-300">{t('deposit.amount')}</Label><Input type="number" step="0.01" min={siteConfig.minDepositUsdt} value={npDepositAmount} onChange={e => setNpDepositAmount(e.target.value)} className="bg-zinc-800 border-zinc-700 mt-1" placeholder={String(siteConfig.minDepositUsdt)} />
                    <p className="text-zinc-500 text-xs mt-1">{t('deposit.minAmount', { amount: siteConfig.minDepositUsdt })}</p>
                  </div>
                  <div><Label className="text-zinc-300">{t('deposit.payCurrency')}</Label>
                    {availableDepositCurrencies.length > 0 ? (
                      <Select value={npDepositCurrency} onValueChange={setNpDepositCurrency}>
                        <SelectTrigger className="bg-zinc-800 border-zinc-700 mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-zinc-800">
                          {availableDepositCurrencies.map(c => (
                            <SelectItem key={c} value={c}>{currencyLabel(c)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 mt-1 text-center">
                        <AlertTriangle className="h-8 w-8 text-amber-400 mx-auto mb-2" />
                        <p className="text-amber-400 font-semibold text-sm">Meios de pagamento em manutenção</p>
                        <p className="text-zinc-500 text-xs mt-1">Os métodos de depósito estão temporariamente indisponíveis. Tente novamente em alguns instantes.</p>
                      </div>
                    )}
                  </div>
                  {availableDepositCurrencies.length > 0 && (
                  <div className="bg-zinc-800/50 rounded-lg p-3 text-sm">
                    <p className="text-zinc-400">{t('deposit.clickGenerateAddress')}</p>
                    <p className="text-zinc-500 text-xs mt-1">{t('deposit.autoCredit')}</p>
                  </div>
                  )}
                  <DialogFooter>
                    <Button variant="outline" className="border-zinc-700" onClick={() => setDepositDialog(false)}>{t('common.cancel')}</Button>
                    <Button className="bg-emerald-600 hover:bg-cyan-700" onClick={handleNowPaymentsDeposit} disabled={npGeneratingAddress || !npDepositAmount || parseFloat(npDepositAmount) < siteConfig.minDepositUsdt || availableDepositCurrencies.length === 0}>
                      {npGeneratingAddress && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} {t('deposit.generateAddress')}
                    </Button>
                  </DialogFooter>
                </>
              )}

              {/* Separator — ONLY if BOTH NowPayments AND Manual are enabled */}
              {siteConfig.nowpaymentsEnabled && siteConfig.manualDepositEnabled && (
                <div className="relative">
                  <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-zinc-700" /></div>
                  <div className="relative flex justify-center text-xs"><span className="bg-zinc-900 px-2 text-zinc-500">{t('deposit.orManualDeposit')}</span></div>
                </div>
              )}

              {/* Manual Deposit — ONLY if enabled in admin settings */}
              {siteConfig.manualDepositEnabled && (() => {
                const manualMethods = [];
                if (siteConfig.hasPix) manualMethods.push({ value: 'pix', label: 'PIX' });
                if (siteConfig.hasUsdt) {
                  manualMethods.push({ value: 'usdt_trc20', label: 'USDT TRC20' });
                  manualMethods.push({ value: 'usdt_polygon', label: 'USDT Polygon' });
                }
                if (manualMethods.length === 0) return null;
                return (
                  <form onSubmit={handleDeposit} className="space-y-3">
                    <div><Label className="text-zinc-300 text-xs">{t('deposit.amount')}</Label><Input name="amount" type="number" step="0.01" min={siteConfig.minDepositUsdt} required className="bg-zinc-800 border-zinc-700 mt-1" placeholder={String(siteConfig.minDepositUsdt)} /></div>
                    <div><Label className="text-zinc-300 text-xs">{t('deposit.method')}</Label>
                      <Select name="method" defaultValue={manualMethods[0].value}><SelectTrigger className="bg-zinc-800 border-zinc-700 mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-zinc-800">
                          {manualMethods.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                        </SelectContent></Select>
                    </div>
                    <div><Label className="text-zinc-300 text-xs">{t('deposit.txHash')}</Label><Input name="txHash" className="bg-zinc-800 border-zinc-700 mt-1" placeholder={t('deposit.txHashPlaceholder')} /></div>
                    <Button type="submit" className="w-full bg-zinc-700 hover:bg-zinc-600 text-sm" disabled={depositLoading}>
                      {depositLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} {t('deposit.manualDeposit')}
                    </Button>
                  </form>
                );
              })()}

              {/* Neither option available */}
              {!siteConfig.nowpaymentsEnabled && !siteConfig.manualDepositEnabled && (
                <div className="text-center py-6">
                  <AlertTriangle className="h-10 w-10 text-amber-400 mx-auto mb-3" />
                  <p className="text-zinc-400">{t('deposit.unavailable')}</p>
                  <p className="text-zinc-500 text-xs mt-1">{t('deposit.unavailableDesc')}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Status Badge */}
              {npDepositStatus && (
                <div className="flex items-center justify-center gap-2 text-sm">
                  <div className={`h-2.5 w-2.5 rounded-full ${
                    npDepositStatus === 'waiting' ? 'bg-amber-400 animate-pulse' :
                    ['confirming', 'confirmed', 'sending'].includes(npDepositStatus) ? 'bg-blue-400 animate-pulse' :
                    npDepositStatus === 'finished' ? 'bg-emerald-400' :
                    'bg-red-400'
                  }`} />
                  <span className={`font-medium ${
                    npDepositStatus === 'waiting' ? 'text-amber-400' :
                    ['confirming', 'confirmed', 'sending'].includes(npDepositStatus) ? 'text-blue-400' :
                    npDepositStatus === 'finished' ? 'text-cyan-400' :
                    'text-red-400'
                  }`}>
                    {npDepositStatus === 'waiting' && t('deposit.waitingPayment')}
                    {npDepositStatus === 'confirming' && t('deposit.confirming')}
                    {npDepositStatus === 'confirmed' && t('deposit.confirmedProcessing')}
                    {npDepositStatus === 'sending' && t('deposit.sendingToAccount')}
                    {npDepositStatus === 'finished' && t('deposit.depositComplete')}
                    {npDepositStatus === 'failed' && t('deposit.depositFailed')}
                    {npDepositStatus === 'expired' && t('deposit.depositExpired')}
                  </span>
                </div>
              )}

              {/* QR Code */}
              <div className="flex flex-col items-center">
                <div className="bg-white p-3 rounded-xl shadow-lg shadow-emerald-500/10">
                  <QRCodeSVG
                    value={npDepositAddress}
                    size={180}
                    level="H"
                    includeMargin={false}
                    bgColor="#ffffff"
                    fgColor="#0a0a0a"
                  />
                </div>
                <p className="text-zinc-500 text-xs mt-2">Escaneie o QR Code com sua carteira</p>
              </div>

              {/* Amount Details */}
              <div className="bg-zinc-800/80 rounded-lg p-4 border border-zinc-700/50 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400 text-sm">Valor USDT</span>
                  <span className="text-white font-bold text-lg">{npPriceAmount || npDepositAmount} USDT</span>
                </div>
                {npPayAmount && (
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400 text-sm">Valor em {npDepositCurrency.toUpperCase()}</span>
                    <span className="text-cyan-400 font-semibold">{npPayAmount} {npDepositCurrency.toUpperCase()}</span>
                  </div>
                )}
                {npEstimatedFee > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400 text-sm">Taxa de serviço</span>
                    <span className="text-zinc-300 text-sm">{npEstimatedFee}%</span>
                  </div>
                )}
                <Separator className="bg-zinc-700/50" />
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400 text-sm">Rede</span>
                  <Badge variant="outline" className="border-cyan-500/30 text-cyan-400 bg-cyan-500/10">
                    {npDepositCurrency === 'usdttrc20' ? 'TRC20' :
                     npDepositCurrency === 'usdtmatic' ? 'Polygon' :
                     npDepositCurrency === 'btc' ? 'Bitcoin' :
                     npDepositCurrency === 'eth' ? 'Ethereum' :
                     npDepositCurrency === 'trx' ? 'TRON' :
                     npDepositCurrency.toUpperCase()}
                  </Badge>
                </div>
                {npCountdown && (
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400 text-sm">Expira em</span>
                    <span className={`text-sm font-mono ${npCountdown === 'Expirado' ? 'text-red-400' : 'text-amber-400'}`}>
                      <Clock4 className="h-3 w-3 inline mr-1" />{npCountdown}
                    </span>
                  </div>
                )}
              </div>

              {/* Wallet Address */}
              <div className="bg-zinc-800 rounded-lg p-4 border border-zinc-700">
                <Label className="text-zinc-400 text-xs mb-2 block">Endereço da Carteira</Label>
                <div className="flex items-center gap-2">
                  <code className="text-cyan-400 text-xs sm:text-sm break-all flex-1 font-mono leading-relaxed">{npDepositAddress}</code>
                  <Button variant="ghost" size="sm" onClick={copyDepositAddress} className="text-zinc-400 hover:text-white shrink-0 hover:bg-zinc-700">
                    {npAddressCopied ? <Check className="h-4 w-4 text-cyan-400" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              {/* Warnings */}
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-sm">
                <p className="text-amber-300 font-medium flex items-center gap-1"><AlertTriangle className="h-4 w-4" /> Importante:</p>
                <ul className="text-amber-200/70 text-xs mt-1.5 space-y-1">
                  <li>• Envie exatamente o valor especificado para este endereço</li>
                  <li>• Use apenas a rede <strong>{npDepositCurrency === 'usdttrc20' ? 'TRC20' : npDepositCurrency === 'usdtmatic' ? 'Polygon' : npDepositCurrency.toUpperCase()}</strong> — envios por outra rede resultarão em perda</li>
                  <li>• O saldo será creditado automaticamente após confirmação na blockchain</li>
                  <li>• Não envie outros tokens para este endereço</li>
                </ul>
              </div>

              <Button variant="outline" className="w-full border-zinc-700" onClick={() => { resetNpDeposit(); }}>Gerar Novo Endereço</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Withdraw Dialog */}
      <Dialog open={withdrawDialog} onOpenChange={setWithdrawDialog}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-md w-[95vw] sm:w-full">
          <DialogHeader>
            <DialogTitle>{t('dashboard.withdraw')}</DialogTitle>
            <DialogDescription className="text-zinc-400">
              {siteConfig.manualWithdrawalEnabled && siteConfig.nowpaymentsWithdrawalEnabled
                ? t('withdrawal.manualOrAuto')
                : siteConfig.nowpaymentsWithdrawalEnabled
                  ? t('withdrawal.autoWithdraw')
                  : siteConfig.manualWithdrawalEnabled
                    ? t('withdrawal.manualOnly')
                    : t('withdrawal.unavailable')}
            </DialogDescription>
          </DialogHeader>

          {!siteConfig.manualWithdrawalEnabled && !siteConfig.nowpaymentsWithdrawalEnabled ? (
            <div className="text-center py-6">
              <AlertTriangle className="h-10 w-10 text-amber-400 mx-auto mb-3" />
              <p className="text-zinc-400">{t('withdrawal.unavailable')}</p>
              <p className="text-zinc-500 text-xs mt-1">{t('deposit.unavailableDesc')}</p>
            </div>
          ) : (
          <form onSubmit={handleWithdraw} className="space-y-4">
                        {/* Withdrawal Breakdown — Abordagem B (Bloqueio por Origem) */}
                        {withdrawVoucherInfo && withdrawVoucherInfo.hasActiveVoucher ? (
                          <div className={`p-4 rounded-lg border ${
                            withdrawVoucherInfo.unlockPct === 0 && withdrawVoucherInfo.voucherProfits > 0
                              ? 'bg-red-500/10 border-red-500/20'
                              : withdrawVoucherInfo.unlockPct < 100
                                ? 'bg-amber-500/10 border-amber-500/20'
                                : 'bg-cyan-500/10 border-cyan-500/20'
                          }`}>
                            <div className="text-sm font-semibold mb-2 text-white">💰 Composição do Saldo</div>
                            <div className="space-y-1.5 text-xs">
                              <div className="flex justify-between items-center">
                                <span className="text-zinc-300">💵 Recursos próprios</span>
                                <span className="text-emerald-400 font-medium">${fmtUSDT(withdrawVoucherInfo.ownSource)} ✅</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-zinc-300">📈 Lucros de voucher</span>
                                <span className={withdrawVoucherInfo.unlockPct >= 100 ? 'text-cyan-400' : withdrawVoucherInfo.unlockPct > 0 ? 'text-amber-400' : 'text-red-400'}>
                                  ${fmtUSDT(withdrawVoucherInfo.voucherProfits)} {withdrawVoucherInfo.unlockPct >= 100 ? '✅' : `⚠️ ${withdrawVoucherInfo.unlockPct}%`}
                                </span>
                              </div>
                              <div className="border-t border-zinc-700 pt-1.5 mt-1.5 flex justify-between items-center">
                                <span className="text-zinc-200 font-medium">🎯 Máximo sacável</span>
                                <span className="text-cyan-400 font-bold">${fmtUSDT(withdrawVoucherInfo.maxWithdrawable)} USDT</span>
                              </div>
                            </div>
                            {withdrawVoucherInfo.unlockPct < 100 && withdrawVoucherInfo.voucherProfits > 0 && (
                              <div className="text-xs text-zinc-400 mt-2 pt-2 border-t border-zinc-700/50">
                                💡 Recursos próprios (depósitos + lucros próprios) são sempre liberados. Apenas lucros de voucher são bloqueados pelas metas.
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="p-3 rounded-lg border bg-cyan-500/10 border-cyan-500/20">
                            <div className="text-xs text-zinc-300">
                              💰 Saldo disponível: <span className="text-cyan-400 font-medium">${fmtUSDT(user?.balance || '0')} USDT</span> — 100% liberado
                            </div>
                          </div>
                        )}
            <div><Label className="text-zinc-300">{t('withdrawal.amount')}</Label><Input name="amount" type="number" step="0.01" min={siteConfig.minWithdrawalUsdt} max={withdrawVoucherInfo?.hasActiveVoucher ? withdrawVoucherInfo.maxWithdrawable : d(user?.balance)} required className="bg-zinc-800 border-zinc-700 mt-1" placeholder={String(siteConfig.minWithdrawalUsdt)} />
              <div className="text-xs text-zinc-500 mt-1">{t('withdrawal.availableBalance')}: ${fmtUSDT(withdrawVoucherInfo?.hasActiveVoucher ? withdrawVoucherInfo.maxWithdrawable : d(user?.balance || '0'))} USDT · {t('withdrawal.minimum')}: {siteConfig.minWithdrawalUsdt} USDT{siteConfig.withdrawalFeePct > 0 ? ` · ${t('withdrawal.fee')}: ${siteConfig.withdrawalFeePct}%` : ''}</div>
            </div>
            {siteConfig.nowpaymentsWithdrawalEnabled && (
              <>
                <div><Label className="text-zinc-300">{t('withdrawal.currency')}</Label>
                  {availableWithdrawCurrencies.length > 0 ? (
                  <Select name="method" defaultValue={availableWithdrawCurrencies[0]}><SelectTrigger className="bg-zinc-800 border-zinc-700 mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-zinc-800">
                      {availableWithdrawCurrencies.map(c => (
                        <SelectItem key={c} value={c}>{currencyLabel(c)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  ) : (
                    <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 mt-1 text-center">
                      <AlertTriangle className="h-8 w-8 text-amber-400 mx-auto mb-2" />
                      <p className="text-amber-400 font-semibold text-sm">Meios de saque em manutenção</p>
                      <p className="text-zinc-500 text-xs mt-1">Os métodos de saque estão temporariamente indisponíveis. Tente novamente em alguns instantes.</p>
                    </div>
                  )}
                </div>
                <div><Label className="text-zinc-300">{t('withdrawal.destination')}</Label><Input name="destination" required className="bg-zinc-800 border-zinc-700 mt-1" placeholder={t('withdrawal.walletPlaceholder')} /></div>
                <div className="bg-zinc-800/50 rounded-lg p-3 text-sm">
                  <p className="text-zinc-400">{t('withdrawal.toWallet')}</p>
                </div>
              </>
            )}
            {siteConfig.manualWithdrawalEnabled && !siteConfig.nowpaymentsWithdrawalEnabled && (() => {
              const manualMethods = [];
              if (siteConfig.hasPix) manualMethods.push({ value: 'pix', label: 'PIX' });
              if (siteConfig.hasUsdt) {
                manualMethods.push({ value: 'usdt_trc20', label: 'USDT TRC20' });
                manualMethods.push({ value: 'usdt_polygon', label: 'USDT Polygon' });
              }
              if (manualMethods.length === 0) return null;
              return (
                <>
                  <div><Label className="text-zinc-300">{t('deposit.method')}</Label>
                    <Select name="method" defaultValue={manualMethods[0].value}><SelectTrigger className="bg-zinc-800 border-zinc-700 mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-zinc-800">
                        {manualMethods.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label className="text-zinc-300">{t('withdrawal.destination')}</Label><Input name="destination" required className="bg-zinc-800 border-zinc-700 mt-1" placeholder={t('withdrawal.pixOrWalletPlaceholder')} /></div>
                  <div className="bg-zinc-800/50 rounded-lg p-3 text-sm">
                    <p className="text-zinc-400">{t('withdrawal.manualReviewDesc')}</p>
                    <p className="text-zinc-500 text-xs mt-1">{t('withdrawal.manualReviewTime')}</p>
                  </div>
                </>
              );
            })()}
            <DialogFooter>
              <Button variant="outline" className="border-zinc-700" type="button" onClick={() => setWithdrawDialog(false)}>{t('common.cancel')}</Button>
              <Button type="submit" className="bg-emerald-600 hover:bg-cyan-700" disabled={withdrawLoading}>
                {withdrawLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} {t('dashboard.withdraw')}
              </Button>
            </DialogFooter>
          </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Admin CopyTrader Dialog */}
      <Dialog open={traderDialog.open} onOpenChange={() => setTraderDialog({ open: false })}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-lg max-h-[90vh] overflow-y-auto w-[95vw] sm:w-full">
          <DialogHeader><DialogTitle>{traderDialog.trader ? t('admin.edit') : t('admin.newPlan')} Trader</DialogTitle></DialogHeader>
          <form onSubmit={handleAdminTraderSave} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><Label className="text-zinc-300 text-xs">{t('admin.name')}</Label><Input name="name" defaultValue={traderDialog.trader?.name || ''} required className="bg-zinc-800 border-zinc-700 mt-1" /></div>
              <div><Label className="text-zinc-300 text-xs">{t('admin.model')}</Label><Input name="specialty" defaultValue={traderDialog.trader?.specialty || ''} required className="bg-zinc-800 border-zinc-700 mt-1" /></div>
              <div><Label className="text-zinc-300 text-xs">Win Rate</Label><Input name="winRate" defaultValue={traderDialog.trader?.winRate || ''} required className="bg-zinc-800 border-zinc-700 mt-1" /></div>
              <div><Label className="text-zinc-300 text-xs">Risk Level</Label>
                <Select name="riskLevel" defaultValue={traderDialog.trader?.riskLevel || 'medium'}>
                  <SelectTrigger className="bg-zinc-800 border-zinc-700 mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-zinc-800"><SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="high">High</SelectItem></SelectContent>
                </Select>
              </div>
              <div><Label className="text-zinc-300 text-xs">{t('admin.dailyRevenue')}</Label><Input name="monthlyRoi" defaultValue={traderDialog.trader?.monthlyRoi || ''} required className="bg-zinc-800 border-zinc-700 mt-1" /></div>
              <div><Label className="text-zinc-300 text-xs">Total PnL</Label><Input name="totalPnl" defaultValue={traderDialog.trader?.totalPnl || ''} required className="bg-zinc-800 border-zinc-700 mt-1" /></div>
              <div><Label className="text-zinc-300 text-xs">{t('admin.sortOrder')}</Label><Input name="sortOrder" type="number" defaultValue={traderDialog.trader?.sortOrder || 0} className="bg-zinc-800 border-zinc-700 mt-1" /></div>
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm text-zinc-300 py-2 cursor-pointer"><input type="checkbox" name="isActive" defaultChecked={traderDialog.trader?.isActive ?? true} className="accent-cyan-500" /> {t('admin.active')}</label>
              <label className="flex items-center gap-2 text-sm text-zinc-300 py-2 cursor-pointer"><input type="checkbox" name="isFeatured" defaultChecked={traderDialog.trader?.isFeatured ?? false} className="accent-cyan-500" /> {t('admin.featured')}</label>
            </div>
            <DialogFooter>
              <Button variant="outline" className="border-zinc-700" type="button" onClick={() => setTraderDialog({ open: false })}>{t('common.cancel')}</Button>
              <Button type="submit" className="bg-emerald-600 hover:bg-cyan-700" disabled={adminActionLoading}>
                {adminActionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} {t('admin.save')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Admin Plan Dialog */}
      <Dialog open={planDialog.open} onOpenChange={() => setPlanDialog({ open: false })}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-md w-[95vw] sm:w-full">
          <DialogHeader><DialogTitle>{planDialog.plan ? t('admin.edit') : t('admin.newPlan')} {t('adminSidebar.plans')}</DialogTitle></DialogHeader>
          <form onSubmit={handleAdminPlanSave} className="space-y-3">
            <div><Label className="text-zinc-300 text-xs">{t('admin.name')}</Label><Input name="name" defaultValue={planDialog.plan?.name || ''} required className="bg-zinc-800 border-zinc-700 mt-1" /></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><Label className="text-zinc-300 text-xs">{t('admin.dailyRoi')}</Label><Input name="dailyRoiPct" type="number" step="0.1" defaultValue={planDialog.plan?.dailyRoiPct || ''} required className="bg-zinc-800 border-zinc-700 mt-1" /></div>
              <div><Label className="text-zinc-300 text-xs">{t('admin.days')}</Label><Input name="durationDays" type="number" defaultValue={planDialog.plan?.durationDays || 30} required className="bg-zinc-800 border-zinc-700 mt-1" /></div>
              <div><Label className="text-zinc-300 text-xs">Min USDT</Label><Input name="minAmount" defaultValue={planDialog.plan?.minAmount || '10'} required className="bg-zinc-800 border-zinc-700 mt-1" /></div>
              <div><Label className="text-zinc-300 text-xs">Max USDT</Label><Input name="maxAmount" defaultValue={planDialog.plan?.maxAmount || ''} className="bg-zinc-800 border-zinc-700 mt-1" /></div>
            </div>
            <div><Label className="text-zinc-300 text-xs">{t('admin.description')}</Label><Input name="description" defaultValue={planDialog.plan?.description || ''} className="bg-zinc-800 border-zinc-700 mt-1" /></div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm text-zinc-300 py-2 cursor-pointer"><input type="checkbox" name="isActive" defaultChecked={planDialog.plan?.isActive ?? true} className="accent-cyan-500" /> {t('admin.active')}</label>
              <label className="flex items-center gap-2 text-sm text-zinc-300 py-2 cursor-pointer"><input type="checkbox" name="isFeatured" defaultChecked={planDialog.plan?.isFeatured ?? false} className="accent-cyan-500" /> {t('admin.featured')}</label>
            </div>
            <div><Label className="text-zinc-300 text-xs">{t('admin.sortOrder')}</Label><Input name="sortOrder" type="number" defaultValue={planDialog.plan?.sortOrder || 0} className="bg-zinc-800 border-zinc-700 mt-1 w-full sm:w-24" /></div>
            <DialogFooter>
              <Button variant="outline" className="border-zinc-700" type="button" onClick={() => setPlanDialog({ open: false })}>{t('common.cancel')}</Button>
              <Button type="submit" className="bg-emerald-600 hover:bg-cyan-700" disabled={adminActionLoading}>
                {adminActionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} {t('admin.save')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Admin User Dialog */}
      <Dialog open={userDialog.open} onOpenChange={() => setUserDialog({ open: false })}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-md w-[95vw] sm:w-full">
          <DialogHeader><DialogTitle>{t('admin.edit')} {t('admin.users')}</DialogTitle><DialogDescription className="text-zinc-400">{userDialog.user?.email}</DialogDescription></DialogHeader>
          <form onSubmit={handleAdminUserUpdate} className="space-y-3">
            <div><Label className="text-zinc-300 text-xs">{t('admin.name')}</Label><Input name="name" defaultValue={userDialog.user?.name || ''} className="bg-zinc-800 border-zinc-700 mt-1" /></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><Label className="text-zinc-300 text-xs">{t('admin.role')}</Label>
                <Select name="role" defaultValue={userDialog.user?.role || 'user'}>
                  <SelectTrigger className="bg-zinc-800 border-zinc-700 mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-zinc-800"><SelectItem value="user">{t('admin.user')}</SelectItem><SelectItem value="admin">{t('admin.admin')}</SelectItem></SelectContent>
                </Select>
              </div>
              <div><Label className="text-zinc-300 text-xs">{t('admin.balance')} (USDT)</Label><Input name="balance" defaultValue={userDialog.user?.balance || '0'} className="bg-zinc-800 border-zinc-700 mt-1" /></div>
            </div>
            <div><Label className="text-zinc-300 text-xs">{t('dashboard.affiliateBalance')} (USDT)</Label><Input name="affiliateBalance" defaultValue={userDialog.user?.affiliateBalance || '0'} className="bg-zinc-800 border-zinc-700 mt-1" /></div>
            <div><Label className="text-zinc-300 text-xs">{t('admin.walletAddress')}</Label><Input name="walletAddress" defaultValue={userDialog.user?.walletAddress || ''} className="bg-zinc-800 border-zinc-700 mt-1" /></div>
            <div><Label className="text-zinc-300 text-xs">{t('admin.pixKey')}</Label><Input name="pixKey" defaultValue={userDialog.user?.pixKey || ''} className="bg-zinc-800 border-zinc-700 mt-1" /></div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm text-zinc-300 py-2 cursor-pointer"><input type="checkbox" name="isActive" defaultChecked={userDialog.user?.isActive ?? true} className="accent-cyan-500" /> {t('admin.active')}</label>
              <label className="flex items-center gap-2 text-sm text-zinc-300 py-2 cursor-pointer"><input type="checkbox" name="linkUnlocked" defaultChecked={userDialog.user?.linkUnlocked ?? false} className="accent-cyan-500" /> {t('admin.linkUnlocked')}</label>
            </div>
            <DialogFooter>
              <Button variant="outline" className="border-zinc-700" type="button" onClick={() => setUserDialog({ open: false })}>{t('common.cancel')}</Button>
              <Button type="submit" className="bg-emerald-600 hover:bg-cyan-700" disabled={adminActionLoading}>
                {adminActionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} {t('admin.save')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Change Password Dialog */}
      <Dialog open={changePasswordDialog} onOpenChange={setChangePasswordDialog}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-md w-[95vw] sm:w-full">
          <DialogHeader>
            <DialogTitle>{t('admin.passwordChange')}</DialogTitle>
            <DialogDescription className="text-zinc-400">{t('profile.changePassword')}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <Label className="text-zinc-300 text-sm">{t('profile.currentPassword')}</Label>
              <Input name="currentPassword" type="password" required className="bg-zinc-800 border-zinc-700 mt-1" placeholder={t('profile.currentPassword')} />
            </div>
            <div>
              <Label className="text-zinc-300 text-sm">{t('profile.newPassword')}</Label>
              <Input name="newPassword" type="password" required minLength={6} className="bg-zinc-800 border-zinc-700 mt-1" placeholder={t('landing.auth.minPassword')} />
            </div>
            <div>
              <Label className="text-zinc-300 text-sm">{t('profile.confirmPassword')}</Label>
              <Input name="confirmPassword" type="password" required minLength={6} className="bg-zinc-800 border-zinc-700 mt-1" placeholder={t('profile.confirmPassword')} />
            </div>
            <DialogFooter>
              <Button variant="outline" className="border-zinc-700" type="button" onClick={() => setChangePasswordDialog(false)}>{t('common.cancel')}</Button>
              <Button type="submit" className="bg-emerald-600 hover:bg-cyan-700">{t('admin.passwordChange')}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* New Config Dialog */}
      <Dialog open={newConfigDialog} onOpenChange={setNewConfigDialog}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-md w-[95vw] sm:w-full">
          <DialogHeader>
            <DialogTitle>{t('admin.addConfig')}</DialogTitle>
            <DialogDescription className="text-zinc-400">{t('admin.addConfig')}</DialogDescription>
          </DialogHeader>
          <form onSubmit={async (e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const key = (form.key as HTMLInputElement).value;
            const value = (form.value as HTMLInputElement).value;
            const type = (form.type as HTMLSelectElement).value;
            const description = (form.description as HTMLInputElement).value;
            const category = (form.category as HTMLSelectElement).value;
            try {
              await api('/api/admin/config', {
                method: 'POST',
                body: JSON.stringify({ key, value, type, description: description || undefined, category }),
              });
              toast.success(t('toast.adminConfigSaveSuccess'));
              setNewConfigDialog(false);
              fetchAdminData();
            } catch (err: any) {
              toast.error(err.message);
            }
          }} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-zinc-300 text-xs">{t('admin.key')}</Label>
                <Input name="key" required className="bg-zinc-800 border-zinc-700 mt-1" placeholder="ex: site_name" />
              </div>
              <div>
                <Label className="text-zinc-300 text-xs">{t('admin.value')}</Label>
                <Input name="value" required className="bg-zinc-800 border-zinc-700 mt-1" placeholder="ex: PLATAFORMA ROI" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-zinc-300 text-xs">{t('admin.type')}</Label>
                <Select name="type" defaultValue="string">
                  <SelectTrigger className="bg-zinc-800 border-zinc-700 mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-zinc-800">
                    <SelectItem value="string">String</SelectItem>
                    <SelectItem value="number">Number</SelectItem>
                    <SelectItem value="boolean">Boolean</SelectItem>
                    <SelectItem value="json">JSON</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-zinc-300 text-xs">{t('admin.category')}</Label>
                <Select name="category" defaultValue="general">
                  <SelectTrigger className="bg-zinc-800 border-zinc-700 mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-zinc-800">
                    <SelectItem value="general">{t('category.general')}</SelectItem>
                    <SelectItem value="deposit">{t('category.deposit')}</SelectItem>
                    <SelectItem value="withdrawal">{t('category.withdrawal')}</SelectItem>
                    <SelectItem value="mining">{t('category.trading')}</SelectItem>
                    <SelectItem value="affiliate">{t('category.affiliate')}</SelectItem>
                    <SelectItem value="nowpayments">NowPayments</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-zinc-300 text-xs">{t('admin.description')}</Label>
              <Input name="description" className="bg-zinc-800 border-zinc-700 mt-1" placeholder={t('admin.optional')} />
            </div>
            <DialogFooter>
              <Button variant="outline" className="border-zinc-700" type="button" onClick={() => setNewConfigDialog(false)}>{t('common.cancel')}</Button>
              <Button type="submit" className="bg-emerald-600 hover:bg-cyan-700">{t('admin.save')}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Notes Dialog for Deposit/Withdrawal Actions */}
      <Dialog open={notesDialog.open} onOpenChange={(open) => { if (!open) { setNotesDialog({ open: false, id: '', action: 'approve', type: 'deposit' }); setAdminNotes(''); } }}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-md w-[95vw] sm:w-full">
          <DialogHeader>
            <DialogTitle>
              {notesDialog.action === 'approve' ? t('admin.approve') : notesDialog.action === 'complete' ? t('admin.complete') : t('admin.reject')} {notesDialog.type === 'deposit' ? t('admin.deposits') : t('admin.withdrawals')}
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              {notesDialog.action === 'reject' ? t('admin.reject') : notesDialog.action === 'approve' ? t('admin.approve') : t('admin.complete')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-zinc-300 text-sm">{t('admin.adminNotes')}</Label>
              <Textarea
                value={adminNotes}
                onChange={e => setAdminNotes(e.target.value)}
                className="bg-zinc-800 border-zinc-700 mt-1"
                placeholder={t('admin.notesPlaceholder')}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="border-zinc-700" onClick={() => { setNotesDialog({ open: false, id: '', action: 'approve', type: 'deposit' }); setAdminNotes(''); }}>{t('common.cancel')}</Button>
            <Button
              className={notesDialog.action === 'reject' ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-cyan-700'}
              onClick={handleNotesAction}
            >
              {notesDialog.action === 'approve' ? t('admin.approve') : notesDialog.action === 'complete' ? t('admin.complete') : t('admin.reject')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <AlertDialog open={deleteConfirm.open} onOpenChange={() => setDeleteConfirm({ open: false, type: '', id: '', name: '' })}>
        <AlertDialogContent className="bg-zinc-900 border-zinc-800 text-white w-[95vw] sm:w-full">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('admin.deactivate')}</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              {t('admin.confirmActionDesc', { action: deleteConfirm.type, type: deleteConfirm.type })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-zinc-700 bg-zinc-800 text-white hover:bg-zinc-700">{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700 text-white" onClick={handleAdminDelete} disabled={adminActionLoading}>
              {adminActionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} {t('admin.deactivate')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Rank Dialog */}
      <Dialog open={rankDialog.open} onOpenChange={(open) => setRankDialog({ open, rank: rankDialog.rank })}>
        <DialogContent className="bg-zinc-900 border-zinc-800 max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{rankDialog.rank ? t('admin.edit') : t('admin.newRank')}</DialogTitle></DialogHeader>
          <form onSubmit={handleAdminRankSave} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label className="text-zinc-400">{t('admin.rankName')}</Label><Input name="name" defaultValue={rankDialog.rank?.name || ''} required className="bg-zinc-800 border-zinc-700 mt-1" /></div>
              <div><Label className="text-zinc-400">{t('admin.rankIcon')}</Label><Input name="icon" defaultValue={rankDialog.rank?.icon || '🥉'} className="bg-zinc-800 border-zinc-700 mt-1" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label className="text-zinc-400">{t('admin.rankColor')}</Label><Input name="color" type="color" defaultValue={rankDialog.rank?.color || '#CD7F32'} className="bg-zinc-800 border-zinc-700 mt-1 h-10" /></div>
              <div><Label className="text-zinc-400">{t('admin.sortOrder')}</Label><Input name="sortOrder" type="number" defaultValue={rankDialog.rank?.sortOrder || 0} className="bg-zinc-800 border-zinc-700 mt-1" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label className="text-zinc-400">{t('admin.minReferrals')}</Label><Input name="minReferrals" type="number" defaultValue={rankDialog.rank?.minReferrals || 0} className="bg-zinc-800 border-zinc-700 mt-1" /></div>
              <div><Label className="text-zinc-400">{t('admin.minEarnings')}</Label><Input name="minEarnings" defaultValue={rankDialog.rank?.minEarnings || '0'} className="bg-zinc-800 border-zinc-700 mt-1" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label className="text-zinc-400">{t('admin.bonusAmount')}</Label><Input name="bonusAmount" defaultValue={rankDialog.rank?.bonusAmount || '0'} className="bg-zinc-800 border-zinc-700 mt-1" /></div>
              <div><Label className="text-zinc-400">{t('admin.commissionBoost')}</Label><Input name="commissionBoost" defaultValue={rankDialog.rank?.commissionBoost || '0'} className="bg-zinc-800 border-zinc-700 mt-1" /></div>
            </div>
            <div><Label className="text-zinc-400">{t('admin.perks')}</Label><Textarea name="perks" defaultValue={rankDialog.rank?.perks || ''} className="bg-zinc-800 border-zinc-700 mt-1" rows={2} placeholder="Benefit 1, Benefit 2..." /></div>
            <div className="flex items-center gap-2"><input type="checkbox" name="isActive" defaultChecked={rankDialog.rank?.isActive !== false} className="rounded" /><Label className="text-zinc-400">{t('admin.active')}</Label></div>
            <DialogFooter>
              <Button type="button" variant="outline" className="border-zinc-700" onClick={() => setRankDialog({ open: false })}>{t('admin.cancel')}</Button>
              <Button type="submit" className="bg-emerald-600 hover:bg-cyan-700" disabled={adminActionLoading}>{adminActionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{t('admin.save')}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Milestone Dialog */}
      <Dialog open={milestoneDialog.open} onOpenChange={(open) => setMilestoneDialog({ open, milestone: milestoneDialog.milestone })}>
        <DialogContent className="bg-zinc-900 border-zinc-800 max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{milestoneDialog.milestone ? t('admin.edit') : t('admin.newMilestone')}</DialogTitle></DialogHeader>
          <form onSubmit={handleAdminMilestoneSave} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label className="text-zinc-400">{t('admin.milestoneName')}</Label><Input name="name" defaultValue={milestoneDialog.milestone?.name || ''} required className="bg-zinc-800 border-zinc-700 mt-1" /></div>
              <div><Label className="text-zinc-400">{t('admin.rankIcon')}</Label><Input name="icon" defaultValue={milestoneDialog.milestone?.icon || '🎯'} className="bg-zinc-800 border-zinc-700 mt-1" /></div>
            </div>
            <div><Label className="text-zinc-400">{t('admin.description')}</Label><Input name="description" defaultValue={milestoneDialog.milestone?.description || ''} className="bg-zinc-800 border-zinc-700 mt-1" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label className="text-zinc-400">{t('admin.targetCount')}</Label><Input name="targetCount" type="number" defaultValue={milestoneDialog.milestone?.targetCount || 1} required className="bg-zinc-800 border-zinc-700 mt-1" /></div>
              <div><Label className="text-zinc-400">{t('admin.rewardType')}</Label><Select name="rewardType" defaultValue={milestoneDialog.milestone?.rewardType || 'cash'}><SelectTrigger className="bg-zinc-800 border-zinc-700 mt-1"><SelectValue /></SelectTrigger><SelectContent className="bg-zinc-800"><SelectItem value="cash">Cash (USDT)</SelectItem><SelectItem value="boost">Boost (%)</SelectItem></SelectContent></Select></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label className="text-zinc-400">{t('admin.rewardValue')}</Label><Input name="rewardValue" defaultValue={milestoneDialog.milestone?.rewardValue || '0'} className="bg-zinc-800 border-zinc-700 mt-1" /></div>
              <div><Label className="text-zinc-400">{t('admin.sortOrder')}</Label><Input name="sortOrder" type="number" defaultValue={milestoneDialog.milestone?.sortOrder || 0} className="bg-zinc-800 border-zinc-700 mt-1" /></div>
            </div>
            <div className="flex items-center gap-2"><input type="checkbox" name="isActive" defaultChecked={milestoneDialog.milestone?.isActive !== false} className="rounded" /><Label className="text-zinc-400">{t('admin.active')}</Label></div>
            <DialogFooter>
              <Button type="button" variant="outline" className="border-zinc-700" onClick={() => setMilestoneDialog({ open: false })}>{t('admin.cancel')}</Button>
              <Button type="submit" className="bg-emerald-600 hover:bg-cyan-700" disabled={adminActionLoading}>{adminActionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{t('admin.save')}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Contest Dialog */}
      <Dialog open={contestDialog.open} onOpenChange={(open) => setContestDialog({ open, contest: contestDialog.contest })}>
        <DialogContent className="bg-zinc-900 border-zinc-800 max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{contestDialog.contest ? t('admin.edit') : t('admin.newContest')}</DialogTitle></DialogHeader>
          <form onSubmit={handleAdminContestSave} className="space-y-4">
            <div><Label className="text-zinc-400">{t('admin.contestName')}</Label><Input name="name" defaultValue={contestDialog.contest?.name || ''} required className="bg-zinc-800 border-zinc-700 mt-1" /></div>
            <div><Label className="text-zinc-400">{t('admin.description')}</Label><Input name="description" defaultValue={contestDialog.contest?.description || ''} className="bg-zinc-800 border-zinc-700 mt-1" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label className="text-zinc-400">{t('admin.startDate')}</Label><Input name="startDate" type="datetime-local" defaultValue={contestDialog.contest ? new Date(contestDialog.contest.startDate).toISOString().slice(0, 16) : ''} required className="bg-zinc-800 border-zinc-700 mt-1" /></div>
              <div><Label className="text-zinc-400">{t('admin.endDate')}</Label><Input name="endDate" type="datetime-local" defaultValue={contestDialog.contest ? new Date(contestDialog.contest.endDate).toISOString().slice(0, 16) : ''} required className="bg-zinc-800 border-zinc-700 mt-1" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label className="text-zinc-400">{t('admin.rewardPool')}</Label><Input name="rewardPool" defaultValue={contestDialog.contest?.rewardPool || '0'} className="bg-zinc-800 border-zinc-700 mt-1" /></div>
              <div><Label className="text-zinc-400">{t('admin.contestMetric')}</Label><Select name="metric" defaultValue={contestDialog.contest?.metric || 'referrals'}><SelectTrigger className="bg-zinc-800 border-zinc-700 mt-1"><SelectValue /></SelectTrigger><SelectContent className="bg-zinc-800"><SelectItem value="referrals">{t('admin.metricReferrals')}</SelectItem><SelectItem value="earnings">{t('admin.metricEarnings')}</SelectItem><SelectItem value="active_referrals">{t('admin.metricActiveReferrals')}</SelectItem></SelectContent></Select></div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2"><input type="checkbox" name="isActive" defaultChecked={contestDialog.contest?.isActive !== false} className="rounded" /><Label className="text-zinc-400">{t('admin.active')}</Label></div>
              <div className="flex items-center gap-2"><input type="checkbox" name="isFeatured" defaultChecked={contestDialog.contest?.isFeatured || false} className="rounded" /><Label className="text-zinc-400">{t('admin.featured')}</Label></div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" className="border-zinc-700" onClick={() => setContestDialog({ open: false })}>{t('admin.cancel')}</Button>
              <Button type="submit" className="bg-emerald-600 hover:bg-cyan-700" disabled={adminActionLoading}>{adminActionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{t('admin.save')}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Badge Dialog */}
      <Dialog open={badgeDialog.open} onOpenChange={(open) => setBadgeDialog({ open, badge: badgeDialog.badge })}>
        <DialogContent className="bg-zinc-900 border-zinc-800 max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{badgeDialog.badge ? 'Editar Badge' : 'Novo Badge'}</DialogTitle></DialogHeader>
          <form onSubmit={async (e) => {
            e.preventDefault();
            setAdminActionLoading(true);
            try {
              const fd = new FormData(e.currentTarget);
              const body: any = {
                name: fd.get('name') as string,
                description: fd.get('description') as string || null,
                icon: fd.get('icon') as string || '🏅',
                color: fd.get('color') as string || '#CD7F32',
                category: fd.get('category') as string || 'general',
                requirement: fd.get('requirement') as string || '{"type":"referrals","count":1}',
                rewardType: fd.get('rewardType') as string || 'none',
                rewardValue: fd.get('rewardValue') as string || '0',
                isAuto: (fd.get('isAuto') as string) === 'on',
                sortOrder: parseInt(fd.get('sortOrder') as string) || 0,
                isActive: (fd.get('isActive') as string) !== 'off',
              };
              if (badgeDialog.badge) {
                body.id = badgeDialog.badge.id;
                await api('/api/admin/affiliate-badges', { method: 'PUT', body: JSON.stringify(body) });
              } else {
                await api('/api/admin/affiliate-badges', { method: 'POST', body: JSON.stringify(body) });
              }
              setBadgeDialog({ open: false });
              fetchAdminData();
              toast.success('Badge salvo com sucesso!');
            } catch (err: any) {
              toast.error(err.message || 'Erro ao salvar badge');
            } finally {
              setAdminActionLoading(false);
            }
          }} className="space-y-4">
            <div><Label className="text-zinc-400">Nome</Label><Input name="name" defaultValue={badgeDialog.badge?.name || ''} required className="bg-zinc-800 border-zinc-700 mt-1" /></div>
            <div><Label className="text-zinc-400">Descrição</Label><Input name="description" defaultValue={badgeDialog.badge?.description || ''} className="bg-zinc-800 border-zinc-700 mt-1" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label className="text-zinc-400">Ícone (emoji)</Label><Input name="icon" defaultValue={badgeDialog.badge?.icon || '🏅'} className="bg-zinc-800 border-zinc-700 mt-1" /></div>
              <div><Label className="text-zinc-400">Cor (hex)</Label><Input name="color" type="color" defaultValue={badgeDialog.badge?.color || '#CD7F32'} className="bg-zinc-800 border-zinc-700 mt-1 h-10" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-zinc-400">Categoria</Label>
                <Select name="category" defaultValue={badgeDialog.badge?.category || 'general'}>
                  <SelectTrigger className="bg-zinc-800 border-zinc-700 mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-zinc-800">
                    <SelectItem value="general">Geral</SelectItem>
                    <SelectItem value="recruitment">Recrutamento</SelectItem>
                    <SelectItem value="earnings">Ganhos</SelectItem>
                    <SelectItem value="streak">Sequência</SelectItem>
                    <SelectItem value="special">Especial</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-zinc-400">Recompensa</Label>
                <Select name="rewardType" defaultValue={badgeDialog.badge?.rewardType || 'none'}>
                  <SelectTrigger className="bg-zinc-800 border-zinc-700 mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-zinc-800">
                    <SelectItem value="none">Nenhuma</SelectItem>
                    <SelectItem value="cash">Dinheiro</SelectItem>
                    <SelectItem value="boost">Boost</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div><Label className="text-zinc-400">Requisito (JSON)</Label><Input name="requirement" defaultValue={badgeDialog.badge?.requirement || '{"type":"referrals","count":1}'} className="bg-zinc-800 border-zinc-700 mt-1 font-mono text-sm" /><div className="text-xs text-zinc-500 mt-1">Ex: {"{"}"type":"referrals","count":5{"}"} ou {"{"}"type":"earnings","amount":50{"}"}</div></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label className="text-zinc-400">Valor Recompensa</Label><Input name="rewardValue" defaultValue={badgeDialog.badge?.rewardValue || '0'} className="bg-zinc-800 border-zinc-700 mt-1" /></div>
              <div><Label className="text-zinc-400">Ordem</Label><Input name="sortOrder" type="number" defaultValue={badgeDialog.badge?.sortOrder || 0} className="bg-zinc-800 border-zinc-700 mt-1" /></div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2"><input type="checkbox" name="isAuto" defaultChecked={badgeDialog.badge?.isAuto !== false} className="rounded" /><Label className="text-zinc-400">Auto-conceder</Label></div>
              <div className="flex items-center gap-2"><input type="checkbox" name="isActive" defaultChecked={badgeDialog.badge?.isActive !== false} className="rounded" /><Label className="text-zinc-400">{t('admin.active')}</Label></div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" className="border-zinc-700" onClick={() => setBadgeDialog({ open: false })}>{t('admin.cancel')}</Button>
              <Button type="submit" className="bg-emerald-600 hover:bg-cyan-700" disabled={adminActionLoading}>{adminActionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{t('admin.save')}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Create Voucher Dialog */}
      <Dialog open={voucherDialog.open} onOpenChange={(open) => setVoucherDialog({ open, voucher: voucherDialog.voucher })}>
        <DialogContent className="bg-zinc-900 border-zinc-800 max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novo Voucher para Lider</DialogTitle>
            <DialogDescription className="text-zinc-400">
              De credito para um lider trazer sua rede. O saldo do voucher so pode ser usado para investir em planos de copy trading. Os saques ficam bloqueados ate que o lider cumpra as metas.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={async (e) => {
            e.preventDefault();
            setVoucherLoading(true);
            try {
              const form = e.currentTarget;
              const type = (form.type as HTMLSelectElement).value;
              const userId = (form.userId as HTMLSelectElement).value;
              if (!userId) { toast.error('Selecione um usuario'); return; }
              const body: any = { userId, type };
              if (type === 'custom') {
                body.amount = parseFloat((form.customAmount as HTMLInputElement).value);
                body.goalDirectReferrals = parseInt((form.customReferrals as HTMLInputElement).value);
                body.goalMinReferralInvest = (form.customMinInvest as HTMLInputElement).value;
                body.goalNetworkMultiple = (form.customNetworkMultiple as HTMLInputElement).value;
                body.goalDays = parseInt((form.customDays as HTMLInputElement).value);
              }
              body.adminNotes = (form.adminNotes as HTMLTextAreaElement).value || undefined;
              await api('/api/admin/vouchers', { method: 'POST', body: JSON.stringify(body) });
              toast.success('Voucher criado com sucesso!');
              setVoucherDialog({ open: false, voucher: null });
              fetchAdminData();
            } catch (err: any) {
              toast.error(err.message || 'Erro ao criar voucher');
            } finally {
              setVoucherLoading(false);
            }
          }}>
            <div className="space-y-4">
              <div>
                <Label className="text-zinc-400">Usuario (Lider)</Label>
                <Select name="userId">
                  <SelectTrigger className="bg-zinc-800 border-zinc-700 mt-1">
                    <SelectValue placeholder="Selecione o lider..." />
                  </SelectTrigger>
                  <SelectContent>
                    {adminUsers.filter((u: any) => u.role !== 'admin').map((u: any) => (
                      <SelectItem key={u.id} value={u.id}>{u.name} ({u.email})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-zinc-400">Tipo de Voucher</Label>
                <Select name="type" defaultValue="custom">
                  <SelectTrigger className="bg-zinc-800 border-zinc-700 mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="basic">Basico - 500 USDT (5 indicacoes, 30 dias)</SelectItem>
                    <SelectItem value="premium">Premium - 2.000 USDT (10 indicacoes, 45 dias)</SelectItem>
                    <SelectItem value="custom">Personalizado - Definir valores</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Custom fields */}
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-zinc-400">Valor (USDT)</Label>
                    <Input name="customAmount" type="number" step="0.01" defaultValue="500" className="bg-zinc-800 border-zinc-700 mt-1" />
                  </div>
                  <div>
                    <Label className="text-zinc-400">Prazo (dias)</Label>
                    <Input name="customDays" type="number" defaultValue="30" className="bg-zinc-800 border-zinc-700 mt-1" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-zinc-400">Indicacoes necessarias</Label>
                    <Input name="customReferrals" type="number" defaultValue="5" className="bg-zinc-800 border-zinc-700 mt-1" />
                  </div>
                  <div>
                    <Label className="text-zinc-400">Invest. minimo por ref. (USDT)</Label>
                    <Input name="customMinInvest" defaultValue="100" className="bg-zinc-800 border-zinc-700 mt-1" />
                  </div>
                </div>
                <div>
                  <Label className="text-zinc-400">Multiplo de investimento da rede</Label>
                  <Input name="customNetworkMultiple" defaultValue="3" className="bg-zinc-800 border-zinc-700 mt-1" />
                  <div className="text-xs text-zinc-500 mt-1">Ex: 3x significa que a rede deve investir 3x o valor do voucher</div>
                </div>
              </div>

              <div>
                <Label className="text-zinc-400">Notas do admin</Label>
                <Textarea name="adminNotes" placeholder="Observacoes internas sobre este voucher..." className="bg-zinc-800 border-zinc-700 mt-1" />
              </div>

              {/* Explanation Box */}
              <Card className="bg-zinc-800/50 border-zinc-700">
                <CardContent className="p-3">
                  <div className="text-xs text-zinc-400 space-y-1">
                    <div className="font-medium text-zinc-300 mb-1">Como funciona:</div>
                    <div>O lider recebe o credito no saldo de voucher (nao no saldo normal)</div>
                    <div>So pode usar para investir em planos de copy trading ou comprar pacotes</div>
                    <div>Saques ficam BLOQUEADOS ate cumprir as metas</div>
                    <div>Desbloqueio e gradual: % → 50% → 75% → 100%</div>
                    <div>Se nao cumprir as metas no prazo, o voucher expira</div>
                  </div>
                </CardContent>
              </Card>
            </div>
            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" className="border-zinc-700" onClick={() => setVoucherDialog({ open: false, voucher: null })}>Cancelar</Button>
              <Button type="submit" className="bg-emerald-600 hover:bg-cyan-700" disabled={voucherLoading}>
                {voucherLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Criar Voucher
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Voucher Action Dialog (Revoke / Extend / Complete) */}
      <Dialog open={voucherActionDialog.open} onOpenChange={(open) => setVoucherActionDialog({ open, action: voucherActionDialog.action, voucher: voucherActionDialog.voucher })}>
        <DialogContent className="bg-zinc-900 border-zinc-800 max-w-md">
          <DialogHeader>
            <DialogTitle>
              {voucherActionDialog.action === 'revoke' && 'Revogar Voucher'}
              {voucherActionDialog.action === 'extend' && 'Estender Prazo'}
              {voucherActionDialog.action === 'complete' && 'Marcar como Completo'}
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              {voucherActionDialog.action === 'revoke' && `Revogar o voucher de ${voucherActionDialog.voucher?.user?.name || ''}. O saldo restante sera removido.`}
              {voucherActionDialog.action === 'extend' && `Adicionar mais dias ao prazo do voucher de ${voucherActionDialog.voucher?.user?.name || ''}.`}
              {voucherActionDialog.action === 'complete' && `Marcar o voucher de ${voucherActionDialog.voucher?.user?.name || ''} como completo. Isso desbloqueia 100% dos saques.`}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={async (e) => {
            e.preventDefault();
            setVoucherLoading(true);
            try {
              const form = e.currentTarget;
              const body: any = { action: voucherActionDialog.action };
              if (voucherActionDialog.action === 'extend') {
                body.extendDays = parseInt((form.extendDays as HTMLInputElement).value);
              }
              if (voucherActionDialog.action === 'revoke') {
                body.revokeReason = (form.revokeReason as HTMLTextAreaElement)?.value || '';
              }
              body.adminNotes = (form.actionNotes as HTMLTextAreaElement)?.value || undefined;
              await api(`/api/admin/vouchers/${voucherActionDialog.voucher?.id}`, { method: 'PATCH', body: JSON.stringify(body) });
              toast.success(
                voucherActionDialog.action === 'revoke' ? 'Voucher revogado!' :
                voucherActionDialog.action === 'extend' ? 'Prazo estendido!' :
                'Voucher marcado como completo!'
              );
              setVoucherActionDialog({ open: false, action: 'revoke', voucher: null });
              fetchAdminData();
            } catch (err: any) {
              toast.error(err.message || 'Erro na acao');
            } finally {
              setVoucherLoading(false);
            }
          }}>
            <div className="space-y-4">
              {voucherActionDialog.action === 'extend' && (
                <div>
                  <Label className="text-zinc-400">Dias para adicionar</Label>
                  <Input name="extendDays" type="number" defaultValue="15" min="1" className="bg-zinc-800 border-zinc-700 mt-1" />
                </div>
              )}
              {voucherActionDialog.action === 'revoke' && (
                <div>
                  <Label className="text-zinc-400">Motivo da revogacao</Label>
                  <Textarea name="revokeReason" placeholder="Ex: Lider nao cumpriu as metas..." className="bg-zinc-800 border-zinc-700 mt-1" />
                </div>
              )}
              <div>
                <Label className="text-zinc-400">Notas (opcional)</Label>
                <Textarea name="actionNotes" placeholder="Observacoes..." className="bg-zinc-800 border-zinc-700 mt-1" />
              </div>
            </div>
            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" className="border-zinc-700" onClick={() => setVoucherActionDialog({ open: false, action: 'revoke', voucher: null })}>Cancelar</Button>
              <Button type="submit" className={
                voucherActionDialog.action === 'revoke' ? 'bg-red-600 hover:bg-red-700' :
                voucherActionDialog.action === 'extend' ? 'bg-amber-600 hover:bg-amber-700' :
                'bg-emerald-600 hover:bg-cyan-700'
              } disabled={voucherLoading}>
                {voucherLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {voucherActionDialog.action === 'revoke' && 'Revogar Voucher'}
                {voucherActionDialog.action === 'extend' && 'Estender Prazo'}
                {voucherActionDialog.action === 'complete' && 'Marcar Completo'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Split Recipient Dialog */}
      <Dialog open={splitEditDialog} onOpenChange={setSplitEditDialog}>
        <DialogContent className="bg-zinc-900 border-zinc-800 max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Sócio</DialogTitle>
          </DialogHeader>
          {splitEditRecipient && (
            <div className="space-y-3">
              <div>
                <label className="text-xs text-zinc-400">Nome</label>
                <input className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-sm text-white mt-1" value={splitEditRecipient.name} onChange={e => setSplitEditRecipient({ ...splitEditRecipient, name: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-zinc-400">Função</label>
                <select className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-sm text-white mt-1" value={splitEditRecipient.role} onChange={e => setSplitEditRecipient({ ...splitEditRecipient, role: e.target.value })}>
                  <option value="partner">Sócio</option>
                  <option value="marketing">Marketing</option>
                  <option value="operations">Operações</option>
                  <option value="reserve">Reserva</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-zinc-400">Carteira</label>
                <input className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-sm text-white font-mono mt-1" value={splitEditRecipient.walletAddress} onChange={e => setSplitEditRecipient({ ...splitEditRecipient, walletAddress: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-zinc-400">Percentual %</label>
                  <input className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-sm text-white mt-1" type="number" step="0.1" value={splitEditRecipient.percentage} onChange={e => setSplitEditRecipient({ ...splitEditRecipient, percentage: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs text-zinc-400">Mín. Payout USDT</label>
                  <input className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-sm text-white mt-1" type="number" value={splitEditRecipient.minPayout} onChange={e => setSplitEditRecipient({ ...splitEditRecipient, minPayout: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="text-xs text-zinc-400">Moeda</label>
                <select className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-sm text-white mt-1" value={splitEditRecipient.currency} onChange={e => setSplitEditRecipient({ ...splitEditRecipient, currency: e.target.value })}>
                  <option value="usdttrc20">USDT TRC20</option>
                  <option value="usdtmatic">USDT Polygon</option>
                  <option value="btc">BTC</option>
                  <option value="eth">ETH</option>
                </select>
              </div>
              <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer">
                <input type="checkbox" checked={splitEditRecipient.autoPayout} onChange={e => setSplitEditRecipient({ ...splitEditRecipient, autoPayout: e.target.checked })} className="rounded" />
                Auto-payout ao atingir mínimo
              </label>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" className="border-zinc-700" onClick={() => setSplitEditDialog(false)}>Cancelar</Button>
            <Button className="bg-emerald-600 hover:bg-cyan-700" onClick={async () => {
              if (!splitEditRecipient) return;
              try {
                await api('/api/admin/split-recipients', {
                  method: 'PUT',
                  body: JSON.stringify({
                    id: splitEditRecipient.id,
                    name: splitEditRecipient.name,
                    role: splitEditRecipient.role,
                    walletAddress: splitEditRecipient.walletAddress,
                    percentage: splitEditRecipient.percentage,
                    minPayout: splitEditRecipient.minPayout,
                    currency: splitEditRecipient.currency,
                    autoPayout: splitEditRecipient.autoPayout,
                  }),
                });
                setSplitEditDialog(false);
                fetchSplitData();
                toast.success('Sócio atualizado com sucesso!');
              } catch (e: any) {
                toast.error(e.message || 'Erro ao atualizar');
              }
            }}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function CopyButton({ text, t }: { text: string; t: (key: string, params?: Record<string, string | number>) => string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      toast.success(t('toast.copiedToClipboard'));
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <Button variant="outline" size="icon" className="border-zinc-700 h-10 w-10" onClick={handleCopy}>
      {copied ? <Check className="h-4 w-4 text-cyan-400" /> : <Copy className="h-4 w-4" />}
    </Button>
  );
}

function AffiliateLevelEditor({ level, defaultPercentage, defaultActive, existingId, onSave, t }: {
  level: number; defaultPercentage: string; defaultActive: boolean; existingId?: string;
  onSave: (percentage: string, isActive: boolean) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}) {
  const [percentage, setPercentage] = useState(defaultPercentage);
  const [isActive, setIsActive] = useState(defaultActive);
  const [saving, setSaving] = useState(false);

  const resetState = useCallback((p: string, a: boolean) => { setPercentage(p); setIsActive(a); }, []);
  // Sync from parent via reset callback pattern instead of effect

  return (
    <div className="flex flex-wrap items-center gap-3 bg-zinc-800/50 rounded-lg p-3">
      <Badge variant="outline" className="border-cyan-500/30 text-cyan-400 min-w-[70px] justify-center">{t('landing.affiliate.level')} {level}</Badge>
      <div className="flex items-center gap-2">
        <Input value={percentage} onChange={e => setPercentage(e.target.value)} className="bg-zinc-800 border-zinc-700 w-20 sm:w-24 text-sm" />
        <span className="text-zinc-400 text-sm">%</span>
      </div>
      <label className="flex items-center gap-1.5 text-sm text-zinc-300 cursor-pointer">
        <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} className="accent-cyan-500" />
        {t('admin.active')}
      </label>
      <Button size="sm" className="h-9 text-xs bg-emerald-600 hover:bg-cyan-700" disabled={saving} onClick={async () => {
        setSaving(true);
        await onSave(percentage, isActive);
        setSaving(false);
      }}>
        {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : t('admin.save')}
      </Button>
    </div>
  );
}


