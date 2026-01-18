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
