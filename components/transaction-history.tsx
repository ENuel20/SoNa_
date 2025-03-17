"use client"

import { useSolana } from "@/contexts/SolanaContext"
import { ExternalLink } from "lucide-react"

export default function TransactionHistory() {
  const { transactions, publicKey } = useSolana()

  if (!publicKey || transactions.length === 0) return null

  return (
    <div className="bg-zinc-900 rounded-lg p-4 mt-4">
      <h3 className="text-sm text-zinc-400 mb-3">Recent Transactions</h3>

      <div className="space-y-2">
        {transactions.map((tx, index) => (
          <div key={index} className="flex justify-between items-center border-b border-zinc-800 pb-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-zinc-500">
                {tx.hash.slice(0, 6)}...{tx.hash.slice(-4)}
              </span>
              <a
                href={`https://explorer.solana.com/tx/${tx.hash}?cluster=testnet`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:text-blue-400"
              >
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-red-400">-{tx.amount} SOL</span>
              <span className="text-zinc-600 text-xs">{new Date(tx.date).toLocaleTimeString()}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

