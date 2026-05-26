'use client'

import { useEffect } from 'react'
import { useAppStore, type TeamBonusInfo } from '@/lib/store'
import { getTeamBonus, formatUSDT } from '@/lib/api'
import { useI18n } from '@/lib/i18n/context'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Award,
  Users,
  TrendingUp,
  Info,
  Shield,
  ChevronRight,
  Star,
  Flame,
  Target,
  ArrowRight,
  Zap,
} from 'lucide-react'

const tierConfig = {
  none: { label: 'None', color: 'text-muted-foreground', bg: 'bg-secondary', gradient: 'from-gray-500/10', iconColor: '#64748b', pct: 0, next: 'bronze', needed: 10, glow: '' },
  bronze: { label: 'Bronze', color: 'text-amber-600', bg: 'bg-amber-500/10', gradient: 'from-amber-600/10', iconColor: '#d97706', pct: 1, next: 'silver', needed: 20, glow: 'shadow-[0_0_24px_rgba(217,119,6,0.1)]' },
  silver: { label: 'Silver', color: 'text-gray-300', bg: 'bg-gray-400/10', gradient: 'from-gray-400/10', iconColor: '#9ca3af', pct: 2, next: 'gold', needed: 30, glow: 'shadow-[0_0_24px_rgba(156,163,175,0.1)]' },
  gold: { label: 'Gold', color: 'text-yellow-400', bg: 'bg-yellow-500/10', gradient: 'from-yellow-500/10', iconColor: '#eab308', pct: 3, next: null, needed: 0, glow: 'shadow-[0_0_24px_rgba(234,179,8,0.15)]' },
}

