"use client"

import { useState } from "react"
import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useSolana } from "@/contexts/SolanaContext"
import { useSonic } from "@/contexts/SonicContext"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import toast from 'react-hot-toast'

export default function SendToken() {
  const { sendSol, isProcessing: isSolProcessing, publicKey, balance: solBalance } = useSolana()
  const { sendSonic, isProcessing: isSonicProcessing, sonicBalance } = useSonic()
  
  const [activeToken, setActiveToken] = useState("SOL")
  const [recipient, setRecipient] = useState("")
  const [amount, setAmount] = useState("")

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!publicKey || !recipient || !amount) return

    try {
      let result: string | null = null
      
      if (activeToken === "SOL") {
        // Validate SOL amount
        const solAmount = parseFloat(amount)
        if (isNaN(solAmount) || solAmount <= 0) {
          toast.error("Please enter a valid amount")
          return
        }
        if (solAmount > (solBalance || 0)) {
          toast.error("Insufficient SOL balance")
          return
        }
        result = await sendSol(recipient, amount)
      } else {
        // Validate SONIC amount
        const sonicAmount = parseFloat(amount)
        if (isNaN(sonicAmount) || sonicAmount <= 0) {
          toast.error("Please enter a valid amount")
          return
        }
        if (sonicAmount > (sonicBalance || 0)) {
          toast.error("Insufficient SONIC balance")
          return
        }
        result = await sendSonic(recipient, sonicAmount)
      }

      if (result) {
        toast.success(amount + " " + activeToken + " sent successfully!")
        // Reset form on success
        setRecipient("")
        setAmount("")
      }
    } catch (error) {
      console.error("Error sending tokens:", error)
      toast.error("Failed to send tokens")
    }
  }

  if (!publicKey) return null

  return (
    <div className="bg-zinc-900 rounded-lg p-4">
      <h3 className="text-sm font-medium mb-3">Send Tokens</h3>
      
      <Tabs value={activeToken} onValueChange={setActiveToken} className="mb-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="SOL">
            SOL ({solBalance?.toFixed(4) || "0.0000"})
          </TabsTrigger>
          <TabsTrigger value="SONIC">
            SONIC ({sonicBalance?.toFixed(4) || "0.0000"})
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <form onSubmit={handleSend} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="recipient">Recipient Address</Label>
          <Input
            id="recipient"
            placeholder="Enter Solana address"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            className="bg-zinc-800 border-zinc-700"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="amount">Amount</Label>
          <div className="relative">
            <Input
              id="amount"
              type="number"
              placeholder={`Enter ${activeToken} amount`}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="bg-zinc-800 border-zinc-700"
              min="0"
              step="0.000001"
            />
            <span className="absolute right-3 top-2 text-sm text-zinc-400">
              {activeToken}
            </span>
          </div>
          <p className="text-xs text-zinc-500">
            Available: {activeToken === "SOL" 
              ? `${solBalance?.toFixed(4) || "0.0000"} SOL`
              : `${sonicBalance?.toFixed(4) || "0.0000"} SONIC`
            }
          </p>
        </div>

        <Button
          type="submit"
          className="w-full"
          disabled={!recipient || !amount || isSolProcessing || isSonicProcessing}
        >
          {isSolProcessing || isSonicProcessing ? (
            "Processing..."
          ) : (
            <>
              Send {activeToken} <ArrowRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </form>
    </div>
  )
} 