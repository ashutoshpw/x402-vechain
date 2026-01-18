# @x402/vechain

TypeScript/JavaScript SDK for integrating x402 payment protocol with VeChain. Provides both client-side and server-side utilities for building applications that accept VeChain payments.

## Installation

```bash
npm install @x402/vechain
# or
pnpm add @x402/vechain
# or
yarn add @x402/vechain
```

## Features

- 🔐 **Type-safe**: Full TypeScript support with complete type definitions
- 🌐 **Client SDK**: Browser wallet integration with automatic payment handling
- 💼 **Wallet Support**: VeWorld, Connex (Sync/Sync2), and auto-detection
- 🖥️ **Server SDK**: Hono middleware for payment verification
- ⚡ **x402 Protocol**: Implements the x402 payment protocol specification
- 🔗 **VeChain Native**: Built specifically for VeChain blockchain

## Quick Start

### Client Usage (Browser with Wallet)

```typescript
import { x402Fetch, autoDetectWallet } from '@x402/vechain';

// Auto-detect VeWorld or Connex wallet
const wallet = autoDetectWallet();

// Make a request with automatic payment handling
const response = await x402Fetch('https://api.example.com/premium-content', {
  facilitatorUrl: 'https://facilitator.example.com',
  wallet, // Wallet will automatically sign payment when required
  maxAmount: '1000000000000000000', // Max 1 VET
});

const data = await response.json();
```

### Server Usage (Hono)

```typescript
import { Hono } from 'hono';
import { paymentMiddleware } from '@x402/vechain';

const app = new Hono();

// Apply payment middleware to protected routes
app.use('/premium/*', paymentMiddleware({
  facilitatorUrl: 'https://facilitator.example.com',
  getPaymentRequirements: (c) => ({
    paymentOptions: [{
      network: 'eip155:100009', // VeChain testnet
      asset: 'VET',
      amount: '1000000000000000000', // 1 VET in wei
      recipient: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
    }],
    merchantId: 'my-service',
    merchantUrl: 'https://example.com',
  }),
  onPaymentVerified: async (c, verification) => {
    // Store payment info, update credits, etc.
    console.log('Payment from:', verification.senderAddress);
  },
}));

// Protected route - only accessible with valid payment
app.get('/premium/content', (c) => {
  return c.json({ data: 'Premium content' });
});

export default app;
```

## Wallet Integration

The SDK provides first-class support for VeChain wallets with automatic payment signing.

### Auto-Detect Wallet

```typescript
import { x402Fetch, autoDetectWallet } from '@x402/vechain';

// Automatically detect and connect to VeWorld or Connex
const wallet = autoDetectWallet();

if (wallet) {
  const response = await x402Fetch('https://api.example.com/premium', {
    facilitatorUrl: 'https://facilitator.example.com',
    wallet, // Payment automatically signed by wallet
    maxAmount: '1000000000000000000', // Optional: Max 1 VET
  });
}
```

### VeWorld Wallet

```typescript
import { x402Fetch, VeWorldWalletAdapter } from '@x402/vechain';

// Create VeWorld wallet adapter
const wallet = new VeWorldWalletAdapter();

// Connect to wallet
await wallet.connect();

// Use with x402Fetch
const response = await x402Fetch('https://api.example.com/premium', {
  facilitatorUrl: 'https://facilitator.example.com',
  wallet,
});
```

### Connex Wallet (VeChain Sync/Sync2)

```typescript
import { x402Fetch, ConnexWalletAdapter } from '@x402/vechain';

// Use window.connex (automatically available in VeChain Sync)
const wallet = new ConnexWalletAdapter();

// Or provide your own Connex instance
// const connex = new Connex({ node: '...', network: 'test' });
// const wallet = new ConnexWalletAdapter(connex);

const response = await x402Fetch('https://api.example.com/premium', {
  facilitatorUrl: 'https://facilitator.example.com',
  wallet,
});
```

### Detect Available Wallets

```typescript
import { detectWallets } from '@x402/vechain';

// Returns array of available wallet types: ['veworld', 'connex']
const availableWallets = detectWallets();

if (availableWallets.includes('veworld')) {
  console.log('VeWorld is available');
}
```

### Custom Payment Handler with Wallet

For more control over the payment flow (e.g., showing a confirmation UI):

