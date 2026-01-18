/**
 * Client-side browser wallet integration for x402 payments
 * Provides utilities for creating payment payloads and making x402-enabled fetch requests
 */

import { Secp256k1, Keccak256, Hex } from '@vechain/sdk-core';
import { webcrypto } from 'node:crypto';
import type {
  PaymentPayload,
  PaymentRequirements,
  CreatePaymentPayloadOptions,
  X402FetchOptions,
} from '../types/index.js';
import type { WalletAdapter } from './wallets.js';

/**
 * Get crypto implementation (browser or Node.js)
 */
const getCrypto = (): Crypto => {
  // In browser
  if (typeof globalThis.crypto !== 'undefined') {
    return globalThis.crypto;
  }
  // In Node.js
  return webcrypto as Crypto;
};

/**
 * Generate a random nonce for replay protection
 * @returns 32-byte hex string (without 0x prefix)
 */
export function generateNonce(): string {
  const bytes = new Uint8Array(32);
  getCrypto().getRandomValues(bytes);
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Create hash of payload for signature
 * Must match server-side implementation in PaymentVerificationService
 */
function hashPayload(payload: PaymentPayload['payload']): Uint8Array {
  // Create deterministic JSON string - key order MUST match server
  const message = JSON.stringify({
    scheme: payload.scheme,
    network: payload.network,
    payTo: payload.payTo,
    amount: payload.amount,
    asset: payload.asset,
    nonce: payload.nonce,
    validUntil: payload.validUntil,
  });

  return Keccak256.of(Buffer.from(message)).bytes;
}

/**
 * Create a signed payment payload for x402 protocol
 * 
 * @param options Payment details
 * @param privateKey Hex-encoded private key (with or without 0x prefix)
 * @returns Signed payment payload
 */
export async function createPaymentPayload(
  options: CreatePaymentPayloadOptions,
  privateKey: string
): Promise<PaymentPayload> {
  const { network, recipient, amount, asset, validityDuration = 300 } = options;

  // Calculate expiry timestamp
  const validUntil = Math.floor(Date.now() / 1000) + validityDuration;

  // Create payload
  const payload: PaymentPayload['payload'] = {
    scheme: 'exact',
    network,
    payTo: recipient,
    amount,
    asset,
    nonce: generateNonce(),
    validUntil,
  };

  // Hash the payload
  const messageHash = hashPayload(payload);

  // Clean private key (remove 0x prefix if present)
  const cleanPrivateKey = privateKey.startsWith('0x') 
    ? privateKey.slice(2) 
    : privateKey;

  // Sign the hash
  const privateKeyBytes = Hex.of(cleanPrivateKey).bytes;
  const signature = Secp256k1.sign(messageHash, privateKeyBytes);

  // Convert signature to hex string (without 0x prefix)
  const signatureHex = Buffer.from(signature).toString('hex');

  return {
    signature: signatureHex,
    payload,
  };
}

/**
 * Create a signed payment payload using a wallet adapter
 * 
 * @param options Payment details
 * @param wallet Wallet adapter instance (Connex, VeWorld, etc.)
 * @returns Signed payment payload
 */
export async function createPaymentPayloadWithWallet(
  options: CreatePaymentPayloadOptions,
  wallet: WalletAdapter
): Promise<PaymentPayload> {
  const { network, recipient, amount, asset, validityDuration = 300 } = options;

  // Calculate expiry timestamp
  const validUntil = Math.floor(Date.now() / 1000) + validityDuration;

  // Create payload
  const payload: PaymentPayload['payload'] = {
    scheme: 'exact',
    network,
    payTo: recipient,
    amount,
    asset,
    nonce: generateNonce(),
    validUntil,
  };

  // Hash the payload
  const messageHash = hashPayload(payload);

  // Sign with wallet
  const signature = await wallet.signMessageHash(messageHash);

  return {
    signature,
    payload,
  };
}

/**
 * Enhanced fetch that handles x402 payment protocol
 * Automatically retries with payment when receiving 402 Payment Required
 * 
 * @param url Request URL
 * @param options Fetch options including x402-specific handlers
 * @returns Response from the server
 */
export async function x402Fetch(
  url: string,
  options: X402FetchOptions
): Promise<Response> {
  const {
    facilitatorUrl,
    onPaymentRequired,
    wallet,
    maxAmount,
    maxRetries = 1,
    ...fetchOptions
  } = options;

  // Make initial request
  let response = await fetch(url, fetchOptions);

  // Check for 402 Payment Required
  if (response.status === 402) {
    const paymentHeader = response.headers.get('X-Payment-Required');
    
    if (!paymentHeader) {
      throw new Error('402 Payment Required but no X-Payment-Required header found');
    }

    // Parse payment requirements
    let requirements: PaymentRequirements;
    try {
      requirements = JSON.parse(paymentHeader);
    } catch (error) {
      throw new Error(`Failed to parse payment requirements: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Validate max amount if provided
    if (maxAmount && requirements.paymentOptions.length > 0) {
      const requestedAmount = BigInt(requirements.paymentOptions[0].amount);
      const maxAmountBigInt = BigInt(maxAmount);
      
      if (requestedAmount > maxAmountBigInt) {
        throw new Error(
          `Payment amount ${requirements.paymentOptions[0].amount} exceeds maximum allowed ${maxAmount}`
        );
      }
    }

    let paymentPayload: PaymentPayload;

    // Handle payment creation
    if (wallet) {
      // Use wallet adapter to sign payment
      const option = requirements.paymentOptions[0];
      if (!option) {
        throw new Error('No payment options provided in requirements');
      }

      paymentPayload = await createPaymentPayloadWithWallet(
        {
          network: option.network,
          recipient: option.recipient,
          amount: option.amount,
          asset: option.asset,
        },
        wallet
      );
    } else if (onPaymentRequired) {
      // Use custom payment handler
      paymentPayload = await onPaymentRequired(requirements);
    } else {
      throw new Error(
        'Payment required but no wallet or onPaymentRequired handler provided. ' +
        'Please provide either a wallet adapter or onPaymentRequired callback.'
      );
    }

    // Encode payment payload as base64
    const encodedPayload = Buffer.from(JSON.stringify(paymentPayload)).toString('base64');

    // Verify payment with facilitator
    const verifyResponse = await fetch(`${facilitatorUrl}/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        paymentPayload: encodedPayload,
        paymentRequirements: requirements,
      }),
    });

    if (!verifyResponse.ok) {
      const errorData = await verifyResponse.json().catch(() => ({ invalidReason: verifyResponse.statusText }));
      throw new Error(`Payment verification failed: ${errorData.invalidReason || 'Unknown error'}`);
    }

    // Settle payment with facilitator
    const settleResponse = await fetch(`${facilitatorUrl}/settle`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        paymentPayload: encodedPayload,
        paymentRequirements: requirements,
      }),
    });

    if (!settleResponse.ok) {
      const errorData = await settleResponse.json().catch(() => ({ error: settleResponse.statusText }));
      throw new Error(`Payment settlement failed: ${errorData.error || 'Unknown error'}`);
    }

    const settlementResult = await settleResponse.json();

    // Retry original request with payment proof
    const retryHeaders = new Headers(fetchOptions.headers);
    retryHeaders.set('X-Payment-Proof', encodedPayload);
    retryHeaders.set('X-Transaction-Hash', settlementResult.transactionHash);

    response = await fetch(url, {
      ...fetchOptions,
      headers: retryHeaders,
    });
  }

  return response;
}

/**
 * Check supported networks and assets from facilitator
 * @param facilitatorUrl URL of the x402 facilitator
 * @returns Supported networks and schemes
 */
export async function getSupported(facilitatorUrl: string) {
  const response = await fetch(`${facilitatorUrl}/supported`);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch supported networks: ${response.statusText}`);
  }

  return response.json();
}

// Re-export wallet utilities
export {
  type WalletAdapter,
  ConnexWalletAdapter,
  VeWorldWalletAdapter,
  PrivateKeyWalletAdapter,
  detectWallets,
  autoDetectWallet,
} from './wallets.js';
