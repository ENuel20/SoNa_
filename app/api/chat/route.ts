import OpenAI from "openai"
import { PublicKey } from "@solana/web3.js"

// Allow responses up to 30 seconds
export const maxDuration = 30

// Initialize OpenAI with error handling
const openai = process.env.OPENAI_API_KEY 
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null

// Function to parse send command
function parseSendCommand(message: string): { token: string; amount: number; recipient: string } | null {
  // Match patterns like "send 5 SOL to address" or "send 10 SONIC to address"
  const regex = /send\s+(\d+\.?\d*)\s+(SOL|SONIC)\s+to\s+([A-Za-z0-9]+)/i
  const match = message.match(regex)
  
  if (!match) return null
  
  const [_, amount, token, recipient] = match
  return {
    token: token.toUpperCase(),
    amount: parseFloat(amount),
    recipient
  }
}

// Function to format system message
function formatSystemMessage(walletInfo: any): string {
  const walletStatus = walletInfo
    ? `The user has connected their Backpack wallet with the following information:
- SOL Balance: ${typeof walletInfo.solBalance === 'number' ? walletInfo.solBalance.toFixed(4) + ' SOL' : 'Not available'}
- SOL Price: ${typeof walletInfo.solPrice === 'number' ? '$' + walletInfo.solPrice.toFixed(4) + ' USD' : 'Not available'}
- SONIC Balance: ${typeof walletInfo.sonicBalance === 'number' ? walletInfo.sonicBalance.toFixed(4) + ' SONIC' : 'Not available'}
- SONIC Price: ${typeof walletInfo.sonicPrice === 'number' ? '$' + walletInfo.sonicPrice.toFixed(4) + ' USD' : 'Not available'}`
    : "The user has not connected their Backpack wallet yet."

  return `You are Sona, an educational AI assistant for DeFi enthusiasts using a crypto wallet application. 

${walletStatus}

You are an expert in DeFi, staking, Solana, SOL, SONIC, and related topics. Provide educational, accurate, and helpful information about:

1. Solana blockchain and its ecosystem
2. DeFi concepts and protocols on Solana
3. Staking mechanisms and rewards on Solana
4. SOL and SONIC token information and market trends
5. Sonic SVM (Sonic Virtual Machine) - a gaming-focused layer on Solana with its own SONIC token
6. Best practices for crypto security and management

About Sonic SVM:
- Sonic SVM is a gaming-focused layer built on Solana
- The SONIC token (mint address: 7rh23QToLTBmYxR5jDiRbUtqcGey4xjDeU9JmtX6QChe) is used for governance and utility within the Sonic ecosystem
- Users can stake SONIC tokens to earn rewards
- The Sonic testnet endpoint is https://api.testnet.v1.sonic.game

Only provide wallet balance or price information when specifically requested by the user.

For sending tokens:
1. Users can send SOL or SONIC tokens by typing a message in this format:
   - "send [amount] SOL to [address]" for SOL
   - "send [amount] SONIC to [address]" for SONIC
2. When a user requests to send tokens:
   - Validate that they have sufficient balance
   - Confirm the transaction details
   - Provide clear feedback about the transaction status

Be concise, educational, and accurate. If you don't know something, admit it rather than providing incorrect information.`
}

export async function POST(req: Request) {
  try {
    // Log request attempt
    console.log('Chat request received')

    // Check if OpenAI is properly initialized
    if (!openai || !process.env.OPENAI_API_KEY) {
      console.error('OpenAI API key missing')
      return new Response(
        JSON.stringify({ 
          error: 'OpenAI API key not configured',
          details: 'Please set the OPENAI_API_KEY environment variable'
        }), 
        { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    // Parse request body
    let body
    try {
      body = await req.json()
    } catch (error) {
      console.error('Failed to parse request body:', error)
      return new Response(
        JSON.stringify({ 
          error: 'Invalid request body',
          details: 'Failed to parse JSON'
        }), 
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    const { messages, walletInfo } = body

    // Log request data (excluding sensitive info)
    console.log('Request data:', {
      messageCount: messages?.length,
      hasWalletInfo: !!walletInfo
    })
    
    // Validate request body
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      console.error('Invalid messages array')
      return new Response(
        JSON.stringify({ 
          error: 'Invalid request',
          details: 'Messages array is required and must not be empty'
        }), 
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    const lastMessage = messages[messages.length - 1]

    // Check if the last message is a send command
    if (lastMessage.role === "user") {
      const sendCommand = parseSendCommand(lastMessage.content)
      
      if (sendCommand) {
        const { token, amount, recipient } = sendCommand

        // Validate recipient address
        try {
          new PublicKey(recipient)
        } catch (error) {
          return Response.json({
            content: "Invalid recipient address. Please provide a valid Solana address.",
            role: "assistant"
          })
        }

        // Validate amount and balance
        if (token === "SOL") {
          if (!walletInfo?.solBalance || amount > walletInfo.solBalance) {
            return Response.json({
              content: `Insufficient SOL balance. You have ${walletInfo?.solBalance?.toFixed(4) || 0} SOL available.`,
              role: "assistant"
            })
          }
        } else if (token === "SONIC") {
          if (!walletInfo?.sonicBalance || amount > walletInfo.sonicBalance) {
            return Response.json({
              content: `Insufficient SONIC balance. You have ${walletInfo?.sonicBalance?.toFixed(4) || 0} SONIC available.`,
              role: "assistant"
            })
          }
        }

        // Return confirmation message
        return Response.json({
          content: `I'll help you send ${amount} ${token} to ${recipient}. Please confirm the transaction in your wallet.`,
          role: "assistant",
          action: {
            type: "send_token",
            token,
            amount,
            recipient
          }
        })
      }
    }

    // Create system message with wallet info
    const systemMessage = {
      role: "system",
      content: formatSystemMessage(walletInfo)
    }

    try {
      console.log('Sending request to OpenAI')
      // Create the prompt with the system message
      const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [systemMessage, ...messages],
        temperature: 0.7,
        max_tokens: 1000,
      })

      console.log('Received response from OpenAI')
      // Return a regular JSON response
      return Response.json({ 
        content: response.choices[0].message.content,
        role: 'assistant'
      })
    } catch (error) {
      console.error('OpenAI API error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      return new Response(
        JSON.stringify({ 
          error: 'OpenAI API error',
          details: errorMessage
        }), 
        { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }
  } catch (error) {
    console.error('Error in chat route:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ 
        error: 'Failed to process chat request',
        details: errorMessage
      }), 
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
}