```typescript
import { x402Fetch, createPaymentPayloadWithWallet, autoDetectWallet } from '@x402/vechain';

const wallet = autoDetectWallet();

const response = await x402Fetch('https://api.example.com/premium', {
  facilitatorUrl: 'https://facilitator.example.com',
  onPaymentRequired: async (requirements) => {
    // Show payment UI
    const confirmed = await showPaymentDialog(requirements);
    
    if (!confirmed) {
      throw new Error('Payment cancelled by user');
    }
    
    // Use wallet to sign payment
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

## API Reference

### Client Functions

#### `createPaymentPayloadWithWallet(options, wallet)`

Creates a signed payment payload using a wallet adapter.

**Parameters:**
- `options: CreatePaymentPayloadOptions`
  - `network: string` - CAIP-2 network identifier (e.g., 'eip155:100009')
  - `recipient: string` - Payment recipient address
  - `amount: string` - Amount in wei
  - `asset: string` - Asset identifier ('VET', 'VTHO', or token address)
  - `validityDuration?: number` - Validity period in seconds (default: 300)
- `wallet: WalletAdapter` - Wallet adapter instance (VeWorld, Connex, etc.)

**Returns:** `Promise<PaymentPayload>`

**Example:**
```typescript
import { createPaymentPayloadWithWallet, VeWorldWalletAdapter } from '@x402/vechain';

const wallet = new VeWorldWalletAdapter();
const payload = await createPaymentPayloadWithWallet(
  {
    network: 'eip155:100009',
    recipient: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
    amount: '1000000000000000000',
    asset: 'VET',
  },
  wallet
);
```

#### `createPaymentPayload(options, privateKey)`

Creates a signed payment payload for the x402 protocol (development/testing).

**Parameters:**
- `options: CreatePaymentPayloadOptions`
  - `network: string` - CAIP-2 network identifier (e.g., 'eip155:100009')
  - `recipient: string` - Payment recipient address
  - `amount: string` - Amount in wei
  - `asset: string` - Asset identifier ('VET', 'VTHO', or token address)
  - `validityDuration?: number` - Validity period in seconds (default: 300)
- `privateKey: string` - Hex-encoded private key (with or without 0x prefix)

**Returns:** `Promise<PaymentPayload>`

**Example:**
```typescript
const payload = await createPaymentPayload(
  {
    network: 'eip155:100009',
    recipient: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
    amount: '1000000000000000000',
    asset: 'VET',
    validityDuration: 600, // 10 minutes
  },
  privateKey
);
```

#### `x402Fetch(url, options)`

Enhanced fetch function with automatic x402 payment handling.

**Parameters:**
- `url: string` - Request URL
- `options: X402FetchOptions`
  - `facilitatorUrl: string` - URL of x402 facilitator
  - `wallet?: WalletAdapter` - Wallet adapter for automatic payment signing
  - `onPaymentRequired?: (requirements: PaymentRequirements) => Promise<PaymentPayload>` - Custom payment handler
  - `maxAmount?: string` - Maximum payment amount in wei
  - `maxRetries?: number` - Maximum retry attempts (default: 1)
  - Plus all standard `fetch` options

**Returns:** `Promise<Response>`

**Example:**
```typescript
import { x402Fetch, autoDetectWallet } from '@x402/vechain';

const wallet = autoDetectWallet();

const response = await x402Fetch('https://api.example.com/data', {
  facilitatorUrl: 'https://facilitator.example.com',
  wallet,
  maxAmount: '1000000000000000000', // Max 1 VET
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ query: 'test' }),
});
```

#### `getSupported(facilitatorUrl)`

Fetches supported networks and assets from a facilitator.

**Parameters:**
- `facilitatorUrl: string` - URL of x402 facilitator

**Returns:** `Promise<SupportedResponse>`

**Example:**
```typescript
const supported = await getSupported('https://facilitator.example.com');
console.log(supported.networks); // [{ network: 'eip155:100009', assets: ['VET', 'VTHO'] }]
```

#### `generateNonce()`

Generates a cryptographically secure random nonce for payment payloads.

**Returns:** `string` - 32-byte hex string

### Wallet Adapters

#### `autoDetectWallet()`

Auto-detect and create a wallet adapter from available wallets in the browser.
Prioritizes VeWorld, then Connex.

**Returns:** `WalletAdapter | null`

**Example:**
```typescript
import { autoDetectWallet } from '@x402/vechain';

const wallet = autoDetectWallet();
if (wallet) {
  const address = await wallet.getAddress();
  console.log('Connected:', address);
}
```

#### `detectWallets()`

Detect which VeChain wallets are available in the browser.

**Returns:** `string[]` - Array of wallet types: `['veworld', 'connex']`

**Example:**
```typescript
import { detectWallets } from '@x402/vechain';

const wallets = detectWallets();
console.log('Available wallets:', wallets);
// Output: ['veworld', 'connex']
```

#### `ConnexWalletAdapter`

Wallet adapter for Connex (VeChain Sync, Sync2).

**Constructor:**
- `new ConnexWalletAdapter(connex?: any)` - Uses `window.connex` if not provided

**Methods:**
- `getAddress(): Promise<string>` - Get connected wallet address
- `signMessageHash(messageHash: Uint8Array): Promise<string>` - Sign a message hash
- `isConnected(): Promise<boolean>` - Check connection status

**Example:**
```typescript
import { ConnexWalletAdapter } from '@x402/vechain';

const wallet = new ConnexWalletAdapter();
const address = await wallet.getAddress();
```

#### `VeWorldWalletAdapter`

Wallet adapter for VeWorld browser extension and mobile app.

**Constructor:**
- `new VeWorldWalletAdapter()` - Uses `window.vechain`

**Methods:**
- `connect(): Promise<void>` - Connect to VeWorld
- `getAddress(): Promise<string>` - Get connected wallet address
- `signMessageHash(messageHash: Uint8Array): Promise<string>` - Sign a message hash
- `isConnected(): Promise<boolean>` - Check connection status

**Example:**
```typescript
import { VeWorldWalletAdapter } from '@x402/vechain';

const wallet = new VeWorldWalletAdapter();
await wallet.connect();
const address = await wallet.getAddress();
```

#### `PrivateKeyWalletAdapter`

Wallet adapter using a private key (for development/testing only).

**Constructor:**
- `new PrivateKeyWalletAdapter(privateKey: string)` - Hex-encoded private key

**Methods:**
- `getAddress(): Promise<string>` - Get address derived from private key
- `signMessageHash(messageHash: Uint8Array): Promise<string>` - Sign with private key
- `isConnected(): Promise<boolean>` - Always returns true

**Example:**
```typescript
import { PrivateKeyWalletAdapter } from '@x402/vechain';

// WARNING: Only for development!
const wallet = new PrivateKeyWalletAdapter(process.env.PRIVATE_KEY);
const address = await wallet.getAddress();
```

#### `WalletAdapter` (Interface)

Base interface for all wallet adapters. Implement this to create custom wallet integrations.

**Methods:**
- `getAddress(): Promise<string>`
- `signMessageHash(messageHash: Uint8Array): Promise<string>`
- `isConnected(): Promise<boolean>`
- `connect?(): Promise<void>` (optional)



#### `paymentMiddleware(options)`

Hono middleware for x402 payment verification.

**Parameters:**
- `options: PaymentMiddlewareOptions`
  - `getPaymentRequirements: (c: Context) => PaymentRequirements | Promise<PaymentRequirements>` - Function to generate payment requirements
  - `verifyPayment?: (payload: PaymentPayload, requirements: PaymentRequirements) => Promise<PaymentVerification>` - Custom verification function
  - `onPaymentVerified?: (c: Context, verification: PaymentVerification) => void | Promise<void>` - Success callback
  - `facilitatorUrl?: string` - URL to delegate verification to facilitator

**Returns:** `MiddlewareHandler`

**Example:**
```typescript
app.use('/api/*', paymentMiddleware({
  facilitatorUrl: 'https://facilitator.example.com',
  getPaymentRequirements: (c) => {
    const path = c.req.path;
    return {
      paymentOptions: [{
        network: 'eip155:100009',
        asset: 'VET',
        amount: '1000000000000000000',
        recipient: process.env.MERCHANT_ADDRESS,
      }],
      merchantId: 'my-merchant-id',
    };
  },
  onPaymentVerified: async (c, verification) => {
    // Log payment
    await db.payments.insert({
      sender: verification.senderAddress,
      timestamp: new Date(),
    });
  },
}));
```

#### `verifyPayment(facilitatorUrl, paymentPayload, requirements)`

Standalone function to verify a payment payload.

**Parameters:**
- `facilitatorUrl: string` - URL of x402 facilitator
- `paymentPayload: string` - Base64-encoded payment payload
- `requirements: PaymentRequirements` - Payment requirements to verify against

**Returns:** `Promise<VerifyResponse>`

**Example:**
```typescript
const result = await verifyPayment(
  'https://facilitator.example.com',
  encodedPayload,
  requirements
);

if (result.isValid) {
  console.log('Payment is valid');
} else {
  console.log('Invalid:', result.invalidReason);
}
```

#### `settlePayment(facilitatorUrl, paymentPayload, requirements)`

Submits payment to blockchain via facilitator.

**Parameters:**
- `facilitatorUrl: string` - URL of x402 facilitator
- `paymentPayload: string` - Base64-encoded payment payload
- `requirements: PaymentRequirements` - Payment requirements

**Returns:** `Promise<SettleResponse>`

**Example:**
```typescript
const result = await settlePayment(
  'https://facilitator.example.com',
  encodedPayload,
  requirements
);

