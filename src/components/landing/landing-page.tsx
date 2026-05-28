'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { HeroSection } from './hero-section'
import { HowItWorksSection } from './how-it-works'
import { PlansSection } from './plans-section'
import { CopyTradersSection } from './copy-traders-section'
import { AffiliateSection } from './affiliate-section'
import { FAQSection } from './faq-section'
import { Footer } from './footer'
import { useAppStore } from '@/lib/store'
import { useI18n } from '@/lib/i18n/context'
import { Button } from '@/components/ui/button'
import { LanguageSwitcher } from '@/components/ui/language-switcher'
import { TrendingUp, Menu, X, ArrowRight, Wifi } from 'lucide-react'

/* ── Crypto Ticker Bar ───────────────────────────── */
const tickerCoins = [
  { symbol: 'BTC', price: '67,432.50', change: '+2.34%', up: true },
  { symbol: 'ETH', price: '3,521.80', change: '+1.87%', up: true },
  { symbol: 'USDT', price: '1.00', change: '+0.01%', up: true },
  { symbol: 'BNB', price: '612.45', change: '-0.52%', up: false },
  { symbol: 'SOL', price: '178.45', change: '+3.21%', up: true },
  { symbol: 'XRP', price: '0.62', change: '-1.15%', up: false },
  { symbol: 'ADA', price: '0.48', change: '+0.95%', up: true },
  { symbol: 'DOGE', price: '0.165', change: '+4.12%', up: true },
  { symbol: 'AVAX', price: '38.72', change: '+2.08%', up: true },
  { symbol: 'DOT', price: '7.45', change: '-0.33%', up: false },
]

function CryptoTickerBar() {
  const tickerItems = [...tickerCoins, ...tickerCoins] // Duplicate for seamless loop

  return (
    <div className="w-full bg-[#020408] border-b border-border/10 overflow-hidden relative">
      {/* Fade edges */}
      <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-[#020408] to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-[#020408] to-transparent z-10 pointer-events-none" />

      <div className="animate-ticker flex items-center whitespace-nowrap py-1.5">
        {tickerItems.map((coin, i) => (
          <div key={i} className="inline-flex items-center gap-2 px-5 text-xs font-mono">
            <span className="text-muted-foreground font-medium">{coin.symbol}</span>
            <span className="text-foreground/80">${coin.price}</span>
            <span className={coin.up ? 'text-emerald-400' : 'text-red-400'}>
              {coin.change}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Navbar ──────────────────────────────────────── */
function Navbar() {
  const { setAuthModal } = useAppStore()
  const { t } = useI18n()
  const [scrolled, setScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const navLinks = [
    { label: t('landing.nav.plans'), href: '#plans-section' },
    { label: t('landing.nav.traders'), href: '#traders-section' },
    { label: t('landing.nav.affiliate'), href: '#affiliate-section' },
    { label: t('landing.nav.howItWorks'), href: '#how-it-works-section' },
    { label: t('landing.nav.faq'), href: '#faq-section' },
  ]

  const handleNavClick = (href: string) => {
    setMobileMenuOpen(false)
    const el = document.querySelector(href)
    el?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
      scrolled ? 'glass-strong shadow-lg shadow-black/20' : 'bg-transparent'
    }`}>
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center">
          <img
            src="/logo.png"
            alt="Logo"
            className="h-9 w-auto object-contain"
            draggable={false}
          />
        </div>

        {/* Desktop Nav Links */}
        <div className="hidden lg:flex items-center gap-1">
          {navLinks.map((link) => (
            <button
              key={link.href}
              onClick={() => handleNavClick(link.href)}
              className="text-sm text-muted-foreground hover:text-emerald-400 transition-colors duration-300 px-3 py-2 rounded-lg hover:bg-emerald-500/5 font-medium"
            >
              {link.label}
            </button>
          ))}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2">
          <LanguageSwitcher variant="compact" />

          <div className="hidden sm:flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setAuthModal('login')}
              className="text-muted-foreground hover:text-foreground font-medium"
            >
              {t('landing.nav.login')}
            </Button>
            <Button
              size="sm"
              onClick={() => setAuthModal('register')}
              className="bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white font-bold glow-emerald"
            >
              {t('landing.nav.register')}
              <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Mobile menu toggle */}
          <button
            className="lg:hidden p-2 text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            className="lg:hidden glass-strong border-t border-border/10"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="px-4 py-4 space-y-1">
              {navLinks.map((link) => (
                <button
                  key={link.href}
                  onClick={() => handleNavClick(link.href)}
                  className="block w-full text-left text-sm text-muted-foreground hover:text-emerald-400 transition-colors px-3 py-2.5 rounded-lg hover:bg-emerald-500/5 font-medium"
                >
                  {link.label}
                </button>
              ))}
              <div className="flex gap-2 pt-3 border-t border-border/10">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { setAuthModal('login'); setMobileMenuOpen(false) }}
                  className="flex-1 text-muted-foreground hover:text-foreground"
                >
                  {t('landing.nav.login')}
                </Button>
                <Button
                  size="sm"
                  onClick={() => { setAuthModal('register'); setMobileMenuOpen(false) }}
                  className="flex-1 bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white font-bold"
                >
                  {t('landing.nav.register')}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  )
}

/* ── Main Landing Page ───────────────────────────── */
export function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col deep-space-bg">
      {/* Crypto Ticker */}
      <div className="fixed top-0 left-0 right-0 z-[60]">
        <CryptoTickerBar />
      </div>

      {/* Navbar (below ticker) */}
      <div className="fixed top-[30px] left-0 right-0 z-50">
        <Navbar />
      </div>

      {/* Main Content */}
      <main className="flex-1 pt-[94px]">
        <HeroSection />
        <div id="how-it-works-section">
          <HowItWorksSection />
        </div>
        <PlansSection />
        <CopyTradersSection />
        <AffiliateSection />
        <FAQSection />
      </main>

      <Footer />
    </div>
  )
}
