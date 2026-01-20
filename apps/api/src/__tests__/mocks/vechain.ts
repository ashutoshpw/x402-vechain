/**
 * Mock VeChain SDK responses for testing
 */

import type { TransactionReceipt } from '@vechain/sdk-network';

/**
 * Create a mock transaction receipt
 */
export function createMockTransactionReceipt(
  overrides?: Partial<TransactionReceipt>
): TransactionReceipt {
  return {
    gasUsed: 21000,
    gasPayer: '0x0000000000000000000000000000000000000000',
    paid: '0x0',
    reward: '0x0',
    reverted: false,
    meta: {
      blockID: '0x00a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1',
      blockNumber: 100000,
      blockTimestamp: Math.floor(Date.now() / 1000),
      txID: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
      txOrigin: '0xf077b491b355e64048ce21e3a6fc4751eeea77fa',
    },
    outputs: [
      {
        contractAddress: null,
        events: [],
        transfers: [],
      },
    ],
    ...overrides,
  } as TransactionReceipt;
}

/**
 * Create a mock VET transfer receipt
 */
export function createMockVETTransferReceipt(
  from: string,
  to: string,
  amount: string,
  reverted = false
): TransactionReceipt {
  return createMockTransactionReceipt({
    reverted,
    outputs: [
      {
        contractAddress: null,
        events: [],
        transfers: [
          {
            sender: from,
            recipient: to,
            amount,
          },
        ],
      },
    ],
  });
}

/**
 * Create a mock VIP-180 token transfer receipt
 */
export function createMockTokenTransferReceipt(
  tokenAddress: string,
  from: string,
  to: string,
  amount: string,
  reverted = false
): TransactionReceipt {
  return createMockTransactionReceipt({
    reverted,
    outputs: [
      {
        contractAddress: null,
        events: [
          {
            address: tokenAddress,
            topics: [
              '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef', // Transfer event signature
              '0x000000000000000000000000' + from.slice(2),
              '0x000000000000000000000000' + to.slice(2),
            ],
            data: '0x' + BigInt(amount).toString(16).padStart(64, '0'),
          },
        ],
        transfers: [],
      },
    ],
  });
}

/**
 * Create a mock account response
 */
export function createMockAccount(address: string, vetBalance: string, vthoBalance: string) {
  return {
    balance: vetBalance,
    energy: vthoBalance,
    hasCode: false,
  };
}

/**
 * Create a mock block response
 */
export function createMockBlock(blockNumber: number) {
  return {
    number: blockNumber,
    id: '0x' + blockNumber.toString(16).padStart(64, '0'),
    size: 1000,
    parentID: '0x' + (blockNumber - 1).toString(16).padStart(64, '0'),
    timestamp: Math.floor(Date.now() / 1000),
    gasLimit: 10000000,
    beneficiary: '0x0000000000000000000000000000000000000000',
    gasUsed: 21000,
    totalScore: 100000,
    txsRoot: '0x0000000000000000000000000000000000000000000000000000000000000000',
    txsFeatures: 1,
    stateRoot: '0x0000000000000000000000000000000000000000000000000000000000000000',
    receiptsRoot: '0x0000000000000000000000000000000000000000000000000000000000000000',
    com: false,
    signer: '0x0000000000000000000000000000000000000000',
    isTrunk: true,
    isFinalized: true,
    transactions: [],
  };
}

/**
 * Create a mock transaction send result
 */
export function createMockTransactionSendResult(txId: string) {
  return {
    id: txId,
  };
}

/**
 * Create a mock contract call result
 */
export function createMockContractCallResult(balance: bigint, success = true) {
  return {
    success,
    result: {
      plain: balance.toString(),
      errorMessage: success ? undefined : 'Contract call failed',
    },
  };
}
