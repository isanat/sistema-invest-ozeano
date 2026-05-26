'use client'

import { motion } from 'framer-motion'
import { useAppStore } from '@/lib/store'
import { useI18n, T } from '@/lib/i18n/context'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { TrendingUp, ShieldCheck, ShieldAlert, Activity, ArrowRight, Zap } from 'lucide-react'

const defaultTraders = [
  { id: '1', name: 'Alex Rivera', specialty: 'Crypto & DeFi', winRate: 89, monthlyRoi: 12.5, riskLevel: 'medium' as const, avatar: null, totalPnl: 45230, isActive: true, isFeatured: true },
  { id: '2', name: 'Sofia Chen', specialty: 'Forex & Indices', winRate: 92, monthlyRoi: 9.8, riskLevel: 'low' as const, avatar: null, totalPnl: 32100, isActive: true, isFeatured: true },
  { id: '3', name: 'Marcus Johnson', specialty: 'Scalping BTC', winRate: 85, monthlyRoi: 18.2, riskLevel: 'high' as const, avatar: null, totalPnl: 67800, isActive: true, isFeatured: true },
  { id: '4', name: 'Elena Volkov', specialty: 'Altcoins & NFTs', winRate: 87, monthlyRoi: 15.3, riskLevel: 'medium' as const, avatar: null, totalPnl: 51400, isActive: true, isFeatured: true },
]

function SparklineChart({ data, color, width = 120, height = 40 }: { data: number[]; color: string; width?: number; height?: number }) {
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1

  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width
    const y = height - ((v - min) / range) * (height - 4) - 2
    return `${x},${y}`
  }).join(' ')

  const areaPoints = `0,${height} ${points} ${width},${height}`

  return (
    <svg width={width} height={height} className="w-full">
      <defs>
        <linearGradient id={`grad-${color.replace('#', '')}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill={`url(#grad-${color.replace('#', '')})`} />
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

const riskConfig = {
  low: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20', glowColor: '#10B981', labelKey: 'landing.traders.riskLow' },
  medium: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20', glowColor: '#F59E0B', labelKey: 'landing.traders.riskMedium' },
  high: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20', glowColor: '#ef4444', labelKey: 'landing.traders.riskHigh' },
}

const traderGradients = [
  'from-emerald-500 to-cyan-500',
  'from-cyan-500 to-blue-500',
  'from-amber-500 to-orange-500',
  'from-purple-500 to-pink-500',
]

const sparkDataSets = [
  [40, 45, 42, 55, 52, 60, 58, 72, 68, 75, 80, 78],
  [30, 35, 38, 32, 45, 42, 50, 48, 55, 60, 58, 62],
  [50, 45, 60, 55, 70, 65, 58, 75, 80, 72, 85, 90],
  [35, 40, 38, 50, 48, 55, 60, 58, 65, 70, 68, 75],
]

export function CopyTradersSection() {
  const { copyTraders, setAuthModal } = useAppStore()
  const { t } = useI18n()

  const traders = copyTraders.length > 0
    ? copyTraders.slice(0, 4).map((tr, i) => ({ ...tr, gradient: traderGradients[i % traderGradients.length], sparkData: sparkDataSets[i % sparkDataSets.length] }))
    : defaultTraders.map((tr, i) => ({ ...tr, gradient: traderGradients[i], sparkData: sparkDataSets[i] }))

  return (
    <section id="traders-section" className="py-24 px-4 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 grid-bg pointer-events-none" />
      <div className="absolute top-1/2 right-0 w-[600px] h-[600px] bg-cyan-500/3 rounded-full blur-[180px] pointer-events-none" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent" />

      <div className="max-w-6xl mx-auto relative">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl sm:text-5xl font-black mb-4">
            <T k="landing.traders.title" />
          </h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            {t('landing.traders.subtitle')}
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {traders.map((trader, index) => {
            const risk = riskConfig[trader.riskLevel]
            return (
              <motion.div
                key={trader.id}
                className="glass-neon rounded-2xl p-6 border border-border/20 hover:border-cyan-500/30 transition-all duration-500 group relative overflow-hidden"
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                whileHover={{ y: -6, transition: { duration: 0.3 } }}
              >
                {/* Top gradient bar */}
                <div className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${trader.gradient} opacity-60`} />

                {/* Live indicator */}
                <div className="absolute top-3 right-3 flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                  <span className="text-[10px] text-emerald-400 font-mono font-medium">LIVE</span>
                </div>

                {/* Avatar & Name */}
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${trader.gradient} flex items-center justify-center text-white font-bold text-lg shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                    {trader.name[0]}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-sm truncate">{trader.name}</h3>
                    <p className="text-xs text-muted-foreground truncate">{trader.specialty}</p>
                  </div>
                </div>

                {/* Sparkline */}
                <div className="mb-4 -mx-2">
                  <SparklineChart data={trader.sparkData} color={risk.glowColor} width={160} height={45} />
                </div>

                {/* Win Rate Progress Bar */}
                <div className="mb-3">
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Activity className="h-3 w-3" /> {t('landing.traders.winRate')}
                    </span>
                    <span className="font-bold text-emerald-400 text-sm font-mono">{trader.winRate}%</span>
                  </div>
                  <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full"
                      initial={{ width: 0 }}
                      whileInView={{ width: `${trader.winRate}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 1, delay: 0.5 + index * 0.1 }}
                    />
                  </div>
                </div>

                {/* Stats */}
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" /> {t('landing.traders.monthlyRoi')}
                    </span>
                    <span className="font-bold text-cyan-400 text-sm font-mono">+{trader.monthlyRoi}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <ShieldCheck className="h-3 w-3" /> {t('landing.traders.risk')}
                    </span>
                    <Badge className={`${risk.bg} ${risk.text} border ${risk.border} text-[10px] px-2`}>
                      {t(risk.labelKey)}
                    </Badge>
                  </div>
                </div>

                {/* Bottom glow on hover */}
                <div className={`absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r ${trader.gradient} opacity-0 group-hover:opacity-60 transition-opacity duration-500`} />
              </motion.div>
            )
          })}
        </div>

        <motion.div
          className="text-center mt-12"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <Button
            variant="outline"
            className="border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10 hover:border-cyan-500/50 font-bold px-8 py-6"
            onClick={() => setAuthModal('register')}
          >
            <Zap className="mr-2 h-4 w-4" />
            {t('landing.traders.viewAll')}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </motion.div>
      </div>
    </section>
  )
}
