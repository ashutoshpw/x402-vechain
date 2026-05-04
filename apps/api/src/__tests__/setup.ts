/**
 * Test setup file for Vitest
 * Configures global test environment and mocks
 * 
 * IMPORTANT: Environment variables must be set BEFORE any imports
 * that depend on them, so we set them at the top of this file.
 */

// Set test environment variables BEFORE any imports
process.env.NODE_ENV = 'test';
process.env.VECHAIN_NETWORK = 'testnet';
process.env.VECHAIN_TESTNET_RPC = 'https://testnet.vechain.org';
process.env.VECHAIN_MAINNET_RPC = 'https://mainnet.vechain.org';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.JWT_SECRET = 'test-secret-key-for-testing-only-minimum-32-chars';
process.env.FEE_DELEGATION_ENABLED = 'false';

import { beforeAll, afterAll, vi } from 'vitest';

// Mock database module to avoid real database connections during tests
vi.mock('../db/index.js', () => ({
  db: {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    }),
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockResolvedValue(undefined),
    }),
  },
}));

beforeAll(() => {
  // Additional setup if needed
});

afterAll(() => {
  // Cleanup
  vi.clearAllMocks();
});
