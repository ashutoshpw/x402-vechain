---
title: Server SDK
description: Complete guide to implementing payment verification with the x402.vet server SDK
---

The x402.vet server SDK provides middleware and utilities for protecting your API routes with VeChain payments. Built for Hono framework with TypeScript support.

## Installation

```bash
npm install @x402/vechain hono
# or
pnpm add @x402/vechain hono
```

## Quick Start

```typescript
import { Hono } from 'hono';
import { paymentMiddleware } from '@x402/vechain';

const app = new Hono();

// Simple route-based configuration
app.use(paymentMiddleware({
  "GET /api/premium": {
    price: "0.01",      // 0.01 VET
    token: "VET",
    network: "vechain:100009",  // VeChain testnet
    payTo: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    facilitatorUrl: "https://facilitator.example.com"
  }
}));

app.get('/api/premium', (c) => {
  return c.json({ data: 'Premium content' });
});

export default app;
```

## Payment Middleware

The `paymentMiddleware` function is the core of the server SDK. It intercepts requests, checks for payment, and only allows access if payment is valid.

### Route-Based Configuration (Recommended)

The simplest way to configure payments - just specify price and token for each route:

```typescript
app.use(paymentMiddleware({
  "GET /api/premium": {
    price: "0.01",      // Decimal price (0.01 VET)
    token: "VET",       // Token symbol
    network: "vechain:100009",
    payTo: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    facilitatorUrl: "https://facilitator.example.com"
  },
  "POST /api/data": {
    price: "0.05",      // Different price for different route
    token: "VEUSD",     // Different token
    network: "vechain:100009",
    payTo: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    facilitatorUrl: "https://facilitator.example.com"
  }
}));
```

#### Route Pattern Matching

Patterns support various matching styles:

```typescript
app.use(paymentMiddleware({
  // Exact method + path
  "GET /api/premium": { price: "0.01", token: "VET", ... },
  
  // Any method for path
  "/api/premium": { price: "0.01", token: "VET", ... },
  
  // Wildcard paths
  "GET /api/*": { price: "0.01", token: "VET", ... },
  
  // Path parameters
  "GET /api/:id": { price: "0.01", token: "VET", ... },
  
  // Nested wildcards
  "POST /api/*/data": { price: "0.05", token: "VET", ... }
}));
```

#### Route Configuration Options

```typescript
interface RoutePaymentConfig {
  // Required
  price: string;              // Decimal price (e.g., "0.01")
  token: string;              // "VET", "VTHO", "VEUSD", "B3TR", or address
  network: string;            // "vechain:100009" or "eip155:100009"
  payTo: string;              // Your wallet address
  
  // Optional
  merchantId?: string;        // Your service identifier
  merchantUrl?: string;       // Your website URL
  facilitatorUrl?: string;    // Override default facilitator
}
```

### Traditional Configuration (Advanced)

For dynamic pricing or complex requirements:

```typescript
app.use('/api/premium', paymentMiddleware({
  facilitatorUrl: 'https://facilitator.example.com',
  
  getPaymentRequirements: (c) => {
    // Dynamic pricing based on request
    const userId = c.req.query('user');
    const price = getPriceForUser(userId);
    
    return {
      paymentOptions: [{
        network: 'eip155:100009',
        asset: 'VET',
        amount: price.toString(),  // Wei format
        recipient: process.env.MERCHANT_ADDRESS!,
      }],
      merchantId: 'my-service',
      merchantUrl: 'https://myservice.com',
    };
  },
  
  onPaymentVerified: async (c, verification) => {
    // Store payment in database
    await db.payments.insert({
      sender: verification.senderAddress,
      amount: verification.amount,
      timestamp: new Date(),
    });
  },
}));
```

### Hybrid Configuration

Combine both approaches - route-based with callbacks:

```typescript
app.use(paymentMiddleware({
  // Routes configuration
  routes: {
    "GET /api/premium": { price: "0.01", token: "VET", ... },
    "POST /api/data": { price: "0.05", token: "VEUSD", ... }
  },
  
  // Default facilitator for all routes
  facilitatorUrl: "https://facilitator.example.com",
  
  // Callback for all successful payments
  onPaymentVerified: async (c, verification) => {
    console.log(`Payment from ${verification.senderAddress}`);
    await logPayment(verification);
  }
}));
```

## Payment Flow

### 1. First Request (No Payment)

When a client first requests a protected route without payment:

```http
GET /api/premium HTTP/1.1
Host: api.example.com
```

Server responds with:

```http
HTTP/1.1 402 Payment Required
X-Payment-Required: {"paymentOptions":[{"network":"eip155:100009",...}],...}
Content-Type: application/json

{
  "error": "Payment required",
  "paymentRequirements": {
    "paymentOptions": [{
      "network": "eip155:100009",
      "asset": "VET",
      "amount": "10000000000000000",
      "recipient": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
    }],
    "merchantId": "my-service"
  }
}
```

### 2. Second Request (With Payment)

Client creates payment and retries with proof:

```http
GET /api/premium HTTP/1.1
Host: api.example.com
X-Payment-Proof: eyJzaWduYXR1cmUiOiIweDEyMy...
```

Server verifies payment and responds with content:

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "data": "Premium content"
}
```

## Payment Verification

### Automatic Verification (via Facilitator)

When `facilitatorUrl` is provided, payment verification is delegated:

```typescript
app.use('/api/*', paymentMiddleware({
  facilitatorUrl: 'https://facilitator.example.com',
  getPaymentRequirements: (c) => ({
    paymentOptions: [{
      network: 'eip155:100009',
      asset: 'VET',
      amount: '1000000000000000000',
      recipient: process.env.MERCHANT_ADDRESS!,
    }],
    merchantId: 'my-service',
  }),
}));
```

The middleware:
1. Sends payment payload to `POST /verify` on facilitator
2. Checks if `isValid: true` in response
3. Allows request if valid, returns 403 if invalid

### Custom Verification

Implement your own verification logic:

```typescript
import { verifyPayment } from '@x402/vechain';

app.use('/api/*', paymentMiddleware({
  getPaymentRequirements: (c) => ({ /* ... */ }),
  
  verifyPayment: async (payload, requirements) => {
    // Custom verification logic
    const option = requirements.paymentOptions[0];
    
    // Check signature
    const isValidSignature = await checkSignature(payload);
    if (!isValidSignature) {
      return {
        isValid: false,
        invalidReason: 'Invalid signature',
      };
    }
    
    // Check amount
    if (BigInt(payload.payload.amount) < BigInt(option.amount)) {
      return {
        isValid: false,
        invalidReason: 'Insufficient amount',
      };
    }
    
    // Check nonce hasn't been used
    const nonceUsed = await db.nonces.exists(payload.payload.nonce);
    if (nonceUsed) {
      return {
        isValid: false,
        invalidReason: 'Nonce already used (replay attack)',
      };
    }
    
    // Mark nonce as used
    await db.nonces.insert(payload.payload.nonce);
    
    return {
      isValid: true,
      senderAddress: recoverAddress(payload),
    };
  },
}));
```

## Accessing Payment Data

### In Route Handlers

Payment verification data is stored in the Hono context:

```typescript
app.get('/api/premium', (c) => {
  // Access payment verification
  const verification = c.get('paymentVerification');
  
  return c.json({
    content: 'Premium content',
    paidBy: verification.senderAddress,
    amount: verification.amount,
  });
});
```

### In Callbacks

Use the `onPaymentVerified` callback:

```typescript
app.use('/api/*', paymentMiddleware({
  facilitatorUrl: 'https://facilitator.example.com',
  getPaymentRequirements: (c) => ({ /* ... */ }),
  
  onPaymentVerified: async (c, verification) => {
    // Log to database
    await db.payments.insert({
      route: c.req.path,
      sender: verification.senderAddress,
      amount: verification.amount,
      timestamp: new Date(),
    });
    
    // Update user credits
    const userId = c.req.query('user');
    if (userId) {
      await db.users.addCredit(userId, 1);
    }
  },
}));
```

## Dynamic Pricing

### Based on Request Parameters

```typescript
app.use(paymentMiddleware({
  routes: {
    "GET /api/content/:id": async (c) => {
      const contentId = c.req.param('id');
      const content = await db.content.find(contentId);
      
      return {
        price: content.price.toString(),
        token: "VET",
        network: "vechain:100009",
        payTo: process.env.MERCHANT_ADDRESS!,
      };
    }
  }
}));
```

### Based on User Tier

```typescript
function getPaymentRequirements(c) {
  const userTier = c.req.header('X-User-Tier') || 'free';
  
  const pricing = {
    free: '1000000000000000000',    // 1 VET
    basic: '500000000000000000',    // 0.5 VET
    premium: '100000000000000000',  // 0.1 VET
  };
  
  return {
    paymentOptions: [{
      network: 'eip155:100009',
      asset: 'VET',
      amount: pricing[userTier],
      recipient: process.env.MERCHANT_ADDRESS!,
    }],
    merchantId: 'my-service',
  };
}

app.use('/api/*', paymentMiddleware({
  facilitatorUrl: 'https://facilitator.example.com',
  getPaymentRequirements,
}));
```

### Time-Based Pricing

```typescript
function getPaymentRequirements(c) {
  const hour = new Date().getHours();
  const isPeakHour = hour >= 9 && hour <= 17;
  
  return {
    paymentOptions: [{
      network: 'eip155:100009',
      asset: 'VET',
      amount: isPeakHour ? '2000000000000000000' : '1000000000000000000',
      recipient: process.env.MERCHANT_ADDRESS!,
    }],
    merchantId: 'my-service',
  };
}
```

## Multiple Payment Options

Offer users multiple ways to pay:

```typescript
app.use('/api/*', paymentMiddleware({
  facilitatorUrl: 'https://facilitator.example.com',
  
  getPaymentRequirements: (c) => ({
    paymentOptions: [
      {
        network: 'eip155:100009',
        asset: 'VET',
        amount: '1000000000000000000',  // 1 VET
        recipient: process.env.MERCHANT_ADDRESS!,
      },
      {
        network: 'eip155:100009',
        asset: 'VEUSD',
        amount: '1000000',  // $1 VEUSD (6 decimals)
        recipient: process.env.MERCHANT_ADDRESS!,
      },
      {
        network: 'eip155:100009',
        asset: 'VTHO',
        amount: '100000000000000000000',  // 100 VTHO
        recipient: process.env.MERCHANT_ADDRESS!,
      },
    ],
    merchantId: 'my-service',
  }),
}));
```

The client can choose which payment option to use.

## Standalone Functions

Use SDK functions without middleware for custom integrations.

### Verify Payment

```typescript
import { verifyPayment } from '@x402/vechain';

const result = await verifyPayment(
  'https://facilitator.example.com',
  paymentProofBase64,
  requirements
);

if (result.isValid) {
  console.log('Payment is valid');
  console.log('Sender:', result.senderAddress);
} else {
  console.log('Invalid payment:', result.invalidReason);
}
```

### Settle Payment

Submit payment to blockchain:

```typescript
import { settlePayment } from '@x402/vechain';

const result = await settlePayment(
  'https://facilitator.example.com',
  paymentProofBase64,
  requirements
);

if (result.success) {
  console.log('Transaction hash:', result.transactionHash);
  console.log('Network:', result.networkId);
} else {
  console.log('Settlement failed:', result.error);
}
```

### Get Supported Networks

```typescript
import { getSupported } from '@x402/vechain';

const supported = await getSupported('https://facilitator.example.com');

console.log('Supported networks:', supported.networks);
// [{
//   network: 'eip155:100009',
//   assets: ['VET', 'VTHO', 'VEUSD']
// }]
```

## Database Integration

### Store Payments

```typescript
import { paymentMiddleware } from '@x402/vechain';
import { db } from './db';

app.use('/api/*', paymentMiddleware({
  facilitatorUrl: 'https://facilitator.example.com',
  getPaymentRequirements: (c) => ({ /* ... */ }),
  
  onPaymentVerified: async (c, verification) => {
    // Insert payment record
    await db.payments.insert({
      id: generateId(),
      route: c.req.path,
      method: c.req.method,
      senderAddress: verification.senderAddress,
      amount: verification.amount,
      asset: verification.asset,
      nonce: verification.nonce,
      timestamp: new Date(),
    });
  },
}));
```

### Prevent Replay Attacks

Store used nonces to prevent the same payment being used twice:

```typescript
const usedNonces = new Set(); // Use Redis/database in production

app.use('/api/*', paymentMiddleware({
  facilitatorUrl: 'https://facilitator.example.com',
  getPaymentRequirements: (c) => ({ /* ... */ }),
  
  verifyPayment: async (payload, requirements) => {
    const nonce = payload.payload.nonce;
    
    // Check if nonce already used
    if (usedNonces.has(nonce)) {
      return {
        isValid: false,
        invalidReason: 'Payment already used',
      };
    }
    
    // Delegate to facilitator
    const result = await verifyPayment(
      'https://facilitator.example.com',
      payload,
      requirements
    );
    
    // Store nonce if valid
    if (result.isValid) {
      usedNonces.add(nonce);
    }
    
    return result;
  },
}));
```

### Track User Credits

```typescript
app.use('/api/*', paymentMiddleware({
  facilitatorUrl: 'https://facilitator.example.com',
  getPaymentRequirements: (c) => ({ /* ... */ }),
  
  onPaymentVerified: async (c, verification) => {
    const userId = c.req.query('user');
    
    if (userId) {
      // Add credits to user account
      await db.users.update(userId, {
        credits: db.users.credits + 1,
        lastPayment: new Date(),
      });
    }
  },
}));

app.get('/api/content', async (c) => {
  const userId = c.req.query('user');
  const user = await db.users.find(userId);
  
  if (user.credits > 0) {
    // Deduct credit
    await db.users.update(userId, {
      credits: user.credits - 1,
    });
    
    return c.json({ content: 'Premium content' });
  }
  
  return c.json({ error: 'No credits' }, 402);
});
```

## Error Handling

### Custom Error Responses

```typescript
app.use('/api/*', paymentMiddleware({
  facilitatorUrl: 'https://facilitator.example.com',
  getPaymentRequirements: (c) => ({ /* ... */ }),
}));

// Global error handler
app.onError((err, c) => {
  if (err.message.includes('Payment')) {
    return c.json({
      error: 'Payment processing failed',
      details: err.message,
    }, 402);
  }
  
  return c.json({ error: 'Internal server error' }, 500);
});
```

### Validation Errors

The middleware automatically validates payment payloads using Zod schemas. Invalid payloads return 400:

```json
{
  "error": "Invalid payment payload",
  "details": [
    {
      "path": ["signature"],
      "message": "Required"
    }
  ]
}
```

## Security Best Practices

### 1. Never Trust Client Amount

Always define pricing on the server:

```typescript
// ✅ Good - server controls price
app.use(paymentMiddleware({
  "GET /api/data": {
    price: "0.01",
    token: "VET",
    // ...
  }
}));

// ❌ Bad - client could manipulate
app.use(paymentMiddleware({
  getPaymentRequirements: (c) => ({
    paymentOptions: [{
      amount: c.req.query('price'), // Never do this!
      // ...
    }]
  })
}));
```

### 2. Validate Recipient Address

Ensure payments go to your wallet:

```typescript
getPaymentRequirements: (c) => ({
  paymentOptions: [{
    network: 'eip155:100009',
    asset: 'VET',
    amount: '1000000000000000000',
    recipient: process.env.MERCHANT_ADDRESS!, // Your wallet
  }]
})
```

### 3. Check Payment Expiry

Payments include `validUntil` timestamp. The facilitator checks this, but you can add extra validation:

```typescript
verifyPayment: async (payload, requirements) => {
  const now = Math.floor(Date.now() / 1000);
  
  if (payload.payload.validUntil < now) {
    return {
      isValid: false,
      invalidReason: 'Payment expired',
    };
  }
  
  // Continue verification...
}
```

### 4. Prevent Replay Attacks

Always track used nonces in a persistent store (database/Redis):

```typescript
// Redis example
import Redis from 'ioredis';
const redis = new Redis();

