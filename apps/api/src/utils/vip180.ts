/**
 * VIP-180 Token Utilities
 * 
 * Provides utilities for interacting with VIP-180 tokens (VeChain's ERC-20 equivalent)
 * Includes transfer detection and decoding helpers
 */

/**
 * ABI encoding/decoding constants
 */
const FUNCTION_SIGNATURE_LENGTH = 10; // 0x + 8 hex chars (4 bytes)
const PARAM_SIZE_BYTES = 32; // Each parameter is 32 bytes in ABI encoding
const PARAM_SIZE_HEX = PARAM_SIZE_BYTES * 2; // 64 hex chars per parameter
const ADDRESS_PADDING_START = 24; // Addresses are right-padded in 32-byte slots
const ADDRESS_LENGTH = 40; // Address hex length (20 bytes)

/**
 * Transfer function parameters
 */
const TRANSFER_PARAMS_LENGTH = PARAM_SIZE_HEX * 2; // 2 params: to, amount
const TRANSFER_WITH_AUTH_MIN_PARAMS = 9; // from, to, value, validAfter, validBefore, nonce, v, r, s
const TRANSFER_WITH_AUTH_PARAMS_MIN_LENGTH = PARAM_SIZE_HEX * TRANSFER_WITH_AUTH_MIN_PARAMS;

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
    const params = data.slice(FUNCTION_SIGNATURE_LENGTH);

    // Decode parameters: address (32 bytes) + uint256 (32 bytes)
    if (params.length !== TRANSFER_PARAMS_LENGTH) {
      return null;
    }

    // Extract address (first 32 bytes, last 20 bytes are the address)
    const toAddress = '0x' + params.slice(ADDRESS_PADDING_START, ADDRESS_PADDING_START + ADDRESS_LENGTH);

    // Extract amount (next 32 bytes)
    const amountStart = PARAM_SIZE_HEX;
    const amountEnd = amountStart + PARAM_SIZE_HEX;
    const amountHex = params.slice(amountStart, amountEnd);
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
    const params = data.slice(FUNCTION_SIGNATURE_LENGTH);

    // Parameters: from, to, value, validAfter, validBefore, nonce, v, r, s
    // Each parameter is 32 bytes (64 hex chars)
    if (params.length < TRANSFER_WITH_AUTH_PARAMS_MIN_LENGTH) {
      return null;
    }

    // Helper function to extract parameter at index
    const getParam = (index: number) => {
      const start = index * PARAM_SIZE_HEX;
      const end = start + PARAM_SIZE_HEX;
      return params.slice(start, end);
    };

    // Extract addresses (skip padding)
    const fromAddress = '0x' + getParam(0).slice(ADDRESS_PADDING_START);
    const toAddress = '0x' + getParam(1).slice(ADDRESS_PADDING_START);
    
    // Extract bigint values
    const amount = BigInt('0x' + getParam(2));
    const validAfter = BigInt('0x' + getParam(3));
    const validBefore = BigInt('0x' + getParam(4));
    const nonce = '0x' + getParam(5);

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