if (result.success) {
  console.log('Transaction hash:', result.transactionHash);
}
```

## TypeScript Types

### Core Types

```typescript
interface PaymentRequirements {
  paymentOptions: PaymentOption[];
  merchantId: string;
  merchantUrl?: string;
  expiresAt?: string;
}

interface PaymentOption {
  network: string; // CAIP-2 identifier
  asset: string;
  amount: string;
  recipient: string;
}

interface PaymentPayload {
  signature: string;
  payload: {
    scheme: 'exact';
    network: string;
    payTo: string;
    amount: string;
    asset: string;
    nonce: string;
    validUntil: number;
  };
}
```

See [src/types/index.ts](./src/types/index.ts) for complete type definitions.

## VeChain Network Identifiers

The SDK uses CAIP-2 format for network identifiers:

- **Testnet**: `eip155:100009`
- **Mainnet**: `eip155:100010`

Alternative format `vechain:100009` is also supported and will be normalized to `eip155:100009`.

## Asset Identifiers

- **VET** (native): Use `'VET'` or `'native'`
- **VTHO**: Use `'VTHO'`
- **VIP-180 Tokens**: Use contract address (e.g., `'0x...'`)

## Security Considerations

1. **Private Keys**: Never expose private keys in client-side code. In production, integrate with wallet providers (VeChain Sync, VeWorld).

2. **Nonce Verification**: The facilitator must track used nonces to prevent replay attacks.

3. **Signature Verification**: The SDK uses secp256k1 signature verification matching VeChain's standards.

4. **Amount Handling**: Always use strings for amounts to avoid precision loss with large numbers.

## Examples

### Complete Client Example

```typescript
import { x402Fetch, createPaymentPayload, getSupported } from '@x402/vechain';

const facilitatorUrl = 'https://facilitator.example.com';

// 1. Check supported networks
const supported = await getSupported(facilitatorUrl);
console.log('Supported:', supported.networks);

// 2. Make request with payment handling
const response = await x402Fetch('https://api.example.com/premium', {
  facilitatorUrl,
  onPaymentRequired: async (requirements) => {
    // Show payment UI to user
    const userApproved = await showPaymentDialog(requirements);
    
    if (!userApproved) {
      throw new Error('Payment cancelled by user');
    }
    
    // Get wallet private key (from VeChain wallet)
    const privateKey = await wallet.getPrivateKey();
    
    // Create payment
    const option = requirements.paymentOptions[0];
    return await createPaymentPayload(
      {
        network: option.network,
        recipient: option.recipient,
        amount: option.amount,
        asset: option.asset,
      },
      privateKey
    );
  },
});

const data = await response.json();
```

### Complete Server Example

```typescript
import { Hono } from 'hono';
import { paymentMiddleware } from '@x402/vechain';

const app = new Hono();

// Public endpoint - no payment required
app.get('/free-content', (c) => {
  return c.json({ message: 'Free content' });
});

// Payment-protected endpoint
app.use('/premium/*', paymentMiddleware({
  facilitatorUrl: 'https://facilitator.example.com',
  getPaymentRequirements: (c) => {
    // Dynamic pricing based on content
    const contentId = c.req.query('id');
    const price = getPriceForContent(contentId);
    
    return {
      paymentOptions: [{
        network: 'eip155:100009',
        asset: 'VET',
        amount: price.toString(),
        recipient: process.env.MERCHANT_ADDRESS!,
      }],
      merchantId: 'my-service',
      merchantUrl: 'https://myservice.com',
    };
  },
  onPaymentVerified: async (c, verification) => {
    // Record payment
    await database.recordPayment({
      sender: verification.senderAddress,
      amount: '1000000000000000000',
      timestamp: new Date(),
    });
  },
}));

app.get('/premium/content', (c) => {
  // Access payment verification from context
  const verification = c.get('paymentVerification');
  
  return c.json({
    content: 'Premium content',
    paidBy: verification.senderAddress,
  });
});

export default app;
```

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## License

ISC

## Related Links

- [x402 Protocol Specification](https://github.com/coinbase/x402)
- [VeChain Documentation](https://docs.vechain.org/)
- [VeChain SDK](https://github.com/vechain/vechain-sdk-js)
- [CAIP-2 Network Identifiers](https://github.com/ChainAgnostic/CAIPs/blob/master/CAIPs/caip-2.md)
