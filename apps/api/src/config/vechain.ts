/**
 * VeChain-specific constants and configuration
 */

import { env } from './env.js';

/**
 * VeChain network identifiers (CAIP-2 format)
 */
export const VECHAIN_NETWORKS = {
  TESTNET: 'eip155:100009',
  MAINNET: 'eip155:100010',
};

/**
 * Network key used to index per-network config below.
 * Mirrors env.VECHAIN_NETWORK ('testnet' | 'mainnet').
 */
export type VeChainNetworkKey = 'testnet' | 'mainnet';

/**
 * The network this API instance is deployed against.
 *
 * This is a per-network deployment model: one running instance serves
 * exactly one VeChain network, selected via env.VECHAIN_NETWORK. There is
 * no multi-network runtime support (no network column on the nonces table,
 * no multi-ThorClient handling) — everything below resolves against this
 * single active network.
 */
export const ACTIVE_NETWORK: VeChainNetworkKey = env.VECHAIN_NETWORK;

/**
 * VeChain token identifiers
 */
export const VECHAIN_TOKENS = {
  VET: 'VET',
  VTHO: 'VTHO',
  B3TR: 'B3TR',
  CONTRACT_INTERACTION: 'CONTRACT_INTERACTION',
} as const;

/**
 * VeChain contract addresses, per network.
 *
 * - VTHO is VeChain's built-in energy contract and shares the same address
 *   on both networks.
 * - B3TR is a deployed VIP-180 token with a different address per network.
 */
export const VECHAIN_CONTRACTS: Record<VeChainNetworkKey, { VTHO: string; B3TR: string }> = {
  testnet: {
    VTHO: '0x0000000000000000000000000000456E65726779',
    B3TR: '0x026771d1be764467f8bdb78bb230df10c924b00d',
  },
  mainnet: {
    VTHO: '0x0000000000000000000000000000456E65726779',
    B3TR: '0x5ef79995FE8a89e0812330E4378eB2660ceDe699',
  },
};

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
 * VIP-180 Token Registry, per network.
 *
 * supportsEIP3009 is always false: VIP-180 has no EIP-3009/EIP-2612
 * signed-transfer methods. Settlement instead relies on a payer-signed
 * transaction plus VIP-191 fee delegation.
 */
export const TOKEN_REGISTRY: Record<VeChainNetworkKey, Record<string, TokenConfig>> = {
  testnet: {
    VTHO: {
      symbol: 'VTHO',
      address: VECHAIN_CONTRACTS.testnet.VTHO,
      decimals: 18,
      supportsEIP3009: false,
    },
    B3TR: {
      symbol: 'B3TR',
      address: VECHAIN_CONTRACTS.testnet.B3TR,
      decimals: 18,
      supportsEIP3009: false,
    },
  },
  mainnet: {
    VTHO: {
      symbol: 'VTHO',
      address: VECHAIN_CONTRACTS.mainnet.VTHO,
      decimals: 18,
      supportsEIP3009: false,
    },
    B3TR: {
      symbol: 'B3TR',
      address: VECHAIN_CONTRACTS.mainnet.B3TR,
      decimals: 18,
      supportsEIP3009: false,
    },
  },
};

/**
 * Contract addresses and token registry for the network this API instance
 * is deployed against (env.VECHAIN_NETWORK / ACTIVE_NETWORK).
 *
 * Prefer these over indexing VECHAIN_CONTRACTS / TOKEN_REGISTRY directly:
 * since one process only ever serves one network, resolving the active
 * network's config once here is the simplest correct approach.
 */
export const ACTIVE_CONTRACTS = VECHAIN_CONTRACTS[ACTIVE_NETWORK];
export const ACTIVE_TOKEN_REGISTRY = TOKEN_REGISTRY[ACTIVE_NETWORK];

/**
 * Null address used as placeholder for contracts not yet deployed
 */
const NULL_ADDRESS = '0x0000000000000000000000000000000000000000';

/**
 * Get token symbol from contract address, resolved against the active
 * network's token registry.
 * @param contractAddress Token contract address
 * @returns Token symbol or the address if not found in registry
 */
export function getTokenSymbolFromAddress(contractAddress: string): string {
  const normalizedAddress = contractAddress.toLowerCase();

  for (const [symbol, config] of Object.entries(ACTIVE_TOKEN_REGISTRY)) {
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
 * Supported networks for x402 protocol.
 *
 * Derived from env.VECHAIN_NETWORK: this API instance is a per-network
 * deployment, so this is always a single-element list containing the CAIP-2
 * id of the active network — never a hardcoded multi-network array.
 */
export const SUPPORTED_NETWORKS = [
  ACTIVE_NETWORK === 'mainnet' ? VECHAIN_NETWORKS.MAINNET : VECHAIN_NETWORKS.TESTNET,
] as const;
