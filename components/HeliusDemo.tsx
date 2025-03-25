"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Connection } from "@solana/web3.js";
import { Alert, AlertDescription } from "./ui/alert";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";

export function HeliusDemo() {
  const [status, setStatus] = useState<"connecting" | "connected" | "error">("connecting");
  const [slotInfo, setSlotInfo] = useState<{ slot: number; parent: number; root: number } | null>(null);
  const [currentSlot, setCurrentSlot] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<number | null>(null);

  useEffect(() => {
    let connection: Connection | null = null;
    let wsSubscriptionId: number | null = null;

    const connectToHelius = async () => {
      try {
        setStatus("connecting");
        
        // Get API key from env
        const apiKey = process.env.NEXT_PUBLIC_HELIUS_API_KEY;
        if (!apiKey) {
          throw new Error("NEXT_PUBLIC_HELIUS_API_KEY is not defined in environment variables");
        }

        // Configure Helius Sonic connection with WebSocket support
        const rpcUrl = `https://sonic.helius-rpc.com/?api-key=${apiKey}`;
        const wsUrl = `wss://sonic.helius-rpc.com/?api-key=${apiKey}`;
        
        connection = new Connection(rpcUrl, {
          commitment: "confirmed",
          wsEndpoint: wsUrl,
          confirmTransactionInitialTimeout: 60000,
        });

        // Get current slot (HTTP RPC)
        const slot = await connection.getSlot();
        setCurrentSlot(slot);
        
        // Subscribe to slot updates (WebSocket)
        wsSubscriptionId = connection.onSlotChange((slotInfo) => {
          setStatus("connected");
          setSlotInfo({
            slot: slotInfo.slot,
            parent: slotInfo.parent,
            root: slotInfo.root
          });
        });
        
        setSubscription(wsSubscriptionId);
      } catch (err) {
        console.error("Error connecting to Helius:", err);
        setStatus("error");
        setError(err instanceof Error ? err.message : String(err));
      }
    };

    connectToHelius();

    // Cleanup on unmount
    return () => {
      if (connection && wsSubscriptionId !== null) {
        connection.removeSlotChangeListener(wsSubscriptionId);
        console.log("WebSocket connection closed");
      }
    };
  }, []);

  const getStatusBadge = () => {
    switch (status) {
      case "connecting":
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800">Connecting...</Badge>;
      case "connected":
        return <Badge variant="outline" className="bg-green-100 text-green-800">Connected</Badge>;
      case "error":
        return <Badge variant="outline" className="bg-red-100 text-red-800">Error</Badge>;
      default:
        return null;
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Helius Sonic WebSocket Demo</CardTitle>
          {getStatusBadge()}
        </div>
        <CardDescription>
          Demonstrates real-time Solana blockchain updates using WebSockets
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error ? (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-medium mb-2">Current Slot (HTTP RPC):</h3>
            <p className="text-2xl font-bold">
              {currentSlot !== null ? currentSlot.toLocaleString() : "Loading..."}
            </p>
          </div>

          {slotInfo && (
            <div className="border rounded-md p-4 bg-slate-50">
              <h3 className="text-sm font-medium mb-2">Real-time Slot Updates (WebSocket):</h3>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-xs text-gray-500">Current</p>
                  <p className="text-xl font-bold">{slotInfo.slot.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Parent</p>
                  <p className="text-xl font-bold">{slotInfo.parent.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Root</p>
                  <p className="text-xl font-bold">{slotInfo.root.toLocaleString()}</p>
                </div>
              </div>
            </div>
          )}

          <div className="text-xs text-gray-500 mt-4">
            <p>WebSocket subscription ID: {subscription !== null ? subscription : "None"}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
