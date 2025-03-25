"use client"

import { ThemeProvider } from "next-themes"
import { Toaster } from "react-hot-toast"
import { SonicProvider } from "@/contexts/SonicContext"
import { SolanaProvider } from "@/contexts/SolanaContext"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <SolanaProvider solPrice={null}>
        <SonicProvider>
          {children}
        </SonicProvider>
      </SolanaProvider>
      <Toaster position="bottom-right" />
    </ThemeProvider>
  )
} 