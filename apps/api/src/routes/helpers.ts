/**
 * Helper functions for x402 payment validation
 */

import type { PaymentOption } from '../types/x402.js';
import type { PaymentDetails } from '../services/VeChainService.js';

/**
 * Validates that a transaction's payment details match the requirements
 * @param paymentDetails Decoded payment details from the transaction
 * @param paymentOptions Array of acceptable payment options
 * @returns The matching payment option if validation succeeds, null otherwise
 */
export function validatePaymentDetails(
  paymentDetails: PaymentDetails,
  paymentOptions: PaymentOption[]
): PaymentOption | null {
  // Reject contract interactions since we cannot decode the amount without ABI
  if (paymentDetails.token === 'CONTRACT_INTERACTION') {
    return null;
  }
  
  // Find a matching payment option
  const matchingOption = paymentOptions.find((option: PaymentOption) => {
    // Check if recipient matches
    const recipientMatches = option.recipient.toLowerCase() === paymentDetails.to.toLowerCase();
    
    // Check if amount matches (convert option.amount to bigint)
    const requiredAmount = BigInt(option.amount);
    const amountMatches = paymentDetails.amount >= requiredAmount;
    
    // Check if token matches
    const tokenMatches = option.asset.toUpperCase() === paymentDetails.token.toUpperCase();
    
    return recipientMatches && amountMatches && tokenMatches;
  });
  
  return matchingOption || null;
}

/**
 * Error message for contract interaction transactions
 */
export const CONTRACT_INTERACTION_ERROR = 
  'Contract interaction transactions are not supported. Please use direct VET or VTHO transfers.';
