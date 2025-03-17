import { useState } from "react"
import { useSolana } from "@/contexts/SolanaContext"
import { useSonic } from "@/contexts/SonicContext"
import toast from "react-hot-toast"

export function useChat() {
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const solana = useSolana()
  const sonic = useSonic()

  const sendMessage = async (content: string) => {
    try {
      setIsLoading(true)

      // Add user message to state
      const userMessage = { role: "user", content }
      setMessages((prev) => [...prev, userMessage])

      // Prepare wallet info
      const walletInfo = solana.publicKey ? {
        solBalance: solana.balance,
        solPrice: null, // This will be fetched from CoinGecko in the API
        sonicBalance: sonic.sonicBalance,
        sonicPrice: sonic.sonicPrice
      } : null

      // Send message to API
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          walletInfo
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to send message")
      }

      // Handle token sending action
      if (data.action?.type === "send_token") {
        const { token, amount, recipient } = data.action
        let txHash: string | null = null

        try {
          if (token === "SOL") {
            txHash = await solana.sendSol(recipient, amount.toString())
          } else if (token === "SONIC") {
            txHash = await sonic.sendSonic(recipient, amount.toString())
          }

          if (txHash) {
            // Add success message
            setMessages((prev) => [
              ...prev,
              data,
              {
                role: "assistant",
                content: `Transaction successful! Hash: ${txHash}`
              }
            ])
          } else {
            throw new Error("Transaction failed")
          }
        } catch (error) {
          // Add error message
          setMessages((prev) => [
            ...prev,
            data,
            {
              role: "assistant",
              content: "Transaction failed. Please try again."
            }
          ])
          toast.error("Transaction failed")
        }
        return
      }

      // Add assistant message to state
      setMessages((prev) => [...prev, data])
    } catch (error) {
      console.error("Error in chat:", error)
      const errorMessage = error instanceof Error ? error.message : "Failed to send message"
      toast.error(errorMessage)
      
      // Add error message to chat
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "I apologize, but I encountered an error. Please try again."
        }
      ])
    } finally {
      setIsLoading(false)
    }
  }

  return {
    messages,
    sendMessage,
    isLoading
  }
} 