'use client'

import { useEffect, useState, useRef } from 'react'
import { useAppStore } from '@/lib/store'
import { formatUSDT, getInvestments } from '@/lib/api'
import { useI18n } from '@/lib/i18n/context'
import { motion } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  Briefcase,
  Clock,
  TrendingUp,
  CheckCircle2,
  DollarSign,
  ArrowRight,
  Flame,
} from 'lucide-react'

// Animated counter hook
function useAnimatedCounter(target: number, duration = 800) {
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

const planAccents: Record<string, { color: string; bg: string; border: string; glow: string }> = {
  starter: { color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', glow: 'shadow-[0_0_16px_rgba(16,185,129,0.08)]' },
  bronze: { color: 'text-amber-600', bg: 'bg-amber-500/10', border: 'border-amber-600/20', glow: 'shadow-[0_0_16px_rgba(180,83,9,0.08)]' },
  silver: { color: 'text-gray-300', bg: 'bg-gray-400/10', border: 'border-gray-400/20', glow: 'shadow-[0_0_16px_rgba(156,163,175,0.08)]' },
  gold: { color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', glow: 'shadow-[0_0_16px_rgba(234,179,8,0.08)]' },
  diamond: { color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20', glow: 'shadow-[0_0_16px_rgba(6,182,212,0.08)]' },
}

function getAccent(planName: string) {
  return planAccents[planName.toLowerCase()] || planAccents.starter
}

function InvestmentCard({ inv, index }: { inv: ReturnType<typeof useAppStore>['investments'][0]; index: number }) {
  const { t } = useI18n()
  const accent = getAccent(inv.planName)
  const progress = (inv.daysElapsed / inv.totalDays) * 100
  const dailyEarning = inv.amount * ((inv.dailyRoi + inv.teamBonusPct) / 100)
  const daysLeft = inv.totalDays - inv.daysElapsed
  const animatedEarned = useAnimatedCounter(inv.totalEarned)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 + index * 0.05 }}
    >
      <Card className={`glass ${accent.border} hover:${accent.glow} transition-all duration-300 group relative overflow-hidden`}>
        <div className={`absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-emerald-400 to-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity`} />
        <CardContent className="p-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`h-10 w-10 rounded-xl ${accent.bg} flex items-center justify-center`}>
                <Flame className={`h-5 w-5 ${accent.color}`} />
              </div>
              <div>
                <h3 className="font-bold text-base">{inv.planName}</h3>
                <p className="text-xs text-muted-foreground">{t('general.active')}</p>
              </div>
            </div>
            <Badge className={`${accent.bg} ${accent.color} border-0 text-xs`}>
              {t('general.active')}
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="glass rounded-lg p-2.5 border border-border/5">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{t('dash.invest.amount')}</p>
              <p className="font-semibold text-sm font-mono">{formatUSDT(inv.amount)} USDT</p>
            </div>
            <div className="glass rounded-lg p-2.5 border border-border/5">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{t('dash.invest.dailyReturn')}</p>
              <p className="font-semibold text-sm text-emerald-400 font-mono">
                {inv.dailyRoi}%{inv.teamBonusPct > 0 ? <span className="text-amber-400"> +{inv.teamBonusPct}%</span> : ''}
              </p>
            </div>
            <div className="glass rounded-lg p-2.5 border border-border/5">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Today</p>
              <p className="font-semibold text-sm text-emerald-400 font-mono">+{formatUSDT(dailyEarning)}</p>
            </div>
            <div className="glass rounded-lg p-2.5 border border-border/5">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{t('dash.plans.earned')}</p>
              <p className="font-semibold text-sm text-emerald-400 font-mono">+{formatUSDT(animatedEarned)}</p>
            </div>
          </div>

          {/* Animated Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" /> {t('dash.plans.progress')}: {inv.daysElapsed}/{inv.totalDays}
              </span>
              <span>{progress.toFixed(0)}%</span>
            </div>
            <div className="relative h-2.5 bg-secondary/50 rounded-full overflow-hidden">
              <motion.div
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-500 to-cyan-400 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 1, ease: 'easeOut', delay: 0.3 + index * 0.1 }}
              />
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-gradient" />
            </div>
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>{daysLeft} {t('dash.plans.daysLeft')}</span>
              <span>{formatUSDT(inv.totalEarned)} USDT {t('dash.plans.earned')}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

function CompletedCard({ inv, index }: { inv: ReturnType<typeof useAppStore>['investments'][0]; index: number }) {
  const { t } = useI18n()
  const animatedEarned = useAnimatedCounter(inv.totalEarned)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 + index * 0.05 }}
    >
      <Card className="glass border-border/10 opacity-75">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                <CheckCircle2 className="h-4 w-4 text-cyan-400" />
              </div>
              <h3 className="font-bold text-sm">{inv.planName}</h3>
            </div>
            <Badge className="bg-cyan-500/10 text-cyan-400 border-0 text-xs">{t('general.completed')}</Badge>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{t('dash.invest.amount')}</p>
              <p className="font-semibold text-sm font-mono">{formatUSDT(inv.amount)} USDT</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{t('dash.plans.earned')}</p>
              <p className="font-semibold text-sm text-emerald-400 font-mono">+{formatUSDT(animatedEarned)} USDT</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

export function PlansTab() {
  const { investments, setInvestments, setDashboardTab } = useAppStore()
  const { t } = useI18n()

  useEffect(() => {
    getInvestments()
      .then(setInvestments)
      .catch(() => {})
  }, [setInvestments])

  const activeInvestments = investments.filter((i) => i.status === 'active')
  const completedInvestments = investments.filter((i) => i.status === 'completed')

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-2xl sm:text-3xl font-bold">
          <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
            {t('dash.plans.title')}
          </span>
        </h1>
        <p className="text-muted-foreground mt-1">{t('dash.plans.subtitle')}</p>
      </motion.div>

      {activeInvestments.length === 0 && completedInvestments.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card className="glass border-border/20">
            <CardContent className="p-12 text-center">
              <div className="h-16 w-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
                <Briefcase className="h-8 w-8 text-emerald-400/50" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{t('dash.plans.noPlans')}</h3>
              <p className="text-muted-foreground text-sm mb-6">Start earning daily ROI with your first investment</p>
              <Button
                onClick={() => setDashboardTab('invest')}
                className="bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shadow-[0_0_16px_rgba(16,185,129,0.15)]"
              >
                {t('general.invest')} <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Active Investments */}
      {activeInvestments.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-sm font-semibold flex items-center gap-2 uppercase tracking-wider text-muted-foreground">
            <TrendingUp className="h-4 w-4 text-emerald-400" />
            {t('dash.overview.activeInvestments')}
            <Badge className="bg-emerald-500/10 text-emerald-400 border-0 text-xs ml-1">{activeInvestments.length}</Badge>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {activeInvestments.map((inv, index) => (
              <InvestmentCard key={inv.id} inv={inv} index={index} />
            ))}
          </div>
        </div>
      )}

      {/* Completed Investments */}
      {completedInvestments.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-sm font-semibold flex items-center gap-2 uppercase tracking-wider text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-cyan-400" />
            {t('general.completed')}
            <Badge className="bg-cyan-500/10 text-cyan-400 border-0 text-xs ml-1">{completedInvestments.length}</Badge>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {completedInvestments.map((inv, index) => (
              <CompletedCard key={inv.id} inv={inv} index={index} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
