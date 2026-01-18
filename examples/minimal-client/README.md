# Minimal x402 Client Example

A browser-based client demonstrating VeChain wallet integration with x402 payment protocol.

## What This Example Shows

- ✅ VeChain wallet detection (VeWorld & Connex)
- ✅ Automatic payment handling with `x402Fetch`
- ✅ User-friendly payment flow
- ✅ Both free and paid endpoints
- ✅ Real-time payment verification

## Prerequisites

Before running this example, you need:

1. **VeChain Wallet** - Install one of:
   - [VeWorld Browser Extension](https://www.veworld.net/) (Recommended)
   - [VeChain Sync Desktop App](https://sync.vecha.in/)

2. **Testnet VET** - Get free testnet VET from:
   - [VeChain Faucet](https://faucet.vecha.in/)

3. **Running Server** - The [minimal-server example](../minimal-server) should be running

4. **Running Facilitator** - The x402 facilitator API should be running

## Quick Start

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Start Development Server

```bash
pnpm dev
```

This will open the client in your browser at http://localhost:5173

### 3. Connect Your Wallet

1. Click "Connect Wallet" button
2. Approve the connection in your VeChain wallet
3. Your wallet address will be displayed

### 4. Try It Out

**Test Free Endpoint:**
- Click "Fetch Free Content" - No payment required

**Test Premium Endpoints:**
- Click "Fetch Premium Data" - Wallet will prompt for 0.01 VET payment
- Click "Fetch Premium Content" - Wallet will prompt for 0.05 VEUSD payment

## How It Works

### 1. Wallet Detection

The client automatically detects available VeChain wallets:

```typescript
import { autoDetectWallet } from '@x402/vechain';

const wallet = autoDetectWallet();
if (wallet) {
  await wallet.connect();
  const address = await wallet.getAddress();
}
```

### 2. Automatic Payment Handling

The `x402Fetch` function handles the entire payment flow:

```typescript
import { x402Fetch } from '@x402/vechain';

const response = await x402Fetch('http://localhost:3001/premium/data', {
  facilitatorUrl: 'http://localhost:3000',
  wallet,
  maxAmount: '10000000000000000000', // Max 10 VET
});
```

**What happens:**
1. Client makes request to protected endpoint
2. Server returns 402 Payment Required with requirements
3. SDK creates payment payload using connected wallet
4. User approves transaction in wallet
5. SDK submits payment proof to server
6. Server verifies payment and returns content

### 3. Payment Flow

```
┌──────────┐         ┌──────────┐         ┌─────────────┐
│  Client  │         │  Server  │         │ Facilitator │
└────┬─────┘         └────┬─────┘         └──────┬──────┘
     │                    │                       │
     │  1. GET /premium   │                       │
     ├───────────────────>│                       │
     │                    │                       │
     │  2. 402 Payment    │                       │
     │     Required       │                       │
     │<───────────────────┤                       │
     │                    │                       │
     │  3. Create Payment │                       │
     │     (Wallet Sign)  │                       │
     │                    │                       │
     │  4. GET /premium   │                       │
     │     + Payment Proof│                       │
     ├───────────────────>│                       │
     │                    │  5. Verify Payment    │
     │                    ├──────────────────────>│
     │                    │                       │
     │                    │  6. Verification OK   │
     │                    │<──────────────────────┤
     │  7. Content        │                       │
     │<───────────────────┤                       │
     │                    │                       │
```

## Configuration

### API Server URL
Default: `http://localhost:3001`

This is the URL of your payment-protected API server (minimal-server example).

### Facilitator URL
Default: `http://localhost:3000`

This is the URL of the x402 facilitator that verifies and settles payments.

Both can be changed in the UI or by editing `main.ts`.

## Supported Wallets

### VeWorld
- Browser extension for Chrome, Firefox, Edge
- Mobile app for iOS and Android
- Best for everyday users
- [Download VeWorld](https://www.veworld.net/)

### VeChain Sync (via Connex)
- Desktop application for Windows, macOS, Linux
- Built-in DApp browser
- Best for developers
- [Download Sync](https://sync.vecha.in/)

## Building for Production

```bash
pnpm build
```

The built files will be in the `dist/` directory and can be deployed to any static hosting service.

## Troubleshooting

### "No wallet detected"
- Install VeWorld extension or VeChain Sync
- Refresh the page after installing
- Check browser console for errors

### Payment fails
- Ensure you have enough VET/VTHO in your wallet
- Check that you're on VeChain testnet
- Verify the facilitator is running
- Check browser console for detailed errors

### Server connection failed
- Ensure the minimal-server example is running on port 3001
- Check that CORS is properly configured
- Verify the API URL in the configuration

## Security Notes

1. **Testnet Only**: This example uses VeChain testnet. For mainnet, update network configuration
2. **Max Amount**: Always set `maxAmount` to prevent excessive payments
3. **HTTPS**: Use HTTPS in production for all API calls
4. **Wallet Approval**: Users must explicitly approve all transactions

## Next Steps

- **AI Agent**: See how to automate payments in the [ai-agent example](../ai-agent)
- **Content Paywall**: Check out a complete implementation in the [content-paywall example](../content-paywall)
- **SDK Documentation**: Read the full [@x402/vechain documentation](../../packages/x402-vechain/README.md)

## Related Documentation

- [VeWorld Documentation](https://docs.veworld.net/)
- [Connex Documentation](https://docs.vechain.org/connex/)
- [x402 Protocol](https://github.com/coinbase/x402)
