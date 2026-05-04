---
title: "SDK Wallet Integration"
description: "Client-side x402fetch wrapper with VeChain wallet adapters — VeWorld, Connex/Sync2, and PrivateKey (dev only)"
category: "sdk"
---

# SDK Wallet Integration

The `@x402/vechain` SDK provides a flexible wallet adapter system and an enhanced `x402Fetch` that automatically handles 402 payment responses using a connected wallet.

## Wallet Adapters

All adapters implement the `WalletAdapter` interface:

```typescript
interface WalletAdapter {
  getAddress(): Promise<string>;
  signMessageHash(hash: Uint8Array): Promise<string>;
  isConnected(): boolean;
  connect?(): Promise<void>;
}
```

### ConnexWalletAdapter
- Supports VeChain Sync and Sync2 desktop wallets
- Uses the Connex framework (`window.connex`)
- Implements certificate-based authentication

### VeWorldWalletAdapter
- Supports VeWorld browser extension and mobile app
- Uses VeWorld's wallet API (`window.vechain`)
- Implements `wallet_connect` connection flow and `personal_sign` for signing

### PrivateKeyWalletAdapter
- For development and testing only
- Uses raw private keys; derives address via VeChain SDK
- **Never use in production**

## Wallet Detection

```typescript
import { detectWallets, autoDetectWallet } from '@x402/vechain';

// Returns array of available wallet types
const available = detectWallets(); // e.g. ['veworld', 'connex']

// Auto-creates adapter, prioritizing VeWorld, falling back to Connex
const wallet = autoDetectWallet(); // returns null if no wallet detected
```

## Enhanced x402Fetch

```typescript
import { x402Fetch, autoDetectWallet } from '@x402/vechain';

const wallet = autoDetectWallet();

const response = await x402Fetch('https://api.example.com/premium', {
  facilitatorUrl: 'https://facilitator.example.com',
  wallet,                              // auto-signs payment when 402 received
  maxAmount: '1000000000000000000',   // optional: max 1 VET
});
```

**New options added to `X402FetchOptions`:**

| Option | Type | Description |
|--------|------|-------------|
| `wallet` | `WalletAdapter` | Wallet to automatically sign payments |
| `maxAmount` | `string` | Maximum payment amount in wei (prevents overpayment) |

All existing `onPaymentRequired` callbacks continue to work unchanged.

## Usage Examples

### Auto-Detect (Recommended)
```typescript
import { x402Fetch, autoDetectWallet } from '@x402/vechain';

const wallet = autoDetectWallet();
if (!wallet) {
  console.error('No VeChain wallet detected. Install VeWorld or VeChain Sync.');
  return;
}

const response = await x402Fetch('https://api.example.com/premium-data', {
  facilitatorUrl: 'https://facilitator.example.com',
  wallet,
  maxAmount: '1000000000000000000',
});
```

### Explicit VeWorld
```typescript
import { x402Fetch, VeWorldWalletAdapter } from '@x402/vechain';

const wallet = new VeWorldWalletAdapter();
await wallet.connect();

const response = await x402Fetch(url, { facilitatorUrl, wallet });
```

### Explicit Connex
```typescript
import { x402Fetch, ConnexWalletAdapter } from '@x402/vechain';

const wallet = new ConnexWalletAdapter(); // uses window.connex
const response = await x402Fetch(url, { facilitatorUrl, wallet });
```

### Custom Payment Handler with Wallet
```typescript
import { x402Fetch, autoDetectWallet, createPaymentPayloadWithWallet } from '@x402/vechain';

const wallet = autoDetectWallet();

const response = await x402Fetch(url, {
  facilitatorUrl,
  onPaymentRequired: async (requirements) => {
    const confirmed = await showPaymentDialog(requirements);
    if (!confirmed) throw new Error('Cancelled');

    return await createPaymentPayloadWithWallet(
      requirements.paymentOptions[0],
      wallet
    );
  },
});
```

## createPaymentPayloadWithWallet

```typescript
createPaymentPayloadWithWallet(
  options: CreatePaymentPayloadOptions,
  wallet: WalletAdapter
): Promise<PaymentPayload>
```

Signs payment payloads using a wallet adapter instead of a raw private key.

## Security Considerations

- Never expose private keys — use wallet adapters in production
- `PrivateKeyWalletAdapter` is for development/testing only
- Wallets require explicit user approval for each signature
- Use `maxAmount` to prevent unexpected overpayment
- Nonce system is built in to prevent replay attacks

## Compatibility

| Wallet | Environment |
|--------|-------------|
| VeWorld browser extension | Browser |
| VeWorld mobile app | Browser (mobile) |
| Connex / VeChain Sync | Browser / Desktop |
| Sync2 desktop | Desktop |
| PrivateKeyWalletAdapter | Node.js (dev only) |
| Custom `WalletAdapter` | Any |

## Relevant Files

| File | Description |
|------|-------------|
| `packages/x402-vechain/src/client/wallets.ts` | Wallet adapter implementations |
| `packages/x402-vechain/src/client/index.ts` | x402Fetch with wallet support |
| `packages/x402-vechain/src/index.ts` | Public exports |
| `packages/x402-vechain/examples/wallet-integration-example.ts` | Full usage examples |
| `packages/x402-vechain/examples/wallet-demo.html` | Interactive browser demo |
