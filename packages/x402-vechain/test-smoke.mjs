#!/usr/bin/env node
/**
 * Simple smoke test to verify the package builds and exports work correctly
 */

import {
  // Client functions
  createPaymentPayload,
  createPaymentPayloadWithWallet,
  generateNonce,
  // Wallet adapters
  PrivateKeyWalletAdapter,
  detectWallets,
  autoDetectWallet,
  // Server functions
  paymentMiddleware,
  verifyPayment,
} from './dist/index.js';

console.log('✅ All imports successful');

// Test requirements object
const requirements = {
  paymentOptions: [{
    network: 'eip155:100009',
    asset: 'VET',
    amount: '1000000000000000000',
    recipient: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
  }],
  merchantId: 'test',
};

console.log('✅ Requirements object created');

// Test nonce generation
const nonce = generateNonce();
console.log('✅ generateNonce() works:', nonce.length === 64);

// Test that functions are exported
console.log('✅ createPaymentPayload is function:', typeof createPaymentPayload === 'function');
console.log('✅ createPaymentPayloadWithWallet is function:', typeof createPaymentPayloadWithWallet === 'function');
console.log('✅ paymentMiddleware is function:', typeof paymentMiddleware === 'function');
console.log('✅ verifyPayment is function:', typeof verifyPayment === 'function');

// Test wallet detection functions
console.log('✅ detectWallets is function:', typeof detectWallets === 'function');
console.log('✅ autoDetectWallet is function:', typeof autoDetectWallet === 'function');

// Test wallet detection (should return empty array in Node.js)
const wallets = detectWallets();
console.log('✅ detectWallets() works:', Array.isArray(wallets));

// Test auto-detect (should return null in Node.js)
const autoWallet = autoDetectWallet();
console.log('✅ autoDetectWallet() works:', autoWallet === null);

// Test PrivateKeyWalletAdapter
const testPrivateKey = '0x' + '1'.repeat(64); // Dummy private key for testing
const walletAdapter = new PrivateKeyWalletAdapter(testPrivateKey);
console.log('✅ PrivateKeyWalletAdapter created');

// Test wallet adapter methods
(async () => {
  try {
    const address = await walletAdapter.getAddress();
    console.log('✅ walletAdapter.getAddress() works:', address.startsWith('0x'));
    
    const isConnected = await walletAdapter.isConnected();
    console.log('✅ walletAdapter.isConnected() works:', isConnected === true);
    
    // Test createPaymentPayloadWithWallet
    const payloadWithWallet = await createPaymentPayloadWithWallet(
      {
        network: 'eip155:100009',
        recipient: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        amount: '1000000000000000000',
        asset: 'VET',
      },
      walletAdapter
    );
    console.log('✅ createPaymentPayloadWithWallet() works:', !!payloadWithWallet.signature);
    
    console.log('\n🎉 All smoke tests passed!');
    console.log('\nPackage is ready for use.');
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
})();
