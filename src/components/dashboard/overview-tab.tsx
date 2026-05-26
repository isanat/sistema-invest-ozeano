'use client'

import { useEffect, useRef, useState, useMemo } from 'react'
import { useAppStore } from '@/lib/store'
import { formatUSDT } from '@/lib/api'
import { useI18n, T } from '@/lib/i18n/context'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DollarSign,
  TrendingUp,
  Briefcase,
  ArrowDownCircle,
  ArrowRight,
  Wallet,
  UserPlus,
  ArrowUpRight,
  Activity,
  Coins,
  Flame,
} from 'lucide-react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts'

// Animated counter hook
function useAnimatedCounter(target: number, duration = 1200) {
  const [value, setValue] = useState(0)
  const prevTarget = useRef(0)

  useEffect(() => {
    const start = prevTarget.current
    const diff = target - start
    if (Math.abs(diff) < 0.01) {
      const id = requestAnimationFrame(() => setValue(target))
      return () => cancelAnimationFrame(id)
    }
    const startTime = performance.now()
    let raf: number
    const animate = (now: number) => {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      const newVal = start + diff * eased
      if (progress < 1) {
        setValue(newVal)
        raf = requestAnimationFrame(animate)
      } else {
        prevTarget.current = target
        setValue(target)
      }
    }
    raf = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(raf)
  }, [target, duration])

  return value
}

// Generate sparkline data from investments
function generateSparkline(baseValue: number, points = 12): number[] {
  const data: number[] = []
  let current = baseValue
  for (let i = 0; i < points; i++) {
    current = current * (1 + (Math.random() - 0.4) * 0.08)
    data.push(Math.max(0, current))
  }
  return data
}

// Generate ROI chart data from investments
function generateRoiChartData(investments: { dailyRoi: number; teamBonusPct: number; amount: number }[]) {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  if (investments.length === 0) {
    return days.map((d) => ({ day: d, roi: +(Math.random() * 2 + 1.5).toFixed(1) }))
  }
  const avgRoi = investments.reduce((s, i) => s + i.dailyRoi + i.teamBonusPct, 0) / investments.length
  return days.map((d) => ({
    day: d,
    roi: +(avgRoi * (0.7 + Math.random() * 0.6)).toFixed(1),
  }))
}