export function TeamBonusTab() {
  const { teamBonusInfo, setTeamBonusInfo, setDashboardTab } = useAppStore()
  const { t } = useI18n()

  useEffect(() => {
    getTeamBonus()
      .then(setTeamBonusInfo)
      .catch(() => {})
  }, [setTeamBonusInfo])

  const info: TeamBonusInfo = teamBonusInfo || {
    tier: 'none',
    bonusPct: 0,
    directReferrals: 0,
    nextTier: 'bronze',
    referralsNeeded: 10,
  }

  const currentTier = tierConfig[info.tier]
  const nextTierKey = info.nextTier as keyof typeof tierConfig | null
  const nextTierInfo = nextTierKey ? tierConfig[nextTierKey] : null
  const progressToNext = info.tier === 'gold' ? 100 : nextTierInfo
    ? Math.min((info.directReferrals / nextTierInfo.needed) * 100, 100)
    : 0

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-2xl sm:text-3xl font-bold">
          <span className="bg-gradient-to-r from-amber-400 to-yellow-400 bg-clip-text text-transparent">
            {t('dash.team.title')}
          </span>
        </h1>
        <p className="text-muted-foreground mt-1">{t('dash.team.subtitle')}</p>
      </motion.div>

      {/* Current Tier Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <Card className={`relative overflow-hidden border-amber-500/20 ${currentTier.glow}`}>
          <div className={`absolute inset-0 bg-gradient-to-br ${currentTier.gradient} to-transparent`} />
          <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <CardContent className="relative p-6 sm:p-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className={`relative h-18 w-18 rounded-2xl ${currentTier.bg} flex items-center justify-center border border-currentTier.border`} style={{ width: 72, height: 72 }}>
                  <Award className="h-9 w-9" style={{ color: currentTier.iconColor }} />
                  {info.tier !== 'none' && (
                    <div className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-emerald-500 flex items-center justify-center border-2 border-[#060a14]">
                      <Check className="h-2.5 w-2.5 text-white" />
                    </div>
                  )}
                </div>
                <div>
                  <Badge className={`${currentTier.bg} ${currentTier.color} border-0 text-xs mb-1`}>
                    {t('dash.team.currentTier')}
                  </Badge>
                  <h2 className="text-2xl font-bold">{currentTier.label}</h2>
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-1 justify-end">
                  <TrendingUp className="h-4 w-4 text-amber-400" />
                  <span className="text-3xl font-bold text-amber-400">+{currentTier.pct}%</span>
                </div>
                <p className="text-xs text-muted-foreground">{t('dash.team.bonusOnRoi')}</p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Referral count */}
              <div className="glass rounded-xl p-4 border border-border/10">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Direct active referrals
                  </span>
                  <span className="font-bold text-lg">{info.directReferrals}</span>
                </div>

                {info.tier !== 'gold' && nextTierInfo && (
                  <>
                    <div className="flex items-center justify-between mb-2 text-sm">
                      <span className="text-muted-foreground">
                        Next: <span className="font-semibold" style={{ color: nextTierInfo.iconColor }}>{nextTierInfo.label}</span>
                      </span>
                      <span className="font-semibold">{nextTierInfo.needed} {t('dash.team.referralsNeeded')}</span>
                    </div>
                    <div className="relative h-3 bg-secondary/50 rounded-full overflow-hidden">
                      <motion.div
                        className="absolute inset-y-0 left-0 bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${progressToNext}%` }}
                        transition={{ duration: 1, ease: 'easeOut' }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground text-center mt-2">
                      {info.referralsNeeded} more referrals to {nextTierInfo.label}
                    </p>
                  </>
                )}

                {info.tier === 'gold' && (
                  <motion.div
                    initial={{ scale: 0.9 }}
                    animate={{ scale: 1 }}
                    className="text-center pt-2"
                  >
                    <Badge className="bg-yellow-500/15 text-yellow-400 border-yellow-500/30 text-sm px-4 py-1.5">
                      <Star className="h-3 w-3 mr-1 fill-yellow-400" /> Max Rank Achieved!
                    </Badge>
                  </motion.div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* All Tiers */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <Card className="glass border-border/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Target className="h-4 w-4 text-amber-400" />
              All Ranks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(tierConfig).filter(([key]) => key !== 'none').map(([key, tier], idx) => {
                const isActive = info.tier === key
                const isAchieved = ['none', 'bronze', 'silver', 'gold'].indexOf(info.tier) >= ['none', 'bronze', 'silver', 'gold'].indexOf(key)
                return (
                  <motion.div
                    key={key}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + idx * 0.08 }}
                    className={`glass rounded-xl p-4 flex items-center justify-between border transition-all ${
                      isActive ? 'border-amber-500/30 bg-amber-500/5' : 'border-border/5'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`h-11 w-11 rounded-xl ${tier.bg} flex items-center justify-center relative`}>
                        <Award className="h-5 w-5" style={{ color: tier.iconColor }} />
                        {isAchieved && key !== 'none' && (
                          <div className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-emerald-500 flex items-center justify-center">
                            <Check className="h-2 w-2 text-white" />
                          </div>
                        )}
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm">{tier.label}</h4>
                        <p className="text-xs text-muted-foreground">{tier.needed} direct referrals</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-bold text-amber-400">+{tier.pct}%</span>
                      <p className="text-[10px] text-muted-foreground">ROI bonus</p>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* How to Qualify */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <Card className="glass border-cyan-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Info className="h-4 w-4 text-cyan-400" />
              How it Works
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { icon: Zap, text: 'Team Bonus is added to your daily ROI on all active investments' },
              { icon: Users, text: 'Referrals must have at least one active investment to count' },
              { icon: TrendingUp, text: 'Bonus is automatically recalculated with each ROI distribution' },
              { icon: Award, text: 'New rank bonus is applied immediately upon qualification' },
            ].map((item, idx) => (
              <div key={idx} className="flex items-start gap-3 text-sm text-muted-foreground">
                <div className="h-6 w-6 rounded-lg bg-cyan-500/10 flex items-center justify-center shrink-0 mt-0.5">
                  <item.icon className="h-3 w-3 text-cyan-400" />
                </div>
                <span>{item.text}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </motion.div>

      {/* CTA */}
      {info.tier !== 'gold' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <Card className="glass border-emerald-500/20 bg-gradient-to-r from-emerald-500/5 to-transparent">
            <CardContent className="p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                  <Flame className="h-5 w-5 text-emerald-400" />
                </div>
                <div>
                  <p className="font-semibold text-sm">Boost your bonus</p>
                  <p className="text-xs text-muted-foreground">Invite more friends to reach the next rank</p>
                </div>
              </div>
              <Button
                onClick={() => setDashboardTab('affiliate')}
                className="bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shadow-[0_0_12px_rgba(16,185,129,0.15)]"
                size="sm"
              >
                {t('dash.sidebar.affiliate')} <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  )
}

function Check({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}
