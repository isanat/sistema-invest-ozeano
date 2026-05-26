'use client'

import { useEffect, useState, useRef } from 'react'
import { useAppStore } from '@/lib/store'
import { getAffiliate, formatUSDT } from '@/lib/api'
import { useI18n } from '@/lib/i18n/context'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  UserPlus,
  Copy,
  Link2,
  Users,
  DollarSign,
  Share2,
  Coins,
  Gift,
  ChevronRight,
  Check,
} from 'lucide-react'
import { toast } from 'sonner'

// Animated counter hook
function useAnimatedCounter(target: number, duration = 1200) {
  const [value, setValue] = useState(0)
  const prevTarget = useRef(0)
  useEffect(() => {
    const start = prevTarget.current
    const diff = target - start
    if (Math.abs(diff) < 0.01) {
      const id = requestAnimationFrame(() => setValue(target))
      return () => cancelAnimationFrame(id)
    }
    const startTime = performance.now()
    let raf: number
    const animate = (now: number) => {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      const newVal = start + diff * eased
      if (progress < 1) {
        setValue(newVal)
        raf = requestAnimationFrame(animate)
      } else {
        prevTarget.current = target
        setValue(target)
      }
    }
    raf = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(raf)
  }, [target, duration])
  return value
}

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

const levelColors = [
  'from-emerald-500 to-emerald-400',
  'from-emerald-400 to-cyan-400',
  'from-cyan-400 to-cyan-500',
  'from-cyan-500 to-blue-500',
  'from-blue-500 to-blue-400',
  'from-blue-400 to-purple-400',
  'from-purple-400 to-purple-500',
  'from-purple-500 to-pink-500',
  'from-pink-500 to-pink-400',
  'from-pink-400 to-amber-400',
  'from-amber-400 to-amber-500',
]

