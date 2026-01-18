# Payment Signature Verification Implementation Summary

## Overview
This implementation adds payment signature verification logic for VeChain transactions according to the x402 specification. It enables secure, signature-based payment validation without requiring on-chain transaction submission first.

## Components Implemented

### 1. PaymentPayload Interface (`apps/api/src/types/x402.ts`)
```typescript
interface PaymentPayload {
  signature: string; // secp256k1 signature in hex format
  payload: {
    scheme: 'exact';
    network: string; // CAIP-2 identifier (e.g., 'vechain:100009')
    payTo: string; // recipient address
    amount: string; // amount in wei
    asset: string; // token address or 'native'
    nonce: string; // unique nonce for replay protection
    validUntil: number; // Unix timestamp
  };
}
```

### 2. Payment Verification Service (`apps/api/src/services/PaymentVerificationService.ts`)

#### Core Functions:

**`verifyPaymentPayload(paymentPayload, paymentOptions)`**
- Main entry point for payment verification
- Returns `{ isValid: boolean, senderAddress?: string, error?: string }`
- Performs comprehensive validation in order:
  1. Payload structure validation
  2. CAIP-2 network identifier parsing
  3. Network support validation
  4. Timestamp expiration check
  5. Token address validation
  6. Signature verification and address recovery
  7. Nonce uniqueness validation
  8. Payment details matching
  9. Nonce caching

**`parseCAIP2Network(network)`**
- Parses CAIP-2 format network identifiers
- Supports both `vechain:X` and `eip155:X` namespaces
- Returns `{ namespace, reference }` or `null`

**`normalizeNetworkIdentifier(network)`**
- Converts any valid network ID to standard `eip155:X` format
- Ensures consistency across the system

**`validateTokenAddress(asset)`**
- Validates token identifiers
- Accepts: `native`, `VET`, `VTHO`, or valid contract addresses
- Uses VeChain SDK Address validation

**`isNonceUsed(walletAddress, nonce)`**
- Checks if a nonce has been used for a wallet
- Database-backed with indexed queries

**`cacheNonce(walletAddress, nonce, validUntil)`**
- Stores used nonces in the database
- Has unique constraint to prevent race conditions
- Throws error if duplicate detected

### 3. Configuration (`apps/api/src/config/vechain.ts`)

Added centralized `SUPPORTED_NETWORKS` configuration:
```typescript
export const SUPPORTED_NETWORKS = [
  VECHAIN_NETWORKS.TESTNET,
  // Add MAINNET when ready for production
] as const;
```

### 4. Database Schema (`apps/api/src/db/schema.ts`)

Enhanced `nonces` table with unique constraint:
```typescript
uniqueWalletNonce: uniqueIndex('unique_wallet_nonce')
  .on(table.walletAddress, table.nonce)
```

This prevents race conditions where two concurrent requests with the same nonce could both pass validation.

### 5. Route Integration (`apps/api/src/routes/x402.ts`)

Updated `/verify` endpoint to handle both:
- **New format**: Signed payment payloads (signature-based verification)
- **Legacy format**: Transaction hashes (on-chain verification)

Example request with signed payload:
```json
{
  "paymentPayload": "<base64-encoded-PaymentPayload>",
  "paymentRequirements": {
    "merchantId": "merchant-123",
    "paymentOptions": [
      {
        "network": "vechain:100009",
        "asset": "native",
        "amount": "1000000000000000000",
        "recipient": "0x..."
      }
    ]
  }
}
```

## Security Features

### 1. Signature Verification (secp256k1)
- Uses VeChain SDK's `Secp256k1.recover()` for signature recovery
- Recovers signer's public key from signature
- Derives Ethereum-compatible address from public key
- Validates signature matches the payload hash

### 2. Replay Attack Prevention
- **Nonce-based**: Each payment requires a unique nonce
- **Database caching**: Used nonces stored in PostgreSQL
- **Unique constraint**: Database-level prevention of duplicate nonces
- **Race condition handling**: Concurrent requests with same nonce detected and rejected
- **Expiration**: Nonces have expiry time based on `validUntil`

