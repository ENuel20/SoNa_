"use client"

import { Button } from "@/components/ui/button"
import type { PortfolioData } from "@/types/portfolio"
import { useSolana } from "@/contexts/SolanaContext"
import EnhancedDashboard from "./enhanced-dashboard"

interface DashboardViewProps {
  portfolioData?: PortfolioData
  isWalletConnected: boolean
  onConnectWallet: () => void
}

export default function DashboardView({ portfolioData, isWalletConnected, onConnectWallet }: DashboardViewProps) {
  const { publicKey } = useSolana()

  if (!isWalletConnected && !publicKey) {
    return (
      <div className="flex flex-col items-center justify-center h-64 bg-zinc-900 rounded-lg p-8">
        <p className="text-zinc-400 mb-4 text-center">Connect your Backpack wallet to view your portfolio</p>
        <Button onClick={onConnectWallet}>Connect Wallet</Button>
      </div>
    )
  }

  return <EnhancedDashboard />
}

