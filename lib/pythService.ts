import { Connection, PublicKey } from "@solana/web3.js";
import { PythHttpClient, getPythProgramKeyForCluster } from "@pythnetwork/client";

const HELIUS_API_KEY = process.env.NEXT_PUBLIC_HELIUS_API_KEY;
const SOLANA_RPC_URL = `https://sonic.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;
const connection = new Connection(SOLANA_RPC_URL, "confirmed");
const PYTH_PROGRAM_KEY = getPythProgramKeyForCluster("mainnet-beta");

export async function fetchSolUsdPrice(): Promise<number | null> {
  try {
    console.log('Fetching SOL price from Pyth Network...');
    const pythClient = new PythHttpClient(connection, PYTH_PROGRAM_KEY);
    const data = await pythClient.getData();
    const priceFeed = data.productPrice.get("Crypto.SOL/USD");
    if (priceFeed?.price) {
      console.log('Received SOL price:', priceFeed.price / 1e8);
      return priceFeed.price / 1e8;
    }
    return null;
  } catch (error) {
    console.error('Error fetching SOL price:', error);
    return null;
  }
}

export function streamSolUsdPrice(callback: (price: number) => void) {
  console.log('Starting SOL price polling...');
  
  // Initial fetch
  fetchSolUsdPrice().then(price => {
    if (price) callback(price);
  });

  // Poll every 5 seconds
  const interval = setInterval(async () => {
    const price = await fetchSolUsdPrice();
    if (price) callback(price);
  }, 5000);

  // Return cleanup function
  return () => {
    console.log('Cleaning up SOL price polling...');
    clearInterval(interval);
  };
} 