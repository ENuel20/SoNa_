import { createSolanaConnection, subscribeToSlotUpdates, subscribeToAccountChanges, unsubscribe } from './solanaConnection';

/**
 * Example showing how to use Helius Sonic RPC with WebSocket connection
 */
async function heliusSonicDemo() {
  try {
    // Create connection with WebSocket support
    const connection = createSolanaConnection("confirmed");
    
    // Example 1: Get current slot (HTTP RPC call)
    const slot = await connection.getSlot();
    console.log("Current slot on Sonic:", slot);
    
    // Example 2: Subscribe to slot updates (WebSocket)
    console.log("Subscribing to slot updates...");
    const slotSubscriptionId = await subscribeToSlotUpdates(connection);
    console.log(`Slot subscription ID: ${slotSubscriptionId}`);
    
    // Example 3: Subscribe to a token account changes (WebSocket)
    // Replace with an actual account you want to monitor
    const tokenAccount = process.env.NEXT_PUBLIC_SONIC_TOKEN_MINT || 
                        "7rh23QToLTBmYxR5jDiRbUtqcGey4xjDeU9JmtX6QChe";
    
    console.log(`Subscribing to account changes for: ${tokenAccount}`);
    const accountSubscriptionId = await subscribeToAccountChanges(connection, tokenAccount);
    console.log(`Account subscription ID: ${accountSubscriptionId}`);
    
    // Allow subscriptions to run for a while
    console.log("WebSocket subscriptions are active. Press Ctrl+C to stop.");
    
    // Setup cleanup on process termination
    if (typeof process !== 'undefined' && process.on) {
      process.on('SIGINT', async () => {
        console.log('Cleaning up subscriptions...');
        
        // Unsubscribe from all active subscriptions
        await unsubscribe(connection, slotSubscriptionId);
        await unsubscribe(connection, accountSubscriptionId);
        
        console.log('Exiting...');
        process.exit(0);
      });
    }
    
  } catch (error) {
    console.error("Error in Helius Sonic demo:", error);
  }
}

// Run the demo if this file is executed directly
if (typeof require !== 'undefined' && typeof module !== 'undefined' && require.main === module) {
  heliusSonicDemo();
}

export default heliusSonicDemo;
