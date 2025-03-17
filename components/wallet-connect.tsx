"use client"

import { useSolana } from "@/contexts/SolanaContext"
import { Button } from "@/components/ui/button"
import { Wallet } from "lucide-react"

export default function WalletConnect() {
  const { publicKey, connectWallet, disconnectWallet, hasConnectedBefore } = useSolana()

  return (
    <Button
      onClick={publicKey ? disconnectWallet : connectWallet}
      variant={publicKey ? "outline" : "default"}
      className="flex items-center gap-2"
    >
      <Wallet className="w-4 h-4" />
      {publicKey 
        ? `${publicKey.toString().slice(0, 4)}...${publicKey.toString().slice(-4)}`
        : hasConnectedBefore ? "Reconnect Wallet" : "Connect Wallet"
      }
    </Button>
  )
}

