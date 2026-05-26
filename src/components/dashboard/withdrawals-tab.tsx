'use client'

import { useState, useEffect } from 'react'
import { useAppStore } from '@/lib/store'
import { formatUSDT, getWithdrawals, createWithdrawal } from '@/lib/api'
import { useI18n } from '@/lib/i18n/context'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  ArrowUpRight,
  Wallet,
  CheckCircle2,
  Clock,
  XCircle,
  Loader2,
  Info,
  Coins,
  Shield,
  Copy,
  QrCode,
  AlertCircle,
  Hash,
} from 'lucide-react'
import { toast } from 'sonner'

const statusConfig: Record<string, { color: string; label: string; icon: React.ElementType; dotColor: string }> = {
  pending: { color: 'bg-amber-500/10 text-amber-400 border-amber-500/20', label: 'Pending', icon: Clock, dotColor: 'bg-amber-400' },
  approved: { color: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20', label: 'Approved', icon: CheckCircle2, dotColor: 'bg-cyan-400' },
  rejected: { color: 'bg-red-500/10 text-red-400 border-red-500/20', label: 'Rejected', icon: XCircle, dotColor: 'bg-red-400' },
  processed: { color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', label: 'Processed', icon: CheckCircle2, dotColor: 'bg-emerald-400' },
}

export function WithdrawalsTab() {
  const { currentUser, withdrawals, setWithdrawals } = useAppStore()
  const { t } = useI18n()
  const [amount, setAmount] = useState('')
  const [walletAddress, setWalletAddress] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    getWithdrawals()
      .then(setWithdrawals)
      .catch(() => {})
  }, [setWithdrawals])

  const fee = 0
  const numAmount = parseFloat(amount) || 0
  const netAmount = numAmount - fee

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!numAmount || numAmount < 10) {
      toast.error(`${t('dash.withdrawals.minWithdrawal')}: $10 USDT`)
      return
    }
    if (numAmount > (currentUser?.balance || 0)) {
      toast.error('Insufficient balance')
      return
    }
    if (!walletAddress || walletAddress.length < 20) {
      toast.error('Invalid wallet address')
      return
    }

    setLoading(true)
    try {
      await createWithdrawal({ amount: numAmount, walletAddress })
      toast.success(t('general.success'))
      setAmount('')
      setWalletAddress('')
      getWithdrawals().then(setWithdrawals).catch(() => {})
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('general.error'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-2xl sm:text-3xl font-bold">
          <span className="bg-gradient-to-r from-cyan-400 to-emerald-400 bg-clip-text text-transparent">
            {t('dash.withdrawals.title')}
          </span>
        </h1>
        <p className="text-muted-foreground mt-1">{t('dash.withdrawals.subtitle')}</p>
      </motion.div>

      {/* Balance + Withdraw Form + Info */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Withdrawal Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card className="glass border-cyan-500/20 shadow-[0_0_20px_rgba(6,182,212,0.04)] h-full">
            <CardContent className="p-6">
              {/* Balance Display */}
              <div className="flex items-center gap-3 mb-6">
                <div className="h-12 w-12 rounded-xl bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20">
                  <Wallet className="h-6 w-6 text-cyan-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t('dash.overview.availableBalance')}</p>
                  <p className="text-2xl font-bold text-cyan-400 font-mono">
                    {formatUSDT(currentUser?.balance || 0)} <span className="text-sm">USDT</span>
                  </p>
                </div>
              </div>

              <form onSubmit={handleWithdraw} className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs">{t('dash.withdrawals.amount')} (USDT)</Label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full bg-cyan-500/10 flex items-center justify-center">
                      <Coins className="h-3 w-3 text-cyan-400" />
                    </div>
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="pl-12 bg-secondary/50 border-border/50 focus:border-cyan-500/50 h-12 text-lg font-mono"
                      min={10}
                      step="0.01"
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground">{t('dash.withdrawals.minWithdrawal')}: $10.00 USDT</p>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">{t('dash.withdrawals.walletAddress')} (TRC-20)</Label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full bg-emerald-500/10 flex items-center justify-center">
                      <Hash className="h-3 w-3 text-emerald-400" />
                    </div>
                    <Input
                      placeholder="T..."
                      value={walletAddress}
                      onChange={(e) => setWalletAddress(e.target.value)}
                      className="pl-12 bg-secondary/50 border-border/50 focus:border-emerald-500/50 font-mono text-sm h-12"
                    />
                  </div>
                </div>

                {/* Fee Calculation */}
                {numAmount > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="glass rounded-xl p-4 border border-border/5 space-y-2"
                  >
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{t('dash.withdrawals.amount')}</span>
                      <span className="font-mono">{formatUSDT(numAmount)} USDT</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{t('dash.withdrawals.fee')}</span>
                      <span className="font-mono text-emerald-400">{formatUSDT(fee)} USDT (0%)</span>
                    </div>
                    <div className="flex justify-between text-sm border-t border-border/10 pt-2">
                      <span className="text-muted-foreground font-medium">{t('dash.withdrawals.netAmount')}</span>
                      <span className="font-bold font-mono text-cyan-400">{formatUSDT(netAmount)} USDT</span>
                    </div>
                  </motion.div>
                )}

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white font-semibold shadow-[0_0_20px_rgba(6,182,212,0.15)] h-12"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ArrowUpRight className="h-4 w-4 mr-2" />}
                  {t('dash.withdrawals.requestWithdrawal')}
                </Button>
              </form>
            </CardContent>
          </Card>
        </motion.div>

        {/* Info Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
        >
          <Card className="glass border-border/20 h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Shield className="h-4 w-4 text-cyan-400" />
                Withdrawal Info
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-0">
                {[
                  { label: t('dash.withdrawals.minWithdrawal'), value: '$10.00 USDT', valueColor: 'text-foreground' },
                  { label: t('dash.withdrawals.fee'), value: '0% (Free)', valueColor: 'text-emerald-400' },
                  { label: 'Network', value: 'TRC-20 (TRON)', valueColor: 'text-foreground' },
                  { label: 'Processing', value: 'Up to 24 hours', valueColor: 'text-foreground' },
                ].map((item, idx) => (
                  <div key={idx} className="flex justify-between py-3 border-b border-border/5 last:border-0">
                    <span className="text-sm text-muted-foreground">{item.label}</span>
                    <span className={`text-sm font-semibold ${item.valueColor}`}>{item.value}</span>
                  </div>
                ))}
              </div>

              <div className="glass rounded-xl p-4 border border-border/5 space-y-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <AlertCircle className="h-3 w-3 text-amber-400 shrink-0" />
                  <span>Make sure the address is on TRC-20 network</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <AlertCircle className="h-3 w-3 text-amber-400 shrink-0" />
                  <span>Wrong network addresses cannot be recovered</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <AlertCircle className="h-3 w-3 text-amber-400 shrink-0" />
                  <span>Balance is debited immediately upon request</span>
                </div>
              </div>

              {/* NowPayments Deposit Info */}
              <div className="glass rounded-xl p-4 border border-cyan-500/10">
                <div className="flex items-center gap-2 mb-2">
                  <QrCode className="h-4 w-4 text-cyan-400" />
                  <span className="text-sm font-semibold">NowPayments Integration</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Deposits and withdrawals are processed securely through NowPayments API.
                  USDT TRC-20 is the supported network for all transactions.
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Withdrawal History */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <Card className="glass border-border/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Clock className="h-4 w-4 text-cyan-400" />
              {t('dash.withdrawals.history')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {withdrawals.length === 0 ? (
              <div className="text-center py-10">
                <div className="h-14 w-14 rounded-2xl bg-cyan-500/10 flex items-center justify-center mx-auto mb-3">
                  <ArrowUpRight className="h-7 w-7 text-cyan-400/40" />
                </div>
                <p className="text-sm text-muted-foreground">{t('dash.withdrawals.noWithdrawals')}</p>
              </div>
            ) : (
              <div className="max-h-96 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/10">
                      <TableHead className="text-xs">{t('dash.withdrawals.amount')}</TableHead>
                      <TableHead className="text-xs">{t('dash.withdrawals.walletAddress')}</TableHead>
                      <TableHead className="text-xs">Status</TableHead>
                      <TableHead className="text-xs">Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {withdrawals.map((w) => {
                      const status = statusConfig[w.status] || statusConfig.pending
                      return (
                        <TableRow key={w.id} className="border-border/5 hover:bg-secondary/20 transition-colors">
                          <TableCell className="font-semibold font-mono text-sm">
                            {formatUSDT(w.amount)} USDT
                          </TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground max-w-32 truncate">
                            {w.walletAddress}
                          </TableCell>
                          <TableCell>
                            <Badge className={`${status.color} border text-xs`}>
                              <div className={`h-1.5 w-1.5 rounded-full ${status.dotColor} mr-1.5`} />
                              {status.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {new Date(w.createdAt).toLocaleDateString('es-ES')}
                          </TableCell>
                        </TableRow>
                      )
                    })}
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
