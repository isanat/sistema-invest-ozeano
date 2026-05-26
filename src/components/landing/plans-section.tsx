'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useAppStore } from '@/lib/store'
import { useI18n, T } from '@/lib/i18n/context'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowRight, Star, Crown, Gem, Coins, Medal, Rocket } from 'lucide-react'

const planMeta: Record<string, {
  gradient: string
  border: string
  accent: string
  icon: typeof Star
  bgGlow: string
  badgeLabel?: string
}> = {
  starter: {
    gradient: 'from-slate-500 to-slate-700',
    border: 'border-slate-500/25',
    accent: 'text-slate-300',
    icon: Rocket,
    bgGlow: 'shadow-slate-500/10',
  },
  bronze: {
    gradient: 'from-amber-700 to-amber-900',
    border: 'border-amber-600/25',
    accent: 'text-amber-400',
    icon: Medal,
    bgGlow: 'shadow-amber-500/10',
  },
  silver: {
    gradient: 'from-gray-300 to-gray-500',
    border: 'border-gray-400/25',
    accent: 'text-gray-300',
    icon: Coins,
    bgGlow: 'shadow-gray-400/10',
    badgeLabel: 'landing.plans.popular',
  },
  gold: {
    gradient: 'from-yellow-400 to-amber-600',
    border: 'border-yellow-500/25',
    accent: 'text-yellow-400',
    icon: Crown,
    bgGlow: 'shadow-yellow-500/10',
  },
  diamond: {
    gradient: 'from-cyan-400 to-blue-600',
    border: 'border-cyan-400/25',
    accent: 'text-cyan-400',
    icon: Gem,
    bgGlow: 'shadow-cyan-500/10',
    badgeLabel: 'landing.plans.premium',
  },
}

const defaultPlans = [
  { id: 'starter', name: 'Starter', minAmount: 10, maxAmount: 49, dailyRoi: 1.0, duration: 30 },
  { id: 'bronze', name: 'Bronze', minAmount: 50, maxAmount: 99, dailyRoi: 1.5, duration: 30 },
  { id: 'silver', name: 'Silver', minAmount: 100, maxAmount: 499, dailyRoi: 2.5, duration: 30 },
  { id: 'gold', name: 'Gold', minAmount: 500, maxAmount: 1499, dailyRoi: 3.5, duration: 30 },
  { id: 'diamond', name: 'Diamond', minAmount: 1500, maxAmount: null, dailyRoi: 5.0, duration: 30 },
]

function AnimatedROI({ amount, dailyRoi }: { amount: number; dailyRoi: number }) {
  const [dailyEarning, setDailyEarning] = useState(0)

  useEffect(() => {
    const earning = amount * (dailyRoi / 100)
    const timer = setTimeout(() => setDailyEarning(earning), 100)
    return () => clearTimeout(timer)
  }, [amount, dailyRoi])

  return (
    <motion.span
      className="text-emerald-400 font-bold"
      key={dailyEarning}
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      ${dailyEarning.toFixed(2)}
    </motion.span>
  )
}

export function PlansSection() {
  const { setAuthModal, investmentPlans } = useAppStore()
  const { t } = useI18n()

  const plans = investmentPlans.length > 0
    ? investmentPlans.map((p) => {
        const key = p.name.toLowerCase()
        const meta = planMeta[key] || {
          gradient: 'from-emerald-600 to-cyan-600',
          border: 'border-emerald-500/25',
          accent: 'text-emerald-400',
          icon: Star,
          bgGlow: 'shadow-emerald-500/10',
        }
        return { ...p, ...meta }
      })
    : defaultPlans.map((p) => ({ ...p, ...planMeta[p.id] || planMeta.starter }))

  return (
    <section id="plans-section" className="py-24 px-4 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 grid-bg pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-emerald-500/3 rounded-full blur-[200px] pointer-events-none" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent" />

      <div className="max-w-7xl mx-auto relative">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl sm:text-5xl font-black mb-4">
            <T k="landing.plans.title" />
          </h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            {t('landing.plans.subtitle')}
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
          {plans.map((plan, index) => {
            const IconComp = plan.icon || Star
            const totalReturn = plan.minAmount * (plan.dailyRoi / 100) * plan.duration
            const isPopular = plan.badgeLabel === 'landing.plans.popular'
            const isPremium = plan.badgeLabel === 'landing.plans.premium'

            return (
              <motion.div
                key={plan.id}
                className={`relative group ${isPopular ? 'rotating-gradient-border' : ''}`}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                whileHover={{ y: -8, transition: { duration: 0.3 } }}
              >
                {/* Card */}
                <div className={`relative rounded-2xl p-6 h-full flex flex-col border ${plan.border} holographic-card overflow-hidden transition-all duration-500 group-hover:${plan.border.replace('/25', '/50')} ${
                  isPopular ? 'glass-strong' : 'glass-neon'
                } ${isPopular ? 'ring-1 ring-emerald-500/30' : ''} ${isPremium ? 'ring-1 ring-cyan-500/30' : ''}`}>

                  {/* Top gradient accent line */}
                  <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${plan.gradient} opacity-60`} />

                  {/* Badge */}
                  {plan.badgeLabel && (
                    <Badge className={`absolute -top-0 right-4 ${
                      isPremium ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white' : 'bg-gradient-to-r from-emerald-600 to-cyan-600 text-white'
                    } shadow-lg z-10`}>
                      <Star className="h-3 w-3 mr-1" />
                      {t(plan.badgeLabel)}
                    </Badge>
                  )}

                  {/* Plan icon & name */}
                  <div className="text-center mb-5 pt-3">
                    <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br ${plan.gradient} mb-4 shadow-lg ${plan.bgGlow} group-hover:scale-110 transition-transform duration-500`}>
                      <IconComp className="h-8 w-8 text-white" />
                    </div>
                    <h3 className="text-xl font-bold">{plan.name}</h3>
                  </div>

                  {/* Plan details */}
                  <div className="space-y-3 mb-6 flex-1">
                    <div className="flex justify-between items-center py-2 border-b border-border/10">
                      <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">{t('landing.plans.investment')}</span>
                      <span className="font-bold font-mono text-sm">${plan.minAmount}{plan.maxAmount ? ` - $${plan.maxAmount}` : '+'}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-border/10">
                      <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">{t('landing.plans.dailyRoi')}</span>
                      <span className={`font-bold font-mono text-sm ${plan.accent}`}>{plan.dailyRoi}%</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-border/10">
                      <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">{t('landing.plans.duration')}</span>
                      <span className="font-bold font-mono text-sm">{plan.duration} {t('landing.plans.days')}</span>
                    </div>

                    {/* Daily earning highlight */}
                    <div className="glass rounded-lg p-3 text-center mt-2">
                      <div className="text-xs text-muted-foreground mb-1">{t('landing.plans.estimatedReturn')}</div>
                      <div className="text-lg font-black text-emerald-400 font-mono">
                        ~${totalReturn.toFixed(2)}
                      </div>
                    </div>
                  </div>

                  {/* CTA Button */}
                  <Button
                    className={`w-full font-bold transition-all duration-300 ${
                      isPopular
                        ? 'bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white glow-emerald'
                        : isPremium
                        ? 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white glow-cyan'
                        : 'bg-secondary hover:bg-secondary/80 text-foreground'
                    }`}
                    onClick={() => setAuthModal('register')}
                  >
                    {t('landing.plans.investNow')}
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </Button>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
