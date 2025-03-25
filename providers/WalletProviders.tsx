"use client"
import { ReactNode } from "react"
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react"
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui"
import { BackpackWalletAdapter } from "@solana/wallet-adapter-backpack"
import { Connection, ConnectionConfig, clusterApiUrl } from "@solana/web3.js"
import { Toaster } from "react-hot-toast"
import { SolanaProvider } from "@/contexts/SolanaContext"
import { SonicProvider } from "@/contexts/SonicContext"

require("@solana/wallet-adapter-react-ui/styles.css")

// Configure Helius Sonic RPC with WebSocket support
const getHeliusConnection = () => {
  const apiKey = process.env.NEXT_PUBLIC_HELIUS_API_KEY
  const fallbackEndpoint = clusterApiUrl("testnet")
  
  if (!apiKey) {
    console.warn("NEXT_PUBLIC_HELIUS_API_KEY not found in environment, falling back to testnet")
    return fallbackEndpoint
  }
  
  // Create connection config with WebSocket support
  const rpcUrl = `https://sonic.helius-rpc.com/?api-key=${apiKey}`
  const wsUrl = `wss://sonic.helius-rpc.com/?api-key=${apiKey}`
  
  const config: ConnectionConfig = {
    commitment: "confirmed",
    wsEndpoint: wsUrl,
    confirmTransactionInitialTimeout: 60000, // 60 seconds
    disableRetryOnRateLimit: false
  }
  
  // We return the URL here instead of the Connection object because ConnectionProvider needs the URL
  return rpcUrl
}

const endpoint = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || getHeliusConnection()
const wallets = [new BackpackWalletAdapter()]

interface WalletProvidersProps {
  children: ReactNode
}

export function WalletProviders({ children }: WalletProvidersProps) {
  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <SolanaProvider>
            <SonicProvider>
              <Toaster
                position="top-right"
                toastOptions={{
                  duration: 5000,
                  style: {
                    background: "rgba(0, 0, 0, 0.9)",
                    color: "#fff",
                    border: "1px solid #333",
                    backdropFilter: "blur(10px)",
                  },
                  success: {
                    style: {
                      border: "1px solid #0d9488",
                      color: "#4ade80",
                    },
                  },
                  error: {
                    style: {
                      border: "1px solid #ef4444",
                      color: "#ef4444",
                    },
                  },
                }}
              />
              {children}
            </SonicProvider>
          </SolanaProvider>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  )
}
