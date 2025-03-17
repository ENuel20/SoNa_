"use client"

import { ReactNode } from "react"
import { WalletProviders } from "./WalletProviders"
import { SolanaProvider } from "@/contexts/SolanaContext"
import { SonicProvider } from "@/contexts/SonicContext"
import { ThemeProvider } from "./ThemeProvider"

interface ProvidersProps {
  children: ReactNode
}

export function Providers({ children }: ProvidersProps) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      storageKey="sona-theme"
    >
      <WalletProviders>
        <SolanaProvider>
          <SonicProvider>
            {children}
          </SonicProvider>
        </SolanaProvider>
      </WalletProviders>
    </ThemeProvider>
  )
} 