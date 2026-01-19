---
title: Quick Start
description: Get started with x402.vet in 5 minutes
---

Welcome to x402.vet! This guide will help you integrate VeChain payments into your application in just 5 minutes.

## What is x402.vet?

x402.vet is a payment facilitator implementing the [x402 protocol](https://github.com/coinbase/x402) for VeChain blockchain. It enables seamless cryptocurrency payments using VeChain's native tokens (VET, VTHO, VEUSD, B3TR).

## Key Features

- ✅ **x402 Protocol Compliant** - Standard payment protocol
- ✅ **VeChain Native** - Built specifically for VeChain blockchain
- ✅ **Wallet Integration** - Support for VeWorld, Connex (Sync/Sync2)
- ✅ **Fee Delegation** - Optional gas sponsorship for users
- ✅ **TypeScript First** - Full type safety and IntelliSense
- ✅ **Production Ready** - Rate limiting, CORS, error handling

## 5-Minute Integration

### Step 1: Install the SDK

```bash
npm install @x402/vechain
# or
pnpm add @x402/vechain
```

### Step 2: Protect Your API Route (Server)

```typescript
import { Hono } from 'hono';
import { paymentMiddleware } from '@x402/vechain';

const app = new Hono();

// Simple route-based payment configuration
app.use(paymentMiddleware({
  "GET /api/premium": {
    price: "0.01",      // 0.01 VET
    token: "VET",
    network: "vechain:100009",  // VeChain testnet
    payTo: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    facilitatorUrl: "https://facilitator.example.com"
  }
}));

// This route now requires payment
app.get('/api/premium', (c) => {
  return c.json({ data: 'Premium content' });
});

export default app;
```

### Step 3: Make a Payment Request (Client)

```typescript
import { x402Fetch, autoDetectWallet } from '@x402/vechain';

// Auto-detect VeWorld or Connex wallet
const wallet = autoDetectWallet();

// Make a request - payment handled automatically!
const response = await x402Fetch('https://api.example.com/api/premium', {
  facilitatorUrl: 'https://facilitator.example.com',
  wallet,  // Wallet signs payment when required
  maxAmount: '1000000000000000000', // Max 1 VET
});

const data = await response.json();
console.log(data); // { data: 'Premium content' }
```

That's it! You've integrated VeChain payments in 3 steps. 🎉

## How It Works

```
1. Client → Server: Request premium content
   Server → Client: 402 Payment Required + Payment Requirements
   
2. Client: User approves payment in wallet
   Client: Wallet signs transaction
   Client: Send signed payment to facilitator
   
3. Facilitator: Verify payment on VeChain
   Facilitator → Server: Payment verified
   
4. Server → Client: Return premium content
```

## What's Next?

- [Installation Guide](/getting-started/installation) - Detailed setup instructions
- [First Payment](/getting-started/first-payment) - Step-by-step payment flow
- [Client SDK](/sdk/client) - Complete client SDK reference
- [Server SDK](/sdk/server) - Complete server SDK reference
- [API Reference](/api/overview) - x402 API endpoints

## Need Help?

- 📖 Browse the [documentation](/getting-started/installation)
- 🐛 Report issues on [GitHub](https://github.com/ashutoshpw/x402-vechain/issues)
- 💬 Ask questions in [GitHub Discussions](https://github.com/ashutoshpw/x402-vechain/discussions)
