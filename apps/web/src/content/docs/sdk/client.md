---
title: Client SDK
description: Complete guide to the x402.vet client SDK for browser and Node.js applications
---

The x402.vet client SDK provides powerful tools for integrating VeChain payments into your frontend applications. It handles wallet connections, payment signing, and automatic retry logic.

## Installation

```bash
npm install @x402/vechain
# or
pnpm add @x402/vechain
# or
yarn add @x402/vechain
```

## Core Concepts

The client SDK revolves around three main concepts:

1. **x402Fetch** - Enhanced fetch function with automatic payment handling
2. **Wallet Adapters** - Unified interface for VeChain wallets (VeWorld, Connex)
3. **Payment Payloads** - Signed payment proofs sent to servers

## Quick Start

```typescript
import { x402Fetch, autoDetectWallet } from '@x402/vechain';

// Auto-detect available wallet
const wallet = autoDetectWallet();

// Make a request with automatic payment
const response = await x402Fetch('https://api.example.com/premium', {
  facilitatorUrl: 'https://facilitator.example.com',
  wallet,
  maxAmount: '1000000000000000000', // Max 1 VET
});

const data = await response.json();
```

## x402Fetch

The `x402Fetch` function is a drop-in replacement for the native `fetch` API that automatically handles the x402 payment protocol.

### Basic Usage

```typescript
import { x402Fetch } from '@x402/vechain';

const response = await x402Fetch('https://api.example.com/data', {
  facilitatorUrl: 'https://facilitator.example.com',
  wallet: myWalletAdapter,
});
```

### With Custom Payment Handler

For complete control over the payment flow (e.g., showing a confirmation dialog):

```typescript
import { x402Fetch, createPaymentPayloadWithWallet } from '@x402/vechain';

const response = await x402Fetch('https://api.example.com/premium', {
  facilitatorUrl: 'https://facilitator.example.com',
  onPaymentRequired: async (requirements) => {
    // Show payment confirmation UI
    const userConfirmed = await showPaymentDialog({
      amount: requirements.paymentOptions[0].amount,
      token: requirements.paymentOptions[0].asset,
    });
    
    if (!userConfirmed) {
      throw new Error('Payment cancelled by user');
    }
    
    // Create and sign payment with wallet
    const option = requirements.paymentOptions[0];
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

### With Maximum Amount Protection

Protect users from unexpected high charges:

```typescript
const response = await x402Fetch('https://api.example.com/data', {
  facilitatorUrl: 'https://facilitator.example.com',
  wallet,
  maxAmount: '5000000000000000000', // Max 5 VET
});
```

If the server requests more than `maxAmount`, the payment will be rejected automatically.

### Advanced Options

```typescript
const response = await x402Fetch('https://api.example.com/data', {
  // Required
  facilitatorUrl: 'https://facilitator.example.com',
  
  // Wallet integration (choose one)
  wallet: walletAdapter,                    // Automatic payment signing
  onPaymentRequired: customPaymentHandler,  // Manual payment handling
  
  // Optional safety limits
  maxAmount: '1000000000000000000',  // Wei format
  maxRetries: 3,                     // Default: 1
  
  // Standard fetch options
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ query: 'test' }),
});
```

### Payment Flow

When you call `x402Fetch`:

1. **First request** is sent to your API
2. If **402 Payment Required** is returned:
   - Parse payment requirements from `X-Payment-Required` header
   - Call `onPaymentRequired` or auto-sign with `wallet`
   - Create signed payment payload
3. **Retry request** with `X-Payment-Proof` header
4. **Return response** or throw error

### Error Handling

```typescript
import { x402Fetch } from '@x402/vechain';

try {
  const response = await x402Fetch(url, options);
  
  if (!response.ok) {
    console.error('Request failed:', response.status);
  }
  
  const data = await response.json();
} catch (error) {
  if (error.message.includes('Payment cancelled')) {
    console.log('User cancelled payment');
  } else if (error.message.includes('Max amount exceeded')) {
    console.error('Payment too expensive');
  } else {
    console.error('Request failed:', error);
  }
}
```

## Wallet Integration

The SDK provides first-class support for VeChain wallets through a unified `WalletAdapter` interface.

### Auto-Detect Wallet

The simplest way to connect to a wallet:

```typescript
import { autoDetectWallet } from '@x402/vechain';

const wallet = autoDetectWallet();

if (!wallet) {
  console.error('No VeChain wallet found');
  console.log('Please install VeWorld or VeChain Sync');
  return;
}

