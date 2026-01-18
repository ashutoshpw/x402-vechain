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
 * Simplified route configuration for payment requirements
 */
export interface RoutePaymentConfig {
  /** Price in token units (will be converted to wei) */
  price: string;
  /** Token symbol (VET, VTHO, VEUSD, B3TR, or contract address) */
  token: string;
  /** Network identifier (CAIP-2 format or 'vechain:chainId') */
  network: string;
  /** Payment recipient address */
  payTo: string;
  /** Optional merchant ID (defaults to 'default') */
  merchantId?: string;
  /** Optional merchant URL */
  merchantUrl?: string;
  /** Optional facilitator URL for this specific route */
  facilitatorUrl?: string;
}

/**
 * Route-based payment configuration
 * Maps route patterns to payment configs
 * Example: { "GET /api/premium": { price: "0.01", token: "VEUSD", ... } }
 */
export type RoutePaymentMap = Record<string, RoutePaymentConfig>;

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
 * Enhanced middleware options supporting route-based configuration
 */
export interface EnhancedPaymentMiddlewareOptions {
  /**
   * Route-based payment configuration map
   * Can be passed directly as the first parameter to paymentMiddleware
   */
  routes?: RoutePaymentMap;

  /**
   * Default facilitator URL for all routes
   * Can be overridden per-route in the route config
   */
  facilitatorUrl?: string;

  /**
   * Custom payment verification function
   */
  verifyPayment?: (
    payload: PaymentPayload,
    requirements: PaymentRequirements
  ) => Promise<PaymentVerification>;

  /**
   * Callback after payment is verified
   */
  onPaymentVerified?: (
    c: Context,
    verification: PaymentVerification
  ) => void | Promise<void>;
}

/**
 * Convert price in token units to wei
 * VeChain uses 18 decimals for VET and VTHO
 */
function priceToWei(price: string, decimals: number = 18): string {
  // Parse the price as a float
  const priceFloat = parseFloat(price);
  if (isNaN(priceFloat) || priceFloat < 0) {
    throw new Error(`Invalid price: ${price}`);
  }

  // Convert to wei (multiply by 10^decimals)
  const weiAmount = BigInt(Math.floor(priceFloat * Math.pow(10, decimals)));
  return weiAmount.toString();
}

/**
 * Normalize network identifier to CAIP-2 format
 * Converts 'vechain:100009' to 'eip155:100009'
 */
function normalizeNetworkId(network: string): string {
  if (network.startsWith('vechain:')) {
    return network.replace('vechain:', 'eip155:');
  }
  return network;
}

/**
 * Match route pattern against request
 * Supports patterns like "GET /api/premium" or "/api/premium"
 */
function matchRoute(pattern: string, method: string, path: string): boolean {
  const parts = pattern.trim().split(/\s+/);
  
  if (parts.length === 2) {
    // Pattern includes method: "GET /api/premium"
    const [patternMethod, patternPath] = parts;
    return patternMethod.toUpperCase() === method.toUpperCase() && 
           matchPath(patternPath, path);
  } else {
    // Pattern is just path: "/api/premium"
    return matchPath(pattern, path);
  }
}

/**
 * Match path pattern with wildcards
 * Supports exact match and wildcard patterns
 */
function matchPath(pattern: string, path: string): boolean {
  // Remove trailing slashes for comparison
  const normalizedPattern = pattern.replace(/\/$/, '');
  const normalizedPath = path.replace(/\/$/, '');
  
  // Exact match
  if (normalizedPattern === normalizedPath) {
    return true;
  }
  
  // Wildcard match (e.g., "/api/*" matches "/api/anything")
  if (normalizedPattern.endsWith('/*')) {
    const prefix = normalizedPattern.slice(0, -2);
    return normalizedPath.startsWith(prefix);
  }
  
  // Pattern with path parameters (e.g., "/api/:id")
  const patternParts = normalizedPattern.split('/');
  const pathParts = normalizedPath.split('/');
  
  if (patternParts.length !== pathParts.length) {
    return false;
  }
  
  return patternParts.every((part, i) => {
    return part.startsWith(':') || part === pathParts[i];
  });
}

/**
 * Convert route payment config to PaymentRequirements
 */
