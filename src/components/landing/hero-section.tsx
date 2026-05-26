'use client'

import { useEffect, useState, useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { useAppStore } from '@/lib/store'
import { useI18n, T } from '@/lib/i18n/context'
import { Button } from '@/components/ui/button'
import { ArrowRight, Zap, Activity, TrendingUp, BarChart3, Shield, Wifi } from 'lucide-react'

function AnimatedCounter({ target, prefix = '', suffix = '', duration = 2000 }: { target: number; prefix?: string; suffix?: string; duration?: number }) {
  const [count, setCount] = useState(0)
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true })

  useEffect(() => {
    if (!isInView) return
    let start = 0
    const end = target
    const increment = end / (duration / 16)
    const timer = setInterval(() => {
      start += increment
      if (start >= end) {
        setCount(end)
        clearInterval(timer)
      } else {
        setCount(Math.floor(start))
      }
    }, 16)
    return () => clearInterval(timer)
  }, [isInView, target, duration])

  return <div ref={ref}>{prefix}{count.toLocaleString()}{suffix}</div>
}

function StarField() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {Array.from({ length: 50 }).map((_, i) => (
        <div
          key={i}
          className="absolute w-[1px] h-[1px] bg-white rounded-full animate-star-twinkle"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 5}s`,
            animationDuration: `${2 + Math.random() * 4}s`,
            opacity: Math.random() * 0.5 + 0.1,
          }}
        />
      ))}
    </div>
  )
}

function FloatingParticle({ delay, x, size }: { delay: number; x: number; size: number }) {
  return (
    <motion.div
      className="absolute rounded-full bg-emerald-500/20 pointer-events-none"
      style={{
        width: size,
        height: size,
        left: `${x}%`,
        bottom: '-10px',
      }}
      animate={{
        y: [0, -1200],
        opacity: [0, 0.6, 0.6, 0],
      }}
      transition={{
        duration: 12 + Math.random() * 8,
        delay: delay,
        repeat: Infinity,
        ease: 'linear',
      }}
    />
  )
}

function TradingSignalCard({ label, value, trend, delay }: { label: string; value: string; trend: 'up' | 'down'; delay: number }) {
  return (
    <motion.div
      className="glass-neon rounded-lg px-4 py-3 flex items-center gap-3 min-w-[200px]"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.6, delay }}
    >
      <div className={`w-2 h-2 rounded-full ${trend === 'up' ? 'bg-emerald-400' : 'bg-red-400'} animate-pulse`} />
      <div className="flex-1">
        <div className="text-xs text-muted-foreground font-mono">{label}</div>
        <div className={`text-sm font-bold font-mono ${trend === 'up' ? 'text-emerald-400' : 'text-red-400'}`}>
          {value}
        </div>
      </div>
      {trend === 'up' ? (
        <TrendingUp className="h-4 w-4 text-emerald-400" />
      ) : (
        <TrendingUp className="h-4 w-4 text-red-400 rotate-180" />
      )}
    </motion.div>
  )
}

function MiniSparkline({ data, color, width = 80, height = 30 }: { data: number[]; color: string; width?: number; height?: number }) {
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1
  const points = data.map((v, i) => `${(i / (data.length - 1)) * width},${height - ((v - min) / range) * height}`).join(' ')

  return (
    <svg width={width} height={height} className="opacity-50">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        className="animate-draw"
      />
    </svg>
  )
}

export function HeroSection() {
  const { setAuthModal } = useAppStore()
  const { t } = useI18n()
  const sparkData1 = [40, 45, 42, 55, 52, 60, 58, 72, 68, 75]
  const sparkData2 = [30, 35, 38, 32, 45, 42, 50, 48, 55, 60]

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden deep-space-bg scan-line-overlay">
      {/* Star field */}
      <StarField />

      {/* Floating particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 15 }).map((_, i) => (
          <FloatingParticle key={i} delay={i * 1.5} x={Math.random() * 100} size={2 + Math.random() * 4} />
        ))}
      </div>

      {/* Grid overlay */}
      <div className="absolute inset-0 grid-bg pointer-events-none" />

      {/* Noise overlay */}
      <div className="absolute inset-0 noise-overlay pointer-events-none" />

      {/* Background gradient orbs */}
      <div className="absolute top-1/4 left-1/6 w-[500px] h-[500px] bg-emerald-500/8 rounded-full blur-[160px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/6 w-[400px] h-[400px] bg-cyan-500/6 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-purple-500/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Floating crypto coin elements */}
      <motion.div
        className="absolute top-24 right-[12%] pointer-events-none hidden lg:block"
        animate={{ y: [-15, 15, -15], rotate: [0, 5, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      >
        <div className="relative">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-400/20 to-amber-600/20 border border-amber-500/30 flex items-center justify-center backdrop-blur-sm">
            <span className="text-2xl font-bold text-amber-400">₿</span>
          </div>
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full animate-pulse" />
        </div>
      </motion.div>

      <motion.div
        className="absolute bottom-32 left-[8%] pointer-events-none hidden lg:block"
        animate={{ y: [10, -15, 10], rotate: [0, -3, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
      >
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-400/20 to-blue-600/20 border border-blue-500/20 flex items-center justify-center backdrop-blur-sm">
          <span className="text-lg font-bold text-blue-400">Ξ</span>
        </div>
      </motion.div>

      <motion.div
        className="absolute top-[60%] right-[6%] pointer-events-none hidden xl:block"
        animate={{ y: [-8, 12, -8] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      >
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-400/20 to-green-600/20 border border-green-500/20 flex items-center justify-center backdrop-blur-sm">
          <span className="text-sm font-bold text-green-400">₮</span>
        </div>
      </motion.div>

      {/* Floating data chart */}
      <motion.div
        className="absolute top-36 left-[5%] pointer-events-none hidden xl:block"
        animate={{ y: [-5, 10, -5] }}
        transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
      >
        <div className="glass-neon rounded-lg p-3 opacity-40">
          <MiniSparkline data={sparkData1} color="#10B981" width={100} height={40} />
        </div>
      </motion.div>

      <motion.div
        className="absolute bottom-[30%] right-[10%] pointer-events-none hidden xl:block"
        animate={{ y: [8, -8, 8] }}
        transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut' }}
      >
        <div className="glass-neon rounded-lg p-3 opacity-40">
          <MiniSparkline data={sparkData2} color="#06B6D4" width={90} height={35} />
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="relative z-10 max-w-6xl mx-auto px-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full glass-neon mb-8 text-sm text-emerald-400 font-medium">
            <div className="relative">
              <Zap className="h-4 w-4" />
              <div className="absolute inset-0 animate-ping">
                <Zap className="h-4 w-4 opacity-30" />
              </div>
            </div>
            <span>{t('landing.hero.badge')}</span>
          </div>
        </motion.div>

        <motion.h1
          className="text-5xl sm:text-6xl md:text-8xl font-black mb-4 leading-[0.9] tracking-tight"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1 }}
        >
          <span className="gradient-text-neon animate-neon-pulse block">
            PLATAFORMA
          </span>
          <span className="gradient-text-gold block mt-2">
            ROI
          </span>
        </motion.h1>

        <motion.p
          className="text-xl sm:text-2xl md:text-3xl text-foreground/70 font-light mb-3 tracking-wide"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.15 }}
        >
          {t('landing.hero.subtitle')}
        </motion.p>

        <motion.div
          className="text-base sm:text-lg text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <T k="landing.hero.description" />
        </motion.div>

        <motion.div
          className="flex flex-col sm:flex-row gap-4 justify-center mb-16"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
        >
          <Button
            size="lg"
            onClick={() => setAuthModal('register')}
            className="relative bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white font-bold text-lg px-10 py-7 glow-emerald group overflow-hidden"
          >
            <span className="relative z-10 flex items-center">
              {t('landing.hero.cta')}
              <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
            </span>
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-400/0 via-white/10 to-cyan-400/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={() => {
              const el = document.getElementById('plans-section')
              el?.scrollIntoView({ behavior: 'smooth' })
            }}
            className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 hover:border-emerald-500/50 font-bold text-lg px-10 py-7 transition-all duration-300"
          >
            <BarChart3 className="mr-2 h-5 w-5" />
            {t('landing.hero.viewPlans')}
          </Button>
        </motion.div>

        {/* Stats Counter - Futuristic style */}
        <motion.div
          className="grid grid-cols-3 gap-3 sm:gap-6 max-w-2xl mx-auto"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
        >
          <div className="glass-neon rounded-xl p-4 sm:p-6 text-center group hover:border-emerald-500/40 transition-all duration-300">
            <div className="text-2xl sm:text-4xl font-black text-emerald-400 text-glow-emerald font-mono">
              <AnimatedCounter target={2500000} prefix="$" duration={2500} />
            </div>
            <div className="text-xs sm:text-sm text-muted-foreground mt-2 font-medium uppercase tracking-wider">
              {t('landing.hero.statRoiLabel')}
            </div>
          </div>
          <div className="glass-neon rounded-xl p-4 sm:p-6 text-center group hover:border-cyan-500/40 transition-all duration-300">
            <div className="text-2xl sm:text-4xl font-black text-cyan-400 text-glow-cyan font-mono">
              <AnimatedCounter target={15000} suffix="+" duration={2000} />
            </div>
            <div className="text-xs sm:text-sm text-muted-foreground mt-2 font-medium uppercase tracking-wider">
              {t('landing.hero.statInvestorsLabel')}
            </div>
          </div>
          <div className="glass-neon rounded-xl p-4 sm:p-6 text-center group hover:border-amber-500/40 transition-all duration-300">
            <div className="text-2xl sm:text-4xl font-black text-amber-400 text-glow-gold font-mono">
              <AnimatedCounter target={89} suffix="%" duration={1500} />
            </div>
            <div className="text-xs sm:text-sm text-muted-foreground mt-2 font-medium uppercase tracking-wider">
              {t('landing.hero.statWinRateLabel')}
            </div>
          </div>
        </motion.div>

        {/* Live Trading Signals */}
        <motion.div
          className="hidden lg:flex justify-center gap-4 mt-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
        >
          <TradingSignalCard label="BTC/USDT" value="67,432.50" trend="up" delay={0.7} />
          <TradingSignalCard label="ETH/USDT" value="3,521.80" trend="up" delay={0.85} />
          <TradingSignalCard label="SOL/USDT" value="178.45" trend="down" delay={1.0} />
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <div className="w-6 h-10 rounded-full border-2 border-emerald-500/30 flex items-start justify-center p-2">
            <motion.div
              className="w-1 h-2 bg-emerald-400 rounded-full"
              animate={{ opacity: [1, 0], y: [0, 8] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          </div>
        </motion.div>
      </div>
    </section>
  )
}
