export interface Token {
  symbol: string
  amount: number
  usdValue: number
  priceChangePercentage: number
  price: number
}

export interface PricePoint {
  timestamp: number
  price: number
}

export interface PortfolioData {
  totalValue: number
  tokens: Token[]
  stakingRewards: number
  metrics: {
    day: number
    dayChange: number
    week: number
    weekChange: number
    month: number
    monthChange: number
  }
  priceHistory?: {
    sol: PricePoint[]
    usdc: PricePoint[]
  }
}

