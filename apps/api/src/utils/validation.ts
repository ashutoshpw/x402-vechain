/**
 * Utility functions for validation and common operations
 */

/**
 * Validate Ethereum/VeChain address format
 * @param address Address to validate
 * @returns true if valid, false otherwise
 */
export function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Normalize address to lowercase
 * @param address Address to normalize
 * @returns Normalized address
 */
export function normalizeAddress(address: string): string {
  return address.toLowerCase();
}

/**
 * Validate transaction hash format
 * @param hash Transaction hash to validate
 * @returns true if valid, false otherwise
 */
export function isValidTxHash(hash: string): boolean {
  return /^0x[a-fA-F0-9]{64}$/.test(hash);
}
