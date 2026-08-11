---
title: "Transaction History"
description: "Transaction history API endpoint and dashboard UI — filtering, pagination, CSV export, and VeChain explorer integration"
category: "api"
---

# Transaction History

The transaction history feature provides a comprehensive view of all settlements processed through the x402 VeChain Facilitator.

## API Endpoint

### `GET /transactions`

Fetches transaction history with optional filtering. Requires JWT authentication.

**Query Parameters**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | number | `1` | Page number |
| `limit` | number | `50` | Results per page |
| `status` | string | — | Filter by `pending`, `confirmed`, or `failed` |
| `token` | string | — | Filter by token address (use `"VET"` for native VET) |
| `startDate` | ISO string | — | Filter transactions after this date |
| `endDate` | ISO string | — | Filter transactions before this date |
| `minAmount` | string | — | Minimum amount in wei |
| `maxAmount` | string | — | Maximum amount in wei |
| `search` | string | — | Search by tx hash or recipient address |

**Response**

```json
{
  "transactions": [
    {
      "id": "uuid",
      "txHash": "0x...",
      "fromAddress": "0x...",
      "toAddress": "0x...",
      "amount": "1000000000000000000",
      "tokenAddress": null,
      "network": "testnet",
      "status": "confirmed",
      "blockNumber": 12345,
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 100,
    "totalPages": 2
  }
}
```

## Dashboard UI

Located at `/transactions` in the dashboard (`apps/dashboard/app/routes/transactions.tsx`).

**Features:**
- Full transaction table with Time, Token, Amount, Recipient, Status, Tx Hash columns
- 7-field filter panel
- CSV export with proper escaping and timestamped filename
- Clickable transaction hashes linking to VeChain explorer
- Pagination controls
- Responsive design for mobile and desktop

## Token Symbol Mapping

| `tokenAddress` value | Symbol |
|----------------------|--------|
| `null` | VET (native) |
| `0x0000000000000000000000000000456e65726779` | VTHO |
| `0x5ef79995FE8a89e0812330E4378eB2660ceDe699` | B3TR |

## Explorer URLs

- **Testnet**: `https://explore-testnet.vechain.org/transactions/{txHash}`
- **Mainnet**: `https://explore.vechain.org/transactions/{txHash}`

## Database Schema

Uses the existing `transactions` table:

```sql
CREATE TABLE transactions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  tx_hash VARCHAR(66),
  from_address VARCHAR(42),
  to_address VARCHAR(42),
  amount VARCHAR(78),           -- stored as string (wei)
  token_address VARCHAR(42),    -- null for native VET
  network VARCHAR(20),          -- 'testnet' | 'mainnet'
  status VARCHAR(20),           -- 'pending' | 'confirmed' | 'failed'
  block_number INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

No additional migrations are needed — this feature uses the existing schema.

## Relevant Files

| File | Description |
|------|-------------|
| `apps/api/src/routes/transactions.ts` | API route handler |
| `apps/dashboard/app/routes/transactions.tsx` | Dashboard page |

## Future Enhancements

- Real-time updates via WebSocket
- Charts and analytics
- Transaction details modal
- Bulk operations
- Filtering by API key
