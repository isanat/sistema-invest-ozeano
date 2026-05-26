'use client'

import { useState } from 'react'
import { useAppStore, type DashboardTab, type AdminTab } from '@/lib/store'
import { formatUSDT } from '@/lib/api'
import { useI18n } from '@/lib/i18n/context'
import { LanguageSwitcher } from '@/components/ui/language-switcher'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard,
  DollarSign,
  Briefcase,
  Users,
  UserPlus,
  Award,
  ArrowDownCircle,
  Shield,
  Settings,
  TrendingUp,
  LogOut,
  Menu,
  BarChart3,
  Layers,
  UserCog,
  ArrowDownUp,
  Sliders,
  ChevronDown,
  ChevronRight,
  Wallet,
  Zap,
  Hexagon,
  Activity,
  CreditCard,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface NavItem {
  id: DashboardTab
  labelKey: string
  icon: React.ElementType
  accent: string
}

interface AdminNavItem {
  id: AdminTab
  labelKey: string
  icon: React.ElementType
}

const navItems: NavItem[] = [
  { id: 'overview', labelKey: 'dash.sidebar.overview', icon: LayoutDashboard, accent: 'emerald' },
  { id: 'invest', labelKey: 'dash.sidebar.invest', icon: DollarSign, accent: 'cyan' },
  { id: 'plans', labelKey: 'dash.sidebar.myPlans', icon: Briefcase, accent: 'emerald' },
  { id: 'copy-traders', labelKey: 'dash.sidebar.copyTraders', icon: Activity, accent: 'cyan' },
  { id: 'affiliate', labelKey: 'dash.sidebar.affiliate', icon: UserPlus, accent: 'amber' },
  { id: 'team-bonus', labelKey: 'dash.sidebar.teamBonus', icon: Award, accent: 'amber' },
  { id: 'withdrawals', labelKey: 'dash.sidebar.withdrawals', icon: ArrowDownCircle, accent: 'cyan' },
]

