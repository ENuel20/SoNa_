"use client";

import { HeliusDemo } from "@/components/HeliusDemo";

export default function HeliusDemoPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Helius Sonic WebSocket Connection Demo</h1>
      <p className="mb-6 text-gray-600">
        This page demonstrates the integration with Helius Sonic RPC using WebSocket connections
        for real-time blockchain updates.
      </p>
      <HeliusDemo />
    </div>
  );
}
