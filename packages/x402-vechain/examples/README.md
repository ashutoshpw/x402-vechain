# x402-vechain SDK Examples

This directory contains example code demonstrating how to use the x402-vechain SDK.

## Examples

### Client-Side Examples (`client-example.ts`)

Demonstrates browser wallet integration:

1. **Check Supported Networks** - Query facilitator for supported networks and assets
2. **Fetch Premium Content** - Make requests with automatic payment handling
3. **Create Manual Payment** - Generate signed payment payloads
4. **Wallet Integration** - Conceptual guide for integrating with VeChain wallets

### Server-Side Examples (`server-example.ts`)

Demonstrates Hono middleware integration:

1. **Basic Middleware** - Simple payment protection for routes
2. **Dynamic Pricing** - Adjust pricing based on content type
3. **Custom Verification** - Implement custom payment validation logic
4. **Manual Verification** - Use standalone verify/settle functions
5. **Multi-Token Support** - Accept multiple payment options

## Running Examples

### Prerequisites

```bash
# Install dependencies
cd packages/x402-vechain
pnpm install
```

### Environment Variables

Create a `.env` file in the package root:

```bash
# Facilitator URL
FACILITATOR_URL=https://your-facilitator.com

# Merchant wallet address
MERCHANT_ADDRESS=0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb

# User private key (for client examples)
# WARNING: Never commit this!
USER_PRIVATE_KEY=your-private-key-here
```

### Running Server Examples

```typescript
// Import example
import { example1BasicMiddleware } from './examples/server-example.js';

// Create app
const app = example1BasicMiddleware();

// Start server (with @hono/node-server or any Hono adapter)
import { serve } from '@hono/node-server';
serve(app, (info) => {
  console.log(`Server running at http://localhost:${info.port}`);
});
```

### Running Client Examples

```typescript
// Import example functions
import { checkSupported, fetchPremiumContent } from './examples/client-example.js';

// Run examples
await checkSupported();
await fetchPremiumContent();
```

## Integration Patterns

### Pattern 1: Simple Payment Gate

Protect entire route sections with payment middleware:

```typescript
app.use('/premium/*', paymentMiddleware({ /* ... */ }));
```

### Pattern 2: Conditional Payment

Apply payment based on user subscription or other conditions:

```typescript
app.use('/api/*', async (c, next) => {
  const user = await getUser(c);
  
  if (!user.isPremium) {
    return paymentMiddleware({ /* ... */ })(c, next);
  }
  
  await next();
});
```

### Pattern 3: Pay-Per-Use API

Charge for each API call:

```typescript
app.use('/api/expensive-operation', paymentMiddleware({
  getPaymentRequirements: () => ({
    paymentOptions: [{
      network: 'eip155:100009',
      asset: 'VET',
      amount: '100000000000000000', // 0.1 VET per call
      recipient: MERCHANT_ADDRESS,
    }],
    merchantId: 'api-service',
  }),
  onPaymentVerified: async (c, verification) => {
    await logApiUsage(verification.senderAddress);
  },
}));
```

### Pattern 4: Tiered Pricing

Different prices for different service tiers:

```typescript
const tierPrices = {
  basic: '100000000000000000',    // 0.1 VET
  standard: '500000000000000000',  // 0.5 VET
  premium: '1000000000000000000',  // 1 VET
};

app.use('/api/:tier/*', paymentMiddleware({
  getPaymentRequirements: (c) => {
    const tier = c.req.param('tier') as keyof typeof tierPrices;
    return {
      paymentOptions: [{
        network: 'eip155:100009',
        asset: 'VET',
        amount: tierPrices[tier] || tierPrices.basic,
        recipient: MERCHANT_ADDRESS,
      }],
      merchantId: 'tiered-service',
    };
  },
}));
```

## Best Practices

1. **Never Hardcode Private Keys**: Use environment variables and secure key management
2. **Use HTTPS**: Always use HTTPS in production for facilitator and API endpoints
3. **Validate Payments**: Always verify payments server-side, never trust client
4. **Log Payments**: Keep audit logs of all payment transactions
5. **Handle Errors**: Implement proper error handling for payment failures
6. **Test on Testnet**: Use VeChain testnet for development and testing
7. **Set Reasonable Timeouts**: Configure appropriate validity durations for payment payloads

## Wallet Integration

### VeChain Sync (Desktop)

```typescript
// Connect to Connex
const connex = new Connex({
  node: 'https://testnet.vechain.org',
  network: 'test'
});

// Sign message
const signing = connex.vendor.sign('cert', {
  purpose: 'identification',
  payload: {
    type: 'text',
    content: JSON.stringify(paymentPayload)
  }
});

const result = await signing.request();
```

### VeWorld (Mobile/Browser)

```typescript
// Connect wallet
await window.vechain.request({
  method: 'wallet_connect'
});

// Sign transaction
const signResult = await window.vechain.request({
  method: 'wallet_signTransaction',
  params: [/* transaction */]
});
```

## Troubleshooting

### Common Issues

1. **Payment Verification Fails**
   - Check that payment requirements match exactly
   - Verify network identifier format (CAIP-2)
   - Ensure amounts are in wei (strings)

2. **Signature Invalid**
   - Verify private key format
   - Check payload structure matches server expectations
   - Ensure deterministic JSON serialization

3. **Nonce Already Used**
   - Generate fresh nonces for each payment
   - Check nonce database cleanup

## Additional Resources

- [x402 Protocol Specification](https://github.com/coinbase/x402)
- [VeChain SDK Documentation](https://github.com/vechain/vechain-sdk-js)
- [Hono Documentation](https://hono.dev/)
