"use client"

import { useState, useCallback, useEffect } from "react"
import type { Wallet } from "@/types/wallet"

export function useWallet() {
  const [wallet, setWallet] = useState<Wallet | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)

  // Check if wallet was previously connected
  useEffect(() => {
    const savedWallet = localStorage.getItem("backpack_wallet")
    if (savedWallet) {
      try {
        setWallet(JSON.parse(savedWallet))
      } catch (e) {
        console.error("Failed to parse saved wallet", e)
        localStorage.removeItem("backpack_wallet")
      }
    }
  }, [])

  // Connect to Backpack wallet
  const connect = useCallback(async () => {
    setIsConnecting(true)

    try {
      // Simulate Backpack wallet connection
      // In a real app, you would use the Backpack wallet SDK
      // Example: const wallet = await window.backpack.connect();
      await new Promise((resolve) => setTimeout(resolve, 1500))

      // Mock Backpack wallet data
      const mockWallet: Wallet = {
        publicKey: "CZqQ_GE7e" + Math.random().toString(36).substring(2, 10),
        isConnected: true,
        provider: "Backpack",
      }

      setWallet(mockWallet)
      localStorage.setItem("backpack_wallet", JSON.stringify(mockWallet))

      console.log("Connected to Backpack wallet:", mockWallet.publicKey)
    } catch (error) {
      console.error("Failed to connect Backpack wallet:", error)
    } finally {
      setIsConnecting(false)
    }
  }, [])

  // Disconnect wallet
  const disconnect = useCallback(() => {
    setWallet(null)
    localStorage.removeItem("backpack_wallet")
    console.log("Disconnected from Backpack wallet")
  }, [])

  return {
    wallet,
    connect,
    disconnect,
    isConnecting,
  }
}

