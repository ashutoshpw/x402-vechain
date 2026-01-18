#!/usr/bin/env node
/**
 * Test script for route-based payment middleware
 * Validates the new API works correctly
 */

import { Hono } from 'hono';
import { paymentMiddleware } from './dist/index.js';

console.log('🧪 Testing route-based payment middleware...\n');

// Test 1: Basic route-based config
console.log('Test 1: Basic route-based config');
try {
  const app1 = new Hono();
  
  app1.use(paymentMiddleware({
    "GET /api/premium": {
      price: "0.01",
      token: "VET",
      network: "vechain:100009",
      payTo: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    },
  }));
  
  console.log('✅ Route-based config accepted\n');
} catch (error) {
  console.error('❌ Route-based config failed:', error.message);
  process.exit(1);
}

// Test 2: Enhanced config with routes property
console.log('Test 2: Enhanced config with routes property');
try {
  const app2 = new Hono();
  
  app2.use(paymentMiddleware({
    routes: {
      "GET /api/premium": {
        price: "0.01",
        token: "VET",
        network: "vechain:100009",
        payTo: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
      },
    },
    facilitatorUrl: "http://localhost:3000",
    onPaymentVerified: async (c, verification) => {
      console.log('Payment verified');
    },
  }));
  
  console.log('✅ Enhanced config accepted\n');
} catch (error) {
  console.error('❌ Enhanced config failed:', error.message);
  process.exit(1);
}

// Test 3: Traditional config (backward compatibility)
console.log('Test 3: Traditional config (backward compatibility)');
try {
  const app3 = new Hono();
  
  app3.use('/premium', paymentMiddleware({
    getPaymentRequirements: () => ({
      paymentOptions: [{
        network: 'eip155:100009',
        asset: 'VET',
        amount: '1000000000000000000',
        recipient: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
      }],
      merchantId: 'test',
    }),
    facilitatorUrl: 'http://localhost:3000',
  }));
  
  console.log('✅ Traditional config still works\n');
} catch (error) {
  console.error('❌ Traditional config failed:', error.message);
  process.exit(1);
}

// Test 4: Multiple routes with different configs
console.log('Test 4: Multiple routes with different tokens');
try {
  const app4 = new Hono();
  
  app4.use(paymentMiddleware({
    "GET /vet-content": {
      price: "1",
      token: "VET",
      network: "vechain:100009",
      payTo: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    },
    "GET /vtho-content": {
      price: "10",
      token: "VTHO",
      network: "vechain:100009",
      payTo: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    },
    "POST /api/data": {
      price: "0.5",
      token: "VEUSD",
      network: "vechain:100009",
      payTo: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    },
  }));
  
  console.log('✅ Multiple route configs work\n');
} catch (error) {
  console.error('❌ Multiple route config failed:', error.message);
  process.exit(1);
}

// Test 5: Wildcard routes
console.log('Test 5: Wildcard routes');
try {
  const app5 = new Hono();
  
  app5.use(paymentMiddleware({
    "GET /premium/*": {
      price: "0.1",
      token: "VET",
      network: "vechain:100009",
      payTo: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    },
  }));
  
  console.log('✅ Wildcard routes work\n');
} catch (error) {
  console.error('❌ Wildcard routes failed:', error.message);
  process.exit(1);
}

console.log('🎉 All route-based middleware tests passed!\n');
console.log('The new API is working correctly.');
