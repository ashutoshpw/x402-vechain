# Fee Delegation Usage Example

This document demonstrates how to use the VTHO fee delegation feature with the x402 VeChain API.

## Prerequisites

- VeChain SDK (`@vechain/sdk-core`, `@vechain/sdk-network`)
- User wallet with VET/VTHO (for payment, not gas)
- Facilitator with fee delegation enabled

## Client-Side Implementation

### 1. Create a Delegated Transaction

```typescript
import { Transaction, Address, Secp256k1 } from '@vechain/sdk-core';
import { ThorClient } from '@vechain/sdk-network';

// Initialize Thor client
const thorClient = ThorClient.fromUrl('https://testnet.vechain.org');

// User's private key (keep secure!)
const userPrivateKey = Buffer.from('YOUR_PRIVATE_KEY', 'hex');

// Create transaction body with delegation flag
const txBody = {
  chainTag: 39, // Testnet chain tag (use 74 for mainnet)
  blockRef: '0x...', // Latest block reference from thor client
  expiration: 32, // Number of blocks the transaction is valid for
  clauses: [
    {
      to: '0xRECIPIENT_ADDRESS', // Payment recipient
      value: '100000000000000000000', // Amount in wei (100 VET)
      data: '0x', // No data for simple transfer
    },
  ],
  gasPriceCoef: 0,
  gas: 21000, // Estimated gas
  dependsOn: null,
  nonce: Date.now(), // Unique nonce
  reserved: {
    features: 1, // Enable VIP-191 fee delegation
  },
};

// Create and sign transaction as sender
const transaction = new Transaction(txBody);
const senderSignedTx = transaction.signAsSender(userPrivateKey);

// Encode the sender-signed transaction
const senderSignedTxHex = '0x' + Buffer.from(senderSignedTx.encoded).toString('hex');

// Get sender address
const senderPublicKey = Secp256k1.derivePublicKey(userPrivateKey);
const senderAddress = Address.ofPublicKey(senderPublicKey).toString();
```

### 2. Submit to Facilitator

```typescript
// Create payment payload
const paymentPayload = {
  senderSignedTransaction: senderSignedTxHex,
  senderAddress: senderAddress,
};

// Encode as base64
const base64Payload = Buffer.from(JSON.stringify(paymentPayload)).toString('base64');

// Submit to /settle endpoint
const response = await fetch('https://your-facilitator.com/settle', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    paymentPayload: base64Payload,
    paymentRequirements: {
      paymentOptions: [
        {
          network: 'eip155:100009', // VeChain testnet
          asset: 'VET',
          amount: '100000000000000000000', // 100 VET
          recipient: '0xRECIPIENT_ADDRESS',
        },
      ],
      merchantId: 'your-merchant-id',
    },
  }),
});

const result = await response.json();

if (result.success) {
  console.log('Transaction submitted:', result.transactionHash);
  console.log('Network:', result.networkId);
} else {
  console.error('Settlement failed:', result.error);
}
```

## Complete Example

