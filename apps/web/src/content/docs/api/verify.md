---
title: POST /verify
description: Verify payment without settlement
---

Validates a payment payload against payment requirements without submitting it to the blockchain. Use this endpoint to check if a payment is valid before settlement.

## Endpoint

```
POST /verify
```

## Request

### Headers

```http
Content-Type: application/json
```

### Body

```json
{
  "paymentPayload": "base64-encoded-string",
  "paymentRequirements": {
    "paymentOptions": [
      {
        "network": "eip155:100009",
        "asset": "VET",
        "amount": "100000000000000000",
        "recipient": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
      }
    ],
    "merchantId": "merchant123",
    "merchantUrl": "https://example.com",
    "expiresAt": "2024-12-31T23:59:59Z"
  }
}
```

### Request Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `paymentPayload` | String | Yes | Base64-encoded payment payload |
| `paymentRequirements` | Object | Yes | Payment requirements |
| `paymentRequirements.paymentOptions` | Array | Yes | Acceptable payment options |
| `paymentRequirements.paymentOptions[].network` | String | Yes | CAIP-2 network identifier |
| `paymentRequirements.paymentOptions[].asset` | String | Yes | Asset identifier |
| `paymentRequirements.paymentOptions[].amount` | String | Yes | Amount in wei (string) |
| `paymentRequirements.paymentOptions[].recipient` | String | Yes | Payment recipient address |
| `paymentRequirements.merchantId` | String | Yes | Merchant identifier |
| `paymentRequirements.merchantUrl` | String | No | Merchant website URL |
| `paymentRequirements.expiresAt` | String | No | ISO 8601 expiration timestamp |

## Response

### Success (200 OK) - Valid Payment

```json
{
  "isValid": true
}
```

### Success (200 OK) - Invalid Payment

```json
{
  "isValid": false,
  "invalidReason": "Payment amount does not match requirements"
}
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `isValid` | Boolean | Whether the payment is valid |
| `invalidReason` | String | Reason for invalidity (only if `isValid: false`) |

## Validation Checks

The `/verify` endpoint performs these validations:

1. **Network Support** - Network is supported by facilitator
2. **Asset Support** - Asset is supported on the network
3. **Amount Match** - Payment amount matches at least one payment option
4. **Recipient Match** - Payment recipient matches requirement
5. **Signature Valid** - Payment signature is cryptographically valid
6. **Not Expired** - Payment hasn't expired (if `validUntil` is set)
7. **Nonce Unused** - Payment nonce hasn't been used before (replay protection)

## Invalid Reasons

Common `invalidReason` values:

| Reason | Description |
|--------|-------------|
| `No supported network found in payment options` | Network not supported |
| `Asset not supported on network` | Asset not available |
| `Payment amount does not match requirements` | Amount mismatch |
| `Payment recipient does not match requirements` | Recipient mismatch |
| `Invalid payment signature` | Signature verification failed |
| `Payment has expired` | Payment past `validUntil` timestamp |
| `Payment nonce already used` | Replay attack detected |

## Example Usage

### Using the SDK

```typescript
import { verifyPayment, createPaymentPayload } from '@x402/vechain';

// Create payment payload
const payload = await createPaymentPayload(
  {
    network: 'eip155:100009',
    recipient: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
    amount: '100000000000000000',
    asset: 'VET',
  },
  privateKey
);

// Encode payload
const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64');

// Verify payment
const result = await verifyPayment(
  'https://facilitator.example.com',
  encodedPayload,
  {
    paymentOptions: [{
      network: 'eip155:100009',
      asset: 'VET',
      amount: '100000000000000000',
      recipient: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
    }],
    merchantId: 'my-shop',
  }
);

if (result.isValid) {
  console.log('Payment is valid!');
} else {
  console.log('Invalid payment:', result.invalidReason);
}
```

### Using cURL

```bash
curl -X POST https://facilitator.example.com/verify \
  -H "Content-Type: application/json" \
  -d '{
    "paymentPayload": "eyJzaWduYXR1cmUiOiIweDEyMy4uLiJ9",
    "paymentRequirements": {
      "paymentOptions": [{
        "network": "eip155:100009",
        "asset": "VET",
        "amount": "100000000000000000",
        "recipient": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
      }],
      "merchantId": "merchant123"
    }
  }'
```

## Error Responses

### 400 Bad Request

Invalid request format or missing required fields.

```json
{
  "error": "Invalid request",
  "details": "paymentPayload is required"
}
```

### 500 Internal Server Error

```json
{
  "error": "Internal server error"
}
```

## Use Cases

### Pre-Settlement Validation

Verify payment before calling `/settle` to avoid unnecessary blockchain submissions:

```typescript
// 1. Verify payment first
const verification = await verifyPayment(facilitatorUrl, payload, requirements);

if (!verification.isValid) {
  console.error('Invalid payment:', verification.invalidReason);
  return;
}

// 2. Only settle if valid
const settlement = await settlePayment(facilitatorUrl, payload, requirements);
```

### Client-Side Validation

Check payment correctness before asking user to submit:

```typescript
async function validateBeforeSubmit(payload, requirements) {
  const result = await verifyPayment(facilitatorUrl, payload, requirements);
  
  if (!result.isValid) {
    alert(`Payment invalid: ${result.invalidReason}`);
    return false;
  }
  
  return true;
}
```

## Rate Limiting

This endpoint is subject to rate limiting. See [API Overview](/api/overview#rate-limiting) for details.

## Next Steps

- [POST /settle](/api/settle) - Submit payment to blockchain
- [Error Codes](/api/errors) - Complete error reference
- [Client SDK](/sdk/client) - Use the SDK for easier integration
