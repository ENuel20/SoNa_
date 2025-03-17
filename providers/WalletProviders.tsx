"use client"
import { ReactNode } from "react"
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react"
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui"
import { BackpackWalletAdapter } from "@solana/wallet-adapter-backpack"
import { clusterApiUrl } from "@solana/web3.js"
import { Toaster } from "react-hot-toast"
import { SolanaProvider } from "@/contexts/SolanaContext"
import { SonicProvider } from "@/contexts/SonicContext"

require("@solana/wallet-adapter-react-ui/styles.css")

const endpoint = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || clusterApiUrl("testnet")
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