// Mini Sparkline component
function MiniSparkline({ data, color = '#10B981', width = 80, height = 32 }: { data: number[]; color?: string; width?: number; height?: number }) {
  if (data.length < 2) return null
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width
    const y = height - ((v - min) / range) * height * 0.8 - height * 0.1
    return `${x},${y}`
  }).join(' ')

  return (
    <svg width={width} height={height} className="opacity-60">
      <defs>
        <linearGradient id={`spark-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.3} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <polygon
        points={`0,${height} ${points} ${width},${height}`}
        fill={`url(#spark-${color.replace('#', '')})`}
      />
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

const typeConfig: Record<string, { color: string; labelKey: string; icon: React.ElementType }> = {
  roi_profit: { color: 'text-emerald-400', labelKey: 'general.active', icon: TrendingUp },
  investment: { color: 'text-cyan-400', labelKey: 'general.invest', icon: DollarSign },
  commission: { color: 'text-amber-400', labelKey: 'dash.affiliate.level', icon: Coins },
  team_bonus: { color: 'text-purple-400', labelKey: 'dash.team.bonusOnRoi', icon: Activity },
  withdrawal: { color: 'text-red-400', labelKey: 'general.withdraw', icon: ArrowDownCircle },
}

export function OverviewTab() {
  const { currentUser, setDashboardTab, transactions, investments } = useAppStore()
  const { t } = useI18n()
  const user = currentUser

  const animatedBalance = useAnimatedCounter(user?.balance || 0)
  const animatedInvested = useAnimatedCounter(user?.totalInvested || 0)
  const animatedRoi = useAnimatedCounter(user?.totalRoi || 0)
  const animatedWithdrawals = useAnimatedCounter(user?.totalWithdrawals || 0)

  const roiChartData = useMemo(() => generateRoiChartData(
    investments.filter((i) => i.status === 'active').map((i) => ({ dailyRoi: i.dailyRoi, teamBonusPct: i.teamBonusPct, amount: i.amount }))
  ), [investments])

  const sparklines = useMemo(() => ({
    balance: generateSparkline(user?.balance || 0),
    invested: generateSparkline(user?.totalInvested || 0),
    roi: generateSparkline(user?.totalRoi || 0),
    withdrawals: generateSparkline(user?.totalWithdrawals || 0),
  }), [user?.balance, user?.totalInvested, user?.totalRoi, user?.totalWithdrawals])

  const stats = [
    {
      titleKey: 'dash.overview.totalInvested',
      value: formatUSDT(animatedInvested),
      suffix: ' USDT',
      icon: DollarSign,
      color: 'text-cyan-400',
      bgColor: 'bg-cyan-500/10',
      borderColor: 'border-cyan-500/20',
      sparkData: sparklines.invested,
      sparkColor: '#06B6D4',
    },
    {
      titleKey: 'dash.overview.totalRoi',
      value: formatUSDT(animatedRoi),
      suffix: ' USDT',
      icon: TrendingUp,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10',
      borderColor: 'border-emerald-500/20',
      sparkData: sparklines.roi,
      sparkColor: '#10B981',
    },
    {
      titleKey: 'dash.overview.activeInvestments',
      value: String(user?.activeInvestments || 0),
      suffix: '',
      icon: Briefcase,
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/10',
      borderColor: 'border-amber-500/20',
      sparkData: sparklines.invested,
      sparkColor: '#F59E0B',
    },
    {
      titleKey: 'dash.overview.totalWithdrawals',
      value: formatUSDT(animatedWithdrawals),
      suffix: ' USDT',
      icon: ArrowDownCircle,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10',
      borderColor: 'border-purple-500/20',
      sparkData: sparklines.withdrawals,
      sparkColor: '#8b5cf6',
    },
  ]

  const txList = transactions.length > 0 ? transactions.slice(0, 6) : []

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-2xl sm:text-3xl font-bold">
          <T k="dash.overview.welcome" />,{' '}
          <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
            {user?.name?.split(' ')[0] || 'Investor'}
          </span>
        </h1>
        <p className="text-muted-foreground mt-1">{t('dash.overview.welcomeSubtitle')}</p>
      </motion.div>

      {/* Balance Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <Card className="relative overflow-hidden border-emerald-500/20 shadow-[0_0_30px_rgba(16,185,129,0.08)]">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-cyan-500/5 to-transparent" />
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <CardContent className="relative p-6 sm:p-8">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-8 w-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                    <Wallet className="h-4 w-4 text-emerald-400" />
                  </div>
                  <p className="text-sm text-emerald-300/80 font-medium">{t('dash.overview.availableBalance')}</p>
                </div>
                <div className="flex items-baseline gap-2">
                  <p className="text-4xl sm:text-5xl font-bold text-emerald-400 text-glow-emerald tracking-tight">
                    {formatUSDT(animatedBalance)}
                  </p>
                  <span className="text-lg text-emerald-400/60 font-medium">USDT</span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">≈ ${formatUSDT(animatedBalance)} USD</p>
              </div>
              <div className="hidden sm:block">
                <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 flex items-center justify-center border border-emerald-500/20 animate-pulse-glow">
                  <Flame className="h-8 w-8 text-emerald-400" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.titleKey}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 + index * 0.05 }}
          >
            <Card className={`glass border-border/20 hover:${stat.borderColor} transition-all duration-300 group`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className={`h-8 w-8 rounded-lg ${stat.bgColor} flex items-center justify-center`}>
                    <stat.icon className={`h-4 w-4 ${stat.color}`} />
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <MiniSparkline data={stat.sparkData} color={stat.sparkColor} />
                  </div>
                </div>
                <p className="text-[11px] sm:text-xs text-muted-foreground mb-0.5">{t(stat.titleKey)}</p>
                <p className={`text-base sm:text-xl font-bold ${stat.color} tracking-tight`}>
                  {stat.value}{stat.suffix}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* ROI Chart + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <motion.div
          className="lg:col-span-2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Card className="glass border-border/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Activity className="h-4 w-4 text-emerald-400" />
                {t('dash.overview.roiChart')}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={roiChartData}>
                    <defs>
                      <linearGradient id="roiGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                        <stop offset="50%" stopColor="#10B981" stopOpacity={0.1} />
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.06)" />
                    <XAxis dataKey="day" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} domain={['auto', 'auto']} />
                    <Tooltip
                      contentStyle={{
                        background: 'rgba(6,10,20,0.95)',
                        border: '1px solid rgba(16,185,129,0.2)',
                        borderRadius: '12px',
                        color: '#e2e8f0',
                        fontSize: '12px',
                        boxShadow: '0 0 20px rgba(16,185,129,0.1)',
                      }}
                      labelStyle={{ color: '#94a3b8' }}
                    />
                    <Area
                      type="monotone"
                      dataKey="roi"
                      stroke="#10B981"
                      strokeWidth={2.5}
                      fill="url(#roiGradient)"
                      dot={{ fill: '#10B981', r: 3, strokeWidth: 0 }}
                      activeDot={{ r: 5, fill: '#10B981', stroke: '#060a14', strokeWidth: 2 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.35 }}
        >
          <Card className="glass border-border/20 h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">{t('dash.overview.quickActions')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button
                  className="w-full justify-start bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white shadow-[0_0_20px_rgba(16,185,129,0.2)]"
                  onClick={() => setDashboardTab('invest')}
                >
                  <DollarSign className="h-4 w-4 mr-2" />
                  {t('general.invest')}
                  <ArrowRight className="h-4 w-4 ml-auto" />
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button
                  variant="outline"
                  className="w-full justify-start border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10 hover:border-cyan-500/50 transition-all"
                  onClick={() => setDashboardTab('withdrawals')}
                >
                  <ArrowUpRight className="h-4 w-4 mr-2" />
                  {t('general.withdraw')}
                  <ArrowRight className="h-4 w-4 ml-auto" />
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button
                  variant="outline"
                  className="w-full justify-start border-amber-500/30 text-amber-400 hover:bg-amber-500/10 hover:border-amber-500/50 transition-all"
                  onClick={() => setDashboardTab('affiliate')}
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  {t('dash.sidebar.affiliate')}
                  <ArrowRight className="h-4 w-4 ml-auto" />
                </Button>
              </motion.div>

              {/* Live Stats Mini */}
              <div className="glass rounded-xl p-3 mt-4 border border-border/10 space-y-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">BTC/USDT</span>
                  <span className="text-xs font-mono text-emerald-400">$67,234.50</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">ETH/USDT</span>
                  <span className="text-xs font-mono text-emerald-400">$3,456.78</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Network</span>
                  <span className="text-xs font-mono text-cyan-400">TRC-20</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Recent Transactions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        <Card className="glass border-border/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Activity className="h-4 w-4 text-cyan-400" />
              {t('dash.overview.recentTransactions')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {txList.length === 0 ? (
              <div className="text-center py-10">
                <Activity className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No transactions yet</p>
              </div>
            ) : (
              <div className="space-y-0 max-h-80 overflow-y-auto">
                {txList.map((tx, idx) => {
                  const config = typeConfig[tx.type] || typeConfig.roi_profit
                  const isNegative = tx.amount < 0
                  return (
                    <motion.div
                      key={tx.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="flex items-center justify-between py-3 border-b border-border/5 last:border-0 hover:bg-secondary/20 rounded-lg px-2 -mx-2 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`h-8 w-8 rounded-lg ${
                          isNegative ? 'bg-red-500/10' : 'bg-emerald-500/10'
                        } flex items-center justify-center`}>
                          <config.icon className={`h-3.5 w-3.5 ${config.color}`} />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{tx.description}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(tx.createdAt).toLocaleDateString('es-ES', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </p>
                        </div>
                      </div>
                      <span className={`text-sm font-semibold font-mono ${isNegative ? 'text-red-400' : 'text-emerald-400'}`}>
                        {isNegative ? '' : '+'}{formatUSDT(Math.abs(tx.amount))} USDT
                      </span>
                    </motion.div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
