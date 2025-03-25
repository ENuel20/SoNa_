import { 
  Commitment, 
  Connection, 
  ConnectionConfig,
  SlotInfo,
  PublicKey,
  AccountInfo,
  AccountSubscriptionConfig
} from "@solana/web3.js";

/**
 * Creates a Solana connection to Helius Sonic RPC with WebSocket support
 * @param commitment Optional commitment level, defaults to "confirmed"
 * @returns A Solana connection instance
 */
export function createSolanaConnection(commitment: Commitment = "confirmed"): Connection {
  if (!process.env.NEXT_PUBLIC_HELIUS_API_KEY) {
    throw new Error("NEXT_PUBLIC_HELIUS_API_KEY is not defined in the environment variables");
  }

  const apiKey = process.env.NEXT_PUBLIC_HELIUS_API_KEY;
  const rpcUrl = `https://sonic.helius-rpc.com/?api-key=${apiKey}`;
  const wsUrl = `wss://sonic.helius-rpc.com/?api-key=${apiKey}`;
  
  const config: ConnectionConfig = {
    commitment,
    wsEndpoint: wsUrl,
    confirmTransactionInitialTimeout: 60000, // 60 seconds
    disableRetryOnRateLimit: false
  };

  return new Connection(rpcUrl, config);
}

/**
 * Example function showing how to subscribe to slot updates using WebSocket
 * @param connection Solana connection instance
 * @returns Subscription ID that can be used to unsubscribe
 */
export async function subscribeToSlotUpdates(connection: Connection): Promise<number> {
  return connection.onSlotChange((slotInfo: SlotInfo) => {
    console.log("Slot updated:", {
      slot: slotInfo.slot,
      parent: slotInfo.parent,
      root: slotInfo.root
    });
  });
}

/**
 * Example function showing how to subscribe to account changes using WebSocket
 * @param connection Solana connection instance
 * @param accountPubkey Account public key to watch
 * @returns Subscription ID that can be used to unsubscribe
 */
export async function subscribeToAccountChanges(
  connection: Connection,
  accountPubkey: string | PublicKey,
  commitment: Commitment = "confirmed"
): Promise<number> {
  const pubkey = typeof accountPubkey === 'string' 
    ? new PublicKey(accountPubkey) 
    : accountPubkey;
    
  const config: AccountSubscriptionConfig = {
    commitment,
    encoding: "base64"
  };

  return connection.onAccountChange(
    pubkey,
    (accountInfo: AccountInfo<Buffer>, context: { slot: number }) => {
      console.log("Account updated:", {
        slot: context.slot,
        data: accountInfo.data,
        lamports: accountInfo.lamports,
        owner: accountInfo.owner.toBase58()
      });
    },
    config
  );
}

/**
 * Unsubscribe from a WebSocket subscription
 * @param connection Solana connection instance
 * @param subscriptionId Subscription ID returned from subscription methods
 */
export async function unsubscribe(
  connection: Connection,
  subscriptionId: number
): Promise<void> {
  await connection.removeAccountChangeListener(subscriptionId);
  console.log(`Unsubscribed from subscription ID: ${subscriptionId}`);
}
