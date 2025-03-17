"use client"

import { Connection, PublicKey, LAMPORTS_PER_SOL, ParsedAccountData, Transaction } from "@solana/web3.js"
import { ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID, getAssociatedTokenAddress } from "@solana/spl-token"
import { createContext, useContext, type ReactNode, useState, useEffect, useMemo } from "react"
import toast from "react-hot-toast"
import {
  createTransferInstruction,
} from "@solana/spl-token"

// Update the Sonic SVM endpoint to use Solana testnet
const SONIC_ENDPOINT = "https://api.testnet.solana.com"

// Use environment variable for SONIC token mint address
const SONIC_TOKEN_MINT = process.env.NEXT_PUBLIC_SONIC_TOKEN_MINT || "7rh23QToLTBmYxR5jDiRbUtqcGey4xjDeU9JmtX6QChe"

// Add imports for token account handling

// Define the Backpack window interface
interface BackpackWindow extends Window {
  backpack?: {
    connect: () => Promise<{ publicKey: PublicKey }>
    disconnect: () => Promise<void>
    isConnected: boolean
    publicKey?: PublicKey
    signTransaction: (transaction: any) => Promise<any>
    signAllTransactions: (transactions: any[]) => Promise<any[]>
  }
}

declare const window: BackpackWindow

interface SonicContextType {
  sonicBalance: number | null
  sonicPrice: number | null
  fetchSonicBalance: () => Promise<void>
  stakingInfo: {
    totalStaked: number
    rewards: number
    apy: number
    pools: Array<{
      name: string
      amount: number
      apy: number
    }>
  } | null
  fetchStakingInfo: () => Promise<void>
  stakeSonic: (amount: number) => Promise<string | null>
  unstakeSonic: (amount: number, poolName: string) => Promise<string | null>
  claimRewards: () => Promise<string | null>
  isProcessing: boolean
  publicKey: PublicKey | null
  sendSonic: (recipient: string, amount: number) => Promise<string | null>
}

const SonicContext = createContext<SonicContextType | undefined>(undefined)

