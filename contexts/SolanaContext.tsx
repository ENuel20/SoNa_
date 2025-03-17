"use client"

import { createContext, useContext, type ReactNode, useState, useEffect, useMemo } from "react"
import { Connection, LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction } from "@solana/web3.js"
import toast from "react-hot-toast"

// Define the Sonic network endpoints
const SONIC_RPC_ENDPOINT = "https://devnet.sonic.game"
const SONIC_WS_ENDPOINT = "wss://devnet.sonic.game"

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

interface SolanaContextType {
  balance: number | null
  fetchBalance: (address: PublicKey) => Promise<number>
  sendSol: (recipient: string, amount: string) => Promise<string | null>
  transactions: Array<{ hash: string; amount: string; date: Date }>
  isProcessing: boolean
  publicKey: PublicKey | null
  connectWallet: () => Promise<void>
  disconnectWallet: () => Promise<void>
  hasConnectedBefore: boolean
}

const SolanaContext = createContext<SolanaContextType | undefined>(undefined)

export function SolanaProvider({ children }: { children: ReactNode }) {
  const [publicKey, setPublicKey] = useState<PublicKey | null>(null)
  const [balance, setBalance] = useState<number | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [hasConnectedBefore, setHasConnectedBefore] = useState(false)
  const [transactions, setTransactions] = useState<Array<{ hash: string; amount: string; date: Date }>>([])

  // Create connection with retry and error handling
  const connection = useMemo(() => {
    return new Connection(SONIC_RPC_ENDPOINT, {
      commitment: "confirmed",
      wsEndpoint: SONIC_WS_ENDPOINT,
      disableRetryOnRateLimit: false,
      fetch: (url, options) => {
        return fetch(url, { ...options, cache: 'no-cache' })
      }
    })
  }, [])

  // Check if Backpack is connected
  const checkBackpackConnection = async () => {
    if (window.backpack && window.backpack.isConnected && window.backpack.publicKey) {
      setPublicKey(window.backpack.publicKey)
      const balance = await fetchBalance(window.backpack.publicKey)
      setBalance(balance)
      setHasConnectedBefore(true)
      return true
    }
    return false
  }

  // Auto-connect effect
  useEffect(() => {
    const autoConnect = async () => {
      const hasConnected = await checkBackpackConnection()
      if (!hasConnected && localStorage.getItem('hasConnectedWallet')) {
        try {
          await connectWallet()
        } catch (error) {
          console.warn('Auto-connect failed:', error)
        }
      }
    }

    autoConnect()

    // Also check when window is focused
    window.addEventListener('focus', autoConnect)
    return () => window.removeEventListener('focus', autoConnect)
  }, [])

  // Function to connect wallet manually
  const connectWallet = async () => {
    try {
      if (!window.backpack) {
        toast.error("Please install Backpack wallet")
        return
      }

      const { publicKey: connectedKey } = await window.backpack.connect()
      setPublicKey(connectedKey)
      localStorage.setItem('hasConnectedWallet', 'true')
      setHasConnectedBefore(true)
      toast.success("Wallet connected successfully!")
      
      // Fetch initial balance
      const balance = await fetchBalance(connectedKey)
      setBalance(balance)
    } catch (error) {
      console.error("Error connecting wallet:", error)
      toast.error("Failed to connect wallet")
      throw error // Re-throw to handle in component
    }
  }

  // Function to disconnect wallet
  const disconnectWallet = async () => {
    try {
      if (window.backpack) {
        await window.backpack.disconnect()
        setPublicKey(null)
        setBalance(null)
        localStorage.removeItem('hasConnectedWallet')
        setHasConnectedBefore(false)
        toast.success("Wallet disconnected")
      }
    } catch (error) {
      console.error("Error disconnecting wallet:", error)
      toast.error("Failed to disconnect wallet")
      throw error // Re-throw to handle in component
    }
  }

  const fetchBalance = async (address: PublicKey) => {
    try {
      const balance = await connection.getBalance(address)
      return balance / LAMPORTS_PER_SOL
    } catch (error) {
      console.warn("Error fetching balance:", error)
      return 0
    }
  }

  // Update balance when wallet changes
  useEffect(() => {
    if (!publicKey) {
      setBalance(null)
      return
    }

    const updateBalance = async () => {
      const newBalance = await fetchBalance(publicKey)
      setBalance(newBalance)
    }

    updateBalance()
    const intervalId = setInterval(updateBalance, 30000)
    return () => clearInterval(intervalId)
  }, [publicKey])

  // Modify transaction monitoring to use polling instead of WebSocket
  useEffect(() => {
    if (!publicKey) return

    const pollTransactions = async () => {
      try {
        const signatures = await connection.getSignaturesForAddress(
          publicKey,
          { limit: 10 }
        )

        const transactions = await Promise.all(
          signatures.map(async (sig) => {
            const tx = await connection.getTransaction(sig.signature, {
              maxSupportedTransactionVersion: 0
            })
            return {
              hash: sig.signature,
              amount: ((tx?.meta?.postBalances[0] || 0) - (tx?.meta?.preBalances[0] || 0) / LAMPORTS_PER_SOL).toString(),
              date: new Date(sig.blockTime! * 1000)
            }
          })
        )

        setTransactions(transactions)
      } catch (error) {
        console.warn("Error polling transactions:", error)
      }
    }

    pollTransactions()
    const intervalId = setInterval(pollTransactions, 10000) // Poll every 10 seconds

    return () => clearInterval(intervalId)
  }, [publicKey, connection])

  // Function to send SOL
  const sendSol = async (recipient: string, amount: string): Promise<string | null> => {
    if (!publicKey || !recipient || !amount || !window.backpack) return null

    const toastId = toast.loading("Preparing transaction...")
    setIsProcessing(true)

    try {
      // Validate recipient address
      const recipientPubKey = new PublicKey(recipient)

      // Create transaction
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: recipientPubKey,
          lamports: Number.parseFloat(amount) * LAMPORTS_PER_SOL,
        }),
      )

      // Get recent blockhash
      const { blockhash } = await connection.getLatestBlockhash()
      transaction.recentBlockhash = blockhash
      transaction.feePayer = publicKey

      toast.loading("Waiting for signature...", { id: toastId })

      // Sign transaction with Backpack
      const signedTransaction = await window.backpack.signTransaction(transaction)

      toast.loading("Sending transaction...", { id: toastId })

      // Send transaction
      const signature = await connection.sendRawTransaction(signedTransaction.serialize())

      toast.loading("Confirming transaction...", { id: toastId })

      // Wait for confirmation
      await connection.confirmTransaction(signature, "confirmed")

      // Add to transaction history
      setTransactions((prev) => [
        { hash: signature, amount, date: new Date() },
        ...prev.slice(0, 9), // Keep last 10 transactions
      ])

      toast.success(`${amount} SOL sent successfully!`, { id: toastId })

      // Refresh balance
      await fetchBalance(publicKey)

      return signature
    } catch (error) {
      console.error("Error sending SOL:", error)
      toast.error("Transaction failed", { id: toastId })
      return null
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <SolanaContext.Provider
      value={{
        balance,
        fetchBalance,
        sendSol,
        transactions,
        isProcessing,
        publicKey,
        connectWallet,
        disconnectWallet,
        hasConnectedBefore
      }}
    >
      {children}
    </SolanaContext.Provider>
  )
}

export function useSolana() {
  const context = useContext(SolanaContext)
  if (context === undefined) {
    throw new Error("useSolana must be used within a SolanaProvider")
  }
  return context
}

