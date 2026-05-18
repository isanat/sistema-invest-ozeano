'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Globe } from 'lucide-react';
import { useI18n, Locale } from '@/lib/i18n';

interface LanguageSwitcherProps {
  variant?: 'default' | 'compact';
  className?: string;
}

const localeFlags: Record<Locale, string> = {
  es: '🇪🇸',
  pt: '🇧🇷',
  en: '🇬🇧',
  zh: '🇨🇳',
};

const localeLabels: Record<Locale, string> = {
  es: 'ES',
  pt: 'PT',
  en: 'EN',
  zh: 'ZH',
};

export function LanguageSwitcher({ variant = 'default', className }: LanguageSwitcherProps) {
  const { locale, setLocale, locales } = useI18n();

  if (variant === 'compact') {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors px-2 py-1.5 rounded-lg hover:bg-zinc-800">
            <Globe className="h-3.5 w-3.5" />
            <span>{localeFlags[locale]} {localeLabels[locale]}</span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="bg-zinc-900 border-zinc-800" align="start">
          {locales.map((l) => (
            <DropdownMenuItem
              key={l.code}
              onClick={() => setLocale(l.code)}
              className={`text-sm ${locale === l.code ? 'text-emerald-400 bg-emerald-500/10' : 'text-zinc-300'}`}
            >
              <span className="mr-2">{localeFlags[l.code]}</span>
              {l.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className={`text-zinc-300 hover:text-white ${className || ''}`}>
          <Globe className="h-4 w-4 mr-1.5" />
          <span className="hidden sm:inline">{localeFlags[locale]} {localeLabels[locale]}</span>
          <span className="sm:hidden">{localeFlags[locale]}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="bg-zinc-900 border-zinc-800" align="end">
        {locales.map((l) => (
          <DropdownMenuItem
            key={l.code}
            onClick={() => setLocale(l.code)}
            className={`text-sm ${locale === l.code ? 'text-emerald-400 bg-emerald-500/10' : 'text-zinc-300'}`}
          >
            <span className="mr-2">{localeFlags[l.code]}</span>
            {l.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
