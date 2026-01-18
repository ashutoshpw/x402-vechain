/**
 * Server-side middleware and utilities for x402 payment verification
 * Provides Hono middleware for payment verification and settlement
 */

import type { Context, Next, MiddlewareHandler } from 'hono';
import type {
  PaymentRequirements,
  PaymentPayload,
  PaymentOption,
  VerifyRequest,
  VerifyResponse,
  SettleRequest,
  SettleResponse,
} from '../types/index.js';

/**
 * Payment verification result
 */
export interface PaymentVerification {
  isValid: boolean;
  senderAddress?: string;
  error?: string;
}

/**
 * Options for payment middleware
 */
export interface PaymentMiddlewareOptions {
  /**
   * Generate payment requirements when payment is needed
   * Called when request doesn't include valid payment proof
   */
  getPaymentRequirements: (c: Context) => PaymentRequirements | Promise<PaymentRequirements>;

  /**
   * Verify payment payload (optional custom verification)
   * If not provided, basic structure validation is performed
   */
  verifyPayment?: (
    payload: PaymentPayload,
    requirements: PaymentRequirements
  ) => Promise<PaymentVerification>;

  /**
   * Handle successful payment verification
   * Called after payment is verified, before continuing to route handler
   */
  onPaymentVerified?: (
    c: Context,
    verification: PaymentVerification
  ) => void | Promise<void>;

  /**
   * Facilitator URL for payment verification/settlement
   * If provided, delegates verification to the facilitator
   */
  facilitatorUrl?: string;
}

/**
 * Parse base64-encoded payment payload
 */
function parsePaymentPayload(encodedPayload: string): PaymentPayload | null {
  try {
    const decoded = Buffer.from(encodedPayload, 'base64').toString('utf-8');
    const parsed = JSON.parse(decoded);
    
    // Validate basic structure
    if (!parsed.signature || !parsed.payload) {
      return null;
    }
    
    return parsed as PaymentPayload;
  } catch {
    return null;
  }
}

/**
 * Basic payment payload validation without cryptographic verification
 */
async function basicVerifyPayment(
  payload: PaymentPayload,
  requirements: PaymentRequirements
): Promise<PaymentVerification> {
  // Validate signature exists
  if (!payload.signature || !payload.payload) {
    return {
      isValid: false,
      error: 'Missing signature or payload',
    };
  }

  const { payload: paymentData } = payload;

  // Validate scheme
  if (paymentData.scheme !== 'exact') {
    return {
      isValid: false,
      error: 'Invalid payment scheme. Only "exact" is supported',
    };
  }

  // Check expiration
  const currentTime = Math.floor(Date.now() / 1000);
  if (paymentData.validUntil <= currentTime) {
    return {
      isValid: false,
      error: 'Payment payload has expired',
    };
  }

  // Validate against payment requirements
  const matchingOption = requirements.paymentOptions.find((option: PaymentOption) => {
    const networkMatches = option.network === paymentData.network;
    const recipientMatches = option.recipient.toLowerCase() === paymentData.payTo.toLowerCase();
    
    // Amount validation with error handling for invalid numbers
    let amountMatches = false;
    try {
      amountMatches = BigInt(paymentData.amount) >= BigInt(option.amount);
    } catch {
      // Invalid number format - this option doesn't match
      amountMatches = false;
    }

    const assetMatches = option.asset.toLowerCase() === paymentData.asset.toLowerCase() ||
      (option.asset.toUpperCase() === 'VET' && paymentData.asset === 'native');

    return networkMatches && recipientMatches && amountMatches && assetMatches;
  });

  if (!matchingOption) {
    return {
      isValid: false,
      error: 'Payment details do not match requirements',
    };
  }

  return {
    isValid: true,
  };
}

/**
 * Verify payment using facilitator endpoint
 */