### 3. Timestamp Validation
- Payloads must include `validUntil` Unix timestamp
- Server rejects expired payloads
- Prevents replay attacks with old signatures

### 4. Network Validation
- CAIP-2 compliant network identification
- Supports both `vechain:X` and `eip155:X` formats
- Validates against configured supported networks
- Rejects unsupported networks early

### 5. Token Validation
- Validates VIP-180 token contract addresses
- Accepts keywords: `native`, `VET`, `VTHO`
- Uses VeChain SDK Address validation for contracts
- Rejects malformed addresses

### 6. Deterministic Hashing
- Uses explicit key ordering in JSON serialization
- Ensures consistent hash generation across systems
- Keccak256 hashing (Ethereum-compatible)

### 7. Early Validation
- Rejects malformed payloads before expensive operations
- Validates structure before signature verification
- Validates network before database queries

## Implementation Details

### Signature Creation and Verification Flow

**Signing (Client-side):**
1. Create payload object with all required fields
2. Serialize payload to JSON with deterministic key order
3. Hash with Keccak256
4. Sign hash with private key using secp256k1
5. Create PaymentPayload with signature + payload
6. Base64 encode for transmission

**Verification (Server-side):**
1. Decode base64 to get PaymentPayload
2. Recreate payload hash using same serialization
3. Recover signer's public key from signature
4. Derive address from public key
5. Validate all payload fields
6. Check nonce hasn't been used
7. Cache nonce to prevent reuse

### Database Nonce Management

```sql
CREATE TABLE nonces (
  id UUID PRIMARY KEY,
  wallet_address VARCHAR(42) NOT NULL,
  nonce VARCHAR(255) NOT NULL,
  used_at TIMESTAMP NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL,
  UNIQUE (wallet_address, nonce)  -- Prevents race conditions
);

CREATE INDEX wallet_nonce_idx ON nonces(wallet_address, nonce);
CREATE INDEX expires_at_idx ON nonces(expires_at);
```

### Error Handling

Comprehensive error messages for all failure cases:
- Invalid JSON parsing
- Missing required fields
- Invalid scheme
- Malformed network identifiers
- Unsupported networks
- Expired payloads
- Invalid token addresses
- Signature verification failures
- Duplicate nonces
- Payment requirement mismatches

## Testing

Validated implementation with:
- CAIP-2 network parsing tests
- Network normalization tests
- Token address validation tests
- Signature creation and recovery tests
- TypeScript compilation checks

All tests passed successfully.

## Usage

See `PAYMENT_VERIFICATION_USAGE.md` for:
- Complete code examples
- API request/response formats
- Security best practices
- Error handling guide
- End-to-end integration example

## Compatibility

- **Backward compatible**: Existing transaction hash verification still works
- **Standard compliant**: Follows x402 specification
- **VeChain SDK**: Uses official VeChain SDK v1.2.0
- **TypeScript**: Fully typed with strict mode enabled

## Future Enhancements

Possible improvements for future iterations:
1. Add support for VIP-180 token transfer decoding
2. Implement custom token balance queries
3. Add nonce cleanup job for expired entries
4. Support for batch payment verification
5. Webhook notifications for verified payments
6. Rate limiting per wallet address
7. Integration with VeChain fee delegation

## Performance Considerations

- Database queries use indexed columns
- Early validation reduces expensive operations
- Unique constraint prevents duplicate database checks
- Signature verification is CPU-intensive but necessary
- Nonce table should be periodically cleaned of expired entries

## Deployment Notes

1. Run database migration to add unique constraint:
   ```bash
   npm run db:push
   ```

2. Ensure DATABASE_URL environment variable is set

3. Configure SUPPORTED_NETWORKS in `vechain.ts` for production

4. Monitor nonce table size and implement cleanup job if needed

5. Consider adding application-level rate limiting for verification endpoint
