---
title: POST /settle
description: Submit payment to VeChain blockchain
---

Submits a signed payment transaction to the VeChain blockchain and waits for confirmation. This endpoint performs verification and then broadcasts the transaction.

## Endpoint

```
POST /settle
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
    "merchantUrl": "https://example.com"
  }
}
```

### Request Fields

Same as [POST /verify](/api/verify#request-fields), with additional support for fee delegation payloads.

### Fee Delegation Payload

When using fee delegation, the `paymentPayload` should contain:

```json
{
  "senderSignedTransaction": "0x...",
  "senderAddress": "0x..."
}
```

See [Fee Delegation](/guides/fee-delegation) for details.

## Response

### Success (200 OK)

```json
{
  "success": true,
  "transactionHash": "0x1f1f1532fe47a8127a8629a177fdc4dbb08d4bf20c155434f6c0ecd1251c91d0",
  "networkId": "eip155:100009"
}
```

### Failure (200 OK)

```json
{
  "success": false,
  "networkId": "eip155:100009",
  "error": "Insufficient balance for transfer"
}
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `success` | Boolean | Whether settlement succeeded |
| `transactionHash` | String | Transaction hash (if successful) |
| `networkId` | String | CAIP-2 network identifier |
| `error` | String | Error description (if failed) |

## Settlement Process

1. **Decode Payload** - Decode base64 payment payload
2. **Verify Payment** - Run all verification checks (same as `/verify`)
3. **Build Transaction** - Construct VeChain transaction
4. **Submit to Blockchain** - Broadcast transaction to VeChain node
5. **Wait for Confirmation** - Wait for transaction receipt
6. **Return Result** - Return transaction hash or error

## Transaction Confirmation

The endpoint waits for transaction confirmation before returning. This ensures the payment is finalized on-chain.

**Typical confirmation time**: 10-30 seconds on VeChain

## Example Usage

### Using the SDK

```typescript
import { settlePayment, createPaymentPayloadWithWallet, VeWorldWalletAdapter } from '@x402/vechain';

// Create wallet adapter
const wallet = new VeWorldWalletAdapter();
await wallet.connect();

// Create payment payload
const payload = await createPaymentPayloadWithWallet(
  {
    network: 'eip155:100009',
    recipient: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
    amount: '100000000000000000',
    asset: 'VET',
  },
  wallet
);

// Encode payload
const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64');

// Settle payment
const result = await settlePayment(
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

if (result.success) {
  console.log('Payment settled! TX:', result.transactionHash);
} else {
  console.error('Settlement failed:', result.error);
}
```

### Using cURL

```bash
curl -X POST https://facilitator.example.com/settle \
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

```json
{
  "error": "Invalid request",
  "details": "paymentPayload is required"
}
```

### 403 Forbidden

Payment failed verification:

```json
{
  "error": "Payment verification failed",
  "reason": "Payment amount does not match requirements"
}
```

### 500 Internal Server Error

```json
{
  "error": "Failed to submit transaction to blockchain"
}
```

## Common Settlement Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `Insufficient balance for transfer` | Not enough VET/tokens | Fund sender wallet |
| `Insufficient VTHO for gas` | Not enough VTHO for gas fees | Add VTHO or use fee delegation |
| `Transaction reverted` | Smart contract error | Check token contract |
| `Payment nonce already used` | Duplicate transaction | Use new nonce |
| `Payment has expired` | `validUntil` timestamp passed | Create new payment |

## Fee Delegation

When fee delegation is enabled, users can submit transactions without VTHO for gas. The facilitator sponsors the gas fees.

### Request with Fee Delegation

```typescript
import { Transaction } from '@vechain/sdk-core';

// Create transaction with delegation flag
const txBody = {
  chainTag: 39,
  blockRef: '0x...',
  expiration: 32,
  clauses: [{
    to: recipient,
    value: amount,
    data: '0x',
  }],
  gasPriceCoef: 0,
  gas: 21000,
  dependsOn: null,
  nonce: Date.now(),
  reserved: {
    features: 1,  // Enable fee delegation
  },
};

// Sign as sender
const tx = new Transaction(txBody);
const signed = tx.signAsSender(privateKey);

// Create payload
const payload = {
  senderSignedTransaction: '0x' + Buffer.from(signed.encoded).toString('hex'),
  senderAddress: senderAddress,
};

// Submit to /settle
```

See [Fee Delegation Guide](/guides/fee-delegation) for complete examples.

## Verifying Settlement

After settlement, verify the transaction on VeChain blockchain:

```typescript
import { ThorClient } from '@vechain/sdk-network';

const thor = ThorClient.fromUrl('https://testnet.vechain.org');

// Get transaction receipt
const receipt = await thor.transactions.getTransactionReceipt(
  result.transactionHash
);

console.log('Transaction status:', receipt?.reverted ? 'Failed' : 'Success');
console.log('Gas used:', receipt?.gasUsed);
```

## Rate Limiting

This endpoint is subject to rate limiting. See [API Overview](/api/overview#rate-limiting) for details.

### Fee Delegation Rate Limits

When using fee delegation, additional rate limits apply:

- **Per Address**: 10 transactions per hour (configurable)
- **Per Transaction**: Maximum VTHO limit (default: 10 VTHO)

## Next Steps

- [Fee Delegation Endpoints](/api/fee-delegation) - Monitor delegation usage
- [Fee Delegation Guide](/guides/fee-delegation) - Learn about fee delegation
- [Error Codes](/api/errors) - Complete error reference
- [Troubleshooting](/troubleshooting/errors) - Common issues and solutions
