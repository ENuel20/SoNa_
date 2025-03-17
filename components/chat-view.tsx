"use client"

import { useEffect, useRef } from "react"
import { ScrollArea } from "@/components/ui/scroll-area"

interface ChatViewProps {
  messages: { role: string; content: string }[]
  isLoading?: boolean
}

export default function ChatView({ messages, isLoading = false }: ChatViewProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Scroll to bottom when messages change
  useEffect(() => {
    // Add a small delay to ensure DOM is updated before scrolling
    const scrollTimeout = setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }, 100)

    return () => clearTimeout(scrollTimeout)
  }, [messages])

  // Add a useEffect to handle initial scroll when messages load
  useEffect(() => {
    if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: "auto" })
    }
  }, [])

  return (
    <div className="flex-1 flex flex-col">
      <ScrollArea className="flex-1 px-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center">
            <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold mb-2">Welcome to Sona</h2>
            <p className="text-zinc-400 max-w-sm">
              Your AI-powered DeFi assistant. Ask me anything about your portfolio, tokens, or trading.
            </p>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex items-start gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`px-4 py-2 rounded-lg max-w-[80%] ${
                    message.role === "user" ? "bg-blue-500/20" : "bg-zinc-800"
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex items-start gap-3">
                <div className="bg-zinc-800 px-4 py-2 rounded-lg">
                  <div className="flex space-x-2">
                    <div className="w-2 h-2 rounded-full bg-zinc-500 animate-pulse"></div>
                    <div className="w-2 h-2 rounded-full bg-zinc-500 animate-pulse" style={{ animationDelay: "0.2s" }}></div>
                    <div className="w-2 h-2 rounded-full bg-zinc-500 animate-pulse" style={{ animationDelay: "0.4s" }}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </ScrollArea>
    </div>
  )
}

