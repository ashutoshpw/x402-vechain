/**
 * x402 Protocol TypeScript Interfaces
 * Based on: https://github.com/coinbase/x402/blob/main/specs/facilitator.md
 */

// Payment Requirements interface
export interface PaymentRequirements {
  paymentOptions: PaymentOption[];
  merchantId: string;
  merchantUrl?: string;
  expiresAt?: string;
}

export interface PaymentOption {
  network: string; // CAIP-2 identifier
  asset: string;
  amount: string;
  recipient: string;
}

// Verify endpoint interfaces
export interface VerifyRequest {
  paymentPayload: string; // Base64 encoded
  paymentRequirements: PaymentRequirements;
}

export interface VerifyResponse {
  isValid: boolean;
  invalidReason?: string;
}

// Settle endpoint interfaces
export interface SettleRequest {
  paymentPayload: string; // Base64 encoded
  paymentRequirements: PaymentRequirements;
}

export interface SettleResponse {
  success: boolean;
  transactionHash?: string;
  networkId: string;
  error?: string;
}

// Supported endpoint interfaces
export interface SupportedResponse {
  networks: NetworkSupport[];
  schemes: string[];
}

export interface NetworkSupport {
  network: string; // CAIP-2 identifier
  assets: string[];
}

// Payment Payload interface (signed by user)
export interface PaymentPayload {
  signature: string; // secp256k1 signature in hex format
  payload: {
    scheme: 'exact';
    network: string; // CAIP-2 identifier (e.g., 'vechain:100009')
    payTo: string; // recipient address
    amount: string; // amount in wei
    asset: string; // token address or 'native'
    nonce: string; // unique nonce for replay protection
    validUntil: number; // Unix timestamp
  };
}

// Client-specific types
export interface X402FetchOptions extends RequestInit {
  facilitatorUrl: string;
  onPaymentRequired?: (requirements: PaymentRequirements) => Promise<PaymentPayload>;
  maxRetries?: number;
  /** 
   * Wallet adapter for signing payments (alternative to onPaymentRequired)
   * When provided, payment will be automatically signed using the wallet
   */
  wallet?: any; // WalletAdapter type (imported at runtime to avoid circular dependency)
  /**
   * Maximum amount user is willing to pay (in wei)
   * If payment requirement exceeds this, an error will be thrown
   */
  maxAmount?: string;
}

export interface CreatePaymentPayloadOptions {
  network: string; // CAIP-2 identifier
  recipient: string;
  amount: string;
  asset: string;
  validityDuration?: number; // seconds (default: 300)
}
