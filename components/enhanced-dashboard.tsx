"use client"

import { useState, useEffect } from "react"
import { ArrowUpRight, ArrowDownRight, Clock, Bell, Wallet, MessageSquarePlus, History, ExternalLink, TrendingUp, ChevronRight } from "lucide-react"
import { useRouter } from "next/navigation"
import { useSolana } from "@/contexts/SolanaContext"
import { useSonic } from "@/contexts/SonicContext"
import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis, Tooltip, LineChart, Line } from "recharts"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"

// Add CoinGecko API configuration
const COINGECKO_API_BASE = 'https://api.coingecko.com/api/v3'
const PRICE_FALLBACK = {
  solana: { usd: 0, usd_24h_vol: 0, usd_market_cap: 0 }
}

export default function EnhancedDashboard() {
  const router = useRouter()
  const { publicKey, balance: solBalance, transactions } = useSolana()
  const { sonicBalance, sonicPrice, stakingInfo } = useSonic()
  const [solPrice, setSolPrice] = useState<number | null>(null)
  const [priceHistory, setPriceHistory] = useState<{
    date: string;
    solPrice: number;
    sonicPrice: number;
    volume24h: number;
    marketCap: number;
  }[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [metrics, setMetrics] = useState({
    volume24h: 0,
    marketCap: 0,
    tvl: 0,
    holders: 0,
    transactions24h: 0
  })

  // Add staking data state
  const [stakingData, setStakingData] = useState({
    totalStaked: stakingInfo?.totalStaked || 0,
    apy: stakingInfo?.apy || 12.5,
    rewards: stakingInfo?.rewards || 0,
    pools: [
      { name: 'Sonic Staking Pool 1', apy: 12.5, amount: 500, progress: 75 },
      { name: 'Sonic Staking Pool 2', apy: 10.0, amount: 300, progress: 60 },
      { name: 'Sonic Staking Pool 3', apy: 15.0, amount: 200, progress: 40 }
    ]
  })

  // Update staking data when stakingInfo changes
  useEffect(() => {
    if (stakingInfo) {
      setStakingData(prev => ({
        ...prev,
        totalStaked: stakingInfo.totalStaked || prev.totalStaked,
        apy: stakingInfo.apy || prev.apy,
        rewards: stakingInfo.rewards || prev.rewards
      }))
    }
  }, [stakingInfo])

  // Calculate portfolio values
  const totalValue = (solBalance || 0) * (solPrice || 0) + (sonicBalance || 0) * (sonicPrice || 0)
  const previousValue = totalValue * 0.95 // Simulated 24h change (5% increase)
  const valueChange = totalValue - previousValue
  const valueChangePercent = (valueChange / previousValue) * 100

  // Fetch market data and metrics with retry and fallback
  useEffect(() => {
    const fetchWithRetry = async (url: string, retries = 3) => {
      for (let i = 0; i < retries; i++) {
        try {
          const response = await fetch(url, {
            headers: {
              'Accept': 'application/json',
              'Cache-Control': 'no-cache'
            },
            cache: 'no-store'
          })
          
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
          }
          
          return await response.json()
        } catch (error) {
          console.error(`Attempt ${i + 1} failed:`, error)
          if (i === retries - 1) throw error
          await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1))) // Exponential backoff
        }
      }
    }

    const fetchData = async () => {
      try {
        setIsLoading(true)
        
        // Fetch current SOL price and market data with fallback
        let priceData
        try {
          priceData = await fetchWithRetry(
            `${COINGECKO_API_BASE}/simple/price?ids=solana&vs_currencies=usd&include_24hr_vol=true&include_market_cap=true`
          )
        } catch (error) {
          console.error('Failed to fetch price data, using fallback:', error)
          priceData = PRICE_FALLBACK
        }

        setSolPrice(priceData.solana.usd)
        setMetrics(prev => ({
          ...prev,
          volume24h: priceData.solana.usd_24h_vol || prev.volume24h,
          marketCap: priceData.solana.usd_market_cap || prev.marketCap,
          tvl: (priceData.solana.usd_market_cap || prev.marketCap) * 0.15,
          holders: prev.holders,
          transactions24h: prev.transactions24h
        }))

        // Fetch price history with fallback
        let historyData
        try {
          const historyResponse = await fetchWithRetry(
            `${COINGECKO_API_BASE}/coins/solana/market_chart?vs_currency=usd&days=7&interval=daily`
          )
          historyData = historyResponse
        } catch (error) {
          console.error('Failed to fetch history data, using fallback:', error)
          // Generate mock history data if API fails
          historyData = {
            prices: Array(7).fill(0).map((_, i) => [
              Date.now() - (6 - i) * 24 * 60 * 60 * 1000,
              priceData.solana.usd
            ]),
            total_volumes: Array(7).fill([0, priceData.solana.usd_24h_vol]),
            market_caps: Array(7).fill([0, priceData.solana.usd_market_cap])
          }
        }

        const combinedHistory = historyData.prices.map(([timestamp, solPrice]: [number, number], index: number) => ({
          date: new Date(timestamp).toLocaleDateString(),
          solPrice,
          sonicPrice: solPrice || 1.0,
          volume24h: historyData.total_volumes[index]?.[1] || 0,
          marketCap: historyData.market_caps[index]?.[1] || 0
        }))

        setPriceHistory(combinedHistory)
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
    const interval = setInterval(fetchData, 60000)
    return () => clearInterval(interval)
  }, [sonicPrice])

  // Format large numbers
  const formatNumber = (num: number) => {
    if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B'
    if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M'
    if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K'
    return num.toFixed(2)
  }

  // Format transaction type and details
  const getTransactionType = (tx: any) => {
    if (tx.type) return tx.type
    if (tx.amount > 0) return 'Receive'
    return 'Send'
  }

  const formatAmount = (tx: any) => {
    const amount = Math.abs(tx.amount)
    const token = tx.token || 'SOL'
    return `${amount.toFixed(4)} ${token}`
  }

  return (
    <div className="space-y-4">
      {/* Quick Actions */}
      <div className="flex justify-end gap-2 mb-4">
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => router.push('/chat')}
        >
          <MessageSquarePlus className="w-4 h-4 mr-2" />
          New Chat
        </Button>
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => router.push('/history')}
        >
          <History className="w-4 h-4 mr-2" />
          History
        </Button>
      </div>

      {/* Market Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div className="bg-zinc-900 p-4 rounded-lg">
          <h4 className="text-sm text-zinc-400">Total Value Locked</h4>
          <p className="text-xl font-bold">${formatNumber(metrics.tvl)}</p>
          <div className="mt-2">
            <LineChart width={100} height={30} data={priceHistory}>
              <Line type="monotone" dataKey="marketCap" stroke="#22c55e" strokeWidth={2} dot={false} />
            </LineChart>
          </div>
        </div>
        <div className="bg-zinc-900 p-4 rounded-lg">
          <h4 className="text-sm text-zinc-400">24h Volume</h4>
          <p className="text-xl font-bold">${formatNumber(metrics.volume24h)}</p>
          <div className="mt-2">
            <LineChart width={100} height={30} data={priceHistory}>
              <Line type="monotone" dataKey="volume24h" stroke="#3b82f6" strokeWidth={2} dot={false} />
            </LineChart>
          </div>
        </div>
        <div className="bg-zinc-900 p-4 rounded-lg">
          <h4 className="text-sm text-zinc-400">Active Holders</h4>
          <p className="text-xl font-bold">{formatNumber(metrics.holders)}</p>
          <p className="text-sm text-zinc-400 mt-1">+2.5% this week</p>
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="grid grid-cols-4 mb-4 bg-zinc-900 rounded-md">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="staking">Staking</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid gap-4">
            {/* Portfolio Value Card */}
            <div className="bg-zinc-900 p-6 rounded-lg">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-sm font-medium text-zinc-400">Portfolio Value</h3>
                  <p className="text-2xl font-bold">${totalValue.toFixed(2)}</p>
                </div>
                <div className={`flex items-center ${valueChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {valueChange >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                  <span className="text-sm">{valueChangePercent.toFixed(2)}%</span>
                </div>
              </div>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={priceHistory}>
                    <defs>
                      <linearGradient id="colorSol" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorSonic" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Area
                      type="monotone"
                      dataKey="solPrice"
                      name="SOL"
                      stroke="#3b82f6"
                      fillOpacity={1}
                      fill="url(#colorSol)"
                      stackId="1"
                    />
                    <Area
                      type="monotone"
                      dataKey="sonicPrice"
                      name="SONIC"
                      stroke="#a855f7"
                      fillOpacity={1}
                      fill="url(#colorSonic)"
                      stackId="2"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Token Balances */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-zinc-900 p-6 rounded-lg">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-sm font-medium text-zinc-400">SOL Balance</h3>
                    <p className="text-xl font-bold">{solBalance?.toFixed(4) || '0'} SOL</p>
                    <p className="text-sm text-zinc-400">
                      ${((solBalance || 0) * (solPrice || 0)).toFixed(2)}
                    </p>
                  </div>
                  <div className="p-2 bg-blue-500/10 rounded-full">
                    <Wallet className="w-4 h-4 text-blue-500" />
                  </div>
                </div>
                <div className="mt-2">
                  <p className="text-sm text-zinc-400">24h Change</p>
                  <p className={`text-sm ${valueChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {valueChangePercent.toFixed(2)}%
                  </p>
                </div>
              </div>

              <div className="bg-zinc-900 p-6 rounded-lg">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-sm font-medium text-zinc-400">SONIC Balance</h3>
                    <p className="text-xl font-bold">{sonicBalance?.toFixed(4) || '0'} SONIC</p>
                    <p className="text-sm text-zinc-400">
                      ${((sonicBalance || 0) * (sonicPrice || 0)).toFixed(2)}
                    </p>
                  </div>
                  <div className="p-2 bg-purple-500/10 rounded-full">
                    <Wallet className="w-4 h-4 text-purple-500" />
                  </div>
                </div>
                <div className="mt-2">
                  <p className="text-sm text-zinc-400">Current Price</p>
                  <p className="text-sm">${sonicPrice?.toFixed(4) || '0'}</p>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="staking">
          <div className="grid gap-4">
            {/* Staking Overview */}
            <div className="bg-zinc-900 p-6 rounded-lg">
              <h3 className="text-lg font-medium mb-4">Staking Overview</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div>
                  <p className="text-sm text-zinc-400">Total Staked</p>
                  <p className="text-xl font-bold">
                    {stakingData.totalStaked.toFixed(4)} SONIC
                  </p>
                  <p className="text-sm text-zinc-400">
                    ${(stakingData.totalStaked * (sonicPrice || 0)).toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-zinc-400">Average APY</p>
                  <p className="text-xl font-bold text-green-500">
                    {stakingData.apy}%
                  </p>
                  <p className="text-sm text-zinc-400">Across all pools</p>
                </div>
                <div>
                  <p className="text-sm text-zinc-400">Unclaimed Rewards</p>
                  <p className="text-xl font-bold">
                    {stakingData.rewards.toFixed(4)} SONIC
                  </p>
                  <p className="text-sm text-zinc-400">
                    ${(stakingData.rewards * (sonicPrice || 0)).toFixed(2)}
                  </p>
                </div>
              </div>

              {/* Staking Pools */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-zinc-400">Active Pools</h4>
                {stakingData.pools.map((pool, index) => (
                  <div key={index} className="bg-zinc-800 p-4 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <p className="font-medium">{pool.name}</p>
                      <p className="text-sm text-green-500">{pool.apy}% APY</p>
                    </div>
                    <p className="text-sm text-zinc-400 mb-2">
                      {pool.amount.toFixed(4)} SONIC staked
                    </p>
                    <Progress value={pool.progress} className="h-1" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="transactions">
          <div className="bg-zinc-900 p-6 rounded-lg">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">Recent Transactions</h3>
              <div className="flex items-center gap-2">
                <p className="text-sm text-zinc-400">
                  24h Transactions: {formatNumber(metrics.transactions24h)}
                </p>
                <Button variant="outline" size="sm">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Explorer
                </Button>
              </div>
            </div>

            {transactions && transactions.length > 0 ? (
              <div className="space-y-4">
                {transactions.map((tx: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-zinc-800 rounded-lg hover:bg-zinc-700/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className={`p-2 ${tx.amount > 0 ? 'bg-green-500/10' : 'bg-red-500/10'} rounded-full`}>
                        <Clock className={`w-4 h-4 ${tx.amount > 0 ? 'text-green-500' : 'text-red-500'}`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{formatAmount(tx)}</p>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            tx.amount > 0 ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
                          }`}>
                            {getTransactionType(tx)}
                          </span>
                        </div>
                        <p className="text-sm text-zinc-400">
                          {new Date(tx.date).toLocaleString()}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-zinc-500">
                          <span>{tx.signature?.slice(0, 8)}...{tx.signature?.slice(-8)}</span>
                          <span>•</span>
                          <span>{tx.confirmations} confirmations</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <p className="text-sm text-zinc-400">
                        ${(Math.abs(tx.amount) * (tx.token === 'SONIC' ? sonicPrice || 0 : solPrice || 0)).toFixed(2)}
                      </p>
                      <a
                        href={`https://explorer.solana.com/tx/${tx.signature}?cluster=testnet`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-500 hover:text-blue-400 flex items-center gap-1"
                      >
                        View <ChevronRight className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-zinc-400">
                <p>No transactions found</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="analytics">
          <div className="grid gap-4">
            <div className="bg-zinc-900 p-6 rounded-lg">
              <h3 className="text-lg font-medium mb-4">Market Analytics</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-zinc-400">Market Cap</p>
                  <p className="text-xl font-bold">${formatNumber(metrics.marketCap)}</p>
                  <p className="text-sm text-green-500">+5.2% (24h)</p>
                </div>
                <div>
                  <p className="text-sm text-zinc-400">Volume/Market Cap</p>
                  <p className="text-xl font-bold">
                    {((metrics.volume24h / metrics.marketCap) * 100).toFixed(2)}%
                  </p>
                  <p className="text-sm text-zinc-400">Healthy ratio</p>
                </div>
                <div>
                  <p className="text-sm text-zinc-400">Holder Distribution</p>
                  <p className="text-xl font-bold">0.85</p>
                  <p className="text-sm text-zinc-400">Gini coefficient</p>
                </div>
              </div>
            </div>

            <div className="bg-zinc-900 p-6 rounded-lg">
              <h3 className="text-lg font-medium mb-4">Network Stats</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-zinc-400">TPS</p>
                  <p className="text-xl font-bold">3,245</p>
                  <p className="text-sm text-zinc-400">Current</p>
                </div>
                <div>
                  <p className="text-sm text-zinc-400">Success Rate</p>
                  <p className="text-xl font-bold">99.8%</p>
                  <p className="text-sm text-zinc-400">Last 24h</p>
                </div>
                <div>
                  <p className="text-sm text-zinc-400">Validators</p>
                  <p className="text-xl font-bold">1,785</p>
                  <p className="text-sm text-green-500">+12 this week</p>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
} 