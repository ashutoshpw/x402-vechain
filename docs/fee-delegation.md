---
title: "VTHO Fee Delegation"
description: "VIP-191 gas sponsorship via the FeeDelegationService — setup, client integration, monitoring, and operations"
category: "api"
---

# VTHO Fee Delegation

Fee delegation (gas sponsorship) allows users to submit transactions without holding VTHO for gas fees, using VeChain's Multi-Party Payment (MPP) / VIP-191 protocol.

## Overview

The `FeeDelegationService` (`apps/api/src/services/FeeDelegationService.ts`) handles all delegation logic:

- **Private Key Management** — securely stores and uses the delegator's private key
- **Transaction Signing** — implements VIP-191 by accepting sender-signed transactions, verifying delegation requirements, and adding the gas payer signature
- **Balance Monitoring** — checks VTHO balance and logs warnings when low
- **Rate Limiting** — enforces 10 transactions per hour per address
- **Spending Limits** — limits each transaction to 10 VTHO (configurable)
- **Audit Logging** — records all delegation events to the database

## Configuration

```env
FEE_DELEGATION_ENABLED=true
FEE_DELEGATION_PRIVATE_KEY=<64-char-hex>
FEE_DELEGATION_MAX_VTHO_PER_TX=10
FEE_DELEGATION_LOW_BALANCE_THRESHOLD=1000
```

## VIP-191 Flow

### Client Side
```typescript
import { Transaction } from '@vechain/sdk-core';

// Create transaction with delegation flag
const tx = new Transaction({
  // ... transaction body
  reserved: { features: 1 }, // Enable delegation
});

// Sign as sender
const senderSigned = tx.signAsSender(userPrivateKey);
const senderSignedTxHex = '0x' + Buffer.from(senderSigned.encoded).toString('hex');
```

### Submit to Facilitator
```typescript
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
      paymentOptions: [{
        network: 'eip155:100009',
        asset: 'VET',
        amount: '100000000000000000000',
        recipient: '0xRECIPIENT_ADDRESS',
      }],
      merchantId: 'your-merchant-id',
    },
  }),
});
```

### API Side (FeeDelegationService)
```typescript
// Decode sender-signed transaction
const tx = Transaction.decode(senderSignedTxBytes, false);

// Add gas payer signature
const fullySigned = tx.signAsGasPayer(senderAddress, delegatorPrivateKey);

// Submit to VeChain
await thorClient.sendRawTransaction(fullySigned.encoded);
```

## Complete Client Example

```typescript
import { Transaction, Address, Secp256k1 } from '@vechain/sdk-core';
import { ThorClient } from '@vechain/sdk-network';

async function payWithFeeDelegation() {
  const thorClient = ThorClient.fromUrl('https://testnet.vechain.org');
  const userPrivateKey = Buffer.from(process.env.USER_PRIVATE_KEY!, 'hex');

  const bestBlock = await thorClient.blocks.getBestBlockCompressed();
  if (!bestBlock) throw new Error('Failed to get best block');

  const txBody = {
    chainTag: 39,
    blockRef: bestBlock.id.slice(0, 18),
    expiration: 32,
    clauses: [{
      to: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
      value: '100000000000000000000',
      data: '0x',
    }],
    gasPriceCoef: 0,
    gas: 21000,
    dependsOn: null,
    nonce: Date.now(),
    reserved: { features: 1 },
  };

  const transaction = new Transaction(txBody);
  const senderSignedTx = transaction.signAsSender(userPrivateKey);
  const senderSignedTxHex = '0x' + Buffer.from(senderSignedTx.encoded).toString('hex');

  const senderPublicKey = Secp256k1.derivePublicKey(userPrivateKey);
  const senderAddress = Address.ofPublicKey(senderPublicKey).toString();

  const base64Payload = Buffer.from(JSON.stringify({
    senderSignedTransaction: senderSignedTxHex,
    senderAddress,
  })).toString('base64');

  const response = await fetch('https://your-facilitator.com/settle', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      paymentPayload: base64Payload,
      paymentRequirements: {
        paymentOptions: [{
          network: 'eip155:100009',
          asset: 'VET',
          amount: '100000000000000000000',
          recipient: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        }],
        merchantId: 'my-shop',
      },
    }),
  });

  return await response.json();
}
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/settle` | Extended to support fee delegation |
| `GET` | `/fee-delegation/status` | Delegation status and VTHO balance |
| `GET` | `/fee-delegation/stats/:address` | Per-address delegation statistics |
| `GET` | `/fee-delegation/total-spent` | Total VTHO spent by facilitator |

