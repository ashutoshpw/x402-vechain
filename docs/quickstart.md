---
title: "Quick Start"
description: "Get started with the @x402/vechain SDK in under 5 minutes — client and server-side usage, route-based middleware, and common scenarios"
category: "guide"
---

# Quick Start — @x402/vechain

## Installation

```bash
npm install @x402/vechain
# or
pnpm add @x402/vechain
# or
yarn add @x402/vechain
```

## Client-Side Usage (Browser)

### Using Auto-Detected Wallet (Recommended)

```typescript
import { x402Fetch, autoDetectWallet } from '@x402/vechain';

const wallet = autoDetectWallet();

if (!wallet) {
  console.error('No VeChain wallet detected. Please install VeWorld or VeChain Sync.');
  return;
}

const response = await x402Fetch('https://api.example.com/premium-data', {
  facilitatorUrl: 'https://facilitator.example.com',
  wallet,
  maxAmount: '1000000000000000000', // Optional: max 1 VET
});

const data = await response.json();
```

### Using a Specific Wallet

```typescript
import { x402Fetch, VeWorldWalletAdapter } from '@x402/vechain';

const wallet = new VeWorldWalletAdapter();
await wallet.connect();

const response = await x402Fetch('https://api.example.com/premium-data', {
  facilitatorUrl: 'https://facilitator.example.com',
  wallet,
});
```

## Server-Side Usage (Hono)

### Route-Based Configuration (Simplest)

```typescript
import { Hono } from 'hono';
import { paymentMiddleware } from '@x402/vechain';

const app = new Hono();

app.use(paymentMiddleware({
  "GET /api/premium": {
    price: "0.01",
    token: "VET",
    network: "vechain:100009",
    payTo: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    facilitatorUrl: "https://facilitator.example.com"
  },
  "POST /api/data": {
    price: "0.05",
    token: "B3TR",
    network: "vechain:100009",
    payTo: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    facilitatorUrl: "https://facilitator.example.com"
  }
}));

app.get('/api/premium', (c) => c.json({ data: 'Premium content' }));

export default app;
```

### Traditional Configuration (More Control)

```typescript
import { Hono } from 'hono';
import { paymentMiddleware } from '@x402/vechain';

const app = new Hono();

app.use('/premium/*', paymentMiddleware({
  facilitatorUrl: 'https://facilitator.example.com',
  getPaymentRequirements: () => ({
    paymentOptions: [{
      network: 'eip155:100009',
      asset: 'VET',
      amount: '1000000000000000000', // 1 VET in wei
      recipient: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
    }],
    merchantId: 'my-service',
  }),
}));

app.get('/premium/data', (c) => c.json({ data: 'Premium content' }));
```

## Common Scenarios

### Dynamic Pricing

```typescript
app.use('/content/:type', paymentMiddleware({
  facilitatorUrl: FACILITATOR_URL,
  getPaymentRequirements: (c) => {
    const type = c.req.param('type');
    const prices = {
      article: '100000000000000000',
      video: '500000000000000000',
      premium: '1000000000000000000',
    };
    return {
      paymentOptions: [{
        network: 'eip155:100009',
        asset: 'VET',
        amount: prices[type] ?? prices.article,
        recipient: MERCHANT_ADDRESS,
      }],
      merchantId: 'content-service',
    };
  },
}));
```

### Multiple Tokens

```typescript
app.use(paymentMiddleware({
  "GET /vet-content": {
    price: "1", token: "VET",
    network: "vechain:100009", payTo: MERCHANT_ADDRESS, facilitatorUrl: FACILITATOR_URL,
  },
  "GET /vtho-content": {
    price: "10", token: "VTHO",
    network: "vechain:100009", payTo: MERCHANT_ADDRESS, facilitatorUrl: FACILITATOR_URL,
  },
  "GET /b3tr-content": {
    price: "0.5", token: "B3TR",
    network: "vechain:100009", payTo: MERCHANT_ADDRESS, facilitatorUrl: FACILITATOR_URL,
  },
}));
```

### Wildcard Route Protection

```typescript
app.use(paymentMiddleware({
  "GET /premium/*": {
    price: "0.01", token: "VET",
    network: "vechain:100009", payTo: MERCHANT_ADDRESS, facilitatorUrl: FACILITATOR_URL,
  }
}));
```

## Environment Setup

```bash
FACILITATOR_URL=https://facilitator.example.com
MERCHANT_ADDRESS=0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb

# Development only — use wallet adapters in production
USER_PRIVATE_KEY=your-private-key-here
```

## Network Identifiers (CAIP-2)

| Network | Identifier |
|---------|-----------|
| VeChain Testnet | `eip155:100009` or `vechain:100009` |
| VeChain Mainnet | `eip155:100010` or `vechain:100010` |

The facilitator is a per-network deployment: each running instance is configured for exactly one network via `VECHAIN_NETWORK` and only accepts payment options for that network's identifier. Point `facilitatorUrl` and `network` at a matching pair — e.g. a testnet facilitator with `network: "vechain:100009"`, or a mainnet facilitator with `network: "vechain:100010"`. Mixing them (a mainnet network id against a testnet facilitator, or vice versa) is rejected with "No supported network".

## Amount Format

Always use **wei** as strings:

```typescript
'1000000000000000000'  // 1 VET
'100000000000000000'   // 0.1 VET
'10000000000000000'    // 0.01 VET
```

## Troubleshooting

**Payment verification fails**
- Ensure amounts are in wei (strings)
- Check network identifier format (CAIP-2)
- Verify recipient address matches

**Signature invalid**
- Check private key format (hex, with or without `0x`)
- Ensure payload structure matches server expectations

**Nonce already used**
- Generate fresh nonces for each payment
- Check database cleanup for expired nonces

## Next Steps

- [Full SDK documentation](../packages/x402-vechain/README.md)
- [Wallet integration guide](./sdk-wallet-integration.md)
- [Fee delegation guide](./fee-delegation.md)
- [Examples](../packages/x402-vechain/examples/)
