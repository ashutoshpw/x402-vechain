/**
 * VIP-180 Token Utilities
 * 
 * Provides utilities for interacting with VIP-180 tokens (VeChain's ERC-20 equivalent)
 * Includes transfer detection and decoding helpers
 */

/**
 * Function signature for standard VIP-180 transfer
 * Calculated as: keccak256("transfer(address,uint256)").slice(0, 4)
 */
export const TRANSFER_FUNCTION_SIGNATURE = '0xa9059cbb';

/**
 * Function signature for EIP-3009 transferWithAuthorization
 * Calculated as: keccak256("transferWithAuthorization(address,address,uint256,uint256,uint256,bytes32,uint8,bytes32,bytes32)").slice(0, 4)
 */
export const TRANSFER_WITH_AUTHORIZATION_SIGNATURE = '0xe3ee160e';

/**
 * Transfer event signature
 * Calculated as: keccak256("Transfer(address,address,uint256)")
 */
export const TRANSFER_EVENT_SIGNATURE = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

/**
 * Decode VIP-180 transfer function call data
 * @param data Transaction data (calldata)
 * @returns Decoded transfer parameters or null if not a transfer
 */
export function decodeTransfer(data: string): { to: string; amount: bigint } | null {
  try {
    // Check if data starts with transfer function signature
    if (!data.startsWith(TRANSFER_FUNCTION_SIGNATURE)) {
      return null;
    }

    // Remove function signature (first 4 bytes / 8 hex chars + 0x prefix)
    const params = data.slice(10);

    // Decode parameters: address (32 bytes) + uint256 (32 bytes)
    if (params.length !== 128) {
      // 64 bytes = 128 hex chars
      return null;
    }

    // Extract address (first 32 bytes, last 20 bytes are the address)
    const toAddress = '0x' + params.slice(24, 64);

    // Extract amount (next 32 bytes)
    const amountHex = params.slice(64, 128);
    const amount = BigInt('0x' + amountHex);

    return {
      to: toAddress,
      amount,
    };
  } catch (error) {
    return null;
  }
}

/**
 * Decode transferWithAuthorization function call data
 * @param data Transaction data (calldata)
 * @returns Decoded transfer parameters or null if not a transferWithAuthorization
 */
export function decodeTransferWithAuthorization(data: string): {
  from: string;
  to: string;
  amount: bigint;
  validAfter: bigint;
  validBefore: bigint;
  nonce: string;
} | null {
  try {
    // Check if data starts with transferWithAuthorization function signature
    if (!data.startsWith(TRANSFER_WITH_AUTHORIZATION_SIGNATURE)) {
      return null;
    }

    // Remove function signature (first 4 bytes / 8 hex chars + 0x prefix)
    const params = data.slice(10);

    // Parameters: from, to, value, validAfter, validBefore, nonce, v, r, s
    // Each parameter is 32 bytes (64 hex chars)
    if (params.length < 288) {
      // 9 params * 32 bytes = 288 hex chars minimum
      return null;
    }

    const fromAddress = '0x' + params.slice(24, 64);
    const toAddress = '0x' + params.slice(88, 128);
    const amount = BigInt('0x' + params.slice(128, 192));
    const validAfter = BigInt('0x' + params.slice(192, 256));
    const validBefore = BigInt('0x' + params.slice(256, 320));
    const nonce = '0x' + params.slice(320, 384);

    return {
      from: fromAddress,
      to: toAddress,
      amount,
      validAfter,
      validBefore,
      nonce,
    };
  } catch (error) {
    return null;
  }
}

/**
 * Check if transaction data is a VIP-180 token transfer
 * @param data Transaction data (calldata)
 * @returns true if data represents a token transfer
 */
export function isTokenTransfer(data: string): boolean {
  return (
    data.startsWith(TRANSFER_FUNCTION_SIGNATURE) ||
    data.startsWith(TRANSFER_WITH_AUTHORIZATION_SIGNATURE)
  );
}

