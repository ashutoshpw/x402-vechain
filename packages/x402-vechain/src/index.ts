/**
 * x402-vechain SDK
 * Client and server integration for x402 payment protocol on VeChain
 */

// Re-export all types
export type {
  PaymentRequirements,
  PaymentOption,
  PaymentPayload,
  VerifyRequest,
  VerifyResponse,
  SettleRequest,
  SettleResponse,
  SupportedResponse,
  NetworkSupport,
  X402FetchOptions,
  CreatePaymentPayloadOptions,
} from './types/index.js';

// Re-export client functions
export {
  createPaymentPayload,
  x402Fetch,
  getSupported,
  generateNonce,
} from './client/index.js';

// Re-export server functions and types
export {
  paymentMiddleware,
  verifyPayment,
  settlePayment,
} from './server/index.js';

export type {
  PaymentVerification,
  PaymentMiddlewareOptions,
} from './server/index.js';
