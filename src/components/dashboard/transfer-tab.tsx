'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAppStore } from '@/lib/store'
import { formatUSDT } from '@/lib/api'
import { useI18n } from '@/lib/i18n/context'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  ArrowDownUp,
  Wallet,
  CheckCircle2,
  Loader2,
  Search,
  Info,
  Coins,
  Shield,
  ArrowUpRight,
  ArrowDownLeft,
  Clock,
  AlertCircle,
  User,
  Hash,
} from 'lucide-react'
import { toast } from 'sonner'

// API helper
async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
    ...options,
  })
  const data = await res.json()
  if (!res.ok || data.error) {
    throw new Error(data.error || `Error ${res.status}`)
  }
  return data as T
}

interface TransferConfig {
  enabled: boolean
  minAmount: number
  maxAmount: number
  feePct: number
  dailyLimit: number
  cooldownMin: number
}

interface TransferRecord {
  id: string
  direction: 'sent' | 'received'
  amount: number
  fee: number
  netAmount: number
  status: string
  createdAt: string
  counterparty: { name: string; email: string }
}

interface LookupResult {
  found: boolean
  name?: string
  email?: string
  message?: string
}

export function TransferTab() {
  const { currentUser } = useAppStore()
  const { t } = useI18n()

  // State
  const [recipientEmail, setRecipientEmail] = useState('')
  const [amount, setAmount] = useState('')
  const [lookupResult, setLookupResult] = useState<LookupResult | null>(null)
  const [lookupLoading, setLookupLoading] = useState(false)
  const [sendLoading, setSendLoading] = useState(false)
  const [config, setConfig] = useState<TransferConfig | null>(null)
  const [transfers, setTransfers] = useState<TransferRecord[]>([])
  const [dailyUsed, setDailyUsed] = useState(0)
  const [cooldownRemaining, setCooldownRemaining] = useState(0)
  const [dataLoading, setDataLoading] = useState(true)

  // Fetch transfer data
  const fetchTransferData = useCallback(async () => {
    try {
      setDataLoading(true)
      const res = await apiFetch<{
        config: TransferConfig
        transfers: TransferRecord[]
        dailyLimit: { used: number; max: number }
        cooldownRemaining: number
      }>('/api/transfers')
      setConfig(res.config)
      setTransfers(res.transfers || [])
      setDailyUsed(res.dailyLimit?.used || 0)
      setCooldownRemaining(res.cooldownRemaining || 0)
    } catch {
      // silently fail
    } finally {
      setDataLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTransferData()
  }, [fetchTransferData])

  // Cooldown timer
  useEffect(() => {
    if (cooldownRemaining <= 0) return
    const interval = setInterval(() => {
      setCooldownRemaining((prev) => Math.max(0, prev - 1000))
    }, 1000)
    return () => clearInterval(interval)
  }, [cooldownRemaining])

  // Lookup user by email
  const handleLookup = async () => {
    if (!recipientEmail.trim()) return
    setLookupLoading(true)
    setLookupResult(null)
    try {
      const res = await apiFetch<LookupResult>(
        `/api/transfers/lookup?email=${encodeURIComponent(recipientEmail.trim())}`
      )
      setLookupResult(res)
    } catch (err) {
      setLookupResult({ found: false, message: err instanceof Error ? err.message : 'Error' })
    } finally {
      setLookupLoading(false)
    }
  }

  // Send transfer
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!recipientEmail.trim() || !amount) return

    const numAmount = parseFloat(amount) || 0
    if (numAmount <= 0) {
      toast.error(t('general.error'))
      return
    }

    setSendLoading(true)
    try {
      await apiFetch('/api/transfers', {
        method: 'POST',
        body: JSON.stringify({ toEmail: recipientEmail.trim(), amount: numAmount }),
      })
      toast.success(t('dash.transfer.transferSuccess'))
      setAmount('')
      setRecipientEmail('')
      setLookupResult(null)
      fetchTransferData()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('general.error'))
    } finally {
      setSendLoading(false)
    }
  }

  // Fee calculation
  const numAmount = parseFloat(amount) || 0
  const feePct = config?.feePct || 1
  const fee = numAmount * (feePct / 100)
  const totalDebit = numAmount + fee
  const netAmount = numAmount - fee

  // Format cooldown
  const formatCooldown = (ms: number) => {
    const mins = Math.floor(ms / 60000)
    const secs = Math.floor((ms % 60000) / 1000)
    return `${mins}m ${secs}s`
  }

  const isDisabled = !config?.enabled || cooldownRemaining > 0 || dailyUsed >= (config?.dailyLimit || 0)

  return (
    <div className="space-y-6">
      {/* Title */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-2xl sm:text-3xl font-bold">
          <span className="bg-gradient-to-r from-cyan-400 to-emerald-400 bg-clip-text text-transparent">
            {t('dash.transfer.title')}
          </span>
        </h1>
        <p className="text-muted-foreground mt-1">{t('dash.transfer.subtitle')}</p>
      </motion.div>

      {/* Transfer Disabled Banner */}
      {config && !config.enabled && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="border-amber-500/20 bg-amber-500/5">
            <CardContent className="p-4 flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-amber-400 shrink-0" />
              <p className="text-sm text-amber-300">
                {t('dash.transfer.disabled')}
              </p>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Transfer Form + Config */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Transfer Form */}
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

              <form onSubmit={handleSend} className="space-y-4">
                {/* Recipient Email */}
                <div className="space-y-2">
                  <Label className="text-xs">{t('dash.transfer.recipientEmail')}</Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full bg-cyan-500/10 flex items-center justify-center">
                        <User className="h-3 w-3 text-cyan-400" />
                      </div>
                      <Input
                        type="email"
                        placeholder={t('dash.transfer.recipientEmailPlaceholder')}
                        value={recipientEmail}
                        onChange={(e) => {
                          setRecipientEmail(e.target.value)
                          setLookupResult(null)
                        }}
                        className="pl-12 bg-secondary/50 border-border/50 focus:border-cyan-500/50 h-12"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleLookup}
                      disabled={lookupLoading || !recipientEmail.trim()}
                      className="border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10 h-12 px-4"
                    >
                      {lookupLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Search className="h-4 w-4" />
                      )}
                    </Button>
                  </div>

                  {/* Lookup Result */}
                  {lookupResult && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="mt-2"
                    >
                      {lookupResult.found ? (
                        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                          <span className="text-sm text-emerald-400">
                            {t('dash.transfer.foundUser')}: <strong>{lookupResult.name}</strong>
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-red-500/10 border border-red-500/20">
                          <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
                          <span className="text-sm text-red-400">
                            {lookupResult.message || t('dash.transfer.userNotFound')}
                          </span>
                        </div>
                      )}
                    </motion.div>
                  )}
                </div>

                {/* Amount */}
                <div className="space-y-2">
                  <Label className="text-xs">{t('dash.transfer.amount')} (USDT)</Label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full bg-cyan-500/10 flex items-center justify-center">
                      <Coins className="h-3 w-3 text-cyan-400" />
                    </div>
                    <Input
                      type="number"
                      placeholder={t('dash.transfer.amountPlaceholder')}
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="pl-12 bg-secondary/50 border-border/50 focus:border-cyan-500/50 h-12 text-lg font-mono"
                      min={config?.minAmount || 5}
                      step="0.01"
                    />
                  </div>
                  {config && (
                    <p className="text-[10px] text-muted-foreground">
                      {t('dash.transfer.minAmount')}: ${config.minAmount.toFixed(2)} USDT
                      {config.maxAmount > 0 && ` · ${t('dash.transfer.maxAmount')}: $${config.maxAmount.toFixed(2)} USDT`}
                    </p>
                  )}
                </div>

                {/* Fee Calculation */}
                {numAmount > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="glass rounded-xl p-4 border border-border/5 space-y-2"
                  >
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{t('dash.transfer.amount')}</span>
                      <span className="font-mono">{formatUSDT(numAmount)} USDT</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{t('dash.transfer.fee')} ({feePct}%)</span>
                      <span className="font-mono text-amber-400">{formatUSDT(fee)} USDT</span>
                    </div>
                    <div className="flex justify-between text-sm border-t border-border/10 pt-2">
                      <span className="text-muted-foreground font-medium">{t('dash.transfer.totalDebit')}</span>
                      <span className="font-bold font-mono text-cyan-400">{formatUSDT(totalDebit)} USDT</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{t('dash.transfer.netAmount')}</span>
                      <span className="font-mono text-emerald-400">{formatUSDT(netAmount)} USDT</span>
                    </div>
                  </motion.div>
                )}

                {/* Cooldown Warning */}
                {cooldownRemaining > 0 && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <Clock className="h-4 w-4 text-amber-400 shrink-0" />
                    <span className="text-sm text-amber-400">
                      {t('dash.transfer.cooldownRemaining')}: {formatCooldown(cooldownRemaining)}
                    </span>
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={sendLoading || isDisabled || !lookupResult?.found || numAmount <= 0}
                  className="w-full bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white font-semibold shadow-[0_0_20px_rgba(6,182,212,0.15)] h-12"
                >
                  {sendLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <ArrowDownUp className="h-4 w-4 mr-2" />
                  )}
                  {t('dash.transfer.sendTransfer')}
                </Button>
              </form>
            </CardContent>
          </Card>
        </motion.div>

        {/* Config / Info Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
        >
          <Card className="glass border-border/20 h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Shield className="h-4 w-4 text-cyan-400" />
                {t('dash.transfer.config')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {dataLoading ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  <div className="space-y-0">
                    {[
                      {
                        label: t('dash.transfer.enabled'),
                        value: config?.enabled ? t('dash.transfer.enabled') : t('dash.transfer.disabled'),
                        valueColor: config?.enabled ? 'text-emerald-400' : 'text-red-400',
                        icon: config?.enabled ? CheckCircle2 : AlertCircle,
                        iconColor: config?.enabled ? 'text-emerald-400' : 'text-red-400',
                      },
                      {
                        label: t('dash.transfer.minAmount'),
                        value: `$${(config?.minAmount || 5).toFixed(2)} USDT`,
                        valueColor: 'text-foreground',
                      },
                      {
                        label: t('dash.transfer.maxAmount'),
                        value: config?.maxAmount && config.maxAmount > 0 ? `$${config.maxAmount.toFixed(2)} USDT` : '∞',
                        valueColor: 'text-foreground',
                      },
                      {
                        label: t('dash.transfer.feePct'),
                        value: `${config?.feePct || 1}%`,
                        valueColor: 'text-amber-400',
                      },
                      {
                        label: t('dash.transfer.dailyLimit'),
                        value: `${dailyUsed}/${config?.dailyLimit || 5}`,
                        valueColor: dailyUsed >= (config?.dailyLimit || 5) ? 'text-red-400' : 'text-foreground',
                      },
                      {
                        label: t('dash.transfer.cooldown'),
                        value: `${config?.cooldownMin || 30} min`,
                        valueColor: 'text-foreground',
                      },
                    ].map((item, idx) => (
                      <div key={idx} className="flex justify-between py-3 border-b border-border/5 last:border-0">
                        <span className="text-sm text-muted-foreground">{item.label}</span>
                        <span className={`text-sm font-semibold ${item.valueColor}`}>{item.value}</span>
                      </div>
                    ))}
                  </div>

                  {/* Daily Limit Progress */}
                  {config && (
                    <div className="glass rounded-xl p-4 border border-border/5">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-muted-foreground">{t('dash.transfer.dailyUsed')}</span>
                        <span className="text-xs font-semibold">
                          {dailyUsed} / {config.dailyLimit}
                        </span>
                      </div>
                      <div className="relative h-2 bg-secondary/50 rounded-full overflow-hidden">
                        <motion.div
                          className="absolute inset-y-0 left-0 bg-gradient-to-r from-cyan-500 to-emerald-500 rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min((dailyUsed / config.dailyLimit) * 100, 100)}%` }}
                          transition={{ duration: 0.8, ease: 'easeOut' }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Info Warnings */}
                  <div className="glass rounded-xl p-4 border border-border/5 space-y-2">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <AlertCircle className="h-3 w-3 text-amber-400 shrink-0" />
                      <span>Only investors can send transfers</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <AlertCircle className="h-3 w-3 text-amber-400 shrink-0" />
                      <span>Fee is deducted from the transfer amount</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <AlertCircle className="h-3 w-3 text-amber-400 shrink-0" />
                      <span>Transfers are instant and cannot be reversed</span>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Transfer History */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <Card className="glass border-border/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Clock className="h-4 w-4 text-cyan-400" />
              {t('dash.transfer.history')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dataLoading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : transfers.length === 0 ? (
              <div className="text-center py-10">
                <div className="h-14 w-14 rounded-2xl bg-cyan-500/10 flex items-center justify-center mx-auto mb-3">
                  <ArrowDownUp className="h-7 w-7 text-cyan-400/40" />
                </div>
                <p className="text-sm text-muted-foreground">{t('dash.transfer.noTransfers')}</p>
              </div>
            ) : (
              <div className="max-h-96 overflow-y-auto space-y-2">
                {transfers.map((tx, idx) => {
                  const isSent = tx.direction === 'sent'
                  return (
                    <motion.div
                      key={tx.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.04 }}
                      className="flex items-center justify-between p-3 rounded-xl hover:bg-secondary/20 transition-colors border border-border/5"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`h-10 w-10 rounded-xl flex items-center justify-center ${
                            isSent ? 'bg-red-500/10' : 'bg-emerald-500/10'
                          }`}
                        >
                          {isSent ? (
                            <ArrowUpRight className="h-5 w-5 text-red-400" />
                          ) : (
                            <ArrowDownLeft className="h-5 w-5 text-emerald-400" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">
                              {isSent ? t('dash.transfer.sent') : t('dash.transfer.received')}
                            </span>
                            <Badge
                              className={`text-[10px] px-1.5 py-0 ${
                                tx.status === 'completed'
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                  : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                              } border`}
                            >
                              <div
                                className={`h-1.5 w-1.5 rounded-full mr-1 ${
                                  tx.status === 'completed' ? 'bg-emerald-400' : 'bg-amber-400'
                                }`}
                              />
                              {t('dash.transfer.completed')}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {isSent ? 'Para' : 'De'}: {tx.counterparty?.name || 'Unknown'} ({tx.counterparty?.email || ''})
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p
                          className={`text-sm font-bold font-mono ${
                            isSent ? 'text-red-400' : 'text-emerald-400'
                          }`}
                        >
                          {isSent ? '-' : '+'}{formatUSDT(isSent ? tx.amount : tx.netAmount)} USDT
                        </p>
                        {isSent && tx.fee > 0 && (
                          <p className="text-[10px] text-muted-foreground">
                            {t('dash.transfer.fee')}: {formatUSDT(tx.fee)}
                          </p>
                        )}
                        <p className="text-[10px] text-muted-foreground">
                          {new Date(tx.createdAt).toLocaleDateString('es-ES', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
