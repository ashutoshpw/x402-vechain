# Payment Signature Verification - Usage Example

This document demonstrates how to create and verify signed payment payloads using the x402 protocol.

## Overview

The payment signature verification logic implements the x402 spec for VeChain transactions with:
- Signature verification using secp256k1
- CAIP-2 network identifier parsing (`vechain:100009` or `eip155:100009`)
- Payload structure validation
- Nonce-based replay attack prevention
- Timestamp validation
- Token contract address validation for VIP-180 tokens

## Creating a Signed Payment Payload

```javascript
import { Secp256k1, Keccak256, Hex } from '@vechain/sdk-core';

// 1. Create the payment payload
const payload = {
  scheme: 'exact',
  network: 'vechain:100009', // VeChain testnet (also accepts 'eip155:100009')
  payTo: '0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed', // Recipient address
  amount: '1000000000000000000', // 1 VET in wei
  asset: 'native', // or 'VET', 'VTHO', or a token contract address
  nonce: `nonce-${Date.now()}-${Math.random()}`, // Unique nonce
  validUntil: Math.floor(Date.now() / 1000) + 3600, // Valid for 1 hour
};

// 2. Hash the payload
const message = JSON.stringify(payload);
const messageHash = Keccak256.of(Buffer.from(message)).bytes;

// 3. Sign with private key
const privateKey = 'your-private-key-hex'; // 64 character hex string
const privateKeyBytes = Hex.of(privateKey).bytes;
const signature = Secp256k1.sign(messageHash, privateKeyBytes);

// 4. Create the final signed payload
const signedPayload = {
  signature: '0x' + Buffer.from(signature).toString('hex'),
  payload,
};

// 5. Base64 encode for API submission
const payloadBase64 = Buffer.from(JSON.stringify(signedPayload)).toString('base64');
```

## Verifying a Payment Payload

### Request to `/verify` endpoint:

```json
POST /verify
Content-Type: application/json

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

### Successful Response:

```json
{
  "isValid": true
}
```

### Failed Response Examples:

```json
{
  "isValid": false,
  "invalidReason": "Payment payload has expired"
}
```

```json
{
  "isValid": false,
  "invalidReason": "Nonce has already been used"
}
```

```json
{
  "isValid": false,
  "invalidReason": "Signature verification failed: Invalid signature"
}
```

## Security Features

### 1. Signature Verification
- Uses secp256k1 elliptic curve cryptography (same as Ethereum/VeChain)
- Recovers signer address from signature
- Validates that signature matches the payload data

### 2. Nonce-Based Replay Protection
- Each payment payload must have a unique nonce
- Used nonces are cached in the database
- Prevents the same signed payload from being submitted multiple times

### 3. Timestamp Validation
- Payloads must include a `validUntil` timestamp
- Server rejects expired payloads
- Protects against replay attacks with old signatures

### 4. Network Validation
- Supports CAIP-2 network identifiers
- Accepts both `vechain:100009` and `eip155:100009` formats
- Validates network against supported networks list

### 5. Token Address Validation
- Validates VIP-180 token contract addresses
- Accepts `native`, `VET`, `VTHO` keywords
- Validates contract addresses are properly formatted

## Payload Structure Details

### Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `signature` | string | secp256k1 signature in hex format (0x prefixed, 130 chars) |
| `payload.scheme` | string | Must be "exact" |
| `payload.network` | string | CAIP-2 network identifier (e.g., "vechain:100009") |
| `payload.payTo` | string | Recipient address (0x prefixed, 42 chars) |
| `payload.amount` | string | Amount in wei (string to handle large numbers) |
| `payload.asset` | string | "native", "VET", "VTHO", or token contract address |
| `payload.nonce` | string | Unique identifier to prevent replay attacks |
| `payload.validUntil` | number | Unix timestamp (seconds since epoch) |

### Asset Types

- `"native"` or `"VET"` - VeChain's native token
- `"VTHO"` - VeThor energy token
- `"0x..."` - VIP-180 token contract address (42 chars hex)

## Complete Example

```javascript
// Full example: Create, sign, and submit a payment payload

const { Secp256k1, Keccak256, Hex } = require('@vechain/sdk-core');
const fetch = require('node-fetch');

async function createAndVerifyPayment() {
  // Step 1: Create payload
  const payload = {
    scheme: 'exact',
    network: 'vechain:100009',
    payTo: '0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed',
    amount: '1000000000000000000', // 1 VET
    asset: 'native',
    nonce: `payment-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    validUntil: Math.floor(Date.now() / 1000) + 3600, // 1 hour
  };

  // Step 2: Hash payload
  const message = JSON.stringify(payload);
  const messageHash = Keccak256.of(Buffer.from(message)).bytes;

  // Step 3: Sign
  const privateKey = process.env.PRIVATE_KEY; // Load securely
  const privateKeyBytes = Hex.of(privateKey).bytes;
  const signature = Secp256k1.sign(messageHash, privateKeyBytes);

  // Step 4: Create signed payload
  const signedPayload = {
    signature: '0x' + Buffer.from(signature).toString('hex'),
    payload,
  };

  // Step 5: Encode to base64
  const payloadBase64 = Buffer.from(JSON.stringify(signedPayload)).toString('base64');

  // Step 6: Submit to API
  const response = await fetch('http://localhost:3000/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      paymentPayload: payloadBase64,
      paymentRequirements: {
        merchantId: 'merchant-123',
        paymentOptions: [{
          network: 'vechain:100009',
          asset: 'native',
          amount: '1000000000000000000',
          recipient: '0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed',
        }],
      },
    }),
  });

  const result = await response.json();
  console.log('Verification result:', result);
  
  return result.isValid;
}

createAndVerifyPayment()
  .then(isValid => console.log('Payment valid:', isValid))
  .catch(err => console.error('Error:', err));
```

## Error Handling

The verification service performs comprehensive validation and returns specific error messages:

- `"Invalid payment payload: Unable to parse JSON"` - Malformed JSON
- `"Missing signature or payload"` - Incomplete payload structure
- `"Invalid payment scheme. Only 'exact' is supported"` - Wrong scheme
- `"Invalid CAIP-2 network identifier"` - Malformed network ID
- `"Unsupported network"` - Network not in supported list
- `"Payment payload has expired"` - Timestamp validation failed
- `"Invalid token address"` - Malformed or invalid token address
- `"Signature verification failed"` - Invalid signature or recovery error
- `"Nonce has already been used"` - Replay attack detected
- `"Payment details do not match any payment requirements"` - Amount/recipient/asset mismatch
