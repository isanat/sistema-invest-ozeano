'use client'

import { motion } from 'framer-motion'
import { useI18n, T } from '@/lib/i18n/context'
import { ClipboardList, Wallet, TrendingUp, ChevronRight } from 'lucide-react'

const stepColors = [
  { gradient: 'from-emerald-500 to-emerald-700', bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30', glow: 'shadow-emerald-500/20', ring: 'ring-emerald-500/30' },
  { gradient: 'from-cyan-500 to-cyan-700', bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/30', glow: 'shadow-cyan-500/20', ring: 'ring-cyan-500/30' },
  { gradient: 'from-amber-500 to-amber-700', bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30', glow: 'shadow-amber-500/20', ring: 'ring-amber-500/30' },
]

export function HowItWorksSection() {
  const { t } = useI18n()

  const steps = [
    {
      icon: ClipboardList,
      titleKey: 'landing.how.step1Title',
      descKey: 'landing.how.step1Desc',
    },
    {
      icon: Wallet,
      titleKey: 'landing.how.step2Title',
      descKey: 'landing.how.step2Desc',
    },
    {
      icon: TrendingUp,
      titleKey: 'landing.how.step3Title',
      descKey: 'landing.how.step3Desc',
    },
  ]

  return (
    <section className="py-24 px-4 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 grid-bg pointer-events-none" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent" />

      <div className="max-w-5xl mx-auto relative">
        <motion.div
          className="text-center mb-20"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl sm:text-5xl font-black mb-4">
            <T k="landing.how.title" />
          </h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            {t('landing.how.subtitle')}
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-6 relative">
          {/* Animated connecting lines (desktop only) */}
          <div className="hidden md:block absolute top-1/2 left-[33%] right-[33%] h-px -translate-y-1/2 z-0">
            <svg className="w-full h-8" preserveAspectRatio="none">
              <line x1="0" y1="15" x2="100%" y2="15" stroke="rgba(16,185,129,0.15)" strokeWidth="1" strokeDasharray="8 4" className="animate-dash" />
              <line x1="0" y1="15" x2="100%" y2="15" stroke="url(#lineGrad)" strokeWidth="1" />
              <defs>
                <linearGradient id="lineGrad">
                  <stop offset="0%" stopColor="rgba(16,185,129,0.3)" />
                  <stop offset="50%" stopColor="rgba(6,182,212,0.3)" />
                  <stop offset="100%" stopColor="rgba(245,158,11,0.3)" />
                </linearGradient>
              </defs>
            </svg>
          </div>

          {steps.map((step, index) => {
            const colors = stepColors[index]
            return (
              <motion.div
                key={step.titleKey}
                className="relative z-10"
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.2 }}
              >
                <div className={`glass-neon rounded-2xl p-8 text-center h-full border ${colors.border} holographic-card group hover:${colors.border} transition-all duration-500`}>
                  {/* Hexagonal step icon */}
                  <div className="relative mx-auto mb-6 w-24 h-24">
                    {/* Outer hexagon glow */}
                    <div className={`absolute inset-0 hex-clip bg-gradient-to-br ${colors.gradient} opacity-20 group-hover:opacity-30 transition-opacity duration-500`} />
                    {/* Inner hexagon */}
                    <div className={`absolute inset-[3px] hex-clip-sm ${colors.bg} flex items-center justify-center`}>
                      <step.icon className={`h-10 w-10 ${colors.text}`} />
                    </div>
                    {/* Pulse ring */}
                    <div className={`absolute inset-0 hex-clip border-2 ${colors.border} animate-pulse opacity-50`} />
                  </div>

                  {/* Step number */}
                  <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full ${colors.bg} ${colors.text} text-xs font-bold mb-4 font-mono tracking-wider`}>
                    <span>{t('landing.how.step')}</span>
                    <span className="text-base">0{index + 1}</span>
                  </div>

                  <h3 className="text-xl font-bold mb-3">{t(step.titleKey)}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{t(step.descKey)}</p>

                  {/* Bottom glow line */}
                  <div className={`mt-6 h-0.5 w-0 group-hover:w-full bg-gradient-to-r ${colors.gradient} transition-all duration-500 mx-auto rounded-full`} />
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
