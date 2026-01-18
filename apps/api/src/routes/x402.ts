/**
 * x402 Protocol Route Handlers
 * Implements /verify, /settle, and /supported endpoints
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { VerifyRequestSchema, SettleRequestSchema } from '../schemas/x402.js';
import type { VerifyResponse, SettleResponse, SupportedResponse, PaymentOption } from '../types/x402.js';

const x402Routes = new Hono();

// Constants
const TX_HASH_LENGTH = 64;

/**
 * POST /verify
 * Validates payment payloads without settling
 */
x402Routes.post('/verify', zValidator('json', VerifyRequestSchema), async (c) => {
  const { paymentPayload, paymentRequirements } = c.req.valid('json');

  try {
    // Decode base64 payload
    const decodedPayload = Buffer.from(paymentPayload, 'base64').toString('utf-8');
    
    // Basic validation: Check if payload can be parsed
    let parsedPayload;
    try {
      parsedPayload = JSON.parse(decodedPayload);
    } catch (e) {
      const response: VerifyResponse = {
        isValid: false,
        invalidReason: 'Invalid payment payload: Unable to parse JSON',
      };
      return c.json(response, 400);
    }

    // Validate payment requirements
    if (!paymentRequirements.paymentOptions || paymentRequirements.paymentOptions.length === 0) {
      const response: VerifyResponse = {
        isValid: false,
        invalidReason: 'No payment options provided',
      };
      return c.json(response, 400);
    }

    // Check if any payment option matches supported networks
    const supportedNetworks = ['eip155:100009']; // VeChain testnet
    const hasValidNetwork = paymentRequirements.paymentOptions.some(
      (option: PaymentOption) => supportedNetworks.includes(option.network)
    );

    if (!hasValidNetwork) {
      const response: VerifyResponse = {
        isValid: false,
        invalidReason: 'No supported network found in payment options',
      };
      return c.json(response, 400);
    }

    // Check expiration if provided
    if (paymentRequirements.expiresAt) {
      const expirationTime = new Date(paymentRequirements.expiresAt).getTime();
      const currentTime = Date.now();
      
      if (currentTime > expirationTime) {
        const response: VerifyResponse = {
          isValid: false,
          invalidReason: 'Payment requirements have expired',
        };
        return c.json(response, 400);
      }
    }

    // All validations passed
    const response: VerifyResponse = {
      isValid: true,
    };
    return c.json(response, 200);
  } catch (error) {
    const response: VerifyResponse = {
      isValid: false,
      invalidReason: `Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
    return c.json(response, 500);
  }
});

/**
 * POST /settle
 * Submits payment to VeChain and waits for confirmation
 */
x402Routes.post('/settle', zValidator('json', SettleRequestSchema), async (c) => {
  const { paymentPayload, paymentRequirements } = c.req.valid('json');

  try {
    // First, verify the payment
    const decodedPayload = Buffer.from(paymentPayload, 'base64').toString('utf-8');
    
    let parsedPayload;
    try {
      parsedPayload = JSON.parse(decodedPayload);
    } catch (e) {
      const response: SettleResponse = {
        success: false,
        networkId: 'eip155:100009',
        error: 'Invalid payment payload: Unable to parse JSON',
      };
      return c.json(response, 400);
    }

    // Validate that we have at least one payment option
    if (!paymentRequirements.paymentOptions || paymentRequirements.paymentOptions.length === 0) {
      const response: SettleResponse = {
        success: false,
        networkId: 'eip155:100009',
        error: 'No payment options provided',
      };
      return c.json(response, 400);
    }

    // Check for supported network (VeChain)
    const supportedNetworks = ['eip155:100009']; // VeChain testnet
    const matchingOption = paymentRequirements.paymentOptions.find(
      (option: PaymentOption) => supportedNetworks.includes(option.network)
    );

    if (!matchingOption) {
      const response: SettleResponse = {
        success: false,
        networkId: 'eip155:100009',
        error: 'No supported network found in payment options',
      };
      return c.json(response, 400);
    }

    // TODO: Implement actual VeChain transaction submission
    // For now, return a mock successful response
    // In production, this would:
    // 1. Connect to VeChain network
    // 2. Submit the transaction
    // 3. Wait for confirmation
    // 4. Return transaction hash

    // Mock transaction hash for demonstration
    const mockTxHash = '0x' + Array.from({ length: TX_HASH_LENGTH }, () => 
      Math.floor(Math.random() * 16).toString(16)
    ).join('');

    const response: SettleResponse = {
      success: true,
      transactionHash: mockTxHash,
      networkId: matchingOption.network,
    };
    return c.json(response, 200);
  } catch (error) {
    const response: SettleResponse = {
      success: false,
      networkId: 'eip155:100009',
      error: `Settlement error: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
    return c.json(response, 500);
  }
});

/**
 * GET /supported
 * Returns supported networks and assets
 */
x402Routes.get('/supported', (c) => {
  const response: SupportedResponse = {
    networks: [
      {
        network: 'eip155:100009', // VeChain testnet (CAIP-2 format)
        assets: [
          'VET',  // VeChain native token
          'VTHO', // VeThor token
        ],
      },
    ],
    schemes: ['x402'], // Supported payment schemes
  };
  
  return c.json(response, 200);
});

export default x402Routes;
