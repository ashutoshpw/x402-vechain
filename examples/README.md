# x402 VeChain Examples

This directory contains practical example applications demonstrating how to integrate the x402 payment protocol with VeChain blockchain.

## Examples Overview

### 1. [Minimal Server](./minimal-server)
**Simple paid API endpoint**

A minimal Hono server with payment-protected routes. Perfect for getting started quickly.

- ✅ Route-based payment configuration
- ✅ Multiple payment tokens
- ✅ Automatic verification
- ✅ ~50 lines of code

**Use Case**: Add payment requirements to any API endpoint in minutes.

[View Example →](./minimal-server/README.md)

---

### 2. [Minimal Client](./minimal-client)
**Browser wallet payment integration**

A simple web client that makes payments using VeChain wallets (VeWorld/Connex).

- ✅ Auto-detect VeChain wallets
- ✅ One-click payment flow
- ✅ User-friendly interface
- ✅ Real-time status updates

**Use Case**: Build frontend applications that interact with paid APIs.

[View Example →](./minimal-client/README.md)

---

### 3. [AI Agent](./ai-agent)
**Autonomous payment bot**

An autonomous bot that makes paid API calls automatically with retry logic and error handling.

- ✅ Scheduled tasks
- ✅ Automatic payment handling
- ✅ Retry with exponential backoff
- ✅ Payment tracking & statistics

**Use Case**: Automate data collection from paid APIs, monitoring services, or testing.

[View Example →](./ai-agent/README.md)

---

### 4. [Content Paywall](./content-paywall)
**Full-stack content access gating**

A complete content platform with payment-gated articles, featuring both frontend and backend.

- ✅ Full-stack application
- ✅ Professional UI/UX
- ✅ Multiple content tiers
- ✅ Dynamic pricing
- ✅ Payment history

**Use Case**: Build premium content platforms, paywalls, or digital product marketplaces.

[View Example →](./content-paywall/README.md)

---

## Quick Start

Each example is self-contained with its own README, dependencies, and setup instructions.

### Installation

From the repository root:

```bash
# Install all dependencies
pnpm install
```

### Running Examples

Each example can be run independently:

```bash
# Minimal Server
cd examples/minimal-server
pnpm install
pnpm dev

# Minimal Client  
cd examples/minimal-client
pnpm install
pnpm dev

# AI Agent
cd examples/ai-agent
pnpm install
pnpm start

# Content Paywall (starts both client & server)
cd examples/content-paywall
pnpm install
pnpm dev
```

## Prerequisites

Before running any example, ensure you have:

