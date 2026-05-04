---
title: "Payment Signature Verification"
description: "x402 payment payload signing and verification using secp256k1, CAIP-2 network identifiers, and nonce-based replay protection"
category: "api"
---

# Payment Signature Verification

The payment verification system implements the x402 specification for VeChain transactions. It enables secure, signature-based payment validation without requiring on-chain transaction submission first.

## Overview

Verification is handled by `PaymentVerificationService` (`apps/api/src/services/PaymentVerificationService.ts`) and performs:

1. Payload structure validation
2. CAIP-2 network identifier parsing
3. Network support validation
4. Timestamp expiration check
5. Token address validation
6. Signature verification and address recovery (secp256k1)
7. Nonce uniqueness check
8. Payment details matching
9. Nonce caching to prevent reuse

## PaymentPayload Interface

```typescript
interface PaymentPayload {
  signature: string; // secp256k1 signature in hex format (0x prefixed, 130 chars)
  payload: {
    scheme: 'exact';
    network: string;      // CAIP-2 identifier, e.g. 'vechain:100009'
    payTo: string;        // recipient address
    amount: string;       // amount in wei
    asset: string;        // 'native' | 'VET' | 'VTHO' | token contract address
    nonce: string;        // unique nonce for replay protection
    validUntil: number;   // Unix timestamp (seconds)
  };
}
```

## Creating a Signed Payment Payload

```typescript
import { Secp256k1, Keccak256, Hex } from '@vechain/sdk-core';

// 1. Create the payload
const payload = {
  scheme: 'exact',
  network: 'vechain:100009', // also accepts 'eip155:100009'
  payTo: '0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed',
  amount: '1000000000000000000', // 1 VET in wei
  asset: 'native',
  nonce: `nonce-${Date.now()}-${Math.random()}`,
  validUntil: Math.floor(Date.now() / 1000) + 3600, // 1 hour
};

// 2. Hash the payload
const message = JSON.stringify(payload);
const messageHash = Keccak256.of(Buffer.from(message)).bytes;

// 3. Sign with private key
const privateKeyBytes = Hex.of(process.env.PRIVATE_KEY!).bytes;
const signature = Secp256k1.sign(messageHash, privateKeyBytes);

// 4. Build the signed payload
const signedPayload = {
  signature: '0x' + Buffer.from(signature).toString('hex'),
  payload,
};

// 5. Base64 encode for API submission
const payloadBase64 = Buffer.from(JSON.stringify(signedPayload)).toString('base64');
```

## Verifying via API

### Request

```
POST /verify
Content-Type: application/json
```

```json
{
  "paymentPayload": "<base64-encoded-signed-payload>",
  "paymentRequirements": {
    "merchantId": "merchant-123",
    "paymentOptions": [
      {
        "network": "vechain:100009",
        "asset": "native",
        "amount": "1000000000000000000",
        "recipient": "0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed"
      }
    ],
    "expiresAt": "2026-01-19T00:00:00Z"
  }
}
```

### Successful Response

```json
{ "isValid": true }
```

### Failed Response Examples

```json
{ "isValid": false, "invalidReason": "Payment payload has expired" }
{ "isValid": false, "invalidReason": "Nonce has already been used" }
{ "isValid": false, "invalidReason": "Signature verification failed: Invalid signature" }
```

## Asset Types

| Value | Description |
|-------|-------------|
| `"native"` or `"VET"` | VeChain's native token |
| `"VTHO"` | VeThor energy token |
| `"0x..."` | VIP-180 token contract address (42 chars hex) |

## Security Features

### Signature Verification (secp256k1)
- Uses VeChain SDK's `Secp256k1.recover()` to recover the signer's public key
- Derives Ethereum-compatible address from public key
- Validates signature matches the payload hash

### Replay Attack Prevention
- Each payload requires a unique nonce
- Used nonces are stored in PostgreSQL with a unique constraint
- Concurrent requests with the same nonce are both rejected at the database level

### Timestamp Validation
- Payloads must include a `validUntil` Unix timestamp
- Server rejects expired payloads immediately

### Network Validation
- Supports CAIP-2 identifiers in both `vechain:X` and `eip155:X` formats
- Validated against the `SUPPORTED_NETWORKS` list in `apps/api/src/config/vechain.ts`

### Deterministic Hashing
- Uses explicit key ordering in JSON serialization
- Ensures consistent hash generation across client and server
- Keccak256 hashing (Ethereum-compatible)

## Database Schema

```sql
CREATE TABLE nonces (
  id UUID PRIMARY KEY,
  wallet_address VARCHAR(42) NOT NULL,
  nonce VARCHAR(255) NOT NULL,
  used_at TIMESTAMP NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL,
  UNIQUE (wallet_address, nonce)
);

CREATE INDEX wallet_nonce_idx ON nonces(wallet_address, nonce);
CREATE INDEX expires_at_idx ON nonces(expires_at);
```

## Error Reference

| Error Message | Cause |
|---------------|-------|
| `"Invalid payment payload: Unable to parse JSON"` | Malformed JSON |
| `"Missing signature or payload"` | Incomplete payload structure |
| `"Invalid payment scheme. Only 'exact' is supported"` | Wrong scheme |
| `"Invalid CAIP-2 network identifier"` | Malformed network ID |
| `"Unsupported network"` | Network not in supported list |
| `"Payment payload has expired"` | Timestamp validation failed |
| `"Invalid token address"` | Malformed or invalid token address |
| `"Signature verification failed"` | Invalid signature or recovery error |
| `"Nonce has already been used"` | Replay attack detected |
| `"Payment details do not match any payment requirements"` | Amount/recipient/asset mismatch |

## Deployment Notes

1. Run migration to add unique nonce constraint: `npm run db:push`
2. Ensure `DATABASE_URL` environment variable is set
3. Configure `SUPPORTED_NETWORKS` in `apps/api/src/config/vechain.ts` for production
4. Monitor nonce table size and implement a cleanup job for expired entries
