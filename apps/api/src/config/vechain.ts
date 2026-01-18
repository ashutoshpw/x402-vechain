/**
 * VeChain-specific constants and configuration
 */

/**
 * VeChain network identifiers (CAIP-2 format)
 */
export const VECHAIN_NETWORKS = {
  TESTNET: 'eip155:100009',
  MAINNET: 'eip155:100010',
};

/**
 * VeChain token identifiers
 */
export const VECHAIN_TOKENS = {
  VET: 'VET',
  VTHO: 'VTHO',
  CONTRACT_INTERACTION: 'CONTRACT_INTERACTION',
};

/**
 * VeChain contract addresses
 */
export const VECHAIN_CONTRACTS = {
  // VeThor (VTHO) energy contract address
  // This is VeChain's official built-in energy/VTHO contract
  // Reference: https://docs.vechain.org/core-concepts/transactions/meta-transaction-features
  VTHO: '0x0000000000000000000000000000456E65726779',
} as const;

/**
 * VeChain network timing constants
 */
export const VECHAIN_TIMING = {
  // Average block time in milliseconds
  BLOCK_TIME_MS: 10000, // 10 seconds
  
  // Maximum attempts for transaction confirmation polling
  MAX_CONFIRMATION_ATTEMPTS: 30,
  
  // Default number of confirmations to wait for
  DEFAULT_CONFIRMATIONS: 1,
} as const;