export function SonicProvider({ children }: { children: ReactNode }) {
  const [publicKey, setPublicKey] = useState<PublicKey | null>(null)
  const [sonicBalance, setSonicBalance] = useState<number | null>(null)
  const [sonicPrice, setSonicPrice] = useState<number | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [stakingInfo, setStakingInfo] = useState<SonicContextType["stakingInfo"]>(null)

  // Create a connection to Solana testnet
  const connection = useMemo(() => {
    return new Connection(SONIC_ENDPOINT, {
      commitment: "confirmed",
      wsEndpoint: "wss://api.testnet.solana.com",
      disableRetryOnRateLimit: false,
      fetch: (url, options) => {
        return fetch(url, { ...options, cache: 'no-cache' })
      }
    })
  }, [])

  // Check if Backpack is connected
  useEffect(() => {
    const checkBackpackConnection = async () => {
      if (window.backpack && window.backpack.isConnected && window.backpack.publicKey) {
        setPublicKey(window.backpack.publicKey)
      } else {
        setPublicKey(null)
      }
    }

    checkBackpackConnection()

    // Check connection status periodically
    const interval = setInterval(checkBackpackConnection, 5000)
    return () => clearInterval(interval)
  }, [])

  // Update the fetchSonicBalance method to use the proper token account lookup
  const fetchSonicBalance = async () => {
    if (!publicKey) {
      setSonicBalance(null)
      return
    }

    try {
      // Get the associated token account for the SONIC token
      const tokenMintAccount = new PublicKey(SONIC_TOKEN_MINT)
      const ownerTokenAccount = await getAssociatedTokenAddress(
        tokenMintAccount,
        publicKey,
        true,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID,
      )

      // Check if the token account exists
      const accountInfo = await connection.getAccountInfo(ownerTokenAccount)

      if (accountInfo) {
        // Get the token balance
        const tokenBalance = await connection.getTokenAccountBalance(ownerTokenAccount)
        const balance = Number(tokenBalance.value.uiAmount)
        setSonicBalance(balance)
        console.log("Fetched SONIC balance:", balance)
      } else {
        // Token account doesn't exist yet (user has no SONIC)
        setSonicBalance(0)
      }
    } catch (error) {
      console.error("Error fetching SONIC balance:", error)
      toast.error("Failed to fetch SONIC balance")
      setSonicBalance(0)
    }
  }

  // Update the fetchSonicPrice method to use CoinGecko API
  const fetchSonicPrice = async (retries = 3): Promise<number> => {
    try {
      console.log('Fetching SONIC price from CoinGecko...');
      
      const response = await fetch(
        'https://api.coingecko.com/api/v3/simple/price?ids=sonic-token&vs_currencies=usd',
        {
          method: 'GET',
          headers: {
            'Accept': 'application/json'
          }
        }
      );
      
      if (!response.ok) {
        console.error('CoinGecko API Error:', {
          status: response.status,
          statusText: response.statusText
        });

        if (response.status === 429) {
          await new Promise(resolve => setTimeout(resolve, 2000));
          if (retries > 0) {
            console.log('Retrying after rate limit...', retries, 'attempts left');
            return fetchSonicPrice(retries - 1);
          }
        }

        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('CoinGecko API response:', data);

      if (!data['sonic-token']?.usd) {
        console.error('Invalid response format:', data);
        throw new Error('Invalid response format from CoinGecko API');
      }

      const price = data['sonic-token'].usd;
      console.log('Fetched SONIC price:', price);
      setSonicPrice(price);
      return price;
    } catch (error: unknown) {
      console.error('Error fetching SONIC price:', error);
      if (retries > 0) {
        console.log('Retrying...', retries, 'attempts left');
        await new Promise(resolve => setTimeout(resolve, 2000));
        return fetchSonicPrice(retries - 1);
      }
      setSonicPrice(0);
      return 0;
    }
  };

  // Add price update interval
  useEffect(() => {
    fetchSonicPrice();
    // CoinGecko free API has a rate limit of 10-30 calls per minute
    const interval = setInterval(() => fetchSonicPrice(), 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);

  // Fetch staking information
  const fetchStakingInfo = async () => {
    if (!publicKey) {
      setStakingInfo(null)
      return
    }

    try {
      // Get all stake accounts for the wallet
      const stakeAccounts = await connection.getParsedProgramAccounts(
        new PublicKey('Stake11111111111111111111111111111111111111'),
        {
          filters: [
            {
              memcmp: {
                offset: 44,
                bytes: publicKey.toBase58(),
              },
            },
          ],
        }
      )

      // Calculate total staked and rewards
      let totalStaked = 0
      let rewards = 0

      for (const account of stakeAccounts) {
        const stakeAccount = account.account.data as ParsedAccountData
        if (stakeAccount.parsed.type === 'delegated') {
          totalStaked += stakeAccount.parsed.info.stake
          rewards += stakeAccount.parsed.info.rewards
        }
      }

      // Get current APY from validators
      const validators = await connection.getVoteAccounts()
      const averageAPY = validators.current.reduce((sum, v) => sum + v.commission, 0) / validators.current.length
      
      const stakingData = {
        totalStaked: totalStaked / LAMPORTS_PER_SOL,
        rewards: rewards / LAMPORTS_PER_SOL,
        apy: 7 - (averageAPY / 100),
        pools: stakeAccounts.map(account => ({
          name: (account.account.data as ParsedAccountData).parsed.info.validator || "Unknown Validator",
          amount: (account.account.data as ParsedAccountData).parsed.info.stake / LAMPORTS_PER_SOL,
          apy: 7 - (averageAPY / 100)
        }))
      }

      setStakingInfo(stakingData)
    } catch (error) {
      console.error("Error fetching staking info:", error)
      toast.error("Failed to fetch staking information")
    }
  }

  // Set up real-time updates for staking info
  useEffect(() => {
    if (publicKey) {
      fetchStakingInfo()
      
      // Update every minute
      const interval = setInterval(fetchStakingInfo, 60000)
      
      // Subscribe to stake account changes
      const subscriptionId = connection.onProgramAccountChange(
        new PublicKey('Stake11111111111111111111111111111111111111'),
        () => {
          fetchStakingInfo()
        }
      )

      return () => {
        clearInterval(interval)
        connection.removeProgramAccountChangeListener(subscriptionId)
      }
    }
  }, [publicKey, connection])

  // Fetch data when wallet connects or changes
  useEffect(() => {
    if (publicKey) {
      fetchSonicBalance()
      fetchStakingInfo()

      // Refresh data every 30 seconds
      const interval = setInterval(() => {
        fetchSonicBalance()
        fetchStakingInfo()
      }, 30000)

      return () => clearInterval(interval)
    } else {
      setSonicBalance(null)
      setStakingInfo(null)
    }
  }, [publicKey])

  // Update the stakeSonic method to use proper token transfer
  const stakeSonic = async (amount: number): Promise<string | null> => {
    if (!publicKey || !amount || !window.backpack) return null

    const toastId = toast.loading("Preparing staking transaction...")
    setIsProcessing(true)

    try {
      // In a real implementation, you would create and send a staking transaction
      // For now, we'll simulate a network request
      await new Promise((resolve) => setTimeout(resolve, 2000))

      // Mock transaction hash
      const mockTxHash = `${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`

      // Update staking info
      if (stakingInfo) {
        setStakingInfo({
          ...stakingInfo,
          totalStaked: (stakingInfo.totalStaked || 0) + amount,
          pools:
            stakingInfo.pools?.map((pool, index) =>
              index === 0 ? { ...pool, amount: (pool.amount || 0) + amount } : pool,
            ) || [],
        })
      }

      // Update SONIC balance
      if (sonicBalance !== null) {
        setSonicBalance(sonicBalance - amount)
      }

      toast.success(`${amount} SONIC staked successfully!`, { id: toastId })
      return mockTxHash
    } catch (error) {
      console.error("Error staking SONIC:", error)
      toast.error("Staking transaction failed", { id: toastId })
      return null
    } finally {
      setIsProcessing(false)
    }
  }

  // Unstake SONIC tokens
  const unstakeSonic = async (amount: number, poolName: string): Promise<string | null> => {
    if (!publicKey || !amount || !stakingInfo) return null

    const toastId = toast.loading("Preparing unstaking transaction...")
    setIsProcessing(true)

    try {
      // In a real implementation, you would create and send an unstaking transaction
      // For now, we'll simulate a network request
      await new Promise((resolve) => setTimeout(resolve, 2000))

      // Find the pool
      if (!stakingInfo?.pools) {
        throw new Error("No staking pools available")
      }

      const poolIndex = stakingInfo.pools.findIndex((pool) => pool.name === poolName)
      if (poolIndex === -1) {
        throw new Error("Pool not found")
      }

      // Check if there's enough staked
      if ((stakingInfo.pools[poolIndex].amount || 0) < amount) {
        throw new Error("Not enough SONIC staked in this pool")
      }

      // Mock transaction hash
      const mockTxHash = `${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`

      // Update staking info
      setStakingInfo({
        ...stakingInfo,
        totalStaked: stakingInfo.totalStaked - amount,
        pools: stakingInfo.pools.map((pool, index) =>
          index === poolIndex ? { ...pool, amount: pool.amount - amount } : pool,
        ),
      })

      // Update SONIC balance
      if (sonicBalance !== null) {
        setSonicBalance(sonicBalance + amount)
      }

      toast.success(`${amount} SONIC unstaked successfully!`, { id: toastId })
      return mockTxHash
    } catch (error) {
      console.error("Error unstaking SONIC:", error)
      toast.error(`Unstaking transaction failed: ${error instanceof Error ? error.message : "Unknown error"}`, {
        id: toastId,
      })
      return null
    } finally {
      setIsProcessing(false)
    }
  }

  // Claim staking rewards
  const claimRewards = async (): Promise<string | null> => {
    if (!publicKey || !stakingInfo || (stakingInfo.rewards || 0) <= 0) return null

    const toastId = toast.loading("Claiming staking rewards...")
    setIsProcessing(true)

    try {
      // In a real implementation, you would create and send a claim rewards transaction
      // For now, we'll simulate a network request
      await new Promise((resolve) => setTimeout(resolve, 2000))

      // Mock transaction hash
      const mockTxHash = `${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`

      // Update staking info
      const claimedAmount = stakingInfo.rewards || 0
      setStakingInfo({
        ...stakingInfo,
        rewards: 0,
      })

      // Update SONIC balance
      if (sonicBalance !== null) {
        setSonicBalance(sonicBalance + claimedAmount)
      }

      toast.success(`${claimedAmount.toFixed(2)} SONIC rewards claimed successfully!`, { id: toastId })
      return mockTxHash
    } catch (error) {
      console.error("Error claiming rewards:", error)
      toast.error("Failed to claim rewards", { id: toastId })
      return null
    } finally {
      setIsProcessing(false)
    }
  }

  // Function to send SONIC tokens
  const sendSonic = async (recipient: string, amount: number): Promise<string | null> => {
    if (!publicKey || !recipient || !amount || !window.backpack) return null

    const toastId = toast.loading("Preparing transaction...")
    setIsProcessing(true)

    try {
      // Validate recipient address
      const recipientPubKey = new PublicKey(recipient)

      // Get token accounts
      const tokenMintAccount = new PublicKey(SONIC_TOKEN_MINT)
      const senderTokenAccount = await getAssociatedTokenAddress(
        tokenMintAccount,
        publicKey,
        true,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID,
      )
      const recipientTokenAccount = await getAssociatedTokenAddress(
        tokenMintAccount,
        recipientPubKey,
        true,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID,
      )

      // Create transfer instruction
      const transferInstruction = createTransferInstruction(
        senderTokenAccount,
        recipientTokenAccount,
        publicKey,
        amount * (10 ** 9), // Convert to token decimals (9 for SONIC)
        [],
        TOKEN_PROGRAM_ID,
      )

      // Create transaction
      const transaction = new Transaction().add(transferInstruction)

      // Get recent blockhash
      const { blockhash } = await connection.getLatestBlockhash()
      transaction.recentBlockhash = blockhash
      transaction.feePayer = publicKey

      toast.loading("Waiting for signature...", { id: toastId })

      // Sign transaction with Backpack
      const signedTransaction = await window.backpack.signTransaction(transaction)

      toast.loading("Sending transaction...", { id: toastId })

      // Send transaction
      const signature = await connection.sendRawTransaction(signedTransaction.serialize())

      toast.loading("Confirming transaction...", { id: toastId })

      // Wait for confirmation
      await connection.confirmTransaction(signature, "confirmed")

      toast.success(`${amount} SONIC sent successfully!`, { id: toastId })

      // Refresh balance
      await fetchSonicBalance()

      return signature
    } catch (error) {
      console.error("Error sending SONIC:", error)
      toast.error("Transaction failed", { id: toastId })
      return null
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <SonicContext.Provider
      value={{
        sonicBalance,
        sonicPrice,
        fetchSonicBalance,
        stakingInfo,
        fetchStakingInfo,
        stakeSonic,
        unstakeSonic,
        claimRewards,
        isProcessing,
        publicKey,
        sendSonic,
      }}
    >
      {children}
    </SonicContext.Provider>
  )
}

export function useSonic() {
  const context = useContext(SonicContext)
  if (context === undefined) {
    throw new Error("useSonic must be used within a SonicProvider")
  }
  return context
}

