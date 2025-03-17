"use client"

import { Clock } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"

interface ChatHistoryProps {
  conversations: {
    id: string
    title: string
    messages: { role: string; content: string }[]
  }[]
  currentId: string | null
  onSelect: (id: string) => void
  onClose: () => void
}

export default function ChatHistory({ conversations, currentId, onSelect, onClose }: ChatHistoryProps) {
  return (
    <div className="fixed inset-y-0 left-0 w-80 bg-zinc-900/95 backdrop-blur-sm border-r border-zinc-800 z-50">
      <div className="flex items-center justify-between p-4 border-b border-zinc-800">
        <h2 className="text-sm font-medium">Chat History</h2>
        <button onClick={onClose} className="text-zinc-400 hover:text-white" title="Close chat history">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6 6 18" /><path d="m6 6 12 12" />
          </svg>
        </button>
      </div>
      
      <ScrollArea className="h-[calc(100vh-64px)]">
        <div className="p-2">
          {conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-zinc-500">
              <Clock className="w-8 h-8 mb-2 opacity-50" />
              <p className="text-sm">No chat history yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {conversations.map((conversation) => (
                <button
                  key={conversation.id}
                  onClick={() => onSelect(conversation.id)}
                  className={`w-full text-left p-3 rounded-lg transition-colors ${
                    currentId === conversation.id ? "bg-zinc-800" : "hover:bg-zinc-800/50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs">
                      {conversation.messages[0]?.content.charAt(0) || "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{conversation.title || conversation.messages[0]?.content || "New Chat"}</p>
                      <p className="text-xs text-zinc-400">
                        {new Date(parseInt(conversation.id)).toLocaleDateString()} · {conversation.messages.length} messages
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}

