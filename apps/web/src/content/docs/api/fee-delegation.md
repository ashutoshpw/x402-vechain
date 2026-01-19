---
title: Fee Delegation Endpoints
description: Monitor and manage fee delegation (gas sponsorship)
---

Fee delegation endpoints provide monitoring and statistics for the VTHO gas sponsorship feature. These endpoints help track delegation usage and costs.

## GET /fee-delegation/status

Returns the current status and configuration of fee delegation.

### Request

```
GET /fee-delegation/status
```

No parameters required.

### Response (200 OK)

```json
{
  "enabled": true,
  "delegatorAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "balanceVtho": "1234.567890",
  "isBalanceLow": false,
  "lowBalanceThreshold": 1000,
  "maxVthoPerTx": 10,
  "network": "testnet"
}
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `enabled` | Boolean | Whether fee delegation is enabled |
| `delegatorAddress` | String | Address paying gas fees |
| `balanceVtho` | String | Current VTHO balance |
| `isBalanceLow` | Boolean | Whether balance is below threshold |
| `lowBalanceThreshold` | Number | VTHO threshold for low balance alert |
| `maxVthoPerTx` | Number | Maximum VTHO per transaction |
| `network` | String | Network (testnet or mainnet) |

### Example Usage

```typescript
const response = await fetch('https://facilitator.example.com/fee-delegation/status');
const status = await response.json();

console.log('Fee delegation enabled:', status.enabled);
console.log('Delegator address:', status.delegatorAddress);
console.log('VTHO balance:', status.balanceVtho);

if (status.isBalanceLow) {
  console.warn('⚠️ Low VTHO balance! Please top up.');
}
```

## GET /fee-delegation/stats/:address

Returns delegation statistics for a specific address.

### Request

```
GET /fee-delegation/stats/:address?hours=24
```

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `address` | String | Yes | Address to query (path parameter) |
| `hours` | Number | No | Time window in hours (default: 24) |

### Response (200 OK)

```json
{
  "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "timeWindowHours": 24,
  "transactionCount": 5,
  "totalVthoSpent": "0.125000",
  "lastDelegatedAt": "2024-12-31T23:59:59.000Z"
}
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `address` | String | Queried address |
| `timeWindowHours` | Number | Time window queried |
| `transactionCount` | Number | Number of delegated transactions |
| `totalVthoSpent` | String | Total VTHO spent on delegation |
| `lastDelegatedAt` | String | ISO 8601 timestamp of last delegation |

### Example Usage

```typescript
const address = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb';
const hours = 24;

const response = await fetch(
  `https://facilitator.example.com/fee-delegation/stats/${address}?hours=${hours}`
);
const stats = await response.json();

console.log(`Transactions in last ${stats.timeWindowHours}h:`, stats.transactionCount);
console.log('Total VTHO spent:', stats.totalVthoSpent);
console.log('Last delegated:', new Date(stats.lastDelegatedAt).toLocaleString());
```

### Check Rate Limit Remaining

```typescript
async function checkRateLimitRemaining(address: string) {
  const response = await fetch(
    `https://facilitator.example.com/fee-delegation/stats/${address}?hours=1`
  );
  const stats = await response.json();
  
  const maxPerHour = 10; // Default rate limit
  const remaining = maxPerHour - stats.transactionCount;
  
  console.log(`Rate limit remaining: ${remaining}/${maxPerHour}`);
  return remaining;
}
```

## GET /fee-delegation/total-spent

Returns total VTHO spent by the delegation service across all addresses.

### Request

```
GET /fee-delegation/total-spent?hours=24
```

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `hours` | Number | No | Time window in hours (default: 24) |

### Response (200 OK)

```json
{
  "timeWindowHours": 24,
  "totalVthoSpent": "12.345678",
  "network": "testnet"
}
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `timeWindowHours` | Number | Time window queried |
| `totalVthoSpent` | String | Total VTHO spent across all addresses |
| `network` | String | Network (testnet or mainnet) |

### Example Usage

```typescript
const response = await fetch(
  'https://facilitator.example.com/fee-delegation/total-spent?hours=168'
);
const stats = await response.json();

console.log(`Total VTHO spent in last week: ${stats.totalVthoSpent}`);
console.log(`Average per hour: ${parseFloat(stats.totalVthoSpent) / stats.timeWindowHours}`);
```

## Error Responses

### 404 Not Found

Fee delegation is not enabled:

```json
{
  "error": "Fee delegation is not enabled"
}
```

### 400 Bad Request

Invalid address format:

```json
{
  "error": "Invalid address format"
}
```

## Rate Limiting

These monitoring endpoints have relaxed rate limits compared to settlement endpoints.

## Security Considerations

### Public Information

All fee delegation statistics are public. Anyone can query:
- Total VTHO spent by the service
- Per-address delegation statistics
- Current delegator balance

### Privacy

Transaction details (amounts, recipients) are not exposed through these endpoints. Only delegation metadata is available.

## Monitoring Best Practices

### 1. Monitor Delegator Balance

```typescript
async function monitorBalance() {
  const status = await fetch('https://facilitator.example.com/fee-delegation/status')
    .then(r => r.json());
  
  if (status.isBalanceLow) {
    // Send alert to admin
    sendAlert(`⚠️ Low VTHO balance: ${status.balanceVtho}`);
  }
}

// Check every hour
setInterval(monitorBalance, 60 * 60 * 1000);
```

### 2. Track User Rate Limits

```typescript
async function canUserDelegate(address: string): Promise<boolean> {
  const stats = await fetch(
    `https://facilitator.example.com/fee-delegation/stats/${address}?hours=1`
  ).then(r => r.json());
  
  const maxPerHour = 10;
  return stats.transactionCount < maxPerHour;
}
```

### 3. Calculate Costs

```typescript
async function getDailyCosts() {
  const stats = await fetch(
    'https://facilitator.example.com/fee-delegation/total-spent?hours=24'
  ).then(r => r.json());
  
  const vthoPrice = 0.001; // USD (example)
  const dailyCostUSD = parseFloat(stats.totalVthoSpent) * vthoPrice;
  
  console.log(`Daily delegation cost: $${dailyCostUSD.toFixed(2)}`);
}
```

## Next Steps

- [Fee Delegation Guide](/guides/fee-delegation) - Learn how to use fee delegation
- [POST /settle](/api/settle) - Submit delegated transactions
- [Environment Configuration](/guides/environment) - Configure fee delegation