verifyPayment: async (payload, requirements) => {
  const nonce = payload.payload.nonce;
  const key = `nonce:${nonce}`;
  
  // Check if nonce exists
  const exists = await redis.exists(key);
  if (exists) {
    return {
      isValid: false,
      invalidReason: 'Nonce already used',
    };
  }
  
  // Verify with facilitator
  const result = await verifyPayment(facilitatorUrl, payload, requirements);
  
  // Store nonce for 24 hours
  if (result.isValid) {
    await redis.setex(key, 86400, '1');
  }
  
  return result;
}
```

### 5. Use Environment Variables

Never hardcode secrets:

```typescript
// .env file
MERCHANT_ADDRESS=0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb
FACILITATOR_URL=https://facilitator.example.com

// Code
getPaymentRequirements: (c) => ({
  paymentOptions: [{
    recipient: process.env.MERCHANT_ADDRESS!,
    // ...
  }]
})
```

## Testing

### Unit Testing

```typescript
import { describe, it, expect } from 'vitest';
import { Hono } from 'hono';
import { paymentMiddleware } from '@x402/vechain';

describe('Payment Middleware', () => {
  it('should return 402 without payment', async () => {
    const app = new Hono();
    
    app.use('/api/premium', paymentMiddleware({
      facilitatorUrl: 'https://facilitator.example.com',
      getPaymentRequirements: () => ({
        paymentOptions: [{
          network: 'eip155:100009',
          asset: 'VET',
          amount: '1000000000000000000',
          recipient: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        }],
        merchantId: 'test',
      }),
    }));
    
    app.get('/api/premium', (c) => c.json({ data: 'test' }));
    
    const res = await app.request('/api/premium');
    
    expect(res.status).toBe(402);
    expect(res.headers.get('X-Payment-Required')).toBeTruthy();
  });
});
```

### Integration Testing

```typescript
import { x402Fetch, PrivateKeyWalletAdapter } from '@x402/vechain';

// Test with real payment
const wallet = new PrivateKeyWalletAdapter(process.env.TEST_PRIVATE_KEY);

const response = await x402Fetch('http://localhost:3000/api/premium', {
  facilitatorUrl: 'http://localhost:3000',
  wallet,
});

expect(response.status).toBe(200);
const data = await response.json();
expect(data).toHaveProperty('data');
```

## TypeScript Types

Full TypeScript support with exported types:

```typescript
import type {
  PaymentRequirements,
  PaymentOption,
  PaymentPayload,
  PaymentVerification,
  VerifyResponse,
  SettleResponse,
  SupportedResponse,
  PaymentMiddlewareOptions,
  RoutePaymentConfig,
} from '@x402/vechain';
```

## Examples

### Complete Express-Like API

```typescript
import { Hono } from 'hono';
import { paymentMiddleware } from '@x402/vechain';

const app = new Hono();

// Public routes (no payment)
app.get('/', (c) => c.json({ message: 'Welcome' }));
app.get('/api/free', (c) => c.json({ data: 'Free content' }));

// Payment-protected routes
app.use(paymentMiddleware({
  routes: {
    "GET /api/basic": {
      price: "0.01",
      token: "VET",
      network: "vechain:100009",
      payTo: process.env.MERCHANT_ADDRESS!,
    },
    "GET /api/premium": {
      price: "0.1",
      token: "VET",
      network: "vechain:100009",
      payTo: process.env.MERCHANT_ADDRESS!,
    }
  },
  facilitatorUrl: process.env.FACILITATOR_URL!,
  onPaymentVerified: async (c, verification) => {
    console.log(`Payment received from ${verification.senderAddress}`);
  },
}));

app.get('/api/basic', (c) => {
  return c.json({ data: 'Basic content' });
});

app.get('/api/premium', (c) => {
  return c.json({ data: 'Premium content' });
});

export default app;
```

## Next Steps

- [Client SDK](/sdk/client) - Learn about client-side integration
- [Wallet Integration](/sdk/wallets) - Deep dive into wallet support
- [API Reference](/api/overview) - Facilitator API documentation
- [Examples](https://github.com/ashutoshpw/x402-vechain/tree/main/examples) - Complete working examples
