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
  VEUSD: 'VEUSD',
  B3TR: 'B3TR',
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
  
  // VeUSD - VeChain stable coin
  // Note: Contract address TBD - to be updated when available
  VEUSD: '0x0000000000000000000000000000000000000000', // Placeholder
  
  // B3TR - VeChain token
  // Note: Contract address TBD - to be updated when available
  B3TR: '0x0000000000000000000000000000000000000000', // Placeholder
} as const;

/**
 * Null address used as placeholder for contracts not yet deployed
 */
const NULL_ADDRESS = '0x0000000000000000000000000000000000000000';

/**
 * Get token symbol from contract address
 * @param contractAddress Token contract address
 * @returns Token symbol or the address if not found in registry
 */
export function getTokenSymbolFromAddress(contractAddress: string): string {
  const normalizedAddress = contractAddress.toLowerCase();
  
  for (const [symbol, config] of Object.entries(TOKEN_REGISTRY)) {
    if (config.address.toLowerCase() === normalizedAddress) {
      return symbol;
    }
  }
  
  // Return the address if not found in registry
  return contractAddress;
}

/**
 * Check if a contract address is a placeholder (not yet deployed)
 * @param address Contract address to check
 * @returns true if address is a placeholder
 */
export function isPlaceholderAddress(address: string): boolean {
  return address.toLowerCase() === NULL_ADDRESS.toLowerCase();
}

/**
 * VIP-180 Token Configuration
 * Defines metadata for supported VIP-180 tokens (VeChain's ERC-20 equivalent)
 */
export interface TokenConfig {
  symbol: string;
  address: string;
  decimals: number;
  supportsEIP3009: boolean; // transferWithAuthorization support
}

/**
 * VIP-180 Token Registry
 * Maps token symbols to their configuration
 */
export const TOKEN_REGISTRY: Record<string, TokenConfig> = {
  VTHO: {
    symbol: 'VTHO',
    address: VECHAIN_CONTRACTS.VTHO,
    decimals: 18,
    supportsEIP3009: false, // VTHO is built-in, uses standard transfer
  },
  VEUSD: {
    symbol: 'VEUSD',
    address: VECHAIN_CONTRACTS.VEUSD,
    decimals: 18,
    supportsEIP3009: false, // To be updated when contract details are available
  },
  B3TR: {
    symbol: 'B3TR',
    address: VECHAIN_CONTRACTS.B3TR,
    decimals: 18,
    supportsEIP3009: false, // To be updated when contract details are available
  },
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

/**
 * Supported networks for x402 protocol
 * This can be configured based on deployment environment
 */
export const SUPPORTED_NETWORKS = [
  VECHAIN_NETWORKS.TESTNET,
  // Add MAINNET when ready for production:
  // VECHAIN_NETWORKS.MAINNET,
] as const;
