"use client"

import { useEffect, useRef } from "react"
import { X } from "lucide-react"

interface WalletModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function WalletModal({ isOpen, onClose }: WalletModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)

  // Close modal when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center">
      <div ref={modalRef} className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-medium">Connect Wallet</h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-zinc-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="text-center">
          <p className="text-zinc-400 mb-4">Backpack wallet not detected</p>
          <a
            href="https://www.backpack.app/"
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-md hover:from-blue-500 hover:to-purple-500 transition-all"
          >
            Install Backpack
          </a>
        </div>
      </div>
    </div>
  )
}