// Use wallet
const address = await wallet.getAddress();
console.log('Connected:', address);
```

**Detection Priority:**
1. VeWorld (`window.vechain`)
2. Connex (`window.connex`)

### Detect All Available Wallets

To show users which wallets are available:

```typescript
import { detectWallets } from '@x402/vechain';

const wallets = detectWallets();
// Returns: ['veworld', 'connex'] or [] if none found

if (wallets.includes('veworld')) {
  console.log('VeWorld is available');
}

if (wallets.includes('connex')) {
  console.log('Connex (VeChain Sync) is available');
}
```

### VeWorld Wallet

VeWorld is the official VeChain wallet available as a browser extension and mobile app.

```typescript
import { VeWorldWalletAdapter } from '@x402/vechain';

// Create adapter
const wallet = new VeWorldWalletAdapter();

// Connect to wallet (prompts user)
await wallet.connect();

// Get address
const address = await wallet.getAddress();
console.log('VeWorld address:', address);

// Check connection
const isConnected = await wallet.isConnected();

// Use with x402Fetch
const response = await x402Fetch(url, {
  facilitatorUrl,
  wallet,
});
```

**Features:**
- Browser extension and mobile support
- QR code signing for mobile
- Multiple account support
- DApp interaction APIs

### Connex Wallet (VeChain Sync/Sync2)

Connex is the standard interface for VeChain DApps, used by VeChain Sync desktop wallet.

```typescript
import { ConnexWalletAdapter } from '@x402/vechain';

// Use default window.connex
const wallet = new ConnexWalletAdapter();

// Or provide custom Connex instance
import Connex from '@vechain/connex';
const connex = new Connex({
  node: 'https://testnet.vechain.org',
  network: 'test'
});
const wallet = new ConnexWalletAdapter(connex);

// Get address (no explicit connection needed)
const address = await wallet.getAddress();

// Use with x402Fetch
const response = await x402Fetch(url, {
  facilitatorUrl,
  wallet,
});
```

**Features:**
- Desktop wallet support (VeChain Sync)
- No explicit connection required
- Direct blockchain interaction
- Transaction signing

### Private Key Wallet (Development Only)

For development and testing purposes only. **Never use in production!**

```typescript
import { PrivateKeyWalletAdapter } from '@x402/vechain';

// WARNING: Only for development!
const wallet = new PrivateKeyWalletAdapter(
  process.env.PRIVATE_KEY // From environment variable
);

const address = await wallet.getAddress();

// Use for testing
const response = await x402Fetch(url, {
  facilitatorUrl,
  wallet,
});
```

⚠️ **Security Warning**: Never commit private keys to version control or use in production browsers.

### Wallet Adapter Interface

All wallet adapters implement the `WalletAdapter` interface:

```typescript
interface WalletAdapter {
  // Get wallet address
  getAddress(): Promise<string>;
  
  // Sign a message hash
  signMessageHash(messageHash: Uint8Array): Promise<string>;
  
  // Check if wallet is connected
  isConnected(): Promise<boolean>;
  
  // Optional: Connect to wallet
  connect?(): Promise<void>;
}
```

You can create custom wallet adapters by implementing this interface.

## Payment Payloads

Payment payloads are signed proofs of payment intent sent to servers.

### Create Payment with Wallet

The recommended way to create payment payloads:

```typescript
import { createPaymentPayloadWithWallet } from '@x402/vechain';

const payload = await createPaymentPayloadWithWallet(
  {
    network: 'eip155:100009',           // VeChain testnet
    recipient: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
    amount: '1000000000000000000',      // 1 VET in wei
    asset: 'VET',                       // or 'VTHO', 'VEUSD', '0x...'
    validityDuration: 300,              // Optional: 5 minutes (default)
  },
  wallet  // Your WalletAdapter instance
);

// Payload structure
console.log(payload);
// {
//   signature: '0x...',
//   payload: {
//     scheme: 'exact',
//     network: 'eip155:100009',
//     payTo: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
//     amount: '1000000000000000000',
//     asset: 'VET',
//     nonce: '0x...',
//     validUntil: 1735689600
//   }
// }
```

### Create Payment with Private Key (Testing)

For testing and development only:

```typescript
import { createPaymentPayload } from '@x402/vechain';

