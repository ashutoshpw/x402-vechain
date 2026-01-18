/**
 * Example: VeChain Wallet Integration with x402
 * Demonstrates how to use VeWorld, Connex, and auto-detection
 */

import {
  x402Fetch,
  ConnexWalletAdapter,
  VeWorldWalletAdapter,
  PrivateKeyWalletAdapter,
  autoDetectWallet,
  detectWallets,
} from '../src/index.js';

// Configuration
const FACILITATOR_URL = 'https://facilitator.example.com';
const API_URL = 'https://api.example.com';

/**
 * Example 1: Auto-detect and use any available wallet
 */
export async function autoDetectExample() {
  console.log('=== Auto-Detect Wallet Example ===\n');

  // Detect available wallets
  const availableWallets = detectWallets();
  console.log('Available wallets:', availableWallets);

  // Auto-detect and create wallet adapter
  const wallet = autoDetectWallet();
  
  if (!wallet) {
    console.log('No wallet detected. Please install VeWorld or VeChain Sync.');
    return;
  }

  // Check if connected
  const isConnected = await wallet.isConnected();
  console.log('Wallet connected:', isConnected);

  if (!isConnected && wallet.connect) {
    console.log('Connecting to wallet...');
    await wallet.connect();
  }

  // Get user address
  const address = await wallet.getAddress();
  console.log('User address:', address);

  // Make x402 request with automatic payment
  try {
    const response = await x402Fetch(`${API_URL}/premium/content`, {
      facilitatorUrl: FACILITATOR_URL,
      wallet, // Pass wallet adapter
      maxAmount: '1000000000000000000', // Max 1 VET
    });

    if (response.ok) {
      const data = await response.json();
      console.log('Premium content received:', data);
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

/**
 * Example 2: Explicit VeWorld integration
 */
export async function veWorldExample() {
  console.log('=== VeWorld Wallet Example ===\n');

  try {
    // Create VeWorld adapter
    const wallet = new VeWorldWalletAdapter();

    // Connect to wallet
    console.log('Connecting to VeWorld...');
    await wallet.connect();

    // Get address
    const address = await wallet.getAddress();
    console.log('Connected address:', address);

    // Make payment-protected request
    const response = await x402Fetch(`${API_URL}/premium/article`, {
      facilitatorUrl: FACILITATOR_URL,
      wallet,
      maxAmount: '500000000000000000', // Max 0.5 VET
    });

    if (response.ok) {
      const article = await response.json();
      console.log('Article:', article);
    }
  } catch (error) {
    console.error('VeWorld error:', error);
  }
}

/**
 * Example 3: Explicit Connex integration (VeChain Sync/Sync2)
 */
export async function connexExample() {
  console.log('=== Connex Wallet Example ===\n');

  try {
    // Connex is available at window.connex when using VeChain Sync
    // Or you can create it explicitly:
    // import Connex from '@vechain/connex';
    // const connex = new Connex({ node: '...', network: 'test' });

    const wallet = new ConnexWalletAdapter(); // Uses window.connex

    // Get address
    const address = await wallet.getAddress();
    console.log('Connex address:', address);

    // Make request
    const response = await x402Fetch(`${API_URL}/premium/video`, {
      facilitatorUrl: FACILITATOR_URL,
      wallet,
      maxAmount: '2000000000000000000', // Max 2 VET
    });

    if (response.ok) {
      const video = await response.json();
      console.log('Video:', video);
    }
  } catch (error) {
    console.error('Connex error:', error);
  }
}

/**
 * Example 4: Development mode with private key
 * WARNING: Only for development/testing! Never use in production with hardcoded keys!
 */
export async function devModeExample() {
  console.log('=== Development Mode Example ===\n');

  // Get private key from environment (NEVER hardcode!)
  const privateKey = process.env.USER_PRIVATE_KEY;
  
  if (!privateKey) {
    console.log('No private key found in USER_PRIVATE_KEY env variable');
    return;
  }

  // Create development wallet
  const wallet = new PrivateKeyWalletAdapter(privateKey);

  // Get address
  const address = await wallet.getAddress();
  console.log('Development address:', address);

  // Make request
  const response = await x402Fetch(`${API_URL}/test/endpoint`, {
    facilitatorUrl: FACILITATOR_URL,
    wallet,
  });

  if (response.ok) {
    const data = await response.json();
    console.log('Response:', data);
  }
}

/**
 * Example 5: Custom payment handler with wallet (for UI integration)
 */
export async function customHandlerExample() {
  console.log('=== Custom Payment Handler Example ===\n');

  const wallet = autoDetectWallet();
  
  if (!wallet) {
    console.log('No wallet detected');
    return;
  }

  const response = await x402Fetch(`${API_URL}/premium/content`, {
    facilitatorUrl: FACILITATOR_URL,
    onPaymentRequired: async (requirements) => {
      console.log('Payment required!');
      console.log('Merchant:', requirements.merchantId);
      console.log('Amount:', requirements.paymentOptions[0].amount);
      console.log('Asset:', requirements.paymentOptions[0].asset);

      // Show payment confirmation UI to user
      const userConfirmed = await showPaymentDialog(requirements);
      
      if (!userConfirmed) {
        throw new Error('Payment cancelled by user');
      }

      // Use wallet to create payment
      const { createPaymentPayloadWithWallet } = await import('../src/index.js');
      const option = requirements.paymentOptions[0];
      
      return await createPaymentPayloadWithWallet(
        {
          network: option.network,
          recipient: option.recipient,
          amount: option.amount,
          asset: option.asset,
        },
        wallet
      );
    },
  });

  if (response.ok) {
    console.log('Payment successful!');
  }
}

/**
 * Mock payment dialog (replace with actual UI)
 */
async function showPaymentDialog(requirements: any): Promise<boolean> {
  console.log('--- Payment Dialog ---');
  console.log('Merchant:', requirements.merchantId);
  console.log('Amount:', requirements.paymentOptions[0].amount, requirements.paymentOptions[0].asset);
  console.log('Recipient:', requirements.paymentOptions[0].recipient);
  console.log('--- Confirm payment? (simulating user approval) ---');
  
  // In real app, show actual UI and wait for user input
  return true; // Simulate approval
}

/**
 * Example 6: Handle multiple payment options
 */
export async function multipleOptionsExample() {
  console.log('=== Multiple Payment Options Example ===\n');

  const wallet = autoDetectWallet();
  
  if (!wallet) {
    console.log('No wallet detected');
    return;
  }

  const response = await x402Fetch(`${API_URL}/premium/content`, {
    facilitatorUrl: FACILITATOR_URL,
    onPaymentRequired: async (requirements) => {
      console.log('Payment options available:');
      requirements.paymentOptions.forEach((option, index) => {
        console.log(`  ${index + 1}. ${option.amount} ${option.asset}`);
      });

      // Let user choose (here we just pick the first one)
      const selectedOption = requirements.paymentOptions[0];
      console.log(`Selected: ${selectedOption.amount} ${selectedOption.asset}`);

      const { createPaymentPayloadWithWallet } = await import('../src/index.js');
      
      return await createPaymentPayloadWithWallet(
        {
          network: selectedOption.network,
          recipient: selectedOption.recipient,
          amount: selectedOption.amount,
          asset: selectedOption.asset,
        },
        wallet
      );
    },
  });

  if (response.ok) {
    console.log('Payment successful!');
  }
}

// Run examples (commented out - uncomment to run specific examples)
async function main() {
  console.log('x402-vechain Wallet Integration Examples\n');
  
  // Uncomment the examples you want to run:
  // await autoDetectExample();
  // await veWorldExample();
  // await connexExample();
  // await devModeExample();
  // await customHandlerExample();
  // await multipleOptionsExample();
}

// Uncomment to run
// main().catch(console.error);
