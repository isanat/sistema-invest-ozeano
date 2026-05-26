'use client'

import React, { createContext, useContext, useState, useCallback } from 'react'
import { translations, type Locale } from './translations'

interface I18nContextType {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: string) => string
  tHtml: (key: string) => string
}

const I18nContext = createContext<I18nContextType | undefined>(undefined)

const STORAGE_KEY = 'plataforma-roi-locale'

function getInitialLocale(): Locale {
  if (typeof window === 'undefined') return 'es'
  const stored = localStorage.getItem(STORAGE_KEY) as Locale | null
  if (stored && translations[stored]) return stored
  return 'es'
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(getInitialLocale)

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale)
    localStorage.setItem(STORAGE_KEY, newLocale)
    document.documentElement.lang = newLocale === 'pt-BR' ? 'pt-BR' : newLocale
  }, [])

  const t = useCallback((key: string): string => {
    const dict = translations[locale] as Record<string, string> | undefined
    if (dict && dict[key]) return dict[key]
    // Fallback to Spanish
    const esDict = translations.es as Record<string, string>
    return esDict[key] || key
  }, [locale])

  // Returns text with <em> and <bold> tags preserved for rendering
  const tHtml = useCallback((key: string): string => {
    return t(key)
  }, [t])

  return (
    <I18nContext.Provider value={{ locale, setLocale, t, tHtml }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n() {
  const context = useContext(I18nContext)
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider')
  }
  return context
}

// Helper component for rendering translated text with HTML-like markup
export function T({ k, className }: { k: string; className?: string }) {
  const { t } = useI18n()
  const text = t(k)

  // Split by <em> tags and render with emphasis
  const parts = text.split(/(<em>.*?<\/em>)/g)
  return (
    <span className={className}>
      {parts.map((part, i) => {
        if (part.startsWith('<em>') && part.endsWith('</em>')) {
          return <em key={i} className="text-emerald-400 not-italic font-bold">{part.slice(4, -5)}</em>
        }
        // Handle <bold> tags
        const boldParts = part.split(/(<bold>.*?<\/bold>)/g)
        return boldParts.map((bp, j) => {
          if (bp.startsWith('<bold>') && bp.endsWith('</bold>')) {
            return <strong key={`${i}-${j}`} className="text-emerald-400 font-bold">{bp.slice(7, -8)}</strong>
          }
          return <React.Fragment key={`${i}-${j}`}>{bp}</React.Fragment>
        })
      })}
    </span>
  )
}
