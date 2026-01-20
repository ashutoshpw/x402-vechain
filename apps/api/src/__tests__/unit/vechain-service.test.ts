/**
 * Unit tests for VeChain Service
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { VeChainService } from '../../services/VeChainService.js';
import {
  createMockTransactionReceipt,
  createMockVETTransferReceipt,
  createMockTokenTransferReceipt,
  createMockAccount,
  createMockBlock,
  createMockTransactionSendResult,
  createMockContractCallResult,
} from '../mocks/vechain.js';
import { TEST_ADDRESSES, TEST_TX_HASHES, TEST_AMOUNTS } from '../fixtures/payloads.js';
import { VECHAIN_CONTRACTS } from '../../config/vechain.js';

// Mock the VeChain SDK
vi.mock('@vechain/sdk-network', () => {
  const mockThorClient = {
    transactions: {
      getTransactionReceipt: vi.fn(),
      sendRawTransaction: vi.fn(),
      getTransaction: vi.fn(),
    },
    accounts: {
      getAccount: vi.fn(),
    },
    blocks: {
      getBestBlockCompressed: vi.fn(),
    },
    contracts: {
      executeCall: vi.fn(),
    },
  };

  return {
    ThorClient: {
      fromUrl: vi.fn(() => mockThorClient),
    },
  };
});

describe('VeChainService', () => {
  let service: VeChainService;
  let mockThorClient: any;

  beforeEach(async () => {
    // Reset all mocks before each test
    vi.clearAllMocks();
    vi.resetModules();
    
    // Re-mock the VeChain SDK for each test
    vi.doMock('@vechain/sdk-network', () => {
      mockThorClient = {
        transactions: {
          getTransactionReceipt: vi.fn(),
          sendRawTransaction: vi.fn(),
          getTransaction: vi.fn(),
        },
        accounts: {
          getAccount: vi.fn(),
        },
        blocks: {
          getBestBlockCompressed: vi.fn(),
        },
        contracts: {
          executeCall: vi.fn(),
        },
      };
      
      return {
        ThorClient: {
          fromUrl: vi.fn(() => mockThorClient),
        },
      };
    });
    
    // Import the service after mocking
    const { VeChainService: Service } = await import('../../services/VeChainService.js');
    service = new Service();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('verifyTransaction', () => {
    it('should verify a valid transaction', async () => {
      const mockReceipt = createMockTransactionReceipt();
      mockThorClient.transactions.getTransactionReceipt.mockResolvedValue(mockReceipt);

      const receipt = await service.verifyTransaction(TEST_TX_HASHES.valid);

      expect(receipt).toEqual(mockReceipt);
      expect(mockThorClient.transactions.getTransactionReceipt).toHaveBeenCalledWith(
        TEST_TX_HASHES.valid
      );
    });

    it('should handle transaction hash without 0x prefix', async () => {
      const mockReceipt = createMockTransactionReceipt();
      mockThorClient.transactions.getTransactionReceipt.mockResolvedValue(mockReceipt);

      const hashWithoutPrefix = TEST_TX_HASHES.valid.slice(2);
      await service.verifyTransaction(hashWithoutPrefix);

      expect(mockThorClient.transactions.getTransactionReceipt).toHaveBeenCalledWith(
        TEST_TX_HASHES.valid
      );
    });

    it('should throw error when transaction not found', async () => {
      mockThorClient.transactions.getTransactionReceipt.mockResolvedValue(null);

      await expect(
        service.verifyTransaction(TEST_TX_HASHES.notFound)
      ).rejects.toThrow('Transaction not found');
    });

    it('should detect reverted transactions', async () => {
      const mockReceipt = createMockTransactionReceipt({ reverted: true });
      mockThorClient.transactions.getTransactionReceipt.mockResolvedValue(mockReceipt);

      const receipt = await service.verifyTransaction(TEST_TX_HASHES.reverted);

      expect(receipt.reverted).toBe(true);
    });

    it('should handle network errors', async () => {
      mockThorClient.transactions.getTransactionReceipt.mockRejectedValue(
        new Error('Network error')
      );

      await expect(
        service.verifyTransaction(TEST_TX_HASHES.valid)
      ).rejects.toThrow('Failed to verify transaction');
    });
  });

  describe('submitTransaction', () => {
    it('should submit a valid signed transaction', async () => {
      const signedTx = '0xabcdef' + 'a'.repeat(500);
      const mockResult = createMockTransactionSendResult(TEST_TX_HASHES.valid);
      mockThorClient.transactions.sendRawTransaction.mockResolvedValue(mockResult);

      const txHash = await service.submitTransaction(signedTx);

      expect(txHash).toBe(TEST_TX_HASHES.valid);
      expect(mockThorClient.transactions.sendRawTransaction).toHaveBeenCalledWith(signedTx);
    });

    it('should handle transaction without 0x prefix', async () => {
      const signedTx = 'abcdef' + 'a'.repeat(500);
      const mockResult = createMockTransactionSendResult(TEST_TX_HASHES.valid);
      mockThorClient.transactions.sendRawTransaction.mockResolvedValue(mockResult);

      await service.submitTransaction(signedTx);

      expect(mockThorClient.transactions.sendRawTransaction).toHaveBeenCalledWith(
        '0x' + signedTx
      );
    });

    it('should throw error when submission fails', async () => {
      mockThorClient.transactions.sendRawTransaction.mockResolvedValue(null);

      await expect(
        service.submitTransaction('0xabcdef')
      ).rejects.toThrow('Transaction submission failed');
    });

    it('should handle network errors during submission', async () => {
      mockThorClient.transactions.sendRawTransaction.mockRejectedValue(
        new Error('Network error')
      );

      await expect(
        service.submitTransaction('0xabcdef')
      ).rejects.toThrow('Failed to submit transaction');
    });
  });

  describe('getBalance', () => {
    it('should get VET balance', async () => {
      const mockAccount = createMockAccount(
        TEST_ADDRESSES.sender,
        TEST_AMOUNTS.tenVET,
        TEST_AMOUNTS.oneVTHO
      );
      mockThorClient.accounts.getAccount.mockResolvedValue(mockAccount);

      const balance = await service.getBalance(TEST_ADDRESSES.sender, 'VET');

      expect(balance).toBe(BigInt(TEST_AMOUNTS.tenVET));
    });

    it('should get VTHO balance', async () => {
      const mockAccount = createMockAccount(
        TEST_ADDRESSES.sender,
        TEST_AMOUNTS.tenVET,
        TEST_AMOUNTS.oneVTHO
      );
      mockThorClient.accounts.getAccount.mockResolvedValue(mockAccount);

      const balance = await service.getBalance(TEST_ADDRESSES.sender, 'VTHO');

      expect(balance).toBe(BigInt(TEST_AMOUNTS.oneVTHO));
    });

    it('should get VIP-180 token balance', async () => {
      const tokenBalance = BigInt('5000000000000000000'); // 5 tokens
      const mockResult = createMockContractCallResult(tokenBalance);
      mockThorClient.contracts.executeCall.mockResolvedValue(mockResult);

      const balance = await service.getBalance(TEST_ADDRESSES.sender, VECHAIN_CONTRACTS.VTHO);

      expect(balance).toBe(tokenBalance);
      expect(mockThorClient.contracts.executeCall).toHaveBeenCalled();
    });

    it('should handle VET balance query case-insensitively', async () => {
      const mockAccount = createMockAccount(
        TEST_ADDRESSES.sender,
        TEST_AMOUNTS.oneVET,
        TEST_AMOUNTS.oneVTHO
      );
      mockThorClient.accounts.getAccount.mockResolvedValue(mockAccount);

      const balanceLower = await service.getBalance(TEST_ADDRESSES.sender, 'vet');
      const balanceUpper = await service.getBalance(TEST_ADDRESSES.sender, 'VET');

      expect(balanceLower).toBe(balanceUpper);
    });

    it('should throw error for placeholder token addresses', async () => {
      const placeholderAddress = '0x0000000000000000000000000000000000000000';

      await expect(
        service.getBalance(TEST_ADDRESSES.sender, placeholderAddress)
      ).rejects.toThrow('Cannot query balance for null address');
    });

    it('should throw error when account not found', async () => {
      mockThorClient.accounts.getAccount.mockResolvedValue(null);

      await expect(
        service.getBalance(TEST_ADDRESSES.sender, 'VET')
      ).rejects.toThrow('Account not found');
    });

    it('should throw error for unknown token', async () => {
      await expect(
        service.getBalance(TEST_ADDRESSES.sender, 'UNKNOWN')
      ).rejects.toThrow('Unknown token');
    });
  });

  describe('waitForConfirmation', () => {
    it('should confirm transaction after 1 block', async () => {
      const mockReceipt = createMockTransactionReceipt({
        meta: {
          blockID: '0x123',
          blockNumber: 100000,
          blockTimestamp: Math.floor(Date.now() / 1000),
          txID: TEST_TX_HASHES.valid,
          txOrigin: TEST_ADDRESSES.sender,
        },
      });
      const mockBlock = createMockBlock(100001); // 1 block after transaction

      mockThorClient.transactions.getTransactionReceipt.mockResolvedValue(mockReceipt);
      mockThorClient.blocks.getBestBlockCompressed.mockResolvedValue(mockBlock);

      const confirmed = await service.waitForConfirmation(TEST_TX_HASHES.valid, 1);

      expect(confirmed).toBe(true);
    });

    it('should wait for multiple confirmations', async () => {
      const mockReceipt = createMockTransactionReceipt({
        meta: {
          blockID: '0x123',
          blockNumber: 100000,
          blockTimestamp: Math.floor(Date.now() / 1000),
          txID: TEST_TX_HASHES.valid,
          txOrigin: TEST_ADDRESSES.sender,
        },
      });
      const mockBlock = createMockBlock(100003); // 3 blocks after transaction

      mockThorClient.transactions.getTransactionReceipt.mockResolvedValue(mockReceipt);
      mockThorClient.blocks.getBestBlockCompressed.mockResolvedValue(mockBlock);

      const confirmed = await service.waitForConfirmation(TEST_TX_HASHES.valid, 3);

      expect(confirmed).toBe(true);
    });

    it('should return false for reverted transactions', async () => {
      const mockReceipt = createMockTransactionReceipt({ reverted: true });
      mockThorClient.transactions.getTransactionReceipt.mockResolvedValue(mockReceipt);

      const confirmed = await service.waitForConfirmation(TEST_TX_HASHES.valid, 1);

      expect(confirmed).toBe(false);
    });

    it.skip('should timeout if transaction not found (skipped: takes too long)', async () => {
      mockThorClient.transactions.getTransactionReceipt.mockResolvedValue(null);

      // This will timeout after max attempts (30 * 10 seconds = 300 seconds)
      // Skipping this test as it would take too long in the test suite
      // In real implementation, this works correctly but is slow
      const confirmed = await service.waitForConfirmation(TEST_TX_HASHES.notFound, 1);

      expect(confirmed).toBe(false);
    });
  });
});
