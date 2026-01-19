---
title: First Payment
description: Create your first VeChain payment flow with x402.vet
---

This guide walks you through creating a complete payment flow, from setting up a protected API endpoint to making payments from a client application.

## Overview

A complete x402 payment flow involves:

1. **Server**: Protect an API route with payment requirements
2. **Client**: Request the protected resource
3. **Server**: Return `402 Payment Required` with payment details
4. **Client**: User approves and signs payment in wallet
5. **Client**: Submit payment to facilitator for verification
6. **Facilitator**: Verify payment on VeChain blockchain
7. **Server**: Grant access to protected resource

## Server Setup

### 1. Create a Protected Endpoint

Create a file `server.ts`:

```typescript
import { Hono } from 'hono';
import { paymentMiddleware } from '@x402/vechain';

const app = new Hono();

// Public endpoint - no payment required
app.get('/api/free', (c) => {
  return c.json({ message: 'This is free content' });
});

// Protected endpoint - requires 0.1 VET payment
app.use(paymentMiddleware({
  "GET /api/premium": {
    price: "0.1",
    token: "VET",
    network: "vechain:100009",  // VeChain testnet
    payTo: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    facilitatorUrl: "https://facilitator.example.com"
  }
}));

app.get('/api/premium', (c) => {
  // Access payment verification details
  const verification = c.get('paymentVerification');
  
  return c.json({
    message: 'Premium content unlocked!',
    paidBy: verification.senderAddress,
    data: {
      secret: 'This is valuable premium content',
      timestamp: new Date().toISOString()
    }
  });
});

export default app;
```

### 2. Start the Server

```bash
node server.ts
# Server running at http://localhost:3000
```

## Client Setup

### 1. Create a Payment Client

Create a file `client.ts`:

```typescript
import { x402Fetch, autoDetectWallet } from '@x402/vechain';

async function fetchPremiumContent() {
  // Detect available wallet (VeWorld or Connex)
  const wallet = autoDetectWallet();
  
  if (!wallet) {
    console.error('No VeChain wallet detected. Please install VeWorld or use VeChain Sync.');
    return;
  }

  try {
    console.log('Requesting premium content...');
    
    // Make request with automatic payment handling
    const response = await x402Fetch('http://localhost:3000/api/premium', {
      facilitatorUrl: 'https://facilitator.example.com',
      wallet,
      maxAmount: '1000000000000000000', // Max 1 VET (safety limit)
    });

    if (response.ok) {
      const data = await response.json();
      console.log('Success! Premium content:', data);
    } else {
      console.error('Request failed:', response.status, response.statusText);
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Run the client
fetchPremiumContent();
```

### 2. Run the Client

```bash
node client.ts
```

The wallet will prompt you to approve the payment. After approval, the transaction is signed and submitted to the facilitator, which verifies it and returns the premium content.

## Advanced: Custom Payment Handler

For more control over the payment flow (e.g., showing custom UI):

```typescript
import { 
  x402Fetch, 
  createPaymentPayloadWithWallet, 
  VeWorldWalletAdapter 
} from '@x402/vechain';

const wallet = new VeWorldWalletAdapter();
await wallet.connect();

const response = await x402Fetch('http://localhost:3000/api/premium', {
  facilitatorUrl: 'https://facilitator.example.com',
  onPaymentRequired: async (requirements) => {
    // Show custom payment confirmation UI
    const option = requirements.paymentOptions[0];
    const amountVET = parseFloat(option.amount) / 1e18;
    
    const confirmed = confirm(
      `Pay ${amountVET} ${option.asset} to access premium content?`
    );
    
    if (!confirmed) {
      throw new Error('Payment cancelled by user');
    }
    
    // Create and sign payment with wallet
    return await createPaymentPayloadWithWallet(
      {
        network: option.network,
        recipient: option.recipient,
        amount: option.amount,
        asset: option.asset,
      },
      wallet
    );
  },
});
```

## Testing the Flow

### 1. Free Endpoint (No Payment)

```bash
curl http://localhost:3000/api/free
```

Response:
```json
{
  "message": "This is free content"
}
```

### 2. Premium Endpoint (First Request - No Payment)

```bash
curl http://localhost:3000/api/premium
```

Response (402 Payment Required):
```json
{
  "error": "Payment required",
  "requirements": {
    "paymentOptions": [{
      "network": "eip155:100009",
      "asset": "VET",
      "amount": "100000000000000000",
      "recipient": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
    }],
    "merchantId": "my-service"
  }
}
```

### 3. Premium Endpoint (With Payment)

The client SDK handles this automatically when using `x402Fetch` with a wallet.

## Network Identifiers

Use the correct network identifier for your environment:

- **Testnet**: `vechain:100009` or `eip155:100009`
- **Mainnet**: `vechain:100010` or `eip155:100010`

## Amount Formats

Amounts are specified in **wei** (smallest unit):

- 1 VET = 1,000,000,000,000,000,000 wei = `1e18` wei
- 0.1 VET = 100,000,000,000,000,000 wei = `1e17` wei

When using route-based configuration, you can specify prices in decimal format:

```typescript
{
  price: "0.1",  // Automatically converted to wei
  token: "VET"
}
```

## What's Next?

Now that you've created your first payment flow, explore:

- [Client SDK](/sdk/client) - Complete client SDK reference
- [Server SDK](/sdk/server) - Advanced server configuration
- [Wallet Integration](/sdk/wallets) - Integrate different wallets
- [Fee Delegation](/guides/fee-delegation) - Sponsor gas fees for users
- [Token Support](/guides/tokens) - Use different tokens (VTHO, VEUSD, B3TR)
