'use client';

import React, { createContext, useContext, useCallback, useSyncExternalStore, useEffect } from 'react';

export type Locale = 'es' | 'pt' | 'en' | 'zh';

const STORAGE_KEY = 'mp_locale';
const DEFAULT_LOCALE: Locale = 'es';

export const LOCALES: { code: Locale; label: string; flag: string }[] = [
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'pt', label: 'Português', flag: '🇧🇷' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'zh', label: '中文', flag: '🇨🇳' },
];

interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  locales: typeof LOCALES;
}

const I18nContext = createContext<I18nContextType>({
  locale: DEFAULT_LOCALE,
  setLocale: () => {},
  t: (key: string) => key,
  locales: LOCALES,
});

// Import translations
import { translations } from './translations';

function getNestedValue(obj: Record<string, unknown>, path: string): string {
  // Try direct key access first (translations use flat keys like 'landing.affiliate.title')
  const direct = (obj as Record<string, unknown>)[path];
  if (typeof direct === 'string') {
    return direct;
  }
  // Fallback to nested path lookup for nested object structures
  const keys = path.split('.');
  let current: unknown = obj;
  for (const key of keys) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return path;
    }
    current = (current as Record<string, unknown>)[key];
  }
  return typeof current === 'string' ? current : path;
}

// External store for locale that avoids hydration mismatch
// CRITICAL: currentLocale must start as DEFAULT_LOCALE on both server AND client
// to ensure SSR output matches the first client render. The stored locale is
// applied AFTER hydration via useEffect.
let localeListeners: (() => void)[] = [];
let currentLocale: Locale = DEFAULT_LOCALE;

function subscribeLocale(listener: () => void) {
  localeListeners.push(listener);
  return () => {
    localeListeners = localeListeners.filter(l => l !== listener);
  };
}

function getSnapshotLocale(): Locale {
  return currentLocale;
}

function getServerSnapshotLocale(): Locale {
  return DEFAULT_LOCALE;
}

function setLocaleExternal(newLocale: Locale) {
  currentLocale = newLocale;
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, newLocale);
    document.documentElement.lang = newLocale === 'pt' ? 'pt-BR' : newLocale === 'zh' ? 'zh-CN' : newLocale;
  }
  localeListeners.forEach(l => l());
}

// DO NOT read localStorage at module load time — that would cause hydration mismatch!
// Instead, we read it AFTER hydration in the I18nProvider component.

export function I18nProvider({ children }: { children: React.ReactNode }) {
  // useSyncExternalStore ensures server and client snapshots match during hydration
  const locale = useSyncExternalStore(
    subscribeLocale,
    getSnapshotLocale,
    getServerSnapshotLocale, // Always returns DEFAULT_LOCALE on server
  );

  // After hydration, read stored locale from localStorage and apply it
  useEffect(() => {
    // Migration: check old locale key and map pt-BR → pt
    const OLD_KEY = 'plataforma-roi-locale';
    const oldLocale = localStorage.getItem(OLD_KEY) as string | null;
    if (oldLocale === 'pt-BR') {
      localStorage.setItem(STORAGE_KEY, 'pt');
      localStorage.removeItem(OLD_KEY);
    }

    const stored = localStorage.getItem(STORAGE_KEY) as Locale | null;
    if (stored && stored !== DEFAULT_LOCALE && translations[stored]) {
      setLocaleExternal(stored);
    }
  }, []);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleExternal(newLocale);
  }, []);

  const t = useCallback((key: string, params?: Record<string, string | number>): string => {
    let value = getNestedValue(translations[locale] as unknown as Record<string, unknown>, key);
    if (value === key) {
      // Fallback to Spanish
      value = getNestedValue(translations.es as unknown as Record<string, unknown>, key);
    }
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        value = value.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
      });
    }
    return value;
  }, [locale]);

  return (
    <I18nContext.Provider value={{ locale, setLocale, t, locales: LOCALES }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