async function verifyWithFacilitator(
  facilitatorUrl: string,
  encodedPayload: string,
  requirements: PaymentRequirements
): Promise<PaymentVerification> {
  const response = await fetch(`${facilitatorUrl}/verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      paymentPayload: encodedPayload,
      paymentRequirements: requirements,
    } as VerifyRequest),
  });

  const result = await response.json() as VerifyResponse;

  if (!result.isValid) {
    return {
      isValid: false,
      error: result.invalidReason,
    };
  }

  return {
    isValid: true,
  };
}

/**
 * Hono middleware for x402 payment verification
 * 
 * Checks for payment proof in request headers. If not found or invalid,
 * returns 402 Payment Required with payment requirements in header.
 * 
 * @param options Middleware configuration
 * @returns Hono middleware handler
 */
export function paymentMiddleware(options: PaymentMiddlewareOptions): MiddlewareHandler {
  return async (c: Context, next: Next) => {
    // Check for payment proof in headers
    const paymentProofHeader = c.req.header('X-Payment-Proof');

    if (!paymentProofHeader) {
      // No payment provided - request payment
      const requirements = await options.getPaymentRequirements(c);
      
      return c.json(
        { error: 'Payment required' },
        402,
        {
          'X-Payment-Required': JSON.stringify(requirements),
        }
      );
    }

    // Parse payment payload
    const paymentPayload = parsePaymentPayload(paymentProofHeader);
    
    if (!paymentPayload) {
      return c.json(
        { error: 'Invalid payment payload format' },
        400
      );
    }

    // Get payment requirements
    const requirements = await options.getPaymentRequirements(c);

    // Verify payment
    let verification: PaymentVerification;

    if (options.facilitatorUrl) {
      // Use facilitator for verification
      verification = await verifyWithFacilitator(
        options.facilitatorUrl,
        paymentProofHeader,
        requirements
      );
    } else if (options.verifyPayment) {
      // Use custom verification
      verification = await options.verifyPayment(paymentPayload, requirements);
    } else {
      // Use basic verification (no cryptographic checks)
      verification = await basicVerifyPayment(paymentPayload, requirements);
    }

    if (!verification.isValid) {
      return c.json(
        { error: verification.error || 'Payment verification failed' },
        403
      );
    }

    // Payment verified - call onPaymentVerified hook if provided
    if (options.onPaymentVerified) {
      await options.onPaymentVerified(c, verification);
    }

    // Store verification in context for route handlers
    c.set('paymentVerification', verification);

    // Continue to route handler
    await next();
  };
}

/**
 * Standalone function to verify payment payload
 * Useful for manual verification outside of middleware
 * 
 * @param facilitatorUrl URL of the x402 facilitator
 * @param paymentPayload Base64-encoded payment payload
 * @param requirements Payment requirements to verify against
 * @returns Verification result
 */
export async function verifyPayment(
  facilitatorUrl: string,
  paymentPayload: string,
  requirements: PaymentRequirements
): Promise<VerifyResponse> {
  const response = await fetch(`${facilitatorUrl}/verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      paymentPayload,
      paymentRequirements: requirements,
    } as VerifyRequest),
  });

  if (!response.ok) {
    throw new Error(`Payment verification failed: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Settle payment via facilitator
 * Submits payment to blockchain and waits for confirmation
 * 
 * @param facilitatorUrl URL of the x402 facilitator
 * @param paymentPayload Base64-encoded payment payload
 * @param requirements Payment requirements
 * @returns Settlement result with transaction hash
 */
export async function settlePayment(
  facilitatorUrl: string,
  paymentPayload: string,
  requirements: PaymentRequirements
): Promise<SettleResponse> {
  const response = await fetch(`${facilitatorUrl}/settle`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      paymentPayload,
      paymentRequirements: requirements,
    } as SettleRequest),
  });

  if (!response.ok) {
    throw new Error(`Payment settlement failed: ${response.statusText}`);
  }

  return response.json();
}