### Check Delegation Status
```typescript
const status = await fetch('https://your-facilitator.com/fee-delegation/status').then(r => r.json());

console.log('Enabled:', status.enabled);
console.log('Delegator address:', status.delegatorAddress);
console.log('VTHO balance:', status.balanceVtho);
console.log('Balance low:', status.isBalanceLow);
```

### Check Per-Address Stats
```typescript
const stats = await fetch(
  `https://your-facilitator.com/fee-delegation/stats/${userAddress}?hours=24`
).then(r => r.json());

console.log('Transactions in last 24h:', stats.transactionCount);
console.log('Total VTHO spent:', stats.totalVthoSpent);
```

## Database Schema

```sql
CREATE TABLE fee_delegation_logs (
  id UUID PRIMARY KEY,
  tx_hash VARCHAR(66),
  user_address VARCHAR(42),
  vtho_spent VARCHAR(78),
  network VARCHAR(50),
  block_number INTEGER,
  status VARCHAR(20),  -- success | failed | reverted
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX ON fee_delegation_logs(tx_hash);
CREATE INDEX ON fee_delegation_logs(user_address);
CREATE INDEX ON fee_delegation_logs(created_at);
CREATE INDEX ON fee_delegation_logs(network);
CREATE INDEX ON fee_delegation_logs(status);
```

## Monitoring Queries

```sql
-- Total VTHO spent today
SELECT SUM(CAST(vtho_spent AS NUMERIC)) / 1e18 AS total_vtho
FROM fee_delegation_logs
WHERE created_at >= NOW() - INTERVAL '24 hours';

-- Top users by transaction count
SELECT user_address, COUNT(*) AS tx_count
FROM fee_delegation_logs
WHERE created_at >= NOW() - INTERVAL '24 hours'
GROUP BY user_address
ORDER BY tx_count DESC
LIMIT 10;

-- Failed delegations
SELECT * FROM fee_delegation_logs
WHERE status = 'failed'
ORDER BY created_at DESC
LIMIT 20;
```

## Gas Estimation

Based on VeChain's gas calculation:
- Base gas: 5000 per clause
- Zero byte: 68 gas
- Non-zero byte: 200 gas
- Safety buffer: 20%

## Security

| Feature | Detail |
|---------|--------|
| Private key protection | Never exposed in API responses; stored in memory as Buffer; use HSM/KMS in production |
| Rate limiting | 10 transactions per hour per address |
| Spending limits | Max 10 VTHO per transaction (configurable) |
| Validation | Verifies `reserved.features = 1`, transaction structure, addresses, and signatures |
| Audit trail | All events logged with tx hash, user, VTHO spent |

## Production Deployment

1. Generate a dedicated delegation wallet and fund it with VTHO
2. Set environment variables (see Configuration above)
3. Run database migration: `pnpm db:migrate`
4. Set up alerts for low VTHO balance and failed delegations

### Key Management Options
- AWS KMS / Azure Key Vault / Google Cloud KMS
- HashiCorp Vault
- Hardware Security Module (HSM)

## Troubleshooting

| Error | Solution |
|-------|---------|
| "Fee delegation is not enabled" | Check `FEE_DELEGATION_ENABLED=true` and that private key is set |
| "Transaction is not marked for delegation" | Ensure client sets `reserved.features = 1` |
| "Insufficient VTHO balance" | Fund the delegation account |
| "Rate limit exceeded" | User hit 10 tx/hour — wait or adjust limit |
| "Transaction gas exceeds maximum limit" | Increase `FEE_DELEGATION_MAX_VTHO_PER_TX` or have user pay their own gas |

## References

- [VIP-191: Designated Gas Payer](https://github.com/vechain/VIPs/blob/master/vips/VIP-191.md)
- [VeChain SDK Documentation](https://docs.vechain.org/)
- [x402 Protocol Specification](https://github.com/coinbase/x402)
