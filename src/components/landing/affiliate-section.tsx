'use client'

import { motion } from 'framer-motion'
import { useAppStore } from '@/lib/store'
import { useI18n, T } from '@/lib/i18n/context'
import { Button } from '@/components/ui/button'
import { Users, Award, ArrowRight, Trophy, Target, Flame } from 'lucide-react'

const defaultLevels = [
  { level: 1, percentage: 10 },
  { level: 2, percentage: 4 },
  { level: 3, percentage: 3 },
  { level: 4, percentage: 2 },
  { level: 5, percentage: 1.5 },
  { level: 6, percentage: 1 },
  { level: 7, percentage: 0.8 },
  { level: 8, percentage: 0.5 },
  { level: 9, percentage: 0.4 },
  { level: 10, percentage: 0.3 },
  { level: 11, percentage: 0.5 },
]

const defaultRanks = [
  { name: 'Bronze', directReferrals: 10, bonusPct: 1, color: 'text-amber-600', bg: 'bg-amber-500/10', border: 'border-amber-600/30', gradient: 'from-amber-600 to-amber-800', icon: Trophy },
  { name: 'Prata', directReferrals: 20, bonusPct: 2, color: 'text-gray-300', bg: 'bg-gray-500/10', border: 'border-gray-400/30', gradient: 'from-gray-300 to-gray-500', icon: Target },
  { name: 'Ouro', directReferrals: 30, bonusPct: 3, color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', gradient: 'from-yellow-400 to-amber-600', icon: Flame },
]

function UnilevelTree({ levels }: { levels: { level: number; percentage: number }[] }) {
  return (
    <div className="flex flex-col items-center gap-1">
      {/* Root node */}
      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
        <Users className="h-5 w-5 text-white" />
      </div>
      <svg width="2" height="16"><line x1="1" y1="0" x2="1" y2="16" stroke="rgba(16,185,129,0.3)" strokeWidth="2" /></svg>

      {/* Level nodes */}
      <div className="space-y-2">
        {levels.map((lvl, i) => {
          const width = Math.max(20, 100 - i * 7)
          const opacity = Math.max(0.3, 1 - i * 0.07)
          return (
            <div key={lvl.level} className="flex items-center gap-2">
              <motion.div
                className="flex items-center gap-2 glass rounded-lg px-3 py-1.5 border border-emerald-500/15"
                style={{ width: `${width}%`, minWidth: '120px', opacity }}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
              >
                <div className="w-5 h-5 rounded-md bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-[10px] font-bold text-emerald-400 font-mono">{lvl.level}</span>
                </div>
                <div className="flex-1 h-1 bg-secondary rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full"
                    initial={{ width: 0 }}
                    whileInView={{ width: `${(lvl.percentage / 10) * 100}%` }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8, delay: 0.3 + i * 0.08 }}
                  />
                </div>
                <span className="text-xs font-bold text-emerald-400 font-mono flex-shrink-0">{lvl.percentage}%</span>
              </motion.div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function AffiliateSection() {
  const { setAuthModal, affiliateLevels, affiliateRanks } = useAppStore()
  const { t } = useI18n()

  const levels = affiliateLevels.length > 0 ? affiliateLevels : defaultLevels
  const ranks = affiliateRanks.length > 0
    ? affiliateRanks.map((r, i) => {
        const meta = defaultRanks[i] || defaultRanks[0]
        return { ...r, color: meta.color, bg: meta.bg, border: meta.border, gradient: meta.gradient, icon: meta.icon }
      })
    : defaultRanks

  return (
    <section id="affiliate-section" className="py-24 px-4 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 grid-bg pointer-events-none" />
      <div className="absolute top-1/2 left-0 w-[600px] h-[600px] bg-amber-500/3 rounded-full blur-[180px] pointer-events-none" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-500/20 to-transparent" />

      <div className="max-w-6xl mx-auto relative">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl sm:text-5xl font-black mb-4">
            <T k="landing.affiliate.title" />
          </h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            {t('landing.affiliate.subtitle')}
          </p>
        </motion.div>

        {/* Commission Levels - Desktop horizontal, Mobile tree */}
        <motion.div
          className="glass-neon rounded-2xl p-6 sm:p-8 border border-amber-500/20 mb-12 holographic-card"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h3 className="text-xl font-bold mb-8 text-center flex items-center justify-center gap-2">
            <Users className="h-5 w-5 text-amber-400" />
            {t('landing.affiliate.commissionByLevel')}
          </h3>

          {/* Desktop: Horizontal bars */}
          <div className="hidden sm:grid grid-cols-11 gap-3">
            {levels.map((lvl, i) => {
              const barHeight = Math.max(20, (lvl.percentage / 10) * 100)
              return (
                <motion.div
                  key={lvl.level}
                  className="text-center flex flex-col items-center"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.06 }}
                >
                  <div className="relative w-full flex items-end justify-center mb-2" style={{ height: '120px' }}>
                    <motion.div
                      className={`w-full rounded-t-lg ${i === 0 ? 'bg-gradient-to-t from-emerald-600 to-emerald-400' : i < 4 ? 'bg-gradient-to-t from-cyan-700 to-cyan-400' : 'bg-gradient-to-t from-slate-700 to-slate-500'} opacity-80`}
                      initial={{ height: 0 }}
                      whileInView={{ height: `${barHeight}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.8, delay: 0.2 + i * 0.06 }}
                    />
                    {/* Glow effect for level 1 */}
                    {i === 0 && (
                      <div className="absolute inset-0 rounded-t-lg shadow-[0_0_15px_rgba(16,185,129,0.3)]" />
                    )}
                  </div>
                  <div className="text-[10px] text-muted-foreground font-mono">{t('landing.affiliate.level')} {lvl.level}</div>
                  <div className="font-bold text-sm font-mono text-amber-400">{lvl.percentage}%</div>
                </motion.div>
              )
            })}
          </div>

          {/* Mobile: Tree visualization */}
          <div className="sm:hidden">
            <UnilevelTree levels={levels} />
          </div>
        </motion.div>

        {/* Team Bonus Tiers */}
        <motion.div
          className="mb-12"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <h3 className="text-xl font-bold mb-8 text-center flex items-center justify-center gap-2">
            <Award className="h-5 w-5 text-amber-400" />
            {t('landing.affiliate.teamBonus')}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {ranks.map((rank, index) => {
              const IconComp = rank.icon || Trophy
              return (
                <motion.div
                  key={rank.name}
                  className={`glass-neon rounded-2xl p-6 text-center border ${rank.border} holographic-card group hover:${rank.border} transition-all duration-500`}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.15 }}
                  whileHover={{ y: -4 }}
                >
                  {/* Icon badge */}
                  <div className={`inline-flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-br ${rank.gradient} mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                    <IconComp className="h-7 w-7 text-white" />
                  </div>

                  <div className={`text-3xl font-black ${rank.color} mb-1 font-mono`}>
                    +{rank.bonusPct}%
                  </div>
                  <div className="text-lg font-bold mb-3">{rank.name}</div>
                  <div className="text-sm text-muted-foreground mb-1">
                    {rank.directReferrals} {t('landing.affiliate.directReferrals')}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {t('landing.affiliate.additionalDailyRoi')}
                  </div>

                  {/* Animated border glow */}
                  <div className={`absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r ${rank.gradient} opacity-0 group-hover:opacity-60 transition-opacity duration-500`} />
                </motion.div>
              )
            })}
          </div>
        </motion.div>

        <motion.div
          className="text-center"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <Button
            size="lg"
            onClick={() => setAuthModal('register')}
            className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold text-lg px-10 py-7 glow-gold"
          >
            {t('landing.affiliate.startEarning')}
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </motion.div>
      </div>
    </section>
  )
}
