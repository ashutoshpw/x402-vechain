# Quick Start Guide - @x402/vechain

Get started with the x402-vechain SDK in under 5 minutes.

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

// Auto-detect VeWorld or Connex wallet
const wallet = autoDetectWallet();

if (!wallet) {
  console.error('No VeChain wallet detected. Please install VeWorld or VeChain Sync.');
  return;
}

// Make a request that requires payment
const response = await x402Fetch('https://api.example.com/premium-data', {
  facilitatorUrl: 'https://facilitator.example.com',
  wallet, // Wallet will automatically sign payment when needed
  maxAmount: '1000000000000000000', // Optional: Max 1 VET
});

const data = await response.json();
console.log('Premium data:', data);
```

### Using Specific Wallet

```typescript
import { x402Fetch, VeWorldWalletAdapter } from '@x402/vechain';

// Use VeWorld explicitly
const wallet = new VeWorldWalletAdapter();
await wallet.connect();

const response = await x402Fetch('https://api.example.com/premium-data', {
  facilitatorUrl: 'https://facilitator.example.com',
  wallet,
});

## Server-Side Usage (Hono)

### Route-Based Configuration (New, Easiest!)

```typescript
import { Hono } from 'hono';
import { paymentMiddleware } from '@x402/vechain';

const app = new Hono();

// Protect routes with simple config
app.use(paymentMiddleware({
  "GET /api/premium": {
    price: "0.01",           // Simple decimal price
    token: "VET",            // Token symbol
    network: "vechain:100009", // VeChain testnet
    payTo: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    facilitatorUrl: "https://facilitator.example.com"
  },
  "POST /api/data": {
    price: "0.05",
    token: "VEUSD",
    network: "vechain:100009",
    payTo: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    facilitatorUrl: "https://facilitator.example.com"
  }
}));

// Protected routes
app.get('/api/premium', (c) => {
  return c.json({ data: 'Premium content' });
});

export default app;
```

### Traditional Configuration (More Control)

```typescript
import { Hono } from 'hono';
import { paymentMiddleware } from '@x402/vechain';

const app = new Hono();

// Protect routes with payment
app.use('/premium/*', paymentMiddleware({
  facilitatorUrl: 'https://facilitator.example.com',
  getPaymentRequirements: () => ({
    paymentOptions: [{
      network: 'eip155:100009', // VeChain testnet
      asset: 'VET',
      amount: '1000000000000000000', // 1 VET in wei
      recipient: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
    }],
    merchantId: 'my-service',
  }),
}));

app.get('/premium/data', (c) => {
  return c.json({ data: 'Premium content' });
});

export default app;
```

## Common Scenarios

### 1. Route-Based Pay-Per-Request API

```typescript
// New simplified API
app.use(paymentMiddleware({
  "GET /api/expensive": {
    price: "0.1",      // 0.1 VET
    token: "VET",
    network: "vechain:100009",
    payTo: MERCHANT_ADDRESS,
    facilitatorUrl: FACILITATOR_URL,
  }
}));
```

### 2. Dynamic Pricing (Traditional API)

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
        amount: prices[type] || prices.article,
        recipient: MERCHANT_ADDRESS,
      }],
      merchantId: 'content-service',
    };
  },
}));
```

### 3. Multiple Routes with Different Tokens

```typescript
// Route-based API makes this easy!
app.use(paymentMiddleware({
  "GET /vet-content": {
    price: "1",
    token: "VET",
    network: "vechain:100009",
    payTo: MERCHANT_ADDRESS,
    facilitatorUrl: FACILITATOR_URL,
  },
  "GET /vtho-content": {
    price: "10",
    token: "VTHO",
    network: "vechain:100009",
    payTo: MERCHANT_ADDRESS,
    facilitatorUrl: FACILITATOR_URL,
  },
  "GET /stable-content": {
    price: "0.5",
    token: "VEUSD",
    network: "vechain:100009",
    payTo: MERCHANT_ADDRESS,
    facilitatorUrl: FACILITATOR_URL,
  },
}));
```

### 4. Wildcard Route Protection

```typescript
app.use(paymentMiddleware({
  // Protect all routes under /premium/
  "GET /premium/*": {
    price: "0.01",
    token: "VET",
    network: "vechain:100009",
    payTo: MERCHANT_ADDRESS,
    facilitatorUrl: FACILITATOR_URL,
  }
}));
```

## Environment Setup

Create a `.env` file:

```bash
# Facilitator URL (replace with your facilitator)
FACILITATOR_URL=https://facilitator.example.com

# Your merchant wallet address
MERCHANT_ADDRESS=0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb

# For client examples (development only - use wallet in production)
USER_PRIVATE_KEY=your-private-key-here
```

## Network Identifiers

Use CAIP-2 format for network identifiers:

- **VeChain Testnet**: `eip155:100009`
- **VeChain Mainnet**: `eip155:100010`

## Asset Identifiers

- **VET** (native): `'VET'` or `'native'`
- **VTHO**: `'VTHO'`
- **VIP-180 Tokens**: Contract address (e.g., `'0x...'`)

## Amount Format

Always use **wei** (smallest unit) as strings:

```typescript
'1000000000000000000'  // 1 VET
'100000000000000000'   // 0.1 VET
'10000000000000000'    // 0.01 VET
```

## Next Steps

1. **Read the full README**: `packages/x402-vechain/README.md`
2. **Check examples**: `packages/x402-vechain/examples/`
3. **Deploy a facilitator**: See API documentation in `apps/api/`
4. **Integrate with wallets**: VeChain Sync, VeWorld, or custom solution

## Troubleshooting

### Common Issues

**Payment verification fails**
- Ensure amounts are in wei (strings)
- Check network identifier format (CAIP-2)
- Verify recipient address matches

**Signature invalid**
- Check private key format (hex, with or without 0x)
- Ensure payload structure matches server expectations

**Nonce already used**
- Generate fresh nonces for each payment
- Check database cleanup

## Support

- [Full Documentation](./README.md)
- [Examples](./examples/)
- [GitHub Issues](https://github.com/ashutoshpw/x402-vechain/issues)
