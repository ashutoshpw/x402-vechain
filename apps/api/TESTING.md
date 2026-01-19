# Testing Guide

This document describes the test suite for the x402 VeChain Facilitator API.

## Overview

The API includes comprehensive unit tests covering all major functionality:

- **70 test cases** covering endpoints, services, and utilities
- **Vitest** as the test framework
- **Mocked VeChain SDK** responses for deterministic testing
- **Mock database** to avoid real database connections

## Test Structure

```
src/__tests__/
├── setup.ts              # Global test setup and environment configuration
├── mocks/
│   └── vechain.ts        # Mock VeChain SDK responses and data
├── fixtures/
│   └── payloads.ts       # Test data factories and fixtures
└── unit/
    ├── supported.test.ts          # Tests for /supported endpoint
    ├── verify.test.ts             # Tests for /verify endpoint
    ├── settle.test.ts             # Tests for /settle endpoint
    ├── vechain-service.test.ts    # Tests for VeChain blockchain service
    └── payment-verification.test.ts # Tests for payment signature verification
```

## Running Tests

### Run all tests
```bash
pnpm test
```

### Run tests in watch mode (auto-rerun on file changes)
```bash
pnpm test:watch
```

### Run tests with UI
```bash
pnpm test:ui
```

### Run tests with coverage report
```bash
pnpm test:coverage
```

### Run specific test file
```bash
pnpm test src/__tests__/unit/verify.test.ts
```

## Test Coverage

### `/verify` Endpoint (13 tests)
- ✅ Valid signed payment payload verification
- ✅ Invalid signature rejection
- ✅ Expired payment payload rejection
- ✅ Wrong payment amount detection
- ✅ Legacy transaction hash verification
- ✅ Reverted transaction detection
- ✅ Transaction not found handling
- ✅ Invalid JSON payload rejection
- ✅ Input validation (arrays, empty options)
- ✅ Expired payment requirements
- ✅ Future expiration time acceptance
- ✅ Unsupported network rejection

### `/settle` Endpoint (15 tests)
- ✅ Pre-signed transaction settlement
- ✅ Transaction submission failure handling
- ✅ Confirmation timeout handling
- ✅ Payment details validation
- ✅ Fee delegation when enabled
- ✅ Fee delegation rejection when disabled
- ✅ Fee delegation failure handling
- ✅ Already submitted transaction verification
- ✅ Reverted transaction rejection
- ✅ Transaction verification failure
- ✅ Invalid JSON payload rejection
- ✅ Zod validation for empty payment options
- ✅ Unsupported network rejection
- ✅ Missing required fields rejection
- ✅ Network timeout during decoding

### `/supported` Endpoint (3 tests)
- ✅ Returns correct VeChain networks
- ✅ Returns all supported tokens (VET, VTHO, VEUSD, B3TR)
- ✅ Consistent response format

### VeChain Service (19 tests + 1 skipped)
- ✅ Transaction verification
- ✅ Transaction hash with/without 0x prefix
- ✅ Transaction not found error handling
- ✅ Reverted transaction detection
- ✅ Network error handling
- ✅ Pre-signed transaction submission
- ✅ Transaction submission failures
- ✅ VET balance queries
- ✅ VTHO balance queries
- ✅ VIP-180 token balance queries
- ✅ Case-insensitive token queries
- ✅ Placeholder address validation
- ✅ Account not found errors
- ✅ Unknown token errors
- ✅ Transaction confirmation after N blocks
- ✅ Multiple confirmation waiting
- ✅ Reverted transaction confirmation check
- ⏭️ Timeout for transaction not found (skipped: takes 300s)

### Payment Verification Service (19 tests)
- ✅ CAIP-2 network identifier parsing (eip155, vechain)
- ✅ Invalid format rejection
- ✅ Unsupported namespace handling
- ✅ Testnet and mainnet reference parsing
- ✅ Network identifier normalization
- ✅ Token address validation (native, VET, VTHO, VEUSD, B3TR)
- ✅ Contract address validation
- ✅ Invalid address rejection
- ✅ Address prefix validation
- ✅ Address length validation

## Mocking Strategy

### VeChain SDK Mocking
Tests mock the `@vechain/sdk-network` ThorClient to avoid real blockchain calls:
- Transaction receipts
- Transaction submission results
- Account balances
- Block information
- Contract calls

### Database Mocking
The database is mocked in the setup file to avoid requiring a real PostgreSQL connection during tests.

### Service Mocking
For endpoint tests, services like VeChainService and PaymentVerificationService are mocked to isolate the route handler logic.

## Environment Variables

Tests use the following environment variables (set in `setup.ts`):
- `NODE_ENV=test`
- `VECHAIN_NETWORK=testnet`
- `VECHAIN_TESTNET_RPC=https://testnet.vechain.org`
- `DATABASE_URL=postgresql://test:test@localhost:5432/test`
- `JWT_SECRET=test-secret-key-for-testing-only-minimum-32-chars`
- `FEE_DELEGATION_ENABLED=false`

## Adding New Tests

1. **Create test file** in `src/__tests__/unit/` with `.test.ts` extension
2. **Import required dependencies** from vitest
3. **Mock external dependencies** (VeChain SDK, database, etc.)
4. **Use fixtures** from `fixtures/payloads.ts` for test data
5. **Follow naming convention**: `describe` for grouping, `it` for test cases
6. **Test both success and failure** cases
7. **Verify error messages** and status codes

### Example Test Template

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Hono } from 'hono';
import myRoutes from '../../routes/myRoutes.js';

// Mock dependencies
vi.mock('../../services/MyService.js', () => ({
  myService: {
    doSomething: vi.fn(),
  },
}));

describe('My Feature', () => {
  const app = new Hono();
  app.route('/', myRoutes);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should do something correctly', async () => {
    // Arrange: Setup mocks and test data
    
    // Act: Make the request
    const res = await app.request('/endpoint', {
      method: 'POST',
      body: JSON.stringify({ data: 'test' }),
    });

    // Assert: Verify the results
    expect(res.status).toBe(200);
  });
});
```

## Continuous Integration

Tests are designed to run in CI environments:
- No external dependencies (blockchain, database)
- Fast execution (< 2 seconds for full suite)
- Deterministic results
- Clear error messages

## Known Limitations

1. **Long-running test skipped**: The timeout test for `waitForConfirmation` is skipped because it would take 300 seconds to complete in the real implementation.

2. **Mock-only testing**: These are unit tests with mocked dependencies. For integration testing with real VeChain testnet, see the integration test suite (if available).

3. **Signature verification**: Currently mocked; real signature verification would require generating valid secp256k1 signatures in tests.

## Troubleshooting

### Tests fail with "Environment variable validation failed"
Ensure the setup file (`src/__tests__/setup.ts`) is properly setting all required environment variables before imports.

### Mock functions not working
Make sure to call `vi.clearAllMocks()` in `beforeEach` to reset mock state between tests.

### Import errors
Ensure all imports use `.js` extensions as required by ES modules in TypeScript.

### Database connection errors
The database is mocked in the setup file. If you see database errors, verify the mock is properly configured in `setup.ts`.
