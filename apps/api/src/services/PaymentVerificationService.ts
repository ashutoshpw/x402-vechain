/**
 * Payment Verification Service
 * 
 * Handles verification of payment payloads according to x402 spec:
 * - Signature verification using secp256k1
 * - Payload structure validation
 * - Nonce checking for replay attack prevention
 * - Timestamp validation
 * - CAIP-2 network identifier parsing
 */

import { Secp256k1, Address, Keccak256, Hex } from '@vechain/sdk-core';
import type { PaymentPayload, PaymentOption } from '../types/x402.js';
import { db } from '../db/index.js';
import { nonces } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';
import { VECHAIN_NETWORKS, VECHAIN_TOKENS, SUPPORTED_NETWORKS } from '../config/vechain.js';

/**
 * Result of payment payload verification
 */
export interface VerificationResult {
  isValid: boolean;
  senderAddress?: string;
  error?: string;
}

/**
 * Parse CAIP-2 network identifier
 * Format: namespace:reference (e.g., "vechain:100009")
 * @param network CAIP-2 network identifier
 * @returns Parsed namespace and reference
 */
export function parseCAIP2Network(network: string): { namespace: string; reference: string } | null {
  const parts = network.split(':');
  if (parts.length !== 2) {
    return null;
  }
  
  const [namespace, reference] = parts;
  
  // VeChain uses "eip155" namespace in the codebase but accepts "vechain" as well
  if (namespace !== 'eip155' && namespace !== 'vechain') {
    return null;
  }
  
  return { namespace, reference };
}

/**
 * Normalize network identifier to standard format
 * Converts "vechain:100009" to "eip155:100009" for compatibility
 * @param network Network identifier
 * @returns Normalized network identifier
 */
export function normalizeNetworkIdentifier(network: string): string {
  const parsed = parseCAIP2Network(network);
  if (!parsed) {
    return network;
  }
  
  // Convert to eip155 namespace for consistency with codebase
  return `eip155:${parsed.reference}`;
}

/**
 * Validate token contract address
 * For VIP-180 tokens, ensures the address is a valid VeChain contract address
 * @param asset Token identifier ('native', 'VET', 'VTHO', or contract address)
 * @returns true if valid, false otherwise
 */
export function validateTokenAddress(asset: string): boolean {
  // Native tokens
  if (asset === 'native' || asset.toUpperCase() === VECHAIN_TOKENS.VET || asset.toUpperCase() === VECHAIN_TOKENS.VTHO) {
    return true;
  }
  
  // VIP-180 token contract address (must be 42 chars hex with 0x prefix)
  if (asset.startsWith('0x') && asset.length === 42) {
    try {
      // Validate it's a proper hex address
      Address.of(asset);
      return true;
    } catch {
      return false;
    }
  }
  
  return false;
}

/**
 * Check if a nonce has been used
 * @param walletAddress Wallet address
 * @param nonce Nonce value
 * @returns true if nonce has been used, false otherwise
 */