function configToRequirements(config: RoutePaymentConfig): PaymentRequirements {
  // Normalize network identifier
  const network = normalizeNetworkId(config.network);
  
  // Convert price to wei
  // Common VeChain tokens use 18 decimals
  const amount = priceToWei(config.price);
  
  // Normalize asset identifier
  let asset = config.token;
  if (asset.toUpperCase() === 'VET') {
    asset = 'VET'; // Keep as VET for compatibility
  } else if (asset.toUpperCase() === 'VTHO') {
    asset = 'VTHO';
  }
  // Otherwise assume it's a token symbol or contract address
  
  return {
    paymentOptions: [{
      network,
      asset,
      amount,
      recipient: config.payTo,
    }],
    merchantId: config.merchantId || 'default',
    merchantUrl: config.merchantUrl,
  };
}

/**
 * Find matching route configuration
 */
function findMatchingRoute(
  routes: RoutePaymentMap,
  method: string,
  path: string
): RoutePaymentConfig | null {
  for (const [pattern, config] of Object.entries(routes)) {
    if (matchRoute(pattern, method, path)) {
      return config;
    }
  }
  return null;
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
 * Supports two usage patterns:
 * 
 * 1. Route-based configuration (new API):
 * ```typescript
 * app.use(paymentMiddleware({
 *   "GET /api/premium": {
 *     price: "0.01",
 *     token: "VEUSD",
 *     network: "vechain:100009",
 *     payTo: "0xYourWallet..."
 *   }
 * }));
 * ```
 * 
 * 2. Traditional configuration (existing API):
 * ```typescript
 * app.use('/route', paymentMiddleware({
 *   getPaymentRequirements: (c) => ({ ... }),
 *   facilitatorUrl: "https://..."
 * }));
 * ```
 * 
 * @param options Route map or middleware configuration
 * @returns Hono middleware handler
 */
export function paymentMiddleware(
  options: RoutePaymentMap | PaymentMiddlewareOptions | EnhancedPaymentMiddlewareOptions
): MiddlewareHandler {
  // Detect which API is being used
  const isRouteMap = !('getPaymentRequirements' in options) && 
                     !('routes' in options) &&
                     Object.keys(options).length > 0 &&
                     typeof Object.values(options)[0] === 'object';
  
  const isEnhancedOptions = 'routes' in options;
  
  // Convert route map to enhanced options if needed
  let enhancedOptions: EnhancedPaymentMiddlewareOptions;
  
  if (isRouteMap) {
    // New API: route map passed directly
    enhancedOptions = {
      routes: options as RoutePaymentMap,
    };
  } else if (isEnhancedOptions) {
    // Enhanced options with routes property
    enhancedOptions = options as EnhancedPaymentMiddlewareOptions;
  } else {
    // Old API: convert to enhanced options
    const oldOptions = options as PaymentMiddlewareOptions;
    enhancedOptions = {
      facilitatorUrl: oldOptions.facilitatorUrl,
      verifyPayment: oldOptions.verifyPayment,
      onPaymentVerified: oldOptions.onPaymentVerified,
    };
  }
  
  return async (c: Context, next: Next) => {
    // Determine payment requirements
    let requirements: PaymentRequirements;
    let facilitatorUrl: string | undefined = enhancedOptions.facilitatorUrl;
    
    if (enhancedOptions.routes) {
      // Route-based configuration
      const method = c.req.method;
      const path = c.req.path;
      
      const matchedConfig = findMatchingRoute(enhancedOptions.routes, method, path);
      
      if (!matchedConfig) {
        // No matching route - pass through without payment requirement
        await next();
        return;
      }
      
      // Convert route config to requirements
      requirements = configToRequirements(matchedConfig);
      
      // Use route-specific facilitator URL if provided
      if (matchedConfig.facilitatorUrl) {
        facilitatorUrl = matchedConfig.facilitatorUrl;
      }
    } else {
      // Old API - must have getPaymentRequirements
      const oldOptions = options as PaymentMiddlewareOptions;
      if (!oldOptions.getPaymentRequirements) {
        throw new Error('paymentMiddleware requires either route map or getPaymentRequirements option');
      }
      requirements = await oldOptions.getPaymentRequirements(c);
    }
    
    // Check for payment proof in headers
    const paymentProofHeader = c.req.header('X-Payment-Proof');

    if (!paymentProofHeader) {
      // No payment provided - request payment
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

    // Verify payment
    let verification: PaymentVerification;

    if (facilitatorUrl) {
      // Use facilitator for verification
      verification = await verifyWithFacilitator(
        facilitatorUrl,
        paymentProofHeader,
        requirements
      );
    } else if (enhancedOptions.verifyPayment) {
      // Use custom verification
      verification = await enhancedOptions.verifyPayment(paymentPayload, requirements);
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
    if (enhancedOptions.onPaymentVerified) {
      await enhancedOptions.onPaymentVerified(c, verification);
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
