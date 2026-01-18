/**
 * Example: Client-side usage of x402-vechain SDK
 * Demonstrates browser wallet integration and payment handling
 */

import { x402Fetch, createPaymentPayload, getSupported } from '../src/index.js';

// Configuration
const FACILITATOR_URL = 'https://facilitator.example.com';
const API_URL = 'https://api.example.com';

/**
 * Example 1: Check supported networks and assets
 */
async function checkSupported() {
  try {
    const supported = await getSupported(FACILITATOR_URL);
    console.log('Supported networks:', supported.networks);
    console.log('Supported schemes:', supported.schemes);
  } catch (error) {
    console.error('Failed to fetch supported networks:', error);
  }
}

/**
 * Example 2: Make a payment-protected request
 */
async function fetchPremiumContent() {
  try {
    const response = await x402Fetch(`${API_URL}/premium/content`, {
      facilitatorUrl: FACILITATOR_URL,
      onPaymentRequired: async (requirements) => {
        console.log('Payment required!');
        console.log('Payment options:', requirements.paymentOptions);
        
        // In a real app, you would:
        // 1. Show payment UI to user
        // 2. Get user confirmation
        // 3. Access wallet (VeChain Sync, VeWorld, etc.)
        // 4. Sign payment payload
        
        // For this example, we'll simulate using a private key
        // IMPORTANT: Never hardcode private keys in production!
        const userPrivateKey = process.env.USER_PRIVATE_KEY || '';
        
        const option = requirements.paymentOptions[0];
        
        return await createPaymentPayload(
          {
            network: option.network,
            recipient: option.recipient,
            amount: option.amount,
            asset: option.asset,
            validityDuration: 600, // 10 minutes
          },
          userPrivateKey
        );
      },
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('Premium content:', data);
    } else {
      console.error('Request failed:', response.status, response.statusText);
    }
  } catch (error) {
    console.error('Error fetching premium content:', error);
  }
}

/**
 * Example 3: Create payment payload manually
 */
async function createManualPayment() {
  const privateKey = process.env.USER_PRIVATE_KEY || '';
  
  const payload = await createPaymentPayload(
    {
      network: 'eip155:100009', // VeChain testnet
      recipient: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
      amount: '1000000000000000000', // 1 VET in wei
      asset: 'VET',
      validityDuration: 300, // 5 minutes
    },
    privateKey
  );
  
  console.log('Payment payload created:');
  console.log('Signature:', payload.signature);
  console.log('Payload:', payload.payload);
  
  // Encode for transmission
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64');
  console.log('Base64 encoded:', encoded);
}

/**
 * Example 4: Integrating with VeChain wallet (conceptual)
 */
async function walletIntegration() {
  // This is a conceptual example showing how to integrate with VeChain wallets
  // Actual implementation would depend on the wallet provider
  
  // 1. Connect to wallet
  // const connex = await getConnex(); // VeChain Sync
  // or
  // const wallet = await connectVeWorld(); // VeWorld
  
  // 2. Get user's address
  // const address = await wallet.getAddress();
  
  // 3. When payment is required, request signature
  // const payload = { /* payment data */ };
  // const signature = await wallet.signMessage(JSON.stringify(payload));
  
  console.log('See documentation for wallet integration details');
}

// Run examples
async function main() {
  console.log('=== x402-vechain Client Examples ===\n');
  
  console.log('Example 1: Check supported networks');
  await checkSupported();
  
  console.log('\nExample 2: Fetch premium content (requires payment)');
  // await fetchPremiumContent(); // Uncomment to run
  
  console.log('\nExample 3: Create manual payment');
  // await createManualPayment(); // Uncomment to run
  
  console.log('\nExample 4: Wallet integration (conceptual)');
  await walletIntegration();
}

// Uncomment to run
// main().catch(console.error);

export { checkSupported, fetchPremiumContent, createManualPayment, walletIntegration };
