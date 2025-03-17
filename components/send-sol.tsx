"use client"

import type React from "react"

import { useState } from "react"
import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useSolana } from "@/contexts/SolanaContext"

export default function SendSol() {
  const { sendSol, isProcessing, publicKey } = useSolana()
  const [recipient, setRecipient] = useState("")
  const [amount, setAmount] = useState("")

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!publicKey || !recipient || !amount) return

    const result = await sendSol(recipient, amount)

    if (result) {
      // Reset form on success
      setRecipient("")
      setAmount("")
    }
  }

  if (!publicKey) return null

  return (
    <div className="bg-zinc-900 rounded-lg p-4">
      <h3 className="text-sm text-zinc-400 mb-3">Send SOL</h3>

      <form onSubmit={handleSend} className="space-y-3">
        <div>
          <input
            type="text"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            placeholder="Recipient address"
            className="w-full p-2 bg-zinc-800 border border-zinc-700 rounded text-white focus:border-blue-500 focus:outline-none text-sm"
            disabled={isProcessing}
          />
        </div>

        <div className="flex gap-2">
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Amount (SOL)"
            className="flex-1 p-2 bg-zinc-800 border border-zinc-700 rounded text-white focus:border-blue-500 focus:outline-none text-sm"
            step="0.001"
            min="0.001"
            disabled={isProcessing}
          />

          <Button
            type="submit"
            disabled={isProcessing || !recipient || !amount}
            className="bg-blue-600 hover:bg-blue-500"
            size="sm"
          >
            {isProcessing ? "Sending..." : "Send"}
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </form>
    </div>
  )
}

