'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { useAppStore } from '@/lib/store'
import { useI18n } from '@/lib/i18n/context'
import { login, register } from '@/lib/api'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Loader2, Mail, Lock, User, Gift } from 'lucide-react'

export function AuthModals() {
  const { authModal, setAuthModal, setUser, setCurrentView } = useAppStore()
  const { t } = useI18n()
  const [loading, setLoading] = useState(false)

  // Login state
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')

  // Register state
  const [regName, setRegName] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [regConfirm, setRegConfirm] = useState('')
  const [regReferral, setRegReferral] = useState('')
  const searchParams = useSearchParams()
  const urlRefCode = searchParams.get('ref') || ''

  // Auto-populate referral code from URL and open register modal
  useEffect(() => {
    if (urlRefCode) {
      setRegReferral(urlRefCode)
      setAuthModal('register')
    }
  }, [urlRefCode])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!loginEmail || !loginPassword) {
      toast.error(t('general.error'))
      return
    }
    setLoading(true)
    try {
      const res = await login({ email: loginEmail, password: loginPassword })
      setUser(res.user)
      setCurrentView('dashboard')
      setAuthModal(null)
      toast.success(t('general.success'))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('general.error'))
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!regName || !regEmail || !regPassword || !regConfirm) {
      toast.error(t('general.error'))
      return
    }
    if (regPassword !== regConfirm) {
      toast.error(t('general.error'))
      return
    }
    if (regPassword.length < 6) {
      toast.error(t('general.error'))
      return
    }
    setLoading(true)
    try {
      const res = await register({
        name: regName,
        email: regEmail,
        password: regPassword,
        referralCode: regReferral || undefined,
      })
      setUser(res.user)
      setCurrentView('dashboard')
      setAuthModal(null)
      toast.success(t('general.success'))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('general.error'))
    } finally {
      setLoading(false)
    }
  }

  const closeAndReset = () => {
    setAuthModal(null)
    setLoginEmail('')
    setLoginPassword('')
    setRegName('')
    setRegEmail('')
    setRegPassword('')
    setRegConfirm('')
    setRegReferral('')
  }

  return (
    <>
      {/* Login Modal */}
      <Dialog open={authModal === 'login'} onOpenChange={(open) => !open && closeAndReset()}>
        <DialogContent className="glass-strong sm:max-w-md border-0">
          <DialogHeader>
            <DialogTitle className="text-center text-2xl font-bold">
              <span className="text-emerald-400">{t('auth.loginTitle')}</span>
            </DialogTitle>
            <p className="text-center text-sm text-muted-foreground">{t('auth.loginSubtitle')}</p>
          </DialogHeader>
          <form onSubmit={handleLogin} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="login-email" className="text-muted-foreground">{t('auth.email')}</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="login-email"
                  type="email"
                  placeholder="email@example.com"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="pl-10 bg-secondary/50 border-border/50 focus:border-emerald-500/50"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="login-password" className="text-muted-foreground">{t('auth.password')}</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="login-password"
                  type="password"
                  placeholder="••••••••"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="pl-10 bg-secondary/50 border-border/50 focus:border-emerald-500/50"
                />
              </div>
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold glow-emerald"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              {t('auth.login')}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              {t('auth.noAccount')}{' '}
              <button
                type="button"
                onClick={() => setAuthModal('register')}
                className="text-cyan-400 hover:text-cyan-300 font-medium"
              >
                {t('auth.register')}
              </button>
            </p>
          </form>
        </DialogContent>
      </Dialog>

      {/* Register Modal */}
      <Dialog open={authModal === 'register'} onOpenChange={(open) => !open && closeAndReset()}>
        <DialogContent className="glass-strong sm:max-w-md border-0">
          <DialogHeader>
            <DialogTitle className="text-center text-2xl font-bold">
              <span className="text-emerald-400">{t('auth.registerTitle')}</span>
            </DialogTitle>
            <p className="text-center text-sm text-muted-foreground">{t('auth.registerSubtitle')}</p>
          </DialogHeader>
          <form onSubmit={handleRegister} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="reg-name" className="text-muted-foreground">{t('auth.name')}</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="reg-name"
                  placeholder="John Doe"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  className="pl-10 bg-secondary/50 border-border/50 focus:border-emerald-500/50"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reg-email" className="text-muted-foreground">{t('auth.email')}</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="reg-email"
                  type="email"
                  placeholder="email@example.com"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  className="pl-10 bg-secondary/50 border-border/50 focus:border-emerald-500/50"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reg-password" className="text-muted-foreground">{t('auth.password')}</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="reg-password"
                  type="password"
                  placeholder="••••••••"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  className="pl-10 bg-secondary/50 border-border/50 focus:border-emerald-500/50"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reg-confirm" className="text-muted-foreground">{t('auth.confirmPassword')}</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="reg-confirm"
                  type="password"
                  placeholder="••••••••"
                  value={regConfirm}
                  onChange={(e) => setRegConfirm(e.target.value)}
                  className="pl-10 bg-secondary/50 border-border/50 focus:border-emerald-500/50"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reg-referral" className="text-muted-foreground">
                {t('auth.referralCode')} <span className="text-muted-foreground/60">(optional)</span>
              </Label>
              <div className="relative">
                <Gift className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="reg-referral"
                  placeholder="ABC12345"
                  value={regReferral}
                  onChange={(e) => setRegReferral(e.target.value)}
                  className="pl-10 bg-secondary/50 border-border/50 focus:border-emerald-500/50"
                />
              </div>
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold glow-emerald"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              {t('auth.register')}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              {t('auth.hasAccount')}{' '}
              <button
                type="button"
                onClick={() => setAuthModal('login')}
                className="text-cyan-400 hover:text-cyan-300 font-medium"
              >
                {t('auth.login')}
              </button>
            </p>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