export function AffiliateTab() {
  const { affiliateInfo, setAffiliateInfo, currentUser } = useAppStore()
  const { t } = useI18n()
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    getAffiliate()
      .then(setAffiliateInfo)
      .catch(() => {})
  }, [setAffiliateInfo])

  const referralCode = affiliateInfo?.referralCode || currentUser?.referralCode || 'ABC123'
  const referralLink = affiliateInfo?.referralLink || `${typeof window !== 'undefined' ? window.location.origin : ''}/?ref=${referralCode}`
  const levels = affiliateInfo?.levels || defaultLevels
  const directReferrals = affiliateInfo?.directReferrals || []
  const commissionHistory = affiliateInfo?.commissionHistory || []
  const totalCommission = affiliateInfo?.totalCommission || 0

  const animatedCommission = useAnimatedCounter(totalCommission)

  const copyLink = () => {
    navigator.clipboard.writeText(referralLink)
    setCopied(true)
    toast.success('Link copiado!')
    setTimeout(() => setCopied(false), 2000)
  }

  const copyCode = () => {
    navigator.clipboard.writeText(referralCode)
    toast.success('Código copiado!')
  }

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-2xl sm:text-3xl font-bold">
          <span className="bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
            {t('dash.affiliate.title')}
          </span>
        </h1>
        <p className="text-muted-foreground mt-1">{t('dash.affiliate.subtitle')}</p>
      </motion.div>

      {/* Referral Link Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <Card className="relative overflow-hidden border-amber-500/20 shadow-[0_0_24px_rgba(245,158,11,0.06)]">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/8 via-orange-500/3 to-transparent" />
          <CardContent className="relative p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-12 w-12 rounded-xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
                <Link2 className="h-6 w-6 text-amber-400" />
              </div>
              <div>
                <h3 className="font-bold">{t('dash.affiliate.referralLink')}</h3>
                <p className="text-xs text-muted-foreground">{t('dash.affiliate.subtitle')}</p>
              </div>
            </div>

            <div className="flex gap-2 mb-4">
              <Input
                readOnly
                value={referralLink}
                className="bg-secondary/50 border-border/50 text-sm font-mono"
              />
              <Button
                onClick={copyLink}
                className={`shrink-0 font-semibold transition-all duration-300 ${
                  copied
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                    : 'bg-amber-600 hover:bg-amber-500 text-white'
                }`}
              >
                {copied ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
                {copied ? 'Copied!' : t('dash.affiliate.copyLink')}
              </Button>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground">Code:</span>
              <code className="bg-secondary/50 px-3 py-1.5 rounded-lg text-emerald-400 font-mono text-sm border border-border/10">
                {referralCode}
              </code>
              <Button variant="ghost" size="sm" onClick={copyCode} className="text-muted-foreground hover:text-foreground h-7">
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
        >
          <Card className="glass border-border/20">
            <CardContent className="p-5 text-center">
              <div className="h-10 w-10 rounded-xl bg-cyan-500/10 flex items-center justify-center mx-auto mb-2">
                <Users className="h-5 w-5 text-cyan-400" />
              </div>
              <p className="text-2xl font-bold">{directReferrals.length}</p>
              <p className="text-xs text-muted-foreground">{t('dash.affiliate.directReferrals')}</p>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card className="glass border-emerald-500/20 shadow-[0_0_16px_rgba(16,185,129,0.06)]">
            <CardContent className="p-5 text-center">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-2">
                <DollarSign className="h-5 w-5 text-emerald-400" />
              </div>
              <p className="text-2xl font-bold text-emerald-400">{formatUSDT(animatedCommission)}</p>
              <p className="text-xs text-muted-foreground">{t('dash.affiliate.totalCommission')} (USDT)</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* 11-Level Unilevel Tree */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.25 }}
      >
        <Card className="glass border-border/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Share2 className="h-4 w-4 text-amber-400" />
              {t('landing.affiliate.commissionByLevel')} - 11 {t('dash.affiliate.level')}s
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-3">
              {levels.map((lvl, idx) => {
                const maxPct = Math.max(...levels.map((l) => l.percentage))
                const barWidth = (lvl.percentage / maxPct) * 100
                return (
                  <motion.div
                    key={lvl.level}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3 + idx * 0.03 }}
                    className="glass rounded-xl p-3 text-center border border-border/5 hover:border-amber-500/20 transition-all group"
                  >
                    <div className="text-[10px] text-muted-foreground mb-1">
                      {t('dash.affiliate.level')} {lvl.level}
                    </div>
                    <div className="text-lg font-bold text-amber-400 mb-1">{lvl.percentage}%</div>
                    <div className="h-1 bg-secondary/50 rounded-full overflow-hidden">
                      <motion.div
                        className={`h-full bg-gradient-to-r ${levelColors[idx % levelColors.length]} rounded-full`}
                        initial={{ width: 0 }}
                        animate={{ width: `${barWidth}%` }}
                        transition={{ duration: 0.8, delay: 0.5 + idx * 0.05 }}
                      />
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Direct Referrals */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <Card className="glass border-border/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-cyan-400" />
              {t('dash.affiliate.directReferrals')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {directReferrals.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No referrals yet. Share your link!</p>
              </div>
            ) : (
              <div className="max-h-80 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/10">
                      <TableHead className="text-xs">{t('auth.name')}</TableHead>
                      <TableHead className="text-xs">Status</TableHead>
                      <TableHead className="text-xs">Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {directReferrals.map((ref) => (
                      <TableRow key={ref.id} className="border-border/5 hover:bg-secondary/20 transition-colors">
                        <TableCell className="font-medium text-sm">{ref.name}</TableCell>
                        <TableCell>
                          <Badge className={`${ref.hasInvested ? 'bg-emerald-500/10 text-emerald-400' : 'bg-secondary text-muted-foreground'} border-0 text-xs`}>
                            {ref.hasInvested ? t('general.active') : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs">
                          {new Date(ref.createdAt).toLocaleDateString('es-ES')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Commission History */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.35 }}
      >
        <Card className="glass border-border/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Coins className="h-4 w-4 text-emerald-400" />
              {t('dash.affiliate.commissionHistory')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {commissionHistory.length === 0 ? (
              <div className="text-center py-8">
                <Gift className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No commissions received yet</p>
              </div>
            ) : (
              <div className="max-h-80 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/10">
                      <TableHead className="text-xs">{t('dash.affiliate.level')}</TableHead>
                      <TableHead className="text-xs">From</TableHead>
                      <TableHead className="text-xs">Amount</TableHead>
                      <TableHead className="text-xs">Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {commissionHistory.map((comm) => (
                      <TableRow key={comm.id} className="border-border/5 hover:bg-secondary/20 transition-colors">
                        <TableCell>
                          <Badge className="bg-amber-500/10 text-amber-400 border-0 text-xs">
                            {t('dash.affiliate.level')} {comm.level}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">{comm.fromUser}</TableCell>
                        <TableCell className="text-emerald-400 font-semibold text-sm font-mono">
                          +{formatUSDT(comm.amount)} USDT
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs">
                          {new Date(comm.createdAt).toLocaleDateString('es-ES')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