export async function isNonceUsed(walletAddress: string, nonce: string): Promise<boolean> {
  try {
    const result = await db
      .select()
      .from(nonces)
      .where(
        and(
          eq(nonces.walletAddress, walletAddress.toLowerCase()),
          eq(nonces.nonce, nonce)
        )
      )
      .limit(1);
    
    return result.length > 0;
  } catch (error) {
    // If database is not available or query fails, reject for safety
    throw new Error(`Nonce check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Cache a used nonce to prevent replay attacks
 * @param walletAddress Wallet address
 * @param nonce Nonce value
 * @param validUntil Expiration timestamp
 * @throws Error if nonce already exists (race condition detected) or database error
 */
export async function cacheNonce(walletAddress: string, nonce: string, validUntil: number): Promise<void> {
  try {
    await db.insert(nonces).values({
      walletAddress: walletAddress.toLowerCase(),
      nonce,
      expiresAt: new Date(validUntil * 1000), // Convert Unix timestamp to Date
    });
  } catch (error) {
    // Check if this is a unique constraint violation (race condition)
    const errorMessage = error instanceof Error ? error.message : '';
    if (errorMessage.includes('unique') || errorMessage.includes('duplicate')) {
      throw new Error('Nonce has already been used (detected concurrent request)');
    }
    throw new Error(`Failed to cache nonce: ${errorMessage || 'Unknown error'}`);
  }
}

/**
 * Create hash of payload for signature verification
 * @param payload Payment payload data
 * @returns Hash of the payload
 */
function hashPayload(payload: PaymentPayload['payload']): Uint8Array {
  // Create deterministic JSON string for hashing
  const message = JSON.stringify({
    scheme: payload.scheme,
    network: payload.network,
    payTo: payload.payTo,
    amount: payload.amount,
    asset: payload.asset,
    nonce: payload.nonce,
    validUntil: payload.validUntil,
  });
  
  // Hash the message using Keccak256 (Ethereum-compatible)
  return Keccak256.of(Buffer.from(message)).bytes;
}

/**
 * Recover signer address from signature
 * @param messageHash Hash of the signed message
 * @param signature Signature in hex format (65 bytes)
 * @returns Recovered public address
 */
function recoverSignerAddress(messageHash: Uint8Array, signature: string): string {
  try {
    // Remove 0x prefix if present
    const cleanSig = signature.startsWith('0x') ? signature.slice(2) : signature;
    
    // Convert signature to bytes
    const sigBytes = Hex.of(cleanSig).bytes;
    
    // Recover public key from signature
    const publicKey = Secp256k1.recover(messageHash, sigBytes);
    
    // Derive address from public key
    // VeChain uses Ethereum-compatible addressing (Keccak256 hash of public key)
    const pubKeyHash = Keccak256.of(publicKey.slice(1)).bytes; // Skip first byte (0x04 uncompressed marker)
    const address = '0x' + Buffer.from(pubKeyHash.slice(-20)).toString('hex');
    
    return address;
  } catch (error) {
    throw new Error(`Signature recovery failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Verify payment payload signature and structure
 * @param paymentPayload Signed payment payload
 * @param paymentOptions Array of acceptable payment options
 * @returns Verification result with sender address if valid
 */
export async function verifyPaymentPayload(
  paymentPayload: PaymentPayload,
  paymentOptions: PaymentOption[]
): Promise<VerificationResult> {
  try {
    // 1. Validate payload structure
    if (!paymentPayload.signature || !paymentPayload.payload) {
      return {
        isValid: false,
        error: 'Missing signature or payload',
      };
    }
    
    const { payload, signature } = paymentPayload;
    
    // Validate scheme
    if (payload.scheme !== 'exact') {
      return {
        isValid: false,
        error: 'Invalid payment scheme. Only "exact" is supported',
      };
    }
    
    // 2. Parse and validate CAIP-2 network identifier
    const parsedNetwork = parseCAIP2Network(payload.network);
    if (!parsedNetwork) {
      return {
        isValid: false,
        error: `Invalid CAIP-2 network identifier: ${payload.network}`,
      };
    }
    
    // Normalize network for comparison
    const normalizedNetwork = normalizeNetworkIdentifier(payload.network);
    
    // Check if network is supported (using shared configuration)
    if (!SUPPORTED_NETWORKS.includes(normalizedNetwork as any)) {
      return {
        isValid: false,
        error: `Unsupported network: ${payload.network}`,
      };
    }
    
    // 3. Validate timestamp
    const currentTime = Math.floor(Date.now() / 1000); // Unix timestamp in seconds
    if (payload.validUntil <= currentTime) {
      return {
        isValid: false,
        error: 'Payment payload has expired',
      };
    }
    
    // 4. Validate token contract address
    if (!validateTokenAddress(payload.asset)) {
      return {
        isValid: false,
        error: `Invalid token address: ${payload.asset}`,
      };
    }
    
    // 5. Verify signature and recover sender address
    const messageHash = hashPayload(payload);
    let senderAddress: string;
    
    try {
      senderAddress = recoverSignerAddress(messageHash, signature);
    } catch (error) {
      return {
        isValid: false,
        error: `Signature verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
    
    // 6. Validate nonce (prevent replay attacks)
    const nonceAlreadyUsed = await isNonceUsed(senderAddress, payload.nonce);
    if (nonceAlreadyUsed) {
      return {
        isValid: false,
        error: 'Nonce has already been used',
      };
    }
    
    // 7. Validate payment details match requirements
    const matchingOption = paymentOptions.find((option: PaymentOption) => {
      // Normalize both networks for comparison
      const optionNetwork = normalizeNetworkIdentifier(option.network);
      const payloadNetwork = normalizeNetworkIdentifier(payload.network);
      
      const networkMatches = optionNetwork === payloadNetwork;
      const recipientMatches = option.recipient.toLowerCase() === payload.payTo.toLowerCase();
      // Note: Using >= allows overpayment. For the 'exact' scheme, this means
      // the user can pay more than required, which is acceptable for most use cases.
      // If strict exact amount matching is needed, change to: BigInt(payload.amount) === BigInt(option.amount)
      const amountMatches = BigInt(payload.amount) >= BigInt(option.amount);
      
      // Asset matching (handle 'native' and token symbols)
      let assetMatches = false;
      const optionAssetUpper = option.asset.toUpperCase();
      const payloadAssetUpper = payload.asset.toUpperCase();
      
      if (payloadAssetUpper === 'NATIVE' || payloadAssetUpper === VECHAIN_TOKENS.VET) {
        assetMatches = optionAssetUpper === 'NATIVE' || optionAssetUpper === VECHAIN_TOKENS.VET;
      } else if (payloadAssetUpper === VECHAIN_TOKENS.VTHO) {
        assetMatches = optionAssetUpper === VECHAIN_TOKENS.VTHO;
      } else {
        // Contract address comparison
        assetMatches = option.asset.toLowerCase() === payload.asset.toLowerCase();
      }
      
      return networkMatches && recipientMatches && amountMatches && assetMatches;
    });
    
    if (!matchingOption) {
      return {
        isValid: false,
        error: 'Payment details do not match any payment requirements',
      };
    }
    
    // 8. Cache nonce to prevent future replay attacks
    await cacheNonce(senderAddress, payload.nonce, payload.validUntil);
    
    // All validations passed
    return {
      isValid: true,
      senderAddress,
    };
  } catch (error) {
    return {
      isValid: false,
      error: `Verification error: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}