const adminItems: AdminNavItem[] = [
  { id: 'admin-dashboard', labelKey: 'admin.dashboard', icon: BarChart3 },
  { id: 'admin-plans', labelKey: 'admin.plans', icon: Layers },
  { id: 'admin-copy-traders', labelKey: 'admin.copyTraders', icon: Users },
  { id: 'admin-pools', labelKey: 'admin.pools', icon: TrendingUp },
  { id: 'admin-users', labelKey: 'admin.users', icon: UserCog },
  { id: 'admin-withdrawals', labelKey: 'admin.withdrawals', icon: ArrowDownUp },
  { id: 'admin-settings', labelKey: 'admin.settings', icon: Settings },
  { id: 'admin-levels', labelKey: 'admin.affiliateLevels', icon: Sliders },
  { id: 'admin-ranks', labelKey: 'admin.ranks', icon: Award },
  { id: 'admin-nowpayments', labelKey: 'admin.nowpayments', icon: CreditCard },
]

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { currentUser, dashboardTab, setDashboardTab, adminTab, setAdminTab, logout, setCurrentView } = useAppStore()
  const { t } = useI18n()
  const [adminOpen, setAdminOpen] = useState(true)
  const isAdmin = currentUser?.role === 'admin'

  const handleNav = (tab: DashboardTab) => {
    setDashboardTab(tab)
    onNavigate?.()
  }

  const handleAdminNav = (tab: AdminTab) => {
    setAdminTab(tab)
    setDashboardTab('admin')
    onNavigate?.()
  }

  const handleLogout = () => {
    logout()
    setCurrentView('landing')
    onNavigate?.()
  }

  const accentColors: Record<string, { active: string; hover: string; border: string; icon: string; glow: string }> = {
    emerald: {
      active: 'bg-emerald-500/10 text-emerald-400',
      hover: 'hover:bg-emerald-500/5 hover:text-emerald-300',
      border: 'border-emerald-500/20',
      icon: 'text-emerald-400',
      glow: 'shadow-[0_0_12px_rgba(16,185,129,0.15)]',
    },
    cyan: {
      active: 'bg-cyan-500/10 text-cyan-400',
      hover: 'hover:bg-cyan-500/5 hover:text-cyan-300',
      border: 'border-cyan-500/20',
      icon: 'text-cyan-400',
      glow: 'shadow-[0_0_12px_rgba(6,182,212,0.15)]',
    },
    amber: {
      active: 'bg-amber-500/10 text-amber-400',
      hover: 'hover:bg-amber-500/5 hover:text-amber-300',
      border: 'border-amber-500/20',
      icon: 'text-amber-400',
      glow: 'shadow-[0_0_12px_rgba(245,158,11,0.15)]',
    },
  }

  return (
    <div className="flex flex-col h-full bg-[#060a14]">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-border/10">
        <div className="relative">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.3)]">
            <Hexagon className="h-5 w-5 text-white" />
          </div>
          <div className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
        </div>
        <div>
          <span className="font-bold text-base tracking-tight bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
            PLATAFORMA
          </span>
          <span className="font-bold text-base tracking-tight text-foreground ml-1">ROI</span>
        </div>
      </div>

      {/* User Info */}
      <div className="px-4 py-4 border-b border-border/10">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Avatar className="h-11 w-11 border-2 border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.2)]">
              <AvatarFallback className="bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 text-emerald-400 font-bold text-base">
                {currentUser?.name?.[0] || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-emerald-500 border-2 border-[#060a14] flex items-center justify-center">
              <Zap className="h-2 w-2 text-white" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm truncate">{currentUser?.name || 'User'}</p>
            <div className="flex items-center gap-1.5">
              <Wallet className="h-3 w-3 text-emerald-400" />
              <motion.p
                className="text-xs text-emerald-400 font-mono font-bold"
                key={currentUser?.balance}
                initial={{ scale: 1.1, color: '#34d399' }}
                animate={{ scale: 1, color: '#10b981' }}
                transition={{ duration: 0.3 }}
              >
                {formatUSDT(currentUser?.balance || 0)} USDT
              </motion.p>
            </div>
          </div>
          {isAdmin && (
            <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/30 text-[10px] px-1.5 py-0">
              <Shield className="h-2.5 w-2.5 mr-0.5" />ADMIN
            </Badge>
          )}
        </div>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 py-3">
        <div className="space-y-0.5">
          {navItems.map((item) => {
            const isActive = dashboardTab === item.id && item.id !== 'admin'
            const colors = accentColors[item.accent]
            return (
              <motion.button
                key={item.id}
                onClick={() => handleNav(item.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 relative group',
                  isActive
                    ? `${colors.active} border ${colors.border} ${colors.glow}`
                    : `text-muted-foreground ${colors.hover}`
                )}
                whileHover={{ x: 2 }}
                whileTap={{ scale: 0.98 }}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeNavIndicator"
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-emerald-400 rounded-r-full"
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                )}
                <item.icon className={cn('h-4 w-4', isActive ? colors.icon : 'group-hover:text-foreground')} />
                <span>{t(item.labelKey)}</span>
                {isActive && (
                  <motion.div
                    className="ml-auto h-1.5 w-1.5 rounded-full bg-emerald-400"
                    layoutId="activeDot"
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                )}
              </motion.button>
            )
          })}

          {/* Admin Section */}
          {isAdmin && (
            <>
              <Separator className="my-3 bg-border/10" />
              <motion.button
                onClick={() => setAdminOpen(!adminOpen)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-amber-400 hover:bg-amber-500/5 transition-all duration-300"
                whileHover={{ x: 2 }}
              >
                <Shield className="h-4 w-4" />
                {t('dash.sidebar.admin')}
                <AnimatePresence>
                  {adminOpen ? (
                    <motion.div initial={{ rotate: 0 }} animate={{ rotate: 180 }} exit={{ rotate: 0 }} transition={{ duration: 0.2 }}>
                      <ChevronDown className="h-3 w-3 ml-auto" />
                    </motion.div>
                  ) : (
                    <ChevronRight className="h-3 w-3 ml-auto" />
                  )}
                </AnimatePresence>
              </motion.button>
              <AnimatePresence>
                {adminOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="space-y-0.5 ml-3 pl-3 border-l border-amber-500/10">
                      {adminItems.map((item) => {
                        const isActive = dashboardTab === 'admin' && adminTab === item.id
                        return (
                          <motion.button
                            key={item.id}
                            onClick={() => handleAdminNav(item.id)}
                            className={cn(
                              'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-300',
                              isActive
                                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                            )}
                            whileHover={{ x: 2 }}
                            whileTap={{ scale: 0.98 }}
                          >
                            <item.icon className="h-3.5 w-3.5" />
                            {t(item.labelKey)}
                          </motion.button>
                        )
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}
        </div>
      </ScrollArea>

      {/* Bottom Section */}
      <div className="px-3 py-3 border-t border-border/10 space-y-2">
        <div className="flex items-center justify-between px-2">
          <LanguageSwitcher variant="compact" />
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            TRC-20
          </div>
        </div>
        <Button
          variant="ghost"
          onClick={handleLogout}
          className="w-full justify-start text-muted-foreground hover:text-red-400 hover:bg-red-500/5 transition-all duration-300 rounded-xl"
        >
          <LogOut className="h-4 w-4 mr-3" />
          {t('auth.logout')}
        </Button>
      </div>
    </div>
  )
}

export function DashboardSidebar() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <>
      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 glass-strong h-14 flex items-center px-4 border-b border-border/10">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="text-muted-foreground">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-72 bg-[#060a14] border-border/10">
            <SidebarContent onNavigate={() => setMobileOpen(false)} />
          </SheetContent>
        </Sheet>
        <div className="flex items-center gap-2 ml-3">
          <div className="h-6 w-6 rounded-lg bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center">
            <Hexagon className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="font-bold text-sm bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">PLATAFORMA ROI</span>
        </div>
      </div>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-[260px] min-h-screen border-r border-border/10 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/[0.02] to-transparent pointer-events-none" />
        <SidebarContent />
      </aside>
    </>
  )
}
