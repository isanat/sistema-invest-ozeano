'use client'

import { useState, useEffect } from 'react'
import { useI18n } from '@/lib/i18n/context'
import { TrendingUp, Twitter, MessageCircle, Instagram, Youtube, ExternalLink } from 'lucide-react'

export function Footer() {
  const { t } = useI18n()
  const [siteLogo, setSiteLogo] = useState('')

  useEffect(() => {
    fetch('/api/site/config')
      .then(r => r.json())
      .then(data => {
        if (data.success && data.siteLogo) {
          setSiteLogo(data.siteLogo)
        }
      })
      .catch(() => {})
  }, [])

  const socialLinks = [
    { icon: Twitter, href: '#' },
    { icon: MessageCircle, href: '#' },
    { icon: Instagram, href: '#' },
    { icon: Youtube, href: '#' },
  ]

  const platformLinks = [
    { label: t('landing.nav.plans'), href: '#plans-section' },
    { label: t('landing.nav.traders'), href: '#traders-section' },
    { label: t('landing.nav.affiliate'), href: '#affiliate-section' },
    { label: t('landing.nav.faq'), href: '#faq-section' },
  ]

  const supportLinks = [
    { label: t('landing.footer.helpCenter'), href: '#' },
    { label: t('landing.footer.terms'), href: '#' },
    { label: t('landing.footer.privacy'), href: '#' },
    { label: t('landing.footer.contact'), href: '#' },
  ]

  return (
    <footer className="relative mt-auto">
      {/* Gradient separator */}
      <div className="h-px bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent" />
      <div className="h-px bg-gradient-to-r from-transparent via-cyan-500/10 to-transparent" />

      <div className="deep-space-bg">
        <div className="max-w-6xl mx-auto px-4 py-16">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
            {/* Brand */}
            <div className="md:col-span-1">
              <div className="flex items-center mb-4">
                <img
                  src={siteLogo || '/logo.png'}
                  alt="Logo"
                  className="h-12 w-auto object-contain"
                  draggable={false}
                />
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {t('landing.footer.description')}
              </p>
              {/* Social Links */}
              <div className="flex gap-2 mt-5">
                {socialLinks.map((social, i) => (
                  <a
                    key={i}
                    href={social.href}
                    className="w-9 h-9 rounded-lg glass-neon flex items-center justify-center text-muted-foreground hover:text-emerald-400 hover:border-emerald-500/30 transition-all duration-300 group"
                  >
                    <social.icon className="h-4 w-4 group-hover:scale-110 transition-transform duration-300" />
                  </a>
                ))}
              </div>
            </div>

            {/* Platform links */}
            <div>
              <h4 className="font-bold text-sm uppercase tracking-wider mb-4 text-foreground">
                {t('landing.footer.platform')}
              </h4>
              <ul className="space-y-3">
                {platformLinks.map((link, i) => (
                  <li key={i}>
                    <a
                      href={link.href}
                      className="text-sm text-muted-foreground hover:text-emerald-400 transition-colors duration-300 flex items-center gap-1.5 group"
                    >
                      <div className="w-1 h-1 rounded-full bg-emerald-500/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Support links */}
            <div>
              <h4 className="font-bold text-sm uppercase tracking-wider mb-4 text-foreground">
                {t('landing.footer.support')}
              </h4>
              <ul className="space-y-3">
                {supportLinks.map((link, i) => (
                  <li key={i}>
                    <a
                      href={link.href}
                      className="text-sm text-muted-foreground hover:text-emerald-400 transition-colors duration-300 flex items-center gap-1.5 group"
                    >
                      <div className="w-1 h-1 rounded-full bg-emerald-500/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Community */}
            <div>
              <h4 className="font-bold text-sm uppercase tracking-wider mb-4 text-foreground">
                {t('landing.footer.community')}
              </h4>
              <div className="glass-neon rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="font-mono text-xs">15,000+</span>
                  <span className="text-xs">{t('landing.hero.statInvestorsLabel')}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                  <span className="font-mono text-xs">24/7</span>
                  <span className="text-xs">Support</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                  <span className="font-mono text-xs">TRC-20</span>
                  <span className="text-xs">USDT</span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="pt-8 border-t border-border/10">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
              <p className="text-xs text-muted-foreground/60 font-mono">
                &copy; {new Date().getFullYear()} {t('landing.footer.brand')}. {t('landing.footer.rights')}
              </p>
              <p className="text-xs text-muted-foreground/40 max-w-md text-center sm:text-right">
                {t('landing.footer.disclaimer')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
