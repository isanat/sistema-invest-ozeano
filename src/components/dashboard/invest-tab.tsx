'use client'

import { useState, useEffect, useMemo } from 'react'
import { useAppStore } from '@/lib/store'
import { formatUSDT, getInvestmentPlans, createInvestment } from '@/lib/api'
import { useI18n } from '@/lib/i18n/context'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import {
  DollarSign,
  Star,
  ArrowRight,
  Loader2,
  Check,
  Award,
  Coins,
  Zap,
  Shield,
  Clock,
  TrendingUp,
  Copy,
  QrCode,
  AlertCircle,
} from 'lucide-react'

const planColors: Record<string, { gradient: string; border: string; glow: string; badge: string }> = {
  starter: {
    gradient: 'from-emerald-500/10 to-emerald-500/5',
    border: 'border-emerald-500/20',
    glow: 'shadow-[0_0_20px_rgba(16,185,129,0.08)]',
    badge: 'bg-emerald-600 text-white',
  },
  bronze: {
    gradient: 'from-amber-700/10 to-amber-700/5',
    border: 'border-amber-600/20',
    glow: 'shadow-[0_0_20px_rgba(180,83,9,0.08)]',
    badge: 'bg-amber-700 text-white',
  },
  silver: {
    gradient: 'from-gray-400/10 to-gray-400/5',
    border: 'border-gray-400/20',
    glow: 'shadow-[0_0_20px_rgba(156,163,175,0.08)]',
    badge: 'bg-gray-500 text-white',
  },
  gold: {
    gradient: 'from-yellow-500/10 to-yellow-500/5',
    border: 'border-yellow-500/20',
    glow: 'shadow-[0_0_20px_rgba(234,179,8,0.08)]',
    badge: 'bg-yellow-600 text-white',
  },
  diamond: {
    gradient: 'from-cyan-500/10 to-cyan-500/5',
    border: 'border-cyan-500/20',
    glow: 'shadow-[0_0_20px_rgba(6,182,212,0.08)]',
    badge: 'bg-cyan-600 text-white',
  },
}

const defaultPlans = [
  { id: 'starter', name: 'Starter', minAmount: 10, maxAmount: 49, dailyRoi: 1.0, duration: 30 },
  { id: 'bronze', name: 'Bronze', minAmount: 50, maxAmount: 99, dailyRoi: 1.5, duration: 30 },
  { id: 'silver', name: 'Silver', minAmount: 100, maxAmount: 499, dailyRoi: 2.5, duration: 30 },
  { id: 'gold', name: 'Gold', minAmount: 500, maxAmount: 1499, dailyRoi: 3.5, duration: 30 },
  { id: 'diamond', name: 'Diamond', minAmount: 1500, maxAmount: null, dailyRoi: 5.0, duration: 30 },
]