```typescript
import { Transaction, Address, Secp256k1 } from '@vechain/sdk-core';
import { ThorClient } from '@vechain/sdk-network';

async function payWithFeeDelegation() {
  // Initialize
  const thorClient = ThorClient.fromUrl('https://testnet.vechain.org');
  const userPrivateKey = Buffer.from(process.env.USER_PRIVATE_KEY!, 'hex');
  
  // Get latest block for blockRef
  const bestBlock = await thorClient.blocks.getBestBlockCompressed();
  if (!bestBlock) {
    throw new Error('Failed to get best block');
  }
  
  // Create delegated transaction
  const txBody = {
    chainTag: 39, // Testnet
    blockRef: bestBlock.id.slice(0, 18), // First 8 bytes of block ID
    expiration: 32,
    clauses: [
      {
        to: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        value: '100000000000000000000', // 100 VET
        data: '0x',
      },
    ],
    gasPriceCoef: 0,
    gas: 21000,
    dependsOn: null,
    nonce: Date.now(),
    reserved: {
      features: 1, // Enable fee delegation
    },
  };
  
  // Sign as sender
  const transaction = new Transaction(txBody);
  const senderSignedTx = transaction.signAsSender(userPrivateKey);
  const senderSignedTxHex = '0x' + Buffer.from(senderSignedTx.encoded).toString('hex');
  
  // Get sender address
  const senderPublicKey = Secp256k1.derivePublicKey(userPrivateKey);
  const senderAddress = Address.ofPublicKey(senderPublicKey).toString();
  
  // Submit to facilitator
  const paymentPayload = {
    senderSignedTransaction: senderSignedTxHex,
    senderAddress: senderAddress,
  };
  
  const base64Payload = Buffer.from(JSON.stringify(paymentPayload)).toString('base64');
  
  const response = await fetch('https://your-facilitator.com/settle', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      paymentPayload: base64Payload,
      paymentRequirements: {
        paymentOptions: [
          {
            network: 'eip155:100009',
            asset: 'VET',
            amount: '100000000000000000000',
            recipient: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
          },
        ],
        merchantId: 'my-shop',
      },
    }),
  });
  
  const result = await response.json();
  console.log('Settlement result:', result);
  
  return result;
}

// Run the example
payWithFeeDelegation().catch(console.error);
```

## Monitoring Usage

### Check Delegation Status

```typescript
const statusResponse = await fetch('https://your-facilitator.com/fee-delegation/status');
const status = await statusResponse.json();

console.log('Fee delegation enabled:', status.enabled);
console.log('Delegator address:', status.delegatorAddress);
console.log('VTHO balance:', status.balanceVtho);
console.log('Balance low:', status.isBalanceLow);
```

### Check Your Delegation Stats

```typescript
const userAddress = '0xYOUR_ADDRESS';
const statsResponse = await fetch(
  `https://your-facilitator.com/fee-delegation/stats/${userAddress}?hours=24`
);
const stats = await statsResponse.json();

console.log('Transactions in last 24h:', stats.transactionCount);
console.log('Total VTHO spent:', stats.totalVthoSpent);
console.log('Last delegated at:', stats.lastDelegatedAt);
```

## Security Considerations

1. **Private Key Security**: Never expose your private key. Store it securely (e.g., hardware wallet, secure enclave).

2. **Rate Limits**: The facilitator enforces rate limits (default: 10 transactions per hour per address). Plan accordingly.

3. **Transaction Limits**: Each transaction has a maximum gas limit (default: 10 VTHO). Large transactions may be rejected.

4. **Nonce Management**: Use unique nonces to prevent transaction replay.

5. **Expiration**: Set appropriate expiration (number of blocks). Transactions expire if not processed within this window.

## Error Handling

Common errors and solutions:

- **"Fee delegation is not enabled"**: The facilitator hasn't enabled fee delegation. Use standard transaction flow.

- **"Rate limit exceeded"**: You've hit the hourly transaction limit. Wait before submitting more transactions.

- **"Transaction gas exceeds maximum limit"**: Your transaction requires more gas than the facilitator allows. Reduce complexity or use standard flow.

- **"Insufficient VTHO balance in delegation account"**: The facilitator's gas account is low. Contact the facilitator.

- **"Transaction is not marked for delegation"**: Ensure `reserved.features` is set to 1 in the transaction body.

## Benefits of Fee Delegation

1. **Better UX**: Users don't need VTHO for gas, only the payment token
2. **Lower Barrier**: New users can transact immediately without acquiring VTHO
3. **Simplified Wallets**: Wallets only need to manage payment tokens
4. **Merchant Control**: Merchants can sponsor gas for their customers

## References

- [VIP-191: Designated Gas Payer](https://github.com/vechain/VIPs/blob/master/vips/VIP-191.md)
- [VeChain SDK Documentation](https://docs.vechain.org/developer-resources/sdks-and-providers/sdk)
- [x402 Protocol Specification](https://github.com/coinbase/x402/blob/main/specs/facilitator.md)
