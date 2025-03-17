"use client"

import { useState, useEffect } from "react"
import { PanelTop, ChevronDown, LogOut, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useSolana } from "@/contexts/SolanaContext"
import toast from "react-hot-toast"
import type { PublicKey } from "@solana/web3.js"

// Define the Backpack window interface
interface BackpackWindow extends Window {
  backpack?: {
    connect: () => Promise<{ publicKey: PublicKey }>
    disconnect: () => Promise<void>
    isConnected: boolean
    publicKey?: PublicKey
    signTransaction: (transaction: any) => Promise<any>
    signAllTransactions: (transactions: any[]) => Promise<any[]>
  }
}

declare const window: BackpackWindow

export default function BackpackWalletConnect() {
  const { balance, publicKey, connectWallet, disconnectWallet } = useSolana()
  const [isConnecting, setIsConnecting] = useState(false)
  const [isBackpackAvailable, setIsBackpackAvailable] = useState(false)
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(true)

  // Check if Backpack is available
  useEffect(() => {
    const checkBackpack = async () => {
      setIsCheckingAvailability(true)
      try {
        // Check if Backpack is installed
        const isInstalled = !!window.backpack
        setIsBackpackAvailable(isInstalled)

        // If installed and already connected, reconnect
        if (isInstalled && window.backpack?.isConnected) {
          await connectWallet()
        }
      } catch (error) {
        console.error("Error checking Backpack availability:", error)
      } finally {
        setIsCheckingAvailability(false)
      }
    }

    checkBackpack()

    // Check when window is focused (in case user installs extension)
    window.addEventListener("focus", checkBackpack)
    return () => window.removeEventListener("focus", checkBackpack)
  }, [connectWallet])

  const handleConnect = async () => {
    if (!window.backpack) {
      toast.error("Please install Backpack wallet")
      window.open("https://www.backpack.app/download", "_blank")
      return
    }

    setIsConnecting(true)

    try {
      await connectWallet()
      toast.success("Wallet connected successfully")
    } catch (error: any) {
      console.error("Connection error:", error)
      toast.error(error?.message || "Failed to connect Backpack wallet")
    } finally {
      setIsConnecting(false)
    }
  }

  const handleDisconnect = async () => {
    if (!window.backpack) return

    try {
      await disconnectWallet()
      toast.success("Wallet disconnected")
    } catch (error) {
      console.error("Disconnect error:", error)
      toast.error("Failed to disconnect wallet")
    }
  }

  if (publicKey) {
    // Format wallet address to show first 4 and last 4 characters
    const formattedAddress = `${publicKey.toString().slice(0, 4)}...${publicKey.toString().slice(-4)}`

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="flex items-center gap-1 px-3 py-1 rounded-md hover:bg-zinc-800">
            <span className="text-sm">
              {balance !== null ? `${balance.toFixed(4)} SOL` : ""} • {formattedAddress}
            </span>
            <ChevronDown className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={() =>
              window.open(`https://explorer.solana.com/address/${publicKey.toString()}?cluster=testnet`, "_blank")
            }
            className="cursor-pointer"
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            <span>View on Explorer</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleDisconnect} className="cursor-pointer">
            <LogOut className="w-4 h-4 mr-2" />
            <span>Disconnect</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  if (isCheckingAvailability) {
    return (
      <Button variant="ghost" size="sm" disabled className="flex items-center gap-1 px-3 py-1 rounded-md">
        <PanelTop className="w-4 h-4 animate-spin" />
        <span className="text-sm">Checking wallet...</span>
      </Button>
    )
  }

  if (!isBackpackAvailable) {
    return (
      <Button
        onClick={() => window.open("https://www.backpack.app/download", "_blank")}
        className="flex items-center gap-1 px-3 py-1 rounded-md bg-zinc-800 hover:bg-zinc-700 text-sm"
      >
        <PanelTop className="w-4 h-4" />
        <span>Install Backpack</span>
      </Button>
    )
  }

  return (
    <Button
      onClick={handleConnect}
      disabled={isConnecting}
      className="flex items-center gap-1 px-3 py-1 rounded-md hover:bg-zinc-800"
      variant="ghost"
      size="sm"
    >
      <PanelTop className="w-4 h-4" />
      <span className="text-sm">{isConnecting ? "Connecting..." : "Connect Backpack"}</span>
    </Button>
  )
}

