/**
 * x402 Protocol Route Handlers
 * Implements /verify, /settle, and /supported endpoints
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { VerifyRequestSchema, SettleRequestSchema } from '../schemas/x402.js';
import type { VerifyResponse, SettleResponse, SupportedResponse, PaymentOption } from '../types/x402.js';
import { veChainService } from '../services/VeChainService.js';
import { VECHAIN_NETWORKS, VECHAIN_TIMING } from '../config/vechain.js';

const x402Routes = new Hono();

// Supported networks
const SUPPORTED_NETWORKS = [VECHAIN_NETWORKS.TESTNET];

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

    // If payload contains a transaction hash, verify it on-chain
    if (parsedPayload.transactionHash) {
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
        
        // Reject contract interactions since we cannot decode the amount without ABI
        if (paymentDetails.token === 'CONTRACT_INTERACTION') {
          const response: VerifyResponse = {
            isValid: false,
            invalidReason: 'Contract interaction transactions are not supported. Please use direct VET or VTHO transfers.',
          };
          return c.json(response, 400);
        }
        
        // Validate payment matches requirements
        const matchingOption = paymentRequirements.paymentOptions.find(
          (option: PaymentOption) => {
            // Check if recipient matches
            const recipientMatches = option.recipient.toLowerCase() === paymentDetails.to.toLowerCase();
            
            // Check if amount matches (convert option.amount to bigint)
            const requiredAmount = BigInt(option.amount);
            const amountMatches = paymentDetails.amount >= requiredAmount;
            
            // Check if token matches
            const tokenMatches = option.asset.toUpperCase() === paymentDetails.token.toUpperCase();
            
            return recipientMatches && amountMatches && tokenMatches;
          }
        );

        if (!matchingOption) {
          const response: VerifyResponse = {
            isValid: false,
            invalidReason: 'Transaction does not match any payment requirements',
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
      
      // Reject contract interactions since we cannot decode the amount without ABI
      if (paymentDetails.token === 'CONTRACT_INTERACTION') {
        const response: SettleResponse = {
          success: false,
          networkId: matchingOption.network,
          transactionHash: txHash,
          error: 'Contract interaction transactions are not supported. Please use direct VET or VTHO transfers.',
        };
        return c.json(response, 400);
      }
      
      // Validate payment matches requirements
      const recipientMatches = matchingOption.recipient.toLowerCase() === paymentDetails.to.toLowerCase();
      const requiredAmount = BigInt(matchingOption.amount);
      const amountMatches = paymentDetails.amount >= requiredAmount;
      const tokenMatches = matchingOption.asset.toUpperCase() === paymentDetails.token.toUpperCase();
      
      if (!recipientMatches || !amountMatches || !tokenMatches) {
        const response: SettleResponse = {
          success: false,
          networkId: matchingOption.network,
          transactionHash: txHash,
          error: 'Transaction does not match payment requirements',
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
    networks: [
      {
        network: VECHAIN_NETWORKS.TESTNET, // VeChain testnet (CAIP-2 format)
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
