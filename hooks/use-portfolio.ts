"use client"

import { useState, useCallback, useEffect } from "react"
import type { PortfolioData } from "@/types/portfolio"
import { Connection, PublicKey } from "@solana/web3.js"
import { TOKEN_PROGRAM_ID } from "@solana/spl-token"

export function usePortfolio() {
  const [portfolioData, setPortfolioData] = useState<PortfolioData | undefined>(undefined)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Initialize WebSocket connection for real-time price updates
  useEffect(() => {
    // You can use either Binance or another provider's WebSocket
    const ws = new WebSocket('wss://stream.binance.com:9443/ws/solusdt@ticker')

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data)
      setPortfolioData(prev => {
        if (!prev) return prev
        return {
          ...prev,
          tokens: prev.tokens.map(token => {
            if (token.symbol === 'SOL') {
              const newPrice = parseFloat(data.c) // Current price
              return {
                ...token,
                price: newPrice,
                usdValue: token.amount * newPrice,
                priceChangePercentage: parseFloat(data.P) // 24h price change percent
              }
            }
            return token
          }),
          // Recalculate total value
          totalValue: prev.tokens.reduce((acc, token) => acc + token.usdValue, 0)
        }
      })
    }

    return () => ws.close()
  }, [])

  const fetchPortfolioData = useCallback(async (walletAddress: string) => {
    setIsLoading(true)
    setError(null)

    try {
      // Fetch initial token balances from Solana
      const connection = new Connection("https://api.mainnet-beta.solana.com")
      const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
        new PublicKey(walletAddress),
        { programId: TOKEN_PROGRAM_ID }
      )

      // Initialize portfolio with real balances
      const portfolio: PortfolioData = {
        totalValue: 0,
        tokens: tokenAccounts.value.map(account => ({
          symbol: account.account.data.parsed.info.mint, // You'll need to map mint to symbol
          amount: account.account.data.parsed.info.tokenAmount.uiAmount,
          usdValue: 0, // Will be updated by WebSocket
          price: 0,
          priceChangePercentage: 0
        })),
        stakingRewards: 0,
        metrics: {
          day: 0,
          dayChange: 0,
          week: 0,
          weekChange: 0,
          month: 0,
          monthChange: 0
        }
      }

      setPortfolioData(portfolio)
    } catch (error) {
      console.error("Error fetching portfolio:", error)
      setError("Failed to fetch portfolio data")
    } finally {
      setIsLoading(false)
    }
  }, [])

  return { portfolioData, isLoading, error, fetchPortfolioData }
}

