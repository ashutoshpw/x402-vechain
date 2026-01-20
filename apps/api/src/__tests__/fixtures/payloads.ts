/**
 * Test fixtures for payment payloads and requirements
 */

import type { PaymentRequirements, PaymentOption, PaymentPayload } from '../../types/x402.js';
import { VECHAIN_NETWORKS, VECHAIN_CONTRACTS } from '../../config/vechain.js';

/**
 * Create a payment option for testing
 */
export function createPaymentOption(overrides?: Partial<PaymentOption>): PaymentOption {
  return {
    network: VECHAIN_NETWORKS.TESTNET,
    asset: 'VET',
    amount: '1000000000000000000', // 1 VET in wei
    recipient: '0x1234567890123456789012345678901234567890',
    ...overrides,
  };
}

/**
 * Create payment requirements for testing
 */
export function createPaymentRequirements(
  overrides?: Partial<PaymentRequirements>
): PaymentRequirements {
  return {
    paymentOptions: [createPaymentOption()],
    merchantId: 'test-merchant-123',
    merchantUrl: 'https://example.com',
    ...overrides,
  };
}

/**
 * Create a signed payment payload for testing
 */
export function createSignedPaymentPayload(
  overrides?: Partial<PaymentPayload['payload']>,
  signature?: string
): PaymentPayload {
  const defaultPayload = {
    scheme: 'exact' as const,
    network: VECHAIN_NETWORKS.TESTNET,
    payTo: '0x1234567890123456789012345678901234567890',
    amount: '1000000000000000000', // 1 VET in wei
    asset: 'native',
    nonce: `nonce-${Date.now()}-${Math.random()}`,
    validUntil: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
    ...overrides,
  };

  return {
    signature: signature || '0x' + 'a'.repeat(130), // 65-byte signature in hex
    payload: defaultPayload,
  };
}

/**
 * Create a base64-encoded payment payload
 */
export function encodePaymentPayload(payload: any): string {
  return Buffer.from(JSON.stringify(payload)).toString('base64');
}

/**
 * Create a legacy transaction hash payload
 */
export function createLegacyTransactionPayload(txHash: string): any {
  return {
    transactionHash: txHash,
  };
}

/**
 * Create a pre-signed transaction payload
 */
export function createPreSignedTransactionPayload(signedTx: string): any {
  return {
    signedTransaction: signedTx,
  };
}

/**
 * Create a fee delegation payload
 */
export function createFeeDelegationPayload(
  senderSignedTx: string,
  senderAddress: string
): any {
  return {
    senderSignedTransaction: senderSignedTx,
    senderAddress,
  };
}

/**
 * Test wallet addresses
 */
export const TEST_ADDRESSES = {
  sender: '0xf077b491b355e64048ce21e3a6fc4751eeea77fa',
  recipient: '0x1234567890123456789012345678901234567890',
  gasPayer: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
};

/**
 * Test transaction hashes
 */
export const TEST_TX_HASHES = {
  valid: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
  notFound: '0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef',
  reverted: '0xbaadf00dbaadf00dbaadf00dbaadf00dbaadf00dbaadf00dbaadf00dbaadf00d',
};

/**
 * Test amounts
 */
export const TEST_AMOUNTS = {
  oneVET: '1000000000000000000', // 1 VET
  tenVET: '10000000000000000000', // 10 VET
  oneVTHO: '1000000000000000000', // 1 VTHO
};
