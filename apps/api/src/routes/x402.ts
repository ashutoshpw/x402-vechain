/**
 * x402 Protocol Route Handlers
 * Implements /verify, /settle, and /supported endpoints
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { VerifyRequestSchema, SettleRequestSchema } from '../schemas/x402.js';
import type { VerifyResponse, SettleResponse, SupportedResponse, PaymentOption, PaymentPayload } from '../types/x402.js';
import { veChainService } from '../services/VeChainService.js';
import { VECHAIN_NETWORKS, VECHAIN_TIMING, SUPPORTED_NETWORKS } from '../config/vechain.js';
import { validatePaymentDetails, CONTRACT_INTERACTION_ERROR } from './helpers.js';
import { verifyPaymentPayload } from '../services/PaymentVerificationService.js';

const x402Routes = new Hono();

// Configurable confirmation count (can be overridden via env or per-request)
const DEFAULT_CONFIRMATIONS = VECHAIN_TIMING.DEFAULT_CONFIRMATIONS;

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
    let parsedPayload: unknown;
    try {
      parsedPayload = JSON.parse(decodedPayload);
    } catch (e) {
      const response: VerifyResponse = {
        isValid: false,
        invalidReason: 'Invalid payment payload: Unable to parse JSON',
      };
      return c.json(response, 400);
    }

    // Validate payload is an object
    if (typeof parsedPayload !== 'object' || parsedPayload === null) {
      const response: VerifyResponse = {
        isValid: false,
        invalidReason: 'Invalid payment payload: Must be an object',
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

    // Type guard for signed payment payload
    const isSignedPayload = (obj: unknown): obj is PaymentPayload => {
      return (
        typeof obj === 'object' &&
        obj !== null &&
        'signature' in obj &&
        'payload' in obj &&
        typeof (obj as any).signature === 'string' &&
        typeof (obj as any).payload === 'object'
      );
    };

    // Check if payload has signature (new payment payload format)
    if (isSignedPayload(parsedPayload)) {
      // Verify signed payment payload
      const verificationResult = await verifyPaymentPayload(
        parsedPayload,
        paymentRequirements.paymentOptions
      );
      
      if (!verificationResult.isValid) {
        const response: VerifyResponse = {
          isValid: false,
          invalidReason: verificationResult.error || 'Payment payload verification failed',
        };
        return c.json(response, 400);
      }
      
      // Verification successful
      const response: VerifyResponse = {
        isValid: true,
      };
      return c.json(response, 200);
    }
    
    // Type guard for legacy transaction hash payload
    const hasTransactionHash = (obj: unknown): obj is { transactionHash: string } => {
      return (
        typeof obj === 'object' &&
        obj !== null &&
        'transactionHash' in obj &&
        typeof (obj as any).transactionHash === 'string'
      );
    };

    // Legacy: If payload contains a transaction hash, verify it on-chain
    if (hasTransactionHash(parsedPayload)) {
      // Check if any payment option matches supported networks
      const hasValidNetwork = paymentRequirements.paymentOptions.some(
        (option: PaymentOption) => SUPPORTED_NETWORKS.includes(option.network)
      );

      if (!hasValidNetwork) {
        const response: VerifyResponse = {
          isValid: false,
          invalidReason: 'No supported network found in payment options',
        };
        return c.json(response, 400);
      }

      try {
        const receipt = await veChainService.verifyTransaction(parsedPayload.transactionHash);
        
        // Check if transaction was reverted
        if (receipt.reverted) {
          const response: VerifyResponse = {
            isValid: false,
            invalidReason: 'Transaction was reverted on-chain',
          };
          return c.json(response, 400);
        }

        // Decode transaction to extract payment details
        const paymentDetails = await veChainService.decodeTransaction(parsedPayload.transactionHash);
        
        // Validate payment matches requirements
        const matchingOption = validatePaymentDetails(paymentDetails, paymentRequirements.paymentOptions);
        
        if (!matchingOption) {
          const response: VerifyResponse = {
            isValid: false,
            invalidReason: paymentDetails.token === 'CONTRACT_INTERACTION'
              ? CONTRACT_INTERACTION_ERROR
              : 'Transaction does not match any payment requirements',
          };
          return c.json(response, 400);
        }
      } catch (error) {
        const response: VerifyResponse = {
          isValid: false,
          invalidReason: `Transaction verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
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
        networkId: VECHAIN_NETWORKS.TESTNET,
        error: 'No payment options provided',
      };
      return c.json(response, 400);
    }

    // Check for supported network (VeChain)
    const matchingOption = paymentRequirements.paymentOptions.find(
      (option: PaymentOption) => SUPPORTED_NETWORKS.includes(option.network)
    );

    if (!matchingOption) {
      const response: SettleResponse = {
        success: false,
        networkId: VECHAIN_NETWORKS.TESTNET,
        error: 'No supported network found in payment options',
      };
      return c.json(response, 400);
    }

    // Handle transaction submission
    let txHash: string;
    
    if (parsedPayload.signedTransaction) {
      // Submit a pre-signed transaction
      try {
        txHash = await veChainService.submitTransaction(parsedPayload.signedTransaction);
      } catch (error) {
        const response: SettleResponse = {
          success: false,
          networkId: matchingOption.network,
          error: `Failed to submit transaction: ${error instanceof Error ? error.message : 'Unknown error'}`,
        };
        return c.json(response, 500);
      }
    } else if (parsedPayload.transactionHash) {
      // Verify an already submitted transaction
      txHash = parsedPayload.transactionHash;
      
      try {
        const receipt = await veChainService.verifyTransaction(txHash);
        
        // Check if transaction was reverted
        if (receipt.reverted) {
          const response: SettleResponse = {
            success: false,
            networkId: matchingOption.network,
            transactionHash: txHash,
            error: 'Transaction was reverted on-chain',
          };
          return c.json(response, 400);
        }
      } catch (error) {
        const response: SettleResponse = {
          success: false,
          networkId: matchingOption.network,
          transactionHash: txHash,
          error: `Failed to verify transaction: ${error instanceof Error ? error.message : 'Unknown error'}`,
        };
        return c.json(response, 400);
      }
    } else {
      const response: SettleResponse = {
        success: false,
        networkId: matchingOption.network,
        error: 'Payment payload must contain either signedTransaction or transactionHash',
      };
      return c.json(response, 400);
    }

    // Wait for transaction confirmation (using configurable confirmation count)
    const confirmed = await veChainService.waitForConfirmation(txHash, DEFAULT_CONFIRMATIONS);
    
    if (!confirmed) {
      const response: SettleResponse = {
        success: false,
        networkId: matchingOption.network,
        transactionHash: txHash,
        error: 'Transaction confirmation timeout or reverted',
      };
      return c.json(response, 408);
    }

    // Verify payment details match requirements
    try {
      const paymentDetails = await veChainService.decodeTransaction(txHash);
      
      // Validate payment matches requirements
      const validationResult = validatePaymentDetails(paymentDetails, paymentRequirements.paymentOptions);
      
      if (!validationResult) {
        const response: SettleResponse = {
          success: false,
          networkId: matchingOption.network,
          transactionHash: txHash,
          error: paymentDetails.token === 'CONTRACT_INTERACTION'
            ? CONTRACT_INTERACTION_ERROR
            : 'Transaction does not match payment requirements',
        };
        return c.json(response, 400);
      }
    } catch (error) {
      const response: SettleResponse = {
        success: false,
        networkId: matchingOption.network,
        transactionHash: txHash,
        error: `Failed to decode transaction: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
      return c.json(response, 500);
    }

    // Settlement successful
    const response: SettleResponse = {
      success: true,
      transactionHash: txHash,
      networkId: matchingOption.network,
    };
    return c.json(response, 200);
  } catch (error) {
    const response: SettleResponse = {
      success: false,
      networkId: VECHAIN_NETWORKS.TESTNET,
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
    networks: SUPPORTED_NETWORKS.map(network => ({
      network,
      assets: [
        'VET',  // VeChain native token
        'VTHO', // VeThor token
      ],
    })),
    schemes: ['x402'], // Supported payment schemes
  };
  
  return c.json(response, 200);
});

export default x402Routes;
