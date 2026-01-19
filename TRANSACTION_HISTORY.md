# Transaction History Feature

## Overview
The Transaction History feature provides a comprehensive view of all settlements processed through the x402 VeChain Facilitator.

## Features Implemented

### 1. Transaction List
- Displays all transactions for the authenticated user
- Shows key information: Time, Token, Amount, Recipient, Status, Tx Hash
- Supports pagination (50 transactions per page)

### 2. Filtering Options
- **Status**: Filter by pending, confirmed, or failed transactions
- **Token**: Filter by VET, VTHO, VEUSD, or B3TR
- **Date Range**: Filter by start date and end date
- **Amount Range**: Filter by minimum and maximum amount (in Wei)
- **Search**: Search by transaction hash or recipient address

### 3. CSV Export
- Export filtered transactions to CSV format
- Includes all transaction details
- Downloads with timestamped filename

### 4. VeChain Explorer Integration
- Direct links to VeChain explorer for each transaction
- Automatically detects testnet vs mainnet
- Opens in new tab

## API Endpoints

### GET /transactions
Fetches transaction history with optional filtering.

**Authentication**: Required (JWT token)

**Query Parameters**:
- `page` (number): Page number for pagination (default: 1)
- `limit` (number): Results per page (default: 50)
- `status` (string): Filter by transaction status
- `token` (string): Filter by token address (use "VET" for native VET)
- `startDate` (ISO string): Filter transactions after this date
- `endDate` (ISO string): Filter transactions before this date
- `minAmount` (string): Minimum amount in Wei
- `maxAmount` (string): Maximum amount in Wei
- `search` (string): Search in tx hash or recipient address

**Response**:
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

## Usage

1. Navigate to `/transactions` in the dashboard
2. View your transaction history
3. Apply filters as needed
4. Click on transaction hashes to view details in VeChain explorer
5. Export filtered results to CSV

## Technical Details

### Database Schema
Uses the existing `transactions` table with the following fields:
- `id`: Unique transaction ID
- `userId`: Reference to the user
- `txHash`: VeChain transaction hash
- `fromAddress`: Sender address
- `toAddress`: Recipient address
- `amount`: Amount in Wei (stored as string)
- `tokenAddress`: Token contract address (null for VET)
- `network`: Network identifier (testnet/mainnet)
- `status`: Transaction status (pending/confirmed/failed)
- `blockNumber`: Block number
- `createdAt`: Creation timestamp
- `updatedAt`: Update timestamp

### Token Symbol Mapping
- `null` → VET (native token)
- `0x0000000000000000000000000000456e65726779` → VTHO
- `0x170f4ba2e7c1c0b5e1b811b67e5c82226b248e77` → VEUSD
- `0x5ef79995FE8a89e0812330E4378eB2660ceDe699` → B3TR

### Explorer URLs
- **Testnet**: https://explore-testnet.vechain.org/transactions/{txHash}
- **Mainnet**: https://explore.vechain.org/transactions/{txHash}

## Future Enhancements
- Real-time updates using WebSocket
- More advanced filtering (e.g., by API key)
- Charts and analytics
- Transaction details modal
- Bulk operations