export function InvestTab() {
  const { investmentPlans, setInvestmentPlans, currentUser, teamBonusInfo, setDashboardTab } = useAppStore()
  const { t } = useI18n()
  const [investModal, setInvestModal] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<typeof defaultPlans[0] | null>(null)
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<'form' | 'payment' | 'success'>('form')

  const plans = investmentPlans.length > 0
    ? investmentPlans.map((p) => ({
        id: p.id,
        name: p.name,
        minAmount: p.minAmount,
        maxAmount: p.maxAmount,
        dailyRoi: p.dailyRoi,
        duration: p.duration,
      }))
    : defaultPlans

  useEffect(() => {
    if (investmentPlans.length === 0) {
      getInvestmentPlans()
        .then(setInvestmentPlans)
        .catch(() => {})
    }
  }, [investmentPlans.length, setInvestmentPlans])

  const teamBonusPct = teamBonusInfo?.bonusPct || currentUser?.teamBonusPct || 0

  const calculatedReturns = useMemo(() => {
    const numAmount = parseFloat(amount) || 0
    if (!selectedPlan || numAmount <= 0) return { daily: 0, total: 0, totalWithBonus: 0 }
    const daily = numAmount * (selectedPlan.dailyRoi / 100)
    const dailyWithBonus = numAmount * ((selectedPlan.dailyRoi + teamBonusPct) / 100)
    const total = daily * selectedPlan.duration
    const totalWithBonus = dailyWithBonus * selectedPlan.duration
    return { daily, total, totalWithBonus }
  }, [amount, selectedPlan, teamBonusPct])

  const handleInvest = (plan: typeof defaultPlans[0]) => {
    setSelectedPlan(plan)
    setAmount(String(plan.minAmount))
    setStep('form')
    setInvestModal(true)
  }

  const confirmInvest = async () => {
    if (!selectedPlan || !amount) return
    const numAmount = parseFloat(amount)
    if (isNaN(numAmount) || numAmount < selectedPlan.minAmount) {
      toast.error(`${t('dash.invest.minAmount')}: $${selectedPlan.minAmount}`)
      return
    }
    if (selectedPlan.maxAmount && numAmount > selectedPlan.maxAmount) {
      toast.error(`${t('dash.invest.maxAmount')}: $${selectedPlan.maxAmount}`)
      return
    }
    if (numAmount > (currentUser?.balance || 0)) {
      toast.error(t('general.error'))
      return
    }

    setLoading(true)
    try {
      await createInvestment({ planId: selectedPlan.id, amount: numAmount })
      setStep('success')
      toast.success(t('general.success'))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('general.error'))
    } finally {
      setLoading(false)
    }
  }

  const getPlanStyle = (name: string) => {
    const key = name.toLowerCase()
    return planColors[key] || planColors.starter
  }

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-2xl sm:text-3xl font-bold">
          <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
            {t('dash.invest.title')}
          </span>
        </h1>
        <p className="text-muted-foreground mt-1">{t('dash.invest.subtitle')}</p>
      </motion.div>

      {teamBonusPct > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.05 }}
        >
          <Card className="border-amber-500/20 bg-gradient-to-r from-amber-500/5 to-transparent">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                <Award className="h-5 w-5 text-amber-400" />
              </div>
              <span className="text-sm">
                +<span className="text-amber-400 font-bold">{teamBonusPct}% Team Bonus</span> {t('dash.team.bonusOnRoi')}
              </span>
            </CardContent>
          </Card>
        </motion.div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {plans.map((plan, index) => {
          const style = getPlanStyle(plan.name)
          const totalReturn = plan.minAmount * ((plan.dailyRoi + teamBonusPct) / 100) * plan.duration
          const isPopular = plan.name.toLowerCase() === 'silver'
          const isPremium = plan.name.toLowerCase() === 'diamond'
          return (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 + index * 0.05 }}
              whileHover={{ y: -6, transition: { duration: 0.2 } }}
              className="group"
            >
              <Card className={`relative overflow-hidden glass ${style.border} hover:${style.glow} transition-all duration-300`}>
                <div className={`absolute inset-0 bg-gradient-to-b ${style.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
                <CardContent className="relative p-6">
                  {/* Badges */}
                  <div className="flex items-center gap-2 mb-4">
                    {isPopular && (
                      <Badge className={`${style.badge} text-xs`}>
                        <Star className="h-3 w-3 mr-1" /> {t('landing.plans.popular')}
                      </Badge>
                    )}
                    {isPremium && (
                      <Badge className={`${style.badge} text-xs`}>
                        <Zap className="h-3 w-3 mr-1" /> {t('landing.plans.premium')}
                      </Badge>
                    )}
                  </div>

                  <h3 className="text-xl font-bold mb-1">{plan.name}</h3>
                  <p className="text-xs text-muted-foreground mb-5">{plan.duration} {t('landing.plans.days')}</p>

                  <div className="space-y-3 mb-6">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-muted-foreground">{t('landing.plans.investment')}</span>
                      <span className="font-semibold text-sm">${plan.minAmount}{plan.maxAmount ? ` - $${plan.maxAmount}` : '+'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-muted-foreground">{t('landing.plans.dailyRoi')}</span>
                      <span className="font-semibold text-sm text-emerald-400">
                        {plan.dailyRoi}%{teamBonusPct > 0 ? <span className="text-amber-400"> +{teamBonusPct}%</span> : ''}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-muted-foreground">{t('landing.plans.duration')}</span>
                      <span className="font-semibold text-sm">{plan.duration} {t('landing.plans.days')}</span>
                    </div>
                    <div className="flex justify-between items-center pt-3 border-t border-border/10">
                      <span className="text-xs text-muted-foreground">{t('landing.plans.estimatedReturn')}</span>
                      <span className="font-bold text-emerald-400 text-sm">~${totalReturn.toFixed(2)}</span>
                    </div>
                  </div>

                  <Button
                    className="w-full bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-semibold shadow-[0_0_16px_rgba(16,185,129,0.15)]"
                    onClick={() => handleInvest(plan)}
                  >
                    {t('general.invest')}
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </div>

      {/* Investment Modal */}
      <Dialog open={investModal} onOpenChange={setInvestModal}>
        <DialogContent className="glass-strong border-emerald-500/20 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl">
              {t('dash.invest.selectPlan')}: <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">{selectedPlan?.name}</span>
            </DialogTitle>
          </DialogHeader>

          <AnimatePresence mode="wait">
            {step === 'form' && selectedPlan && (
              <motion.div
                key="form"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4 mt-4"
              >
                {/* Plan details */}
                <div className="glass rounded-xl p-4 space-y-2 border border-border/10">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t('dash.invest.dailyReturn')}</span>
                    <span className="text-emerald-400 font-semibold">{selectedPlan.dailyRoi}%{teamBonusPct > 0 ? ` +${teamBonusPct}%` : ''}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t('landing.plans.duration')}</span>
                    <span className="font-semibold">{selectedPlan.duration} {t('landing.plans.days')}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t('dash.invest.minAmount')}</span>
                    <span className="font-semibold">${selectedPlan.minAmount}</span>
                  </div>
                  {selectedPlan.maxAmount && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{t('dash.invest.maxAmount')}</span>
                      <span className="font-semibold">${selectedPlan.maxAmount}</span>
                    </div>
                  )}
                </div>

                {/* Amount input */}
                <div className="space-y-2">
                  <Label>{t('dash.invest.amount')} (USDT)</Label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full bg-emerald-500/10 flex items-center justify-center">
                      <Coins className="h-3 w-3 text-emerald-400" />
                    </div>
                    <Input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="pl-12 bg-secondary/50 border-border/50 focus:border-emerald-500/50 h-12 text-lg font-mono"
                      min={selectedPlan.minAmount}
                      max={selectedPlan.maxAmount || undefined}
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-medium">
                      USDT
                    </div>
                  </div>
                </div>

                {/* Real-time ROI Calculator */}
                {parseFloat(amount) > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="glass rounded-xl p-4 border border-emerald-500/10"
                  >
                    <p className="text-xs text-muted-foreground mb-3 uppercase tracking-wider">{t('dash.invest.dailyReturn')} / {t('dash.invest.totalReturn')}</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground">{t('general.daily')}</p>
                        <p className="text-xl font-bold text-emerald-400 font-mono">
                          +{formatUSDT(calculatedReturns.dailyWithBonus)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">{t('general.total')}</p>
                        <p className="text-xl font-bold text-emerald-400 font-mono">
                          +{formatUSDT(calculatedReturns.totalWithBonus)}
                        </p>
                      </div>
                    </div>
                    {teamBonusPct > 0 && (
                      <p className="text-[10px] text-amber-400/80 mt-2">
                        Includes +{teamBonusPct}% team bonus
                      </p>
                    )}
                  </motion.div>
                )}

                <Button
                  onClick={confirmInvest}
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-semibold shadow-[0_0_20px_rgba(16,185,129,0.2)] h-12"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
                  {t('dash.invest.confirmInvest')}
                </Button>
              </motion.div>
            )}

            {step === 'success' && (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-8 space-y-4"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
                  className="h-16 w-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(16,185,129,0.2)]"
                >
                  <Check className="h-8 w-8 text-emerald-400" />
                </motion.div>
                <h3 className="text-xl font-bold">{t('general.success')}!</h3>
                <p className="text-sm text-muted-foreground">Your investment is now active and earning daily ROI.</p>
                <div className="flex gap-3 justify-center pt-2">
                  <Button
                    onClick={() => { setInvestModal(false); setDashboardTab('plans') }}
                    className="bg-gradient-to-r from-emerald-600 to-emerald-500 text-white"
                  >
                    {t('dash.sidebar.myPlans')} <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                  <Button variant="outline" onClick={() => setInvestModal(false)} className="border-border/50">
                    {t('general.close')}
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </DialogContent>
      </Dialog>
    </div>
  )
}