const payload = await createPaymentPayload(
  {
    network: 'eip155:100009',
    recipient: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
    amount: '1000000000000000000',
    asset: 'VET',
    validityDuration: 600,  // 10 minutes
  },
  privateKey  // Hex string with or without 0x prefix
);
```

### Payment Payload Fields

| Field | Type | Description |
|-------|------|-------------|
| `signature` | string | Hex-encoded secp256k1 signature |
| `payload.scheme` | string | Always `'exact'` for now |
| `payload.network` | string | CAIP-2 network identifier |
| `payload.payTo` | string | Recipient address |
| `payload.amount` | string | Amount in wei (for VET/VTHO) or token smallest unit |
| `payload.asset` | string | `'VET'`, `'VTHO'`, or token contract address |
| `payload.nonce` | string | Unique nonce to prevent replay attacks |
| `payload.validUntil` | number | Unix timestamp when payment expires |

### Generate Nonce

Nonces prevent replay attacks. The SDK generates them automatically, but you can also create them manually:

```typescript
import { generateNonce } from '@x402/vechain';

const nonce = generateNonce();
console.log(nonce); // 32-byte hex string: '0x...'
```

## Supported Networks & Assets

### Query Supported Networks

Check what a facilitator supports before making requests:

```typescript
import { getSupported } from '@x402/vechain';

const supported = await getSupported('https://facilitator.example.com');

console.log(supported);
// {
//   networks: [
//     {
//       network: 'eip155:100009',
//       assets: ['VET', 'VTHO']
//     }
//   ],
//   schemes: ['x402']
// }
```

### Network Identifiers

The SDK uses CAIP-2 format for network identifiers:

| Network | CAIP-2 ID | Alternative |
|---------|-----------|-------------|
| VeChain Testnet | `eip155:100009` | `vechain:100009` |
| VeChain Mainnet | `eip155:100010` | `vechain:100010` |

Both formats are supported and normalized internally.

### Asset Identifiers

| Asset | Identifier | Format |
|-------|------------|--------|
| VET (native) | `'VET'` or `'native'` | Native token |
| VTHO | `'VTHO'` | Built-in token |
| VEUSD | `'VEUSD'` | Stablecoin |
| B3TR | `'B3TR'` | VeBetterDAO token |
| Custom VIP-180 | `'0x...'` | Contract address |

## Amount Handling

### Wei Format

All amounts use **wei format** (smallest unit):

```typescript
// VET amounts (18 decimals)
const oneVet = '1000000000000000000';     // 1 VET
const halfVet = '500000000000000000';     // 0.5 VET
const pointOneVet = '100000000000000000'; // 0.1 VET

// VTHO amounts (18 decimals)
const oneVtho = '1000000000000000000';    // 1 VTHO
```

### Convert from Decimal

```typescript
// Helper function to convert decimal to wei
function toWei(amount: string | number, decimals = 18): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  const multiplier = BigInt(10 ** decimals);
  const value = BigInt(Math.floor(num * 10 ** decimals));
  return value.toString();
}

const amount = toWei('1.5', 18);  // '1500000000000000000'
```

### Convert to Decimal

```typescript
// Helper function to convert wei to decimal
function fromWei(amount: string, decimals = 18): string {
  const divisor = BigInt(10 ** decimals);
  const value = BigInt(amount);
  const whole = value / divisor;
  const fraction = value % divisor;
  return `${whole}.${fraction.toString().padStart(decimals, '0')}`;
}

const readable = fromWei('1500000000000000000', 18); // '1.5'
```

## Best Practices

### 1. Always Set Max Amount

Protect users from unexpected charges:

```typescript
const response = await x402Fetch(url, {
  facilitatorUrl,
  wallet,
  maxAmount: '10000000000000000000', // Max 10 VET
});
```

### 2. Handle User Cancellation

Users may cancel payments:

```typescript
try {
  const response = await x402Fetch(url, {
    facilitatorUrl,
    onPaymentRequired: async (requirements) => {
      const approved = await showPaymentConfirmation(requirements);
      if (!approved) {
        throw new Error('Payment cancelled');
      }
      // ... create payment
    },
  });
} catch (error) {
  if (error.message.includes('cancelled')) {
    console.log('Payment cancelled by user');
  }
}
```

### 3. Check Wallet Before Requests

Verify wallet connection before making paid requests:

```typescript
const wallet = autoDetectWallet();

if (!wallet) {
  showWalletInstallPrompt();
  return;
}

const isConnected = await wallet.isConnected();
if (!isConnected) {
  await wallet.connect?.();
}

// Now make paid request
const response = await x402Fetch(url, { facilitatorUrl, wallet });
```

### 4. Show Clear Payment UI

Always inform users before charging:

```typescript
async function showPaymentDialog(requirements: PaymentRequirements) {
  const option = requirements.paymentOptions[0];
  
  return confirm(
    `Pay ${fromWei(option.amount)} ${option.asset} to ${requirements.merchantId}?`
  );
}
```

### 5. Use Environment-Specific Networks

```typescript
const network = process.env.NODE_ENV === 'production'
  ? 'eip155:100010'  // Mainnet
  : 'eip155:100009'; // Testnet
```

### 6. Retry Failed Requests

The SDK retries automatically, but you can customize:

```typescript
const response = await x402Fetch(url, {
  facilitatorUrl,
  wallet,
  maxRetries: 3,  // Retry up to 3 times
});
```

## TypeScript Types

The SDK is fully typed. Import types for better IDE support:

```typescript
import type {
  PaymentRequirements,
  PaymentOption,
  PaymentPayload,
  WalletAdapter,
  X402FetchOptions,
  SupportedResponse,
} from '@x402/vechain';

// Use types in your code
const requirements: PaymentRequirements = {
  paymentOptions: [{
    network: 'eip155:100009',
    asset: 'VET',
    amount: '1000000000000000000',
    recipient: '0x...',
  }],
  merchantId: 'my-service',
};
```

## Examples

### React Integration

```typescript
import { useState, useEffect } from 'react';
import { x402Fetch, autoDetectWallet } from '@x402/vechain';

function PremiumContent() {
  const [wallet, setWallet] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const w = autoDetectWallet();
    if (w) setWallet(w);
  }, []);

  const fetchContent = async () => {
    if (!wallet) {
      alert('Please install VeWorld or VeChain Sync');
      return;
    }

    setLoading(true);
    try {
      const response = await x402Fetch('https://api.example.com/premium', {
        facilitatorUrl: 'https://facilitator.example.com',
        wallet,
        maxAmount: '5000000000000000000', // Max 5 VET
      });
      
      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error('Failed to fetch:', error);
      alert('Payment failed or cancelled');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button onClick={fetchContent} disabled={loading || !wallet}>
        {loading ? 'Processing...' : 'Buy Premium Content'}
      </button>
      {data && <pre>{JSON.stringify(data, null, 2)}</pre>}
    </div>
  );
}
```

### Vue Integration

```vue
<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { x402Fetch, autoDetectWallet } from '@x402/vechain';

const wallet = ref(null);
const data = ref(null);
const loading = ref(false);

onMounted(() => {
  wallet.value = autoDetectWallet();
});

async function fetchPremium() {
  if (!wallet.value) {
    alert('No wallet found');
    return;
  }

  loading.value = true;
  try {
    const response = await x402Fetch('https://api.example.com/premium', {
      facilitatorUrl: 'https://facilitator.example.com',
      wallet: wallet.value,
      maxAmount: '5000000000000000000',
    });
    
    data.value = await response.json();
  } catch (error) {
    console.error(error);
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <button @click="fetchPremium" :disabled="loading || !wallet">
    Buy Premium Content
  </button>
  <pre v-if="data">{{ data }}</pre>
</template>
```

### Node.js Integration (Testing)

```typescript
import { x402Fetch, PrivateKeyWalletAdapter } from '@x402/vechain';

// For testing only - use wallet in browser
const wallet = new PrivateKeyWalletAdapter(process.env.PRIVATE_KEY);

const response = await x402Fetch('https://api.example.com/data', {
  facilitatorUrl: 'https://facilitator.example.com',
  wallet,
});

const data = await response.json();
console.log(data);
```

## Troubleshooting

### Wallet Not Detected

```typescript
const wallets = detectWallets();
if (wallets.length === 0) {
  console.log('No wallet found. Please install:');
  console.log('- VeWorld: https://www.veworld.com/');
  console.log('- VeChain Sync: https://sync.vecha.in/');
}
```

### Payment Rejected

Check the error message:

```typescript
try {
  await x402Fetch(url, options);
} catch (error) {
  if (error.message.includes('Max amount exceeded')) {
    console.log('Price is higher than your maximum');
  } else if (error.message.includes('Invalid signature')) {
    console.log('Payment signature verification failed');
  } else {
    console.log('Unknown error:', error.message);
  }
}
```

### Network Mismatch

Ensure your wallet and API use the same network:

```typescript
const supported = await getSupported(facilitatorUrl);
console.log('Supported networks:', supported.networks);

// Use a supported network
const network = supported.networks[0].network;
```

## Next Steps

- [Server SDK](/sdk/server) - Learn how to verify payments on the server
- [Wallet Integration](/sdk/wallets) - Deep dive into wallet connections
- [API Reference](/api/overview) - Explore facilitator API endpoints
- [Examples](https://github.com/ashutoshpw/x402-vechain/tree/main/examples) - Complete working examples
