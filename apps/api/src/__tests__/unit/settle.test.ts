/**
 * Unit tests for /settle endpoint
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { Hono } from 'hono';
import x402Routes from '../../routes/x402.js';
import {
  createPaymentRequirements,
  createPaymentOption,
  createPreSignedTransactionPayload,
  createLegacyTransactionPayload,
  createFeeDelegationPayload,
  encodePaymentPayload,
  TEST_ADDRESSES,
  TEST_TX_HASHES,
  TEST_AMOUNTS,
} from '../fixtures/payloads.js';
import { VECHAIN_NETWORKS } from '../../config/vechain.js';
import {
  createMockVETTransferReceipt,
  createMockTokenTransferReceipt,
} from '../mocks/vechain.js';

// Mock VeChain service
vi.mock('../../services/VeChainService.js', () => ({
  veChainService: {
    verifyTransaction: vi.fn(),
    decodeTransaction: vi.fn(),
    submitTransaction: vi.fn(),
    waitForConfirmation: vi.fn(),
  },
}));

// Mock Fee Delegation service
vi.mock('../../services/FeeDelegationService.js', () => ({
  feeDelegationService: {
    isEnabled: vi.fn(() => false),
    sponsorTransaction: vi.fn(),
    logDelegation: vi.fn(),
  },
}));

describe('POST /settle', () => {
  const app = new Hono();
  app.route('/', x402Routes);

  let veChainService: any;
  let feeDelegationService: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Get mocked services
    veChainService = (await import('../../services/VeChainService.js')).veChainService;
    feeDelegationService = (await import('../../services/FeeDelegationService.js')).feeDelegationService;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Pre-signed Transaction Settlement', () => {
    it('should settle with valid pre-signed transaction', async () => {
      const signedTx = '0xabcdef' + 'a'.repeat(500);
      const payload = createPreSignedTransactionPayload(signedTx);
      const paymentRequirements = createPaymentRequirements();

      const mockReceipt = createMockVETTransferReceipt(
        TEST_ADDRESSES.sender,
        TEST_ADDRESSES.recipient,
        TEST_AMOUNTS.oneVET
      );

      veChainService.submitTransaction.mockResolvedValue(TEST_TX_HASHES.valid);
      veChainService.waitForConfirmation.mockResolvedValue(true);
      veChainService.decodeTransaction.mockResolvedValue({
        from: TEST_ADDRESSES.sender,
        to: TEST_ADDRESSES.recipient,
        amount: BigInt(TEST_AMOUNTS.oneVET),
        token: 'VET',
        clauses: [],
      });

      const res = await app.request('/settle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentPayload: encodePaymentPayload(payload),
          paymentRequirements,
        }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.transactionHash).toBe(TEST_TX_HASHES.valid);
      expect(data.networkId).toBe(VECHAIN_NETWORKS.TESTNET);
      expect(veChainService.submitTransaction).toHaveBeenCalledWith(signedTx);
      expect(veChainService.waitForConfirmation).toHaveBeenCalled();
    });

    it('should handle transaction submission failure', async () => {
      const signedTx = '0xabcdef' + 'a'.repeat(500);
      const payload = createPreSignedTransactionPayload(signedTx);
      const paymentRequirements = createPaymentRequirements();

      veChainService.submitTransaction.mockRejectedValue(
        new Error('Network error: Connection timeout')
      );

      const res = await app.request('/settle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentPayload: encodePaymentPayload(payload),
          paymentRequirements,
        }),
      });

      expect(res.status).toBe(500);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain('Failed to submit transaction');
    });

    it('should handle confirmation timeout', async () => {
      const signedTx = '0xabcdef' + 'a'.repeat(500);
      const payload = createPreSignedTransactionPayload(signedTx);
      const paymentRequirements = createPaymentRequirements();

      veChainService.submitTransaction.mockResolvedValue(TEST_TX_HASHES.valid);
      veChainService.waitForConfirmation.mockResolvedValue(false); // Timeout

      const res = await app.request('/settle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentPayload: encodePaymentPayload(payload),
          paymentRequirements,
        }),
      });

      expect(res.status).toBe(408);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain('confirmation timeout');
    });

    it('should validate payment details match requirements', async () => {
      const signedTx = '0xabcdef' + 'a'.repeat(500);
      const payload = createPreSignedTransactionPayload(signedTx);
      const paymentRequirements = createPaymentRequirements({
        paymentOptions: [
          createPaymentOption({
            amount: TEST_AMOUNTS.tenVET, // Expecting 10 VET
          }),
        ],
      });

      veChainService.submitTransaction.mockResolvedValue(TEST_TX_HASHES.valid);
      veChainService.waitForConfirmation.mockResolvedValue(true);
      veChainService.decodeTransaction.mockResolvedValue({
        from: TEST_ADDRESSES.sender,
        to: TEST_ADDRESSES.recipient,
        amount: BigInt(TEST_AMOUNTS.oneVET), // But only sent 1 VET
        token: 'VET',
        clauses: [],
      });

      const res = await app.request('/settle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentPayload: encodePaymentPayload(payload),
          paymentRequirements,
        }),
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain('does not match payment requirements');
    });
  });

  describe('Fee Delegation Settlement', () => {
    it('should settle with fee delegation when enabled', async () => {
      const senderSignedTx = '0xaaaaaa' + 'a'.repeat(500);
      const payload = createFeeDelegationPayload(senderSignedTx, TEST_ADDRESSES.sender);
      const paymentRequirements = createPaymentRequirements();

      feeDelegationService.isEnabled.mockReturnValue(true);
      feeDelegationService.sponsorTransaction.mockResolvedValue({
        success: true,
        signedTransaction: '0xbbbbbb' + 'b'.repeat(500),
        vthoSpent: '21000',
      });

      veChainService.submitTransaction.mockResolvedValue(TEST_TX_HASHES.valid);
      veChainService.waitForConfirmation.mockResolvedValue(true);
      veChainService.decodeTransaction.mockResolvedValue({
        from: TEST_ADDRESSES.sender,
        to: TEST_ADDRESSES.recipient,
        amount: BigInt(TEST_AMOUNTS.oneVET),
        token: 'VET',
        clauses: [],
      });
      veChainService.verifyTransaction.mockResolvedValue(
        createMockVETTransferReceipt(
          TEST_ADDRESSES.sender,
          TEST_ADDRESSES.recipient,
          TEST_AMOUNTS.oneVET
        )
      );

      const res = await app.request('/settle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentPayload: encodePaymentPayload(payload),
          paymentRequirements,
        }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.transactionHash).toBe(TEST_TX_HASHES.valid);
      expect(feeDelegationService.sponsorTransaction).toHaveBeenCalled();
      expect(feeDelegationService.logDelegation).toHaveBeenCalled();
    });

    it('should reject fee delegation when not enabled', async () => {
      const senderSignedTx = '0xaaaaaa' + 'a'.repeat(500);
      const payload = createFeeDelegationPayload(senderSignedTx, TEST_ADDRESSES.sender);
      const paymentRequirements = createPaymentRequirements();

      feeDelegationService.isEnabled.mockReturnValue(false);

      const res = await app.request('/settle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentPayload: encodePaymentPayload(payload),
          paymentRequirements,
        }),
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain('Fee delegation is not enabled');
    });

    it('should handle fee delegation failure', async () => {
      const senderSignedTx = '0xaaaaaa' + 'a'.repeat(500);
      const payload = createFeeDelegationPayload(senderSignedTx, TEST_ADDRESSES.sender);
      const paymentRequirements = createPaymentRequirements();

      feeDelegationService.isEnabled.mockReturnValue(true);
      feeDelegationService.sponsorTransaction.mockResolvedValue({
        success: false,
        error: 'Insufficient VTHO balance',
      });

      const res = await app.request('/settle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentPayload: encodePaymentPayload(payload),
          paymentRequirements,
        }),
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error).toBe('Insufficient VTHO balance');
    });
  });

  describe('Legacy Transaction Verification', () => {
    it('should verify already submitted transaction', async () => {
      const payload = createLegacyTransactionPayload(TEST_TX_HASHES.valid);
      const paymentRequirements = createPaymentRequirements();

      const mockReceipt = createMockVETTransferReceipt(
        TEST_ADDRESSES.sender,
        TEST_ADDRESSES.recipient,
        TEST_AMOUNTS.oneVET
      );

      veChainService.verifyTransaction.mockResolvedValue(mockReceipt);
      veChainService.waitForConfirmation.mockResolvedValue(true);
      veChainService.decodeTransaction.mockResolvedValue({
        from: TEST_ADDRESSES.sender,
        to: TEST_ADDRESSES.recipient,
        amount: BigInt(TEST_AMOUNTS.oneVET),
        token: 'VET',
        clauses: [],
      });

      const res = await app.request('/settle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentPayload: encodePaymentPayload(payload),
          paymentRequirements,
        }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.transactionHash).toBe(TEST_TX_HASHES.valid);
      expect(veChainService.verifyTransaction).toHaveBeenCalledWith(TEST_TX_HASHES.valid);
    });

    it('should reject reverted transaction', async () => {
      const payload = createLegacyTransactionPayload(TEST_TX_HASHES.reverted);
      const paymentRequirements = createPaymentRequirements();

      const mockReceipt = createMockVETTransferReceipt(
        TEST_ADDRESSES.sender,
        TEST_ADDRESSES.recipient,
        TEST_AMOUNTS.oneVET,
        true // reverted
      );

      veChainService.verifyTransaction.mockResolvedValue(mockReceipt);

      const res = await app.request('/settle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentPayload: encodePaymentPayload(payload),
          paymentRequirements,
        }),
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain('reverted');
    });

    it('should handle transaction verification failure', async () => {
      const payload = createLegacyTransactionPayload(TEST_TX_HASHES.notFound);
      const paymentRequirements = createPaymentRequirements();

      veChainService.verifyTransaction.mockRejectedValue(
        new Error('Transaction not found')
      );

      const res = await app.request('/settle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentPayload: encodePaymentPayload(payload),
          paymentRequirements,
        }),
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain('Failed to verify transaction');
    });
  });

  describe('Input Validation', () => {
    it('should reject invalid JSON in payload', async () => {
      const invalidPayload = Buffer.from('not valid json').toString('base64');
      const paymentRequirements = createPaymentRequirements();

      const res = await app.request('/settle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentPayload: invalidPayload,
          paymentRequirements,
        }),
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain('Unable to parse JSON');
    });

    it('should reject empty payment options via Zod validation', async () => {
      const payload = createPreSignedTransactionPayload('0xabcdef');

      // This should fail Zod validation before reaching the handler
      const res = await app.request('/settle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentPayload: encodePaymentPayload(payload),
          paymentRequirements: {
            merchantId: 'test',
            paymentOptions: [], // Empty array fails Zod validation
          },
        }),
      });

      // Zod validator returns 400 with validation error
      expect(res.status).toBe(400);
    });

    it('should reject unsupported network', async () => {
      const payload = createPreSignedTransactionPayload('0xabcdef');
      const paymentRequirements = createPaymentRequirements({
        paymentOptions: [
          createPaymentOption({
            network: 'eip155:1', // Ethereum mainnet
          }),
        ],
      });

      const res = await app.request('/settle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentPayload: encodePaymentPayload(payload),
          paymentRequirements,
        }),
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain('No supported network');
    });

    it('should reject payload without required fields', async () => {
      const emptyPayload = encodePaymentPayload({});
      const paymentRequirements = createPaymentRequirements();

      const res = await app.request('/settle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentPayload: emptyPayload,
          paymentRequirements,
        }),
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error).toBeDefined();
    });
  });

  describe('Network Error Handling', () => {
    it('should handle network timeout during transaction decoding', async () => {
      const signedTx = '0xabcdef' + 'a'.repeat(500);
      const payload = createPreSignedTransactionPayload(signedTx);
      const paymentRequirements = createPaymentRequirements();

      veChainService.submitTransaction.mockResolvedValue(TEST_TX_HASHES.valid);
      veChainService.waitForConfirmation.mockResolvedValue(true);
      veChainService.decodeTransaction.mockRejectedValue(
        new Error('Network timeout')
      );

      const res = await app.request('/settle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentPayload: encodePaymentPayload(payload),
          paymentRequirements,
        }),
      });

      expect(res.status).toBe(500);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain('Failed to decode transaction');
    });
  });
});
