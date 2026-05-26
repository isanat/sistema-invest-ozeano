'use client'

import { useI18n } from '@/lib/i18n/context'
import { localeNames, localeFlags, type Locale } from '@/lib/i18n/translations'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Globe } from 'lucide-react'

const locales: Locale[] = ['es', 'en', 'pt-BR', 'zh']

export function LanguageSwitcher({ variant = 'default' }: { variant?: 'default' | 'compact' }) {
  const { locale, setLocale } = useI18n()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={variant === 'compact' ? 'ghost' : 'ghost'}
          size={variant === 'compact' ? 'icon' : 'sm'}
          className={variant === 'default' ? 'text-muted-foreground hover:text-foreground gap-1.5' : 'h-8 w-8'}
        >
          <Globe className="h-4 w-4" />
          {variant === 'default' && (
            <span className="text-xs font-medium">{localeNames[locale]}</span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-[#0f172a] border-border/30">
        {locales.map((loc) => (
          <DropdownMenuItem
            key={loc}
            onClick={() => setLocale(loc)}
            className={`cursor-pointer ${locale === loc ? 'bg-emerald-500/10 text-emerald-400' : ''}`}
          >
            <span className="mr-2">{localeFlags[loc]}</span>
            {localeNames[loc]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
