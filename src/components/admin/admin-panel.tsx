'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAppStore } from '@/lib/store'
import { useI18n } from '@/lib/i18n/context'
import { formatUSDT, getAdminStats, getAdminConfig, updateAdminConfig, getAdminUsers, getAdminWithdrawals, getAdminInvestmentPlans, getAdminCopyTraders, getAdminTradingPools, getAdminAffiliateLevels, getAdminAffiliateRanks, updateAdminWithdrawal, updateAdminUser, createAdminInvestmentPlan, updateAdminInvestmentPlan, createAdminCopyTrader, updateAdminCopyTrader, createAdminTradingPool, updateAdminTradingPool, updateAdminAffiliateLevels, updateAdminAffiliateRank } from '@/lib/api'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import { toast } from 'sonner'
import {
  Users,
  DollarSign,
  TrendingUp,
  ArrowDownCircle,
  Briefcase,
  Clock,
  BarChart3,
  Layers,
  Settings,
  Sliders,
  Award,
  Check,
  X,
  Loader2,
  Plus,
  Edit,
  Save,
  Shield,
  CreditCard,
  Wifi,
  WifiOff,
  Eye,
  EyeOff,
} from 'lucide-react'

// Admin Dashboard
function AdminDashboard() {
  const { adminStats, setAdminStats } = useAppStore()
  const { t } = useI18n()

  useEffect(() => {
    getAdminStats()
      .then(setAdminStats)
      .catch(() => {})
  }, [setAdminStats])

  const stats = adminStats || {
    totalUsers: 0,
    totalInvested: 0,
    totalRoi: 0,
    totalWithdrawals: 0,
    activeInvestments: 0,
    pendingWithdrawals: 0,
    activeCopyTraders: 0,
    activeTradingPools: 0,
  }

  const statCards = [
    { title: t('admin.totalUsers'), value: stats.totalUsers, icon: Users, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
    { title: t('admin.totalInvested'), value: formatUSDT(stats.totalInvested) + ' ' + t('general.usdt'), icon: DollarSign, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    { title: t('admin.totalRoiDistributed'), value: formatUSDT(stats.totalRoi) + ' ' + t('general.usdt'), icon: TrendingUp, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    { title: t('admin.total') + ' ' + t('admin.withdrawals'), value: formatUSDT(stats.totalWithdrawals) + ' ' + t('general.usdt'), icon: ArrowDownCircle, color: 'text-purple-400', bg: 'bg-purple-500/10' },
    { title: t('general.active') + ' Invest.', value: stats.activeInvestments, icon: Briefcase, color: 'text-amber-400', bg: 'bg-amber-500/10' },
    { title: t('admin.pendingWithdrawals'), value: stats.pendingWithdrawals, icon: Clock, color: 'text-red-400', bg: 'bg-red-500/10' },
    { title: t('admin.copyTraders'), value: stats.activeCopyTraders, icon: Users, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
    { title: t('admin.pools'), value: stats.activeTradingPools, icon: Layers, color: 'text-amber-400', bg: 'bg-amber-500/10' },
  ]

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold flex items-center gap-2">
        <BarChart3 className="h-5 w-5 text-amber-400" />
        {t('admin.dashboard')}
      </h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, i) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: i * 0.05 }}
          >
            <Card className="glass border-border/20">
              <CardContent className="p-4">
                <div className={`h-9 w-9 rounded-lg ${stat.bg} flex items-center justify-center mb-3`}>
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                </div>
                <p className="text-xs text-muted-foreground">{stat.title}</p>
                <p className={`text-lg font-bold ${stat.color}`}>{stat.value}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

// Plans Management
function AdminPlans() {
  const { investmentPlans, setInvestmentPlans } = useAppStore()
  const { t } = useI18n()
  const [modal, setModal] = useState(false)
  const [editingPlan, setEditingPlan] = useState<typeof investmentPlans[0] | null>(null)
  const [form, setForm] = useState({ name: '', minAmount: 10, maxAmount: null as number | null, dailyRoi: 1, duration: 30, sortOrder: 0 })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    getAdminInvestmentPlans()
      .then(setInvestmentPlans)
      .catch(() => {})
  }, [setInvestmentPlans])

  const handleSave = async () => {
    setLoading(true)
    try {
      if (editingPlan) {
        await updateAdminInvestmentPlan(editingPlan.id, form)
        toast.success(t('general.success'))
      } else {
        await createAdminInvestmentPlan(form)
        toast.success(t('general.success'))
      }
      setModal(false)
      getAdminInvestmentPlans().then(setInvestmentPlans).catch(() => {})
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('general.error'))
    } finally {
      setLoading(false)
    }
  }

  const openEdit = (plan: typeof investmentPlans[0]) => {
    setEditingPlan(plan)
    setForm({ name: plan.name, minAmount: plan.minAmount, maxAmount: plan.maxAmount, dailyRoi: plan.dailyRoi, duration: plan.duration, sortOrder: plan.sortOrder })
    setModal(true)
  }

  const openCreate = () => {
    setEditingPlan(null)
    setForm({ name: '', minAmount: 10, maxAmount: null, dailyRoi: 1, duration: 30, sortOrder: 0 })
    setModal(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Layers className="h-5 w-5 text-amber-400" />
          {t('admin.plans')}
        </h2>
        <Button onClick={openCreate} className="bg-emerald-600 hover:bg-emerald-500 text-white">
          <Plus className="h-4 w-4 mr-1" /> {t('general.create')}
        </Button>
      </div>

      <Card className="glass border-border/20">
        <CardContent className="p-0">
          <div className="max-h-96 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border/20">
                  <TableHead>Name</TableHead>
                  <TableHead>Min</TableHead>
                  <TableHead>Max</TableHead>
                  <TableHead>{t('general.daily')} ROI</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {investmentPlans.map((plan) => (
                  <TableRow key={plan.id} className="border-border/10">
                    <TableCell className="font-semibold">{plan.name}</TableCell>
                    <TableCell>${plan.minAmount}</TableCell>
                    <TableCell>{plan.maxAmount ? `$${plan.maxAmount}` : '∞'}</TableCell>
                    <TableCell className="text-emerald-400">{plan.dailyRoi}%</TableCell>
                    <TableCell>{plan.duration} days</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => openEdit(plan)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={modal} onOpenChange={setModal}>
        <DialogContent className="glass-strong sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingPlan ? t('general.edit') : t('general.create')} Plan</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="bg-secondary/50" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Min Amount</Label>
                <Input type="number" value={form.minAmount} onChange={(e) => setForm({ ...form, minAmount: parseFloat(e.target.value) })} className="bg-secondary/50" />
              </div>
              <div className="space-y-2">
                <Label>Max Amount</Label>
                <Input type="number" value={form.maxAmount || ''} onChange={(e) => setForm({ ...form, maxAmount: e.target.value ? parseFloat(e.target.value) : null })} className="bg-secondary/50" placeholder="∞" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('general.daily')} ROI (%)</Label>
                <Input type="number" step="0.1" value={form.dailyRoi} onChange={(e) => setForm({ ...form, dailyRoi: parseFloat(e.target.value) })} className="bg-secondary/50" />
              </div>
              <div className="space-y-2">
                <Label>Duration (days)</Label>
                <Input type="number" value={form.duration} onChange={(e) => setForm({ ...form, duration: parseInt(e.target.value) })} className="bg-secondary/50" />
              </div>
            </div>
            <Button onClick={handleSave} disabled={loading} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white">
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              {t('general.save')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Copy Traders Management
function AdminCopyTraders() {
  const { copyTraders, setCopyTraders } = useAppStore()
  const { t } = useI18n()
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState<typeof copyTraders[0] | null>(null)
  const [form, setForm] = useState({ name: '', specialty: '', winRate: 85, monthlyRoi: 10, totalPnl: 0, riskLevel: 'medium' as 'low' | 'medium' | 'high', isFeatured: false })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    getAdminCopyTraders()
      .then(setCopyTraders)
      .catch(() => {})
  }, [setCopyTraders])

  const handleSave = async () => {
    setLoading(true)
    try {
      if (editing) {
        await updateAdminCopyTrader(editing.id, form)
        toast.success(t('general.success'))
      } else {
        await createAdminCopyTrader(form)
        toast.success(t('general.success'))
      }
      setModal(false)
      getAdminCopyTraders().then(setCopyTraders).catch(() => {})
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('general.error'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Users className="h-5 w-5 text-cyan-400" />
          {t('admin.copyTraders')}
        </h2>
        <Button onClick={() => { setEditing(null); setForm({ name: '', specialty: '', winRate: 85, monthlyRoi: 10, totalPnl: 0, riskLevel: 'medium', isFeatured: false }); setModal(true) }} className="bg-cyan-600 hover:bg-cyan-500 text-white">
          <Plus className="h-4 w-4 mr-1" /> {t('general.create')}
        </Button>
      </div>
      <Card className="glass border-border/20">
        <CardContent className="p-0">
          <div className="max-h-96 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border/20">
                  <TableHead>Name</TableHead>
                  <TableHead>Specialty</TableHead>
                  <TableHead>Win Rate</TableHead>
                  <TableHead>ROI/Month</TableHead>
                  <TableHead>Risk</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {copyTraders.map((trader) => (
                  <TableRow key={trader.id} className="border-border/10">
                    <TableCell className="font-semibold">{trader.name}</TableCell>
                    <TableCell>{trader.specialty}</TableCell>
                    <TableCell className="text-emerald-400">{trader.winRate}%</TableCell>
                    <TableCell className="text-cyan-400">{trader.monthlyRoi}%</TableCell>
                    <TableCell><Badge className={`${trader.riskLevel === 'low' ? 'bg-emerald-500/15 text-emerald-400' : trader.riskLevel === 'high' ? 'bg-red-500/15 text-red-400' : 'bg-amber-500/15 text-amber-400'} border-0`}>{trader.riskLevel}</Badge></TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => { setEditing(trader); setForm({ name: trader.name, specialty: trader.specialty, winRate: trader.winRate, monthlyRoi: trader.monthlyRoi, totalPnl: trader.totalPnl, riskLevel: trader.riskLevel, isFeatured: trader.isFeatured }); setModal(true) }}>
                        <Edit className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={modal} onOpenChange={setModal}>
        <DialogContent className="glass-strong sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? t('general.edit') : t('general.create')} Copy Trader</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2"><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="bg-secondary/50" /></div>
            <div className="space-y-2"><Label>Specialty</Label><Input value={form.specialty} onChange={(e) => setForm({ ...form, specialty: e.target.value })} className="bg-secondary/50" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Win Rate (%)</Label><Input type="number" value={form.winRate} onChange={(e) => setForm({ ...form, winRate: parseFloat(e.target.value) })} className="bg-secondary/50" /></div>
              <div className="space-y-2"><Label>Monthly ROI (%)</Label><Input type="number" step="0.1" value={form.monthlyRoi} onChange={(e) => setForm({ ...form, monthlyRoi: parseFloat(e.target.value) })} className="bg-secondary/50" /></div>
            </div>
            <div className="space-y-2">
              <Label>Risk Level</Label>
              <div className="flex gap-2">
                {(['low', 'medium', 'high'] as const).map((r) => (
                  <Button key={r} variant={form.riskLevel === r ? 'default' : 'outline'} size="sm" onClick={() => setForm({ ...form, riskLevel: r })} className={form.riskLevel === r ? 'bg-emerald-600' : ''}>
                    {r === 'low' ? 'Low' : r === 'medium' ? 'Medium' : 'High'}
                  </Button>
                ))}
              </div>
            </div>
            <Button onClick={handleSave} disabled={loading} className="w-full bg-cyan-600 hover:bg-cyan-500 text-white">
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}{t('general.save')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Pools Management
function AdminPools() {
  const { tradingPools, setTradingPools } = useAppStore()
  const { t } = useI18n()
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState<typeof tradingPools[0] | null>(null)
  const [form, setForm] = useState({ name: '', totalAum: 0, dailyVolume: 0, strategy: '', status: 'active' as 'active' | 'inactive' })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    getAdminTradingPools()
      .then(setTradingPools)
      .catch(() => {})
  }, [setTradingPools])

  const handleSave = async () => {
    setLoading(true)
    try {
      if (editing) {
        await updateAdminTradingPool(editing.id, form)
        toast.success(t('general.success'))
      } else {
        await createAdminTradingPool(form)
        toast.success(t('general.success'))
      }
      setModal(false)
      getAdminTradingPools().then(setTradingPools).catch(() => {})
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('general.error'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2"><TrendingUp className="h-5 w-5 text-emerald-400" />{t('admin.pools')}</h2>
        <Button onClick={() => { setEditing(null); setForm({ name: '', totalAum: 0, dailyVolume: 0, strategy: '', status: 'active' }); setModal(true) }} className="bg-emerald-600 hover:bg-emerald-500 text-white"><Plus className="h-4 w-4 mr-1" />{t('general.create')}</Button>
      </div>
      <Card className="glass border-border/20">
        <CardContent className="p-0">
          <div className="max-h-96 overflow-y-auto">
            <Table>
              <TableHeader><TableRow className="border-border/20"><TableHead>Name</TableHead><TableHead>AUM</TableHead><TableHead>{t('general.daily')} Volume</TableHead><TableHead>Strategy</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
              <TableBody>
                {tradingPools.map((p) => (
                  <TableRow key={p.id} className="border-border/10">
                    <TableCell className="font-semibold">{p.name}</TableCell>
                    <TableCell>${p.totalAum.toLocaleString()}</TableCell>
                    <TableCell>${p.dailyVolume.toLocaleString()}</TableCell>
                    <TableCell>{p.strategy}</TableCell>
                    <TableCell><Badge className={p.status === 'active' ? 'bg-emerald-500/15 text-emerald-400 border-0' : 'bg-red-500/15 text-red-400 border-0'}>{p.status === 'active' ? t('general.active') : 'Inactive'}</Badge></TableCell>
                    <TableCell><Button variant="ghost" size="sm" onClick={() => { setEditing(p); setForm({ name: p.name, totalAum: p.totalAum, dailyVolume: p.dailyVolume, strategy: p.strategy, status: p.status }); setModal(true) }}><Edit className="h-4 w-4" /></Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      <Dialog open={modal} onOpenChange={setModal}>
        <DialogContent className="glass-strong sm:max-w-md">
          <DialogHeader><DialogTitle>{editing ? t('general.edit') : t('general.create')} Pool</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2"><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="bg-secondary/50" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>AUM {t('general.total')}</Label><Input type="number" value={form.totalAum} onChange={(e) => setForm({ ...form, totalAum: parseFloat(e.target.value) })} className="bg-secondary/50" /></div>
              <div className="space-y-2"><Label>{t('general.daily')} Volume</Label><Input type="number" value={form.dailyVolume} onChange={(e) => setForm({ ...form, dailyVolume: parseFloat(e.target.value) })} className="bg-secondary/50" /></div>
            </div>
            <div className="space-y-2"><Label>Strategy</Label><Input value={form.strategy} onChange={(e) => setForm({ ...form, strategy: e.target.value })} className="bg-secondary/50" /></div>
            <Button onClick={handleSave} disabled={loading} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white">{loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}{t('general.save')}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Users Management
function AdminUsers() {
  const { adminUsers, setAdminUsers } = useAppStore()
  const { t } = useI18n()

  useEffect(() => {
    getAdminUsers()
      .then(setAdminUsers)
      .catch(() => {})
  }, [setAdminUsers])

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold flex items-center gap-2"><Users className="h-5 w-5 text-cyan-400" />{t('admin.users')}</h2>
      <Card className="glass border-border/20">
        <CardContent className="p-0">
          <div className="max-h-96 overflow-y-auto">
            <Table>
              <TableHeader><TableRow className="border-border/20"><TableHead>Name</TableHead><TableHead>E-mail</TableHead><TableHead>Balance</TableHead><TableHead>{t('general.invest')}</TableHead><TableHead>Role</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
              <TableBody>
                {adminUsers.map((u) => (
                  <TableRow key={u.id} className="border-border/10">
                    <TableCell className="font-semibold">{u.name}</TableCell>
                    <TableCell className="text-muted-foreground">{u.email}</TableCell>
                    <TableCell className="text-emerald-400">{formatUSDT(u.balance)}</TableCell>
                    <TableCell>{formatUSDT(u.totalInvested)}</TableCell>
                    <TableCell><Badge className={u.role === 'admin' ? 'bg-amber-500/15 text-amber-400 border-0' : 'bg-secondary text-muted-foreground border-0'}>{u.role}</Badge></TableCell>
                    <TableCell><Badge className={u.isActive ? 'bg-emerald-500/15 text-emerald-400 border-0' : 'bg-red-500/15 text-red-400 border-0'}>{u.isActive ? t('general.active') : 'Inactive'}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Withdrawals Management
function AdminWithdrawals() {
  const { adminWithdrawals, setAdminWithdrawals } = useAppStore()
  const { t } = useI18n()

  useEffect(() => {
    getAdminWithdrawals()
      .then(setAdminWithdrawals)
      .catch(() => {})
  }, [setAdminWithdrawals])

  const handleAction = async (id: string, status: string) => {
    try {
      await updateAdminWithdrawal(id, { status })
      toast.success(t('general.success'))
      getAdminWithdrawals().then(setAdminWithdrawals).catch(() => {})
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('general.error'))
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold flex items-center gap-2"><ArrowDownCircle className="h-5 w-5 text-purple-400" />{t('admin.withdrawals')}</h2>
      <Card className="glass border-border/20">
        <CardContent className="p-0">
          <div className="max-h-96 overflow-y-auto">
            <Table>
              <TableHeader><TableRow className="border-border/20"><TableHead>Amount</TableHead><TableHead>Wallet</TableHead><TableHead>Status</TableHead><TableHead>Date</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
              <TableBody>
                {adminWithdrawals.map((w) => (
                  <TableRow key={w.id} className="border-border/10">
                    <TableCell className="font-semibold">{formatUSDT(w.amount)} {t('general.usdt')}</TableCell>
                    <TableCell className="font-mono text-xs max-w-32 truncate">{w.walletAddress}</TableCell>
                    <TableCell><Badge className={`${w.status === 'pending' ? 'bg-amber-500/15 text-amber-400' : w.status === 'approved' ? 'bg-cyan-500/15 text-cyan-400' : w.status === 'processed' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'} border-0`}>{w.status === 'pending' ? t('general.pending') : w.status}</Badge></TableCell>
                    <TableCell className="text-sm text-muted-foreground">{new Date(w.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell>
                      {w.status === 'pending' && (
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" className="text-emerald-400 hover:bg-emerald-500/10 h-8 w-8 p-0" onClick={() => handleAction(w.id, 'approved')}><Check className="h-4 w-4" /></Button>
                          <Button size="sm" variant="ghost" className="text-red-400 hover:bg-red-500/10 h-8 w-8 p-0" onClick={() => handleAction(w.id, 'rejected')}><X className="h-4 w-4" /></Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Settings
function AdminSettings() {
  const { systemConfig, setSystemConfig } = useAppStore()
  const { t } = useI18n()
  const [form, setForm] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    getAdminConfig()
      .then((config) => {
        setSystemConfig(config)
        setForm(Object.fromEntries(Object.entries(config).map(([k, v]) => [k, String(v)])))
      })
      .catch(() => {})
  }, [setSystemConfig])

  const handleSave = async () => {
    setLoading(true)
    try {
      const configObj: Record<string, string | number | boolean> = {}
      for (const [key, value] of Object.entries(form)) {
        if (value === 'true') configObj[key] = true
        else if (value === 'false') configObj[key] = false
        else if (!isNaN(Number(value)) && value !== '') configObj[key] = Number(value)
        else configObj[key] = value
      }
      await updateAdminConfig(configObj)
      toast.success(t('general.success'))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('general.error'))
    } finally {
      setLoading(false)
    }
  }

  const configKeyLabels: Record<string, string> = {
    platform_name: 'Platform Name',
    platform_currency: 'Currency',
    daily_roi: `${t('general.daily')} ROI (%)`,
    min_investment: `Min ${t('general.invest')} (${t('general.usdt')})`,
    min_withdrawal: `Min ${t('general.withdraw')} (${t('general.usdt')})`,
    withdrawal_fee: `${t('general.withdraw')} Fee (%)`,
    withdrawal_period: `${t('general.withdraw')} Period`,
    max_withdrawal_per_day: `Max ${t('general.withdraw')}/Day (${t('general.usdt')})`,
    referral_commission_enabled: 'Referral Commissions',
    team_bonus_enabled: 'Team Bonus',
  }

  const groups = [
    { title: 'General', icon: Settings, keys: ['platform_name', 'platform_currency'] },
    { title: 'Trading', icon: TrendingUp, keys: ['daily_roi', 'min_investment'] },
    { title: t('admin.withdrawals'), icon: ArrowDownCircle, keys: ['min_withdrawal', 'withdrawal_fee', 'withdrawal_period', 'max_withdrawal_per_day'] },
    { title: 'Affiliate', icon: Users, keys: ['referral_commission_enabled'] },
    { title: 'Team Bonus', icon: Award, keys: ['team_bonus_enabled'] },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2"><Settings className="h-5 w-5 text-muted-foreground" />{t('admin.settings')}</h2>
        <Button onClick={handleSave} disabled={loading} className="bg-emerald-600 hover:bg-emerald-500 text-white">
          {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}{t('general.save')}
        </Button>
      </div>
      {groups.map((group) => (
        <Card key={group.title} className="glass border-border/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <group.icon className="h-4 w-4 text-amber-400" />{group.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {group.keys.map((key) => (
                <div key={key} className="space-y-1">
                  <Label className="text-xs text-muted-foreground">{configKeyLabels[key] || key}</Label>
                  {key === 'referral_commission_enabled' || key === 'team_bonus_enabled' ? (
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={form[key] === 'true'}
                        onCheckedChange={(checked) => setForm({ ...form, [key]: String(checked) })}
                      />
                      <span className="text-sm">{form[key] === 'true' ? t('general.active') : 'Inactive'}</span>
                    </div>
                  ) : (
                    <Input
                      value={form[key] || ''}
                      onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                      className="bg-secondary/50 text-sm"
                    />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

// Affiliate Levels
function AdminLevels() {
  const { affiliateLevels, setAffiliateLevels } = useAppStore()
  const { t } = useI18n()
  const [form, setForm] = useState<{ level: number; percentage: number }[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    getAdminAffiliateLevels()
      .then((levels) => {
        setAffiliateLevels(levels)
        setForm(levels.length > 0 ? levels : Array.from({ length: 11 }, (_, i) => ({ level: i + 1, percentage: [10, 4, 3, 2, 1.5, 1, 0.8, 0.5, 0.4, 0.3, 0.5][i] })))
      })
      .catch(() => {
        setForm(Array.from({ length: 11 }, (_, i) => ({ level: i + 1, percentage: [10, 4, 3, 2, 1.5, 1, 0.8, 0.5, 0.4, 0.3, 0.5][i] })))
      })
  }, [setAffiliateLevels])

  const handleSave = async () => {
    setLoading(true)
    try {
      await updateAdminAffiliateLevels(form)
      toast.success(t('general.success'))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('general.error'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2"><Sliders className="h-5 w-5 text-amber-400" />{t('admin.affiliateLevels')}</h2>
        <Button onClick={handleSave} disabled={loading} className="bg-emerald-600 hover:bg-emerald-500 text-white">
          {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}{t('general.save')}
        </Button>
      </div>
      <Card className="glass border-border/20">
        <CardContent className="p-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
            {form.map((lvl, idx) => (
              <div key={lvl.level} className="glass rounded-lg p-3 text-center border border-amber-500/10">
                <Label className="text-xs text-muted-foreground">Level {lvl.level}</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={lvl.percentage}
                  onChange={(e) => {
                    const updated = [...form]
                    updated[idx] = { ...updated[idx], percentage: parseFloat(e.target.value) }
                    setForm(updated)
                  }}
                  className="bg-secondary/50 text-center mt-1 text-lg font-bold text-amber-400"
                />
                <span className="text-xs text-muted-foreground">%</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Ranks
function AdminRanks() {
  const { affiliateRanks, setAffiliateRanks } = useAppStore()
  const { t } = useI18n()
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    getAdminAffiliateRanks()
      .then(setAffiliateRanks)
      .catch(() => {})
  }, [setAffiliateRanks])

  const handleUpdate = async (id: string, data: { directReferrals?: number; bonusPct?: number }) => {
    setLoading(true)
    try {
      await updateAdminAffiliateRank(id, data)
      toast.success(t('general.success'))
      getAdminAffiliateRanks().then(setAffiliateRanks).catch(() => {})
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('general.error'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold flex items-center gap-2"><Award className="h-5 w-5 text-amber-400" />{t('admin.ranks')}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {(affiliateRanks.length > 0 ? affiliateRanks : [
          { id: '1', name: 'Bronze', directReferrals: 10, bonusPct: 1 },
          { id: '2', name: 'Silver', directReferrals: 20, bonusPct: 2 },
          { id: '3', name: 'Gold', directReferrals: 30, bonusPct: 3 },
        ]).map((rank) => (
          <Card key={rank.id} className="glass border-amber-500/20">
            <CardContent className="p-6 text-center">
              <Award className={`h-10 w-10 mx-auto mb-3 ${rank.name === 'Bronze' ? 'text-amber-600' : rank.name === 'Silver' ? 'text-gray-300' : 'text-yellow-400'}`} />
              <h3 className="text-lg font-bold mb-4">{rank.name}</h3>
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Direct Referrals</Label>
                  <Input
                    type="number"
                    defaultValue={rank.directReferrals}
                    onBlur={(e) => handleUpdate(rank.id, { directReferrals: parseInt(e.target.value) })}
                    className="bg-secondary/50 text-center"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">ROI Bonus (%)</Label>
                  <Input
                    type="number"
                    defaultValue={rank.bonusPct}
                    onBlur={(e) => handleUpdate(rank.id, { bonusPct: parseInt(e.target.value) })}
                    className="bg-secondary/50 text-center text-emerald-400 font-bold"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

// NowPayments Configuration
function AdminNowPayments() {
  const { t } = useI18n()
  const [config, setConfig] = useState<{
    apiKey: string
    apiKeySet: boolean
    ipnSecret: string
    ipnSecretSet: boolean
    apiUrl: string
    enabled: boolean
    platformFeePct: string
    traderFeePct: string
    paymentSplitEnabled: boolean
  } | null>(null)
  const [loading, setLoading] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null)
  const [showApiKey, setShowApiKey] = useState(false)
  const [form, setForm] = useState({
    apiKey: '',
    ipnSecret: '',
    apiUrl: 'https://api.nowpayments.io/v1',
    enabled: false,
    platformFeePct: '5',
    traderFeePct: '10',
    paymentSplitEnabled: false,
  })

  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/nowpayments')
      if (!res.ok) throw new Error('Failed to fetch config')
      const data = await res.json()
      setConfig(data.config)
      setForm({
        apiKey: data.config.apiKey || '',
        ipnSecret: data.config.ipnSecret || '',
        apiUrl: data.config.apiUrl || 'https://api.nowpayments.io/v1',
        enabled: data.config.enabled || false,
        platformFeePct: data.config.platformFeePct || '5',
        traderFeePct: data.config.traderFeePct || '10',
        paymentSplitEnabled: data.config.paymentSplitEnabled || false,
      })
    } catch {
      toast.error(t('general.error'))
    }
  }, [t])

  useEffect(() => {
    fetchConfig()
  }, [fetchConfig])

  const handleSave = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/nowpayments', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error('Failed to save')
      toast.success(t('general.success'))
      fetchConfig()
      setTestResult(null)
    } catch {
      toast.error(t('general.error'))
    } finally {
      setLoading(false)
    }
  }

  const handleTestConnection = async () => {
    setTesting(true)
    setTestResult(null)
    try {
      // First save the current form so the test uses latest values
      await fetch('/api/admin/nowpayments', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })

      // Test by calling the NowPayments status API via our backend
      const res = await fetch('/api/admin/nowpayments')
      if (!res.ok) {
        setTestResult({ ok: false, message: 'Failed to fetch config' })
        setTesting(false)
        return
      }

      const data = await res.json()
      const apiUrl = data.config?.apiUrl || form.apiUrl

      // Ping the NowPayments API status endpoint
      try {
        const statusRes = await fetch(`${apiUrl}/status`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        })

        if (statusRes.ok) {
          const statusData = await statusRes.json()
          setTestResult({ ok: true, message: `Connected! API Status: ${statusData.status || 'OK'}` })
        } else {
          setTestResult({ ok: false, message: `API returned status ${statusRes.status}` })
        }
      } catch {
        setTestResult({ ok: false, message: 'Cannot reach NowPayments API. Check URL.' })
      }
    } catch {
      setTestResult({ ok: false, message: t('general.error') })
    } finally {
      setTesting(false)
    }
  }

  const maskKey = (key: string) => {
    if (!key) return ''
    if (key.includes('...')) return key // Already masked
    if (key.length <= 4) return '****'
    return '*'.repeat(key.length - 4) + key.slice(-4)
  }

  if (!config) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-amber-400" />
        <span className="ml-2 text-muted-foreground">{t('general.loading')}</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-cyan-400" />
          {t('admin.nowpayments')}
        </h2>
        <div className="flex gap-2">
          <Button
            onClick={handleTestConnection}
            disabled={testing}
            variant="outline"
            className="border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10"
          >
            {testing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Wifi className="h-4 w-4 mr-2" />}
            Test Connection
          </Button>
          <Button onClick={handleSave} disabled={loading} className="bg-emerald-600 hover:bg-emerald-500 text-white">
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            {t('general.save')}
          </Button>
        </div>
      </div>

      {/* Test Result */}
      {testResult && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className={`border ${testResult.ok ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-red-500/30 bg-red-500/5'}`}>
            <CardContent className="p-4 flex items-center gap-3">
              {testResult.ok ? (
                <Wifi className="h-5 w-5 text-emerald-400 shrink-0" />
              ) : (
                <WifiOff className="h-5 w-5 text-red-400 shrink-0" />
              )}
              <span className={`text-sm ${testResult.ok ? 'text-emerald-400' : 'text-red-400'}`}>
                {testResult.message}
              </span>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* API Configuration */}
      <Card className="glass border-border/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-cyan-400" />
            API Configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">API Key</Label>
              <div className="relative">
                <Input
                  type={showApiKey ? 'text' : 'password'}
                  value={showApiKey ? form.apiKey : maskKey(form.apiKey)}
                  onChange={(e) => {
                    if (showApiKey) {
                      setForm({ ...form, apiKey: e.target.value })
                    }
                  }}
                  onFocus={() => {
                    if (config.apiKeySet && !form.apiKey.includes('...')) {
                      // Keep masked on focus unless user clears
                    }
                  }}
                  className="bg-secondary/50 pr-10"
                  placeholder={config.apiKeySet ? 'Click eye to edit' : 'Enter API Key'}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                  onClick={() => {
                    if (showApiKey) {
                      setShowApiKey(false)
                    } else {
                      setShowApiKey(true)
                      // If the key is masked, clear it so user can enter a new one
                      if (form.apiKey.includes('...')) {
                        setForm({ ...form, apiKey: '' })
                      }
                    }
                  }}
                >
                  {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              {config.apiKeySet && (
                <p className="text-xs text-muted-foreground">
                  Key set (last 4: ...{config.apiKey?.slice(-4) || '****'})
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">IPN Secret</Label>
              <Input
                type="password"
                value={form.ipnSecret}
                onChange={(e) => setForm({ ...form, ipnSecret: e.target.value })}
                className="bg-secondary/50"
                placeholder={config.ipnSecretSet ? 'Enter new secret to replace' : 'Enter IPN Secret'}
              />
              {config.ipnSecretSet && (
                <p className="text-xs text-muted-foreground">Secret is set</p>
              )}
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">API URL</Label>
              <Input
                value={form.apiUrl}
                onChange={(e) => setForm({ ...form, apiUrl: e.target.value })}
                className="bg-secondary/50"
                placeholder="https://api.nowpayments.io/v1"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Enabled</Label>
              <div className="flex items-center gap-2 mt-1">
                <Switch
                  checked={form.enabled}
                  onCheckedChange={(checked) => setForm({ ...form, enabled: checked })}
                />
                <span className="text-sm">{form.enabled ? t('general.active') : 'Inactive'}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Split Configuration */}
      <Card className="glass border-border/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Sliders className="h-4 w-4 text-amber-400" />
            Payment Split Configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Platform Fee (%)</Label>
              <Input
                type="number"
                step="0.1"
                value={form.platformFeePct}
                onChange={(e) => setForm({ ...form, platformFeePct: e.target.value })}
                className="bg-secondary/50"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Trader Fee (%)</Label>
              <Input
                type="number"
                step="0.1"
                value={form.traderFeePct}
                onChange={(e) => setForm({ ...form, traderFeePct: e.target.value })}
                className="bg-secondary/50"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Payment Split Enabled</Label>
              <div className="flex items-center gap-2 mt-1">
                <Switch
                  checked={form.paymentSplitEnabled}
                  onCheckedChange={(checked) => setForm({ ...form, paymentSplitEnabled: checked })}
                />
                <span className="text-sm">{form.paymentSplitEnabled ? t('general.active') : 'Inactive'}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Main Admin Panel
export function AdminPanel() {
  const { adminTab } = useAppStore()
  const { t } = useI18n()

  const renderTab = () => {
    switch (adminTab) {
      case 'admin-dashboard': return <AdminDashboard />
      case 'admin-plans': return <AdminPlans />
      case 'admin-copy-traders': return <AdminCopyTraders />
      case 'admin-pools': return <AdminPools />
      case 'admin-users': return <AdminUsers />
      case 'admin-withdrawals': return <AdminWithdrawals />
      case 'admin-settings': return <AdminSettings />
      case 'admin-levels': return <AdminLevels />
      case 'admin-ranks': return <AdminRanks />
      case 'admin-nowpayments': return <AdminNowPayments />
      default: return <AdminDashboard />
    }
  }

  return (
    <motion.div
      key={adminTab}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center gap-2 mb-6">
        <Shield className="h-5 w-5 text-amber-400" />
        <span className="text-sm text-amber-400 font-medium">{t('dash.sidebar.admin')}</span>
      </div>
      {renderTab()}
    </motion.div>
  )
}
