/**
 * Utility functions for formatting token amounts
 */

/**
 * Format token amount from Wei (BigInt string) to human-readable format
 * @param amount Amount in Wei as string
 * @param decimals Number of decimals to display (default: 2)
 * @returns Formatted amount string
 */
export function formatTokenAmount(amount: string, decimals: number = 2): string {
  try {
    const num = BigInt(amount || '0')
    const divisor = BigInt(10 ** 18)
    const intPart = num / divisor
    const fracPart = num % divisor
    
    // Format with specified decimal places
    const fracStr = fracPart.toString().padStart(18, '0').slice(0, decimals)
    return `${intPart}.${fracStr}`
  } catch {
    return '0.00'
  }
}

/**
 * Get token symbol from address
 * @param tokenAddress Token contract address or null for native token
 * @returns Token symbol
 */
export function getTokenSymbol(tokenAddress: string | null): string {
  if (!tokenAddress) return 'VET'
  
  const tokenMap: Record<string, string> = {
    '0x0000000000000000000000000000456e65726779': 'VTHO',
    '0x170f4ba2e7c1c0b5e1b811b67e5c82226b248e77': 'VEUSD',
    '0x5ef79995FE8a89e0812330E4378eB2660ceDe699': 'B3TR',
  }
  
  return tokenMap[tokenAddress.toLowerCase()] || tokenAddress.slice(0, 8) + '...'
}

/**
 * Get VeChain explorer URL for a transaction
 * @param txHash Transaction hash
 * @param network Network name ('testnet' or 'mainnet')
 * @returns Explorer URL
 */
export function getExplorerUrl(txHash: string, network: string): string {
  const baseUrl = network === 'mainnet'
    ? 'https://explore.vechain.org'
    : 'https://explore-testnet.vechain.org'
  return `${baseUrl}/transactions/${txHash}`
}
