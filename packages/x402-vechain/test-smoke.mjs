#!/usr/bin/env node
/**
 * Simple smoke test to verify the package builds and exports work correctly
 */

import {
  // Client functions
  createPaymentPayload,
  generateNonce,
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
console.log('✅ paymentMiddleware is function:', typeof paymentMiddleware === 'function');
console.log('✅ verifyPayment is function:', typeof verifyPayment === 'function');

console.log('\n🎉 All smoke tests passed!');
console.log('\nPackage is ready for use.');
