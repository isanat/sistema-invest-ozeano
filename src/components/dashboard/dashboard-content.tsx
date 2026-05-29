'use client'

import { useAppStore, type DashboardTab } from '@/lib/store'
import { OverviewTab } from '@/components/dashboard/overview-tab'
import { InvestTab } from '@/components/dashboard/invest-tab'
import { PlansTab } from '@/components/dashboard/plans-tab'
import { CopyTradersTab } from '@/components/dashboard/copy-traders-tab'
import { AffiliateTab } from '@/components/dashboard/affiliate-tab'
import { TeamBonusTab } from '@/components/dashboard/team-bonus-tab'
import { WithdrawalsTab } from '@/components/dashboard/withdrawals-tab'
import { TransferTab } from '@/components/dashboard/transfer-tab'
import { AdminPanel } from '@/components/admin/admin-panel'
import { AnimatePresence, motion } from 'framer-motion'

export function DashboardContent() {
  const { dashboardTab } = useAppStore()

  const renderTab = () => {
    switch (dashboardTab) {
      case 'overview':
        return <OverviewTab />
      case 'invest':
        return <InvestTab />
      case 'plans':
        return <PlansTab />
      case 'copy-traders':
        return <CopyTradersTab />
      case 'affiliate':
        return <AffiliateTab />
      case 'team-bonus':
        return <TeamBonusTab />
      case 'withdrawals':
        return <WithdrawalsTab />
      case 'transfer':
        return <TransferTab />
      case 'admin':
        return <AdminPanel />
      default:
        return <OverviewTab />
    }
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={dashboardTab}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.2 }}
        className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto"
      >
        {renderTab()}
      </motion.div>
    </AnimatePresence>
  )
}
