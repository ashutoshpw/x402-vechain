/**
 * Minimal x402 Server Example
 * 
 * A simple Hono server with x402 payment-protected endpoints.
 * Demonstrates the easiest way to add payment requirements to API routes.
 */

import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { paymentMiddleware } from '@x402/vechain';

// Configuration - update these with your values
const FACILITATOR_URL = process.env.FACILITATOR_URL || 'http://localhost:3000';
const MERCHANT_ADDRESS = process.env.MERCHANT_ADDRESS || '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb';
const PORT = parseInt(process.env.PORT || '3001', 10);

const app = new Hono();

// Public endpoint - no payment required
app.get('/', (c) => {
  return c.json({
    message: 'Minimal x402 Server',
    endpoints: {
      '/': 'This endpoint (free)',
      '/public/hello': 'Free greeting (free)',
      '/premium/data': 'Premium data endpoint (requires 0.01 VET)',
      '/premium/content': 'Premium content endpoint (requires 0.05 VEUSD)',
    },
  });
});

// Another free endpoint
app.get('/public/hello', (c) => {
  return c.json({ message: 'Hello! This is free content.' });
});

// Apply payment middleware with route-based configuration
app.use(paymentMiddleware({
  // Premium data endpoint - costs 0.01 VET
  "GET /premium/data": {
    price: "0.01",
    token: "VET",
    network: "vechain:100009",  // VeChain testnet
    payTo: MERCHANT_ADDRESS,
    facilitatorUrl: FACILITATOR_URL,
  },
  // Premium content endpoint - costs 0.05 VEUSD
  "GET /premium/content": {
    price: "0.05",
    token: "VEUSD",
    network: "vechain:100009",
    payTo: MERCHANT_ADDRESS,
    facilitatorUrl: FACILITATOR_URL,
  },
}));

// Protected endpoint - requires payment of 0.01 VET
app.get('/premium/data', (c) => {
  // Payment verification is automatically handled by middleware
  const verification = c.get('paymentVerification') as any;
  
  return c.json({
    message: 'Here is your premium data!',
    data: {
      secret: 'The answer is 42',
      timestamp: new Date().toISOString(),
      paidBy: verification?.senderAddress,
    },
  });
});

// Protected endpoint - requires payment of 0.05 VEUSD
app.get('/premium/content', (c) => {
  const verification = c.get('paymentVerification') as any;
  
  return c.json({
    message: 'Premium content delivered!',
    content: {
      title: 'Exclusive Article',
      body: 'This is premium content that requires payment to access.',
      author: 'x402 Team',
      paidBy: verification?.senderAddress,
    },
  });
});

// Start server
serve({
  fetch: app.fetch,
  port: PORT,
}, (info) => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║           Minimal x402 Server Running                     ║
╚═══════════════════════════════════════════════════════════╝

Server: http://localhost:${info.port}

Endpoints:
  • GET /                    - Server info (free)
  • GET /public/hello        - Greeting (free)
  • GET /premium/data        - Premium data (0.01 VET)
  • GET /premium/content     - Premium content (0.05 VEUSD)

Configuration:
  • Facilitator: ${FACILITATOR_URL}
  • Merchant Address: ${MERCHANT_ADDRESS}

Try it:
  curl http://localhost:${info.port}/premium/data
  (You'll get a 402 Payment Required response)
  `);
});
