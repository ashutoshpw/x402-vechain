#!/usr/bin/env node
/**
 * Integration test for route-based payment middleware
 * Tests actual request handling and 402 responses
 */

import { Hono } from 'hono';
import { paymentMiddleware } from './dist/index.js';

console.log('🧪 Integration test: Payment middleware request handling\n');

// Test app with route-based middleware
const app = new Hono();

// Public route - no payment required
app.get('/public', (c) => {
  return c.json({ message: 'Free content' });
});

// Apply payment middleware
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
}));

// Protected routes
app.get('/api/premium', (c) => {
  return c.json({ data: 'Premium content' });
});

app.post('/api/data', (c) => {
  return c.json({ success: true });
});

// Helper to simulate requests
async function testRequest(method, path, headers = {}) {
  const req = new Request(`http://localhost${path}`, {
    method,
    headers: new Headers(headers),
  });
  
  return await app.fetch(req);
}

// Run tests
(async () => {
  try {
    // Test 1: Public route should work without payment
    console.log('Test 1: Public route (no payment required)');
    const res1 = await testRequest('GET', '/public');
    if (res1.status === 200) {
      const data = await res1.json();
      console.log('✅ Public route works:', data.message);
    } else {
      throw new Error(`Expected 200, got ${res1.status}`);
    }
    
    // Test 2: Protected route should return 402 without payment
    console.log('\nTest 2: Protected route without payment (should return 402)');
    const res2 = await testRequest('GET', '/api/premium');
    if (res2.status === 402) {
      const paymentHeader = res2.headers.get('X-Payment-Required');
      if (paymentHeader) {
        const requirements = JSON.parse(paymentHeader);
        console.log('✅ Got 402 Payment Required');
        console.log('   Payment requirements:', {
          network: requirements.paymentOptions[0].network,
          asset: requirements.paymentOptions[0].asset,
          amount: requirements.paymentOptions[0].amount,
          recipient: requirements.paymentOptions[0].recipient,
          merchantId: requirements.merchantId,
        });
      } else {
        throw new Error('Missing X-Payment-Required header');
      }
    } else {
      throw new Error(`Expected 402, got ${res2.status}`);
    }
    
    // Test 3: Verify payment requirements are correct
    console.log('\nTest 3: Verify payment amount conversion');
    const res3 = await testRequest('GET', '/api/premium');
    const paymentHeader3 = res3.headers.get('X-Payment-Required');
    const requirements3 = JSON.parse(paymentHeader3);
    const expectedAmount = '10000000000000000'; // 0.01 VET in wei
    if (requirements3.paymentOptions[0].amount === expectedAmount) {
      console.log('✅ Price correctly converted to wei');
      console.log(`   0.01 VET = ${expectedAmount} wei`);
    } else {
      throw new Error(`Expected ${expectedAmount}, got ${requirements3.paymentOptions[0].amount}`);
    }
    
    // Test 4: Different route, different requirements
    console.log('\nTest 4: Different route with different token');
    const res4 = await testRequest('POST', '/api/data');
    if (res4.status === 402) {
      const paymentHeader4 = res4.headers.get('X-Payment-Required');
      const requirements4 = JSON.parse(paymentHeader4);
      if (requirements4.paymentOptions[0].asset === 'VEUSD' &&
          requirements4.paymentOptions[0].amount === '50000000000000000') { // 0.05 VEUSD
        console.log('✅ Different route has different payment requirements');
        console.log(`   Asset: ${requirements4.paymentOptions[0].asset}`);
        console.log(`   Amount: ${requirements4.paymentOptions[0].amount} wei (0.05 VEUSD)`);
      } else {
        throw new Error('Payment requirements do not match route config');
      }
    } else {
      throw new Error(`Expected 402, got ${res4.status}`);
    }
    
    // Test 5: Network ID normalization
    console.log('\nTest 5: Network ID normalization');
    const res5 = await testRequest('GET', '/api/premium');
    const paymentHeader5 = res5.headers.get('X-Payment-Required');
    const requirements5 = JSON.parse(paymentHeader5);
    const network = requirements5.paymentOptions[0].network;
    if (network === 'eip155:100009') {
      console.log('✅ Network ID normalized from vechain:100009 to eip155:100009');
    } else {
      throw new Error(`Expected eip155:100009, got ${network}`);
    }
    
    // Test 6: Non-matching route should pass through
    console.log('\nTest 6: Non-matching route (should 404, not 402)');
    const res6 = await testRequest('GET', '/not-protected');
    if (res6.status === 404) {
      console.log('✅ Non-matching route passes through middleware');
    } else if (res6.status === 402) {
      throw new Error('Non-protected route incorrectly requires payment');
    }
    
    console.log('\n🎉 All integration tests passed!');
    console.log('\nThe route-based payment middleware is working correctly:');
    console.log('- Routes are matched properly');
    console.log('- 402 responses include payment requirements');
    console.log('- Price conversion to wei works');
    console.log('- Network ID normalization works');
    console.log('- Non-matching routes pass through');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
})();
