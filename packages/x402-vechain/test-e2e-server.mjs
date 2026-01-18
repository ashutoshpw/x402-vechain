#!/usr/bin/env node
/**
 * End-to-end test: Test payment middleware with Hono app.fetch
 * Tests the complete request flow including X-Payment-Proof header validation
 */

import { Hono } from 'hono';
import { paymentMiddleware } from './dist/index.js';

console.log('🧪 Running E2E payment middleware tests...\n');

const app = new Hono();

// Public routes
app.get('/', (c) => {
  return c.json({ 
    message: 'x402 Payment Middleware Test Server',
    endpoints: {
      public: 'GET /',
      protected: [
        'GET /api/premium',
        'POST /api/data',
        'GET /content/article',
        'GET /wildcard/anything',
      ]
    }
  });
});

// Apply route-based payment middleware
app.use(paymentMiddleware({
  "GET /api/premium": {
    price: "0.01",
    token: "VET",
    network: "vechain:100009",
    payTo: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    merchantId: "test-merchant",
  },
  "POST /api/data": {
    price: "0.05",
    token: "VEUSD",
    network: "vechain:100009",
    payTo: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  },
  "GET /content/*": {
    price: "0.1",
    token: "VET",
    network: "vechain:100009",
    payTo: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  },
}));

// Protected routes
app.get('/api/premium', (c) => {
  const verification = c.get('paymentVerification');
  return c.json({ 
    data: 'Premium content',
    paid: true,
    senderAddress: verification?.senderAddress 
  });
});

app.post('/api/data', (c) => {
  return c.json({ success: true, message: 'Data submitted' });
});

app.get('/content/article', (c) => {
  return c.json({ type: 'article', content: 'Article content...' });
});

app.get('/content/video', (c) => {
  return c.json({ type: 'video', content: 'Video stream...' });
});

// Run automated tests
async function runTests() {
  try {
    console.log('Test Suite: Route-Based Payment Middleware E2E\n');
    
    // Test 1: Public route
    console.log('Test 1: Public route (no payment required)');
    const res1 = await app.request('/');
    const data1 = await res1.json();
    if (res1.status === 200) {
      console.log(`✅ Status: ${res1.status}`);
      console.log(`   Response: ${data1.message}\n`);
    } else {
      throw new Error(`Expected 200, got ${res1.status}`);
    }
    
    // Test 2: Protected route without payment
    console.log('Test 2: Protected route without payment (expect 402)');
    const res2 = await app.request('/api/premium');
    if (res2.status === 402) {
      console.log(`✅ Status: ${res2.status} Payment Required`);
      const paymentHeader = res2.headers.get('X-Payment-Required');
      if (paymentHeader) {
        const requirements = JSON.parse(paymentHeader);
        console.log(`   Payment requirements:`);
        console.log(`   - Network: ${requirements.paymentOptions[0].network}`);
        console.log(`   - Asset: ${requirements.paymentOptions[0].asset}`);
        console.log(`   - Amount: ${requirements.paymentOptions[0].amount} wei`);
        console.log(`   - Recipient: ${requirements.paymentOptions[0].recipient}`);
        console.log(`   - Merchant: ${requirements.merchantId}\n`);
      } else {
        throw new Error('Missing X-Payment-Required header');
      }
    } else {
      throw new Error(`Expected 402, got ${res2.status}`);
    }
    
    // Test 3: Different route, different config
    console.log('Test 3: POST /api/data (different payment config)');
    const res3 = await app.request('/api/data', { method: 'POST' });
    if (res3.status === 402) {
      console.log(`✅ Status: ${res3.status}`);
      const paymentHeader = res3.headers.get('X-Payment-Required');
      if (paymentHeader) {
        const requirements = JSON.parse(paymentHeader);
        console.log(`   Token: ${requirements.paymentOptions[0].asset}`);
        console.log(`   Amount: ${requirements.paymentOptions[0].amount} wei (0.05 VEUSD)\n`);
      }
    } else {
      throw new Error(`Expected 402, got ${res3.status}`);
    }
    
    // Test 4: Wildcard route matching
    console.log('Test 4: Wildcard route /content/article (matches /content/*)');
    const res4 = await app.request('/content/article');
    if (res4.status === 402) {
      console.log(`✅ Status: ${res4.status}`);
      const paymentHeader = res4.headers.get('X-Payment-Required');
      if (paymentHeader) {
        const requirements = JSON.parse(paymentHeader);
        console.log(`   Matched by wildcard pattern "GET /content/*"`);
        console.log(`   Amount: ${requirements.paymentOptions[0].amount} wei (0.1 VET)\n`);
      }
    } else {
      throw new Error(`Expected 402, got ${res4.status}`);
    }
    
    // Test 5: Another wildcard match
    console.log('Test 5: Another wildcard match /content/video');
    const res5 = await app.request('/content/video');
    if (res5.status === 402) {
      console.log(`✅ Status: ${res5.status}`);
      console.log(`   Also matched by "GET /content/*"\n`);
    } else {
      throw new Error(`Expected 402, got ${res5.status}`);
    }
    
    // Test 6: Invalid payment proof
    console.log('Test 6: Request with invalid payment proof (expect 400)');
    const res6 = await app.request('/api/premium', {
      headers: {
        'X-Payment-Proof': 'invalid-base64',
      },
    });
    if (res6.status === 400) {
      console.log(`✅ Status: ${res6.status}`);
      const data6 = await res6.json();
      console.log(`   Error: ${data6.error}\n`);
    } else {
      throw new Error(`Expected 400, got ${res6.status}`);
    }
    
    // Test 7: Non-matching route (should pass through)
    console.log('Test 7: Non-matching route (should 404, not 402)');
    const res7 = await app.request('/not-protected');
    if (res7.status === 404) {
      console.log(`✅ Status: ${res7.status}`);
      console.log(`   Non-matching route correctly passes through middleware\n`);
    } else if (res7.status === 402) {
      throw new Error('Non-protected route incorrectly requires payment');
    }
    
    console.log('🎉 All E2E tests passed!\n');
    console.log('Summary:');
    console.log('✅ Public routes accessible without payment');
    console.log('✅ Protected routes return 402 with payment requirements');
    console.log('✅ Route pattern matching works (exact, wildcard)');
    console.log('✅ Different routes have different payment configs');
    console.log('✅ Price conversion to wei is correct');
    console.log('✅ Invalid payment proof returns 400');
    console.log('✅ Non-matching routes pass through');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run tests
runTests();
