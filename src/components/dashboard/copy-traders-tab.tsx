'use client'

import { useEffect, useMemo } from 'react'
import { useAppStore, type CopyTrader } from '@/lib/store'
import { getCopyTraders, formatUSDT } from '@/lib/api'
import { useI18n } from '@/lib/i18n/context'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  LineChart,
  Line,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'
import {
  Activity,
  TrendingUp,
  ShieldCheck,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  Users,
  Copy,
  Star,
} from 'lucide-react'

// Generate performance sparkline for a trader
function generateTraderSparkline(winRate: number, monthlyRoi: number, points = 20) {
  const data: { pnl: number }[] = []
  let cumulative = 0
  for (let i = 0; i < points; i++) {
    const win = Math.random() * 100 < winRate
    const change = win
      ? (monthlyRoi / 30) * (0.5 + Math.random())
      : -(monthlyRoi / 30) * (0.3 + Math.random() * 0.5)
    cumulative += change
    data.push({ pnl: Math.max(-5, cumulative) })
  }
  return data
}

// Win rate ring component
function WinRateRing({ rate, size = 56, strokeWidth = 4 }: { rate: number; size?: number; strokeWidth?: number }) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (rate / 100) * circumference
  const color = rate >= 90 ? '#10B981' : rate >= 80 ? '#06B6D4' : rate >= 70 ? '#F59E0B' : '#ef4444'

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(148,163,184,0.1)"
          strokeWidth={strokeWidth}
          fill="none"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.5, ease: 'easeOut' }}
          style={{ filter: `drop-shadow(0 0 4px ${color}40)` }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xs font-bold" style={{ color }}>{rate}%</span>
      </div>
    </div>
  )
}

// Mini sparkline chart for trader card
function TraderSparkline({ data, positive }: { data: { pnl: number }[]; positive: boolean }) {
  const color = positive ? '#10B981' : '#ef4444'
  return (
    <div className="h-10 w-20">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <Line
            type="monotone"
            dataKey="pnl"
            stroke={color}
            strokeWidth={1.5}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

const riskConfig = {
  low: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
  medium: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' },
  high: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20' },
}

const avatarGradients = [
  'from-emerald-500 to-cyan-500',
  'from-cyan-500 to-blue-500',
  'from-amber-500 to-orange-500',
  'from-purple-500 to-pink-500',
  'from-emerald-500 to-amber-500',
  'from-cyan-500 to-purple-500',
]

export function CopyTradersTab() {
  const { copyTraders, setCopyTraders } = useAppStore()
  const { t } = useI18n()

  const traders = copyTraders.length > 0 ? copyTraders : []

  useEffect(() => {
    if (copyTraders.length === 0) {
      getCopyTraders()
        .then(setCopyTraders)
        .catch(() => {})
    }
  }, [copyTraders.length, setCopyTraders])

  const traderSparklines = useMemo(() => {
    return traders.map((trader) => generateTraderSparkline(trader.winRate, trader.monthlyRoi))
  }, [traders])

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-2xl sm:text-3xl font-bold">
          <span className="bg-gradient-to-r from-cyan-400 to-emerald-400 bg-clip-text text-transparent">
            {t('dash.sidebar.copyTraders')}
          </span>
        </h1>
        <p className="text-muted-foreground mt-1">
          Follow the best traders and copy their strategies automatically
        </p>
      </motion.div>

      {traders.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card className="glass border-border/20">
            <CardContent className="p-12 text-center">
              <div className="h-16 w-16 rounded-2xl bg-cyan-500/10 flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8 text-cyan-400/50" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No traders available yet</h3>
              <p className="text-muted-foreground text-sm">Check back soon for featured copy traders</p>
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {traders.map((trader, index) => {
            const risk = riskConfig[trader.riskLevel]
            const sparkData = traderSparklines[index] || []
            const isPositive = trader.monthlyRoi > 0
            const gradient = avatarGradients[index % avatarGradients.length]

            return (
              <motion.div
                key={trader.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 + index * 0.05 }}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
              >
                <Card className={`glass border-border/20 hover:${risk.border} transition-all duration-300 h-full group`}>
                  <CardContent className="p-5">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white font-bold shadow-lg`}>
                          {trader.name[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <h3 className="font-bold text-sm truncate">{trader.name}</h3>
                            {trader.isFeatured && (
                              <Star className="h-3 w-3 text-amber-400 fill-amber-400 shrink-0" />
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">{trader.specialty}</p>
                        </div>
                      </div>
                      <WinRateRing rate={trader.winRate} size={44} strokeWidth={3} />
                    </div>

                    {/* Sparkline */}
                    <div className="flex items-center justify-between mb-4 glass rounded-lg p-2 border border-border/5">
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">30d Performance</p>
                        <p className={`text-sm font-bold ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                          {isPositive ? '+' : ''}{trader.monthlyRoi}%
                        </p>
                      </div>
                      <TraderSparkline data={sparkData} positive={isPositive} />
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-2 mb-4">
                      <div className="text-center">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Win Rate</p>
                        <p className="text-sm font-semibold text-emerald-400">{trader.winRate}%</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">PnL</p>
                        <p className="text-sm font-semibold text-emerald-400">${(trader.totalPnl / 1000).toFixed(0)}K</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{t('landing.traders.risk')}</p>
                        <Badge className={`${risk.bg} ${risk.text} border-0 text-[10px] px-1.5 py-0`}>
                          {t(`landing.traders.risk${trader.riskLevel.charAt(0).toUpperCase() + trader.riskLevel.slice(1)}` as 'landing.traders.riskLow')}
                        </Badge>
                      </div>
                    </div>

                    {/* Action */}
                    <Button
                      className="w-full bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white text-xs shadow-[0_0_12px_rgba(6,182,212,0.12)]"
                      size="sm"
                    >
                      <Copy className="h-3 w-3 mr-1.5" />
                      Copy Trader
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
