"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { ArrowUp, Clock, Plus, X, Mic, ArrowUpRight, Layers, BrainCircuit, User, History, Send } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { usePortfolio } from "@/hooks/use-portfolio"
import { SolanaProvider } from "@/contexts/SolanaContext"
import { useSonic } from "@/contexts/SonicContext"
import { useSolana } from "@/contexts/SolanaContext"
import BackpackWalletConnect from "@/components/backpack-wallet-connect"
import { useChat } from "@/hooks/use-chat"
import type { Message } from 'ai'
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import Image from "next/image"
import type { AnchorHTMLAttributes, DetailedHTMLProps } from 'react'
import DashboardView from "@/components/dashboard-view"
import { PriceStatus, getPythProgramKeyForCluster, PythHttpClient } from '@pythnetwork/client'
import { Connection } from "@solana/web3.js"
import { streamSolUsdPrice } from "@/lib/pythService"

export default function Home() {
  const [activeTab, setActiveTab] = useState("chat")
  const [solPrice, setSolPrice] = useState<number | null>(null)
  const [showWelcome, setShowWelcome] = useState(true)
  const [input, setInput] = useState("")

  const { sonicBalance, sonicPrice } = useSonic()
  const { publicKey, balance: solBalance, connectWallet, hasConnectedBefore } = useSolana()

  // Effect to handle welcome screen
  useEffect(() => {
    if (publicKey || hasConnectedBefore) {
      setShowWelcome(false)
    }
  }, [publicKey, hasConnectedBefore])

  // Real-time SOL price streaming
  useEffect(() => {
    console.log('Starting SOL price stream...');
    const cleanup = streamSolUsdPrice((price) => {
      console.log('Received SOL price:', price);
      setSolPrice(price)
    })
    return cleanup
  }, [])

  // Log when price changes
  useEffect(() => {
    console.log('SOL price updated:', solPrice);
  }, [solPrice])

  const { messages, sendMessage, isLoading } = useChat()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return
    
    await sendMessage(input)
    setInput("")
  }

  // Show welcome screen only if never connected before
  if (showWelcome && !hasConnectedBefore) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-950 text-white p-4">
        <h1 className="text-2xl font-bold mb-8">Welcome to Sona</h1>
        <p className="text-zinc-400 mb-8 text-center max-w-md">
          Connect your wallet to start chatting with Sona, your AI assistant for DeFi and Solana.
        </p>
        <BackpackWalletConnect />
      </div>
    )
  }

  return (
    <main className="flex flex-col min-h-screen bg-zinc-950 text-white">
      <SolanaProvider solPrice={solPrice}>
        {/* Navigation */}
        <nav className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-xl sticky top-0 z-50">
          <div className="max-w-screen-xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-8">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">Sona</span>
                  <Badge variant="secondary" className="ml-2">BETA</Badge>
                </div>
                
                <Tabs value={activeTab} className="hidden sm:block">
                  <TabsList className="bg-zinc-800/50">
                    <TabsTrigger value="chat" onClick={() => setActiveTab("chat")}>
                      Chat
                    </TabsTrigger>
                    <TabsTrigger value="dashboard" onClick={() => setActiveTab("dashboard")}>
                      Dashboard
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              <div className="flex items-center gap-4">
                <BackpackWalletConnect />
              </div>
            </div>
          </div>
        </nav>

        {/* Main content */}
        <div className="flex-1 max-w-screen-xl mx-auto w-full px-4 py-8">
          {activeTab === "chat" ? (
            <div className="max-w-3xl mx-auto">
              {!publicKey ? (
                <div className="text-center py-8">
                  <p className="text-zinc-400 mb-4">Please connect your wallet to continue chatting</p>
                  <BackpackWalletConnect />
                </div>
              ) : (
                <>
                  <div className="space-y-4 mb-4">
                    {messages.length === 0 ? (
                      <div className="text-center py-8 text-zinc-400">
                        <h2 className="text-xl font-semibold mb-2">Welcome to Sona!</h2>
                        <p>Ask me anything about your portfolio, prices, or transactions.</p>
                      </div>
                    ) : (
                      messages.map((message, i) => (
                        <div
                          key={i}
                          className={cn(
                            "flex w-full items-start gap-4 rounded-lg p-4",
                            message.role === "assistant"
                              ? "bg-zinc-900"
                              : "bg-blue-500/10"
                          )}
                        >
                          {message.role === "assistant" ? (
                            <BrainCircuit className="mt-1 h-6 w-6" />
                          ) : (
                            <User className="mt-1 h-6 w-6" />
                          )}
                          <div className="flex-1 space-y-2">
                            <div className="prose prose-invert max-w-none">
                              <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                components={{
                                  a: (props: DetailedHTMLProps<AnchorHTMLAttributes<HTMLAnchorElement>, HTMLAnchorElement>) => (
                                    <a
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      {...props}
                                      className="text-blue-400 hover:text-blue-300 transition-colors"
                                    />
                                  ),
                                }}
                              >
                                {message.content}
                              </ReactMarkdown>
                            </div>
                          </div>
                        </div>
                      ))
                    )}

                    {isLoading && (
                      <div className="flex w-full items-start gap-4 rounded-lg p-4 bg-zinc-900">
                        <BrainCircuit className="mt-1 h-6 w-6" />
                        <div className="flex-1">
                          <div className="animate-pulse h-4 w-12 bg-zinc-800 rounded" />
                        </div>
                      </div>
                    )}
                  </div>

                  <form onSubmit={handleSubmit} className="relative">
                    <input
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="Ask anything..."
                      className="w-full rounded-lg bg-zinc-900 px-4 py-3 pr-24 text-white placeholder-zinc-400 border border-zinc-800 focus:border-blue-500 focus:outline-none"
                    />
                    <div className="absolute right-2 top-2 flex items-center gap-2">
                      <Button
                        type="submit"
                        size="icon"
                        className="h-8 w-8"
                        disabled={isLoading}
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </form>
                </>
              )}
            </div>
          ) : (
            <div className="max-w-screen-xl mx-auto px-4 py-8">
              <DashboardView 
                isWalletConnected={!!publicKey}
                onConnectWallet={connectWallet} 
              />
            </div>
          )}
        </div>
      </SolanaProvider>
    </main>
  )
}