1. **Node.js 20+** installed
2. **pnpm 10.12.4** (`npm install -g pnpm@10.12.4`)
3. **VeChain Wallet** (for client examples)
   - [VeWorld](https://www.veworld.net/) - Browser extension or mobile app
   - [VeChain Sync](https://sync.vecha.in/) - Desktop application
4. **Testnet Funds** from [VeChain Faucet](https://faucet.vecha.in/)
5. **Running Facilitator** (from `apps/api`)

### Starting the Facilitator

The examples require a running x402 facilitator:

```bash
# From repository root
cd apps/api
cp .env.example .env
# Edit .env with your configuration
pnpm install
pnpm dev
```

The facilitator will run on http://localhost:3000

## Example Selection Guide

**Choose based on your needs:**

| Goal | Recommended Example |
|------|-------------------|
| Learn the basics | [Minimal Server](./minimal-server) |
| Add payments to existing API | [Minimal Server](./minimal-server) |
| Build a web client | [Minimal Client](./minimal-client) |
| Automate API calls | [AI Agent](./ai-agent) |
| Build a complete app | [Content Paywall](./content-paywall) |
| Understand full flow | [Content Paywall](./content-paywall) |

## Common Patterns

### Server-Side (API)

**Route-Based Configuration** (Easiest):
```typescript
import { paymentMiddleware } from '@x402/vechain';

app.use(paymentMiddleware({
  "GET /premium": {
    price: "0.01",
    token: "VET",
    network: "vechain:100009",
    payTo: merchantAddress,
    facilitatorUrl: "http://localhost:3000"
  }
}));
```

**Traditional Middleware** (More Control):
```typescript
app.use('/premium/*', paymentMiddleware({
  facilitatorUrl: 'http://localhost:3000',
  getPaymentRequirements: (c) => ({ /* ... */ }),
  onPaymentVerified: async (c, verification) => { /* ... */ }
}));
```

### Client-Side (Browser)

**Automatic Payment with Wallet**:
```typescript
import { x402Fetch, autoDetectWallet } from '@x402/vechain';

const wallet = autoDetectWallet();
const response = await x402Fetch('http://api.example.com/premium', {
  facilitatorUrl: 'http://localhost:3000',
  wallet,
  maxAmount: '1000000000000000000', // Max 1 VET
});
```

**Manual Payment Control**:
```typescript
const response = await x402Fetch(url, {
  facilitatorUrl,
  onPaymentRequired: async (requirements) => {
    // Show UI, get confirmation, create payment
    return await createPaymentPayloadWithWallet(options, wallet);
  }
});
```

## Environment Configuration

All examples use similar environment variables:

```bash
# x402 Facilitator URL
FACILITATOR_URL=http://localhost:3000

# VeChain Network
VECHAIN_NETWORK=testnet  # or 'mainnet'

# Merchant Wallet Address (where you receive payments)
MERCHANT_ADDRESS=0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb

# For AI Agent: Private key for autonomous payments
AGENT_PRIVATE_KEY=your-private-key-here  # NEVER commit this!
```

## Development Workflow

1. **Start Facilitator**
   ```bash
   cd apps/api && pnpm dev
   ```

2. **Configure Example**
   ```bash
   cd examples/[example-name]
   cp .env.example .env
   # Edit .env
   ```

3. **Run Example**
   ```bash
   pnpm dev
   ```

4. **Test Payment Flow**
   - Connect wallet (client examples)
   - Access paid endpoint
   - Approve payment
   - Verify content delivery

## Payment Flow

All examples follow this flow:

```
┌─────────┐         ┌─────────┐         ┌─────────────┐
│ Client  │         │ Server  │         │ Facilitator │
└────┬────┘         └────┬────┘         └──────┬──────┘
     │                   │                      │
     │  1. Request       │                      │
     ├──────────────────>│                      │
     │                   │                      │
     │  2. 402 Payment   │                      │
     │     Required      │                      │
     │<──────────────────┤                      │
     │                   │                      │
     │  3. Create &      │                      │
     │     Sign Payment  │                      │
     │                   │                      │
     │  4. Request +     │                      │
     │     Proof         │                      │
     ├──────────────────>│                      │
     │                   │  5. Verify           │
     │                   ├─────────────────────>│
     │                   │                      │
     │                   │  6. Verified         │
     │                   │<─────────────────────┤
     │                   │                      │
     │  7. Content       │                      │
     │<──────────────────┤                      │
     │                   │                      │
```

## Supported Networks & Assets

All examples support:

### VeChain Testnet (eip155:100009)
- **VET** - Native token
- **VTHO** - Gas token
- **VEUSD** - Stablecoin
- **B3TR** - Better token

### VeChain Mainnet (eip155:100010)
- **VET** - Native token  
- **VTHO** - Gas token
- **VEUSD** - Stablecoin
- **B3TR** - Better token

## Troubleshooting

### "Cannot find module @x402/vechain"

Install dependencies from repository root:
```bash
pnpm install
```

### "Wallet not detected"

- Install [VeWorld](https://www.veworld.net/) or [VeChain Sync](https://sync.vecha.in/)
- Refresh the page
- Check browser console for errors

### "Facilitator connection failed"

- Ensure facilitator is running on port 3000
- Check `FACILITATOR_URL` in `.env`
- Verify no firewall blocking

### "Payment verification failed"

- Ensure you have enough VET/VTHO
- Check you're on correct network (testnet/mainnet)
- Verify wallet is connected
- Check browser console for detailed errors

## Testing on Testnet

1. **Get Testnet Address**
   - Connect your wallet
   - Copy your address

2. **Request Testnet Tokens**
   - Visit https://faucet.vecha.in/
   - Paste your address
   - Request VET and VTHO

3. **Test Payments**
   - Run an example
   - Make a payment
   - Verify it works

## Best Practices

1. **Security**
   - Never commit private keys
   - Use `.env` for secrets
   - Verify payments server-side
   - Set reasonable `maxAmount` limits

2. **User Experience**
   - Show clear pricing
   - Provide payment status feedback
   - Handle errors gracefully
   - Allow users to cancel

3. **Development**
   - Test on testnet first
   - Use environment variables
   - Log important events
   - Handle edge cases

4. **Production**
   - Use HTTPS everywhere
   - Implement rate limiting
   - Monitor payments
   - Keep audit logs

## Next Steps

1. **Try the Examples**
   - Start with [minimal-server](./minimal-server)
   - Then try [minimal-client](./minimal-client)
   - Explore [ai-agent](./ai-agent) for automation
   - Study [content-paywall](./content-paywall) for full implementation

2. **Build Your Own**
   - Use examples as templates
   - Customize for your use case
   - Add your business logic
   - Deploy to production

3. **Contribute**
   - Share your examples
   - Report issues
   - Suggest improvements
   - Help others

## Resources

- **x402 Protocol**: https://github.com/coinbase/x402
- **SDK Documentation**: [../../packages/x402-vechain/README.md](../../packages/x402-vechain/README.md)
- **Main API**: [../../apps/api/README.md](../../apps/api/README.md)
- **VeChain Docs**: https://docs.vechain.org/
- **VeWorld**: https://www.veworld.net/
- **VeChain Sync**: https://sync.vecha.in/

## Support

- **Issues**: [GitHub Issues](https://github.com/ashutoshpw/x402-vechain/issues)
- **Discussions**: [GitHub Discussions](https://github.com/ashutoshpw/x402-vechain/discussions)
- **VeChain Discord**: https://discord.gg/vechain

## License

ISC - See [LICENSE](../LICENSE) for details.
