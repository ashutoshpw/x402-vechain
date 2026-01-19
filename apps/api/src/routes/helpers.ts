/**
 * Helper functions for x402 payment validation
 */

import type { PaymentOption } from '../types/x402.js';
import type { PaymentDetails } from '../services/VeChainService.js';
import { VECHAIN_TOKENS, TOKEN_REGISTRY } from '../config/vechain.js';

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
    
    // Check if token matches (handle both symbols and contract addresses)
    let tokenMatches = false;
    const optionAssetUpper = option.asset.toUpperCase();
    const paymentTokenUpper = paymentDetails.token.toUpperCase();
    
    if (paymentTokenUpper === VECHAIN_TOKENS.VET) {
      tokenMatches = optionAssetUpper === VECHAIN_TOKENS.VET || optionAssetUpper === 'NATIVE';
    } else if (paymentTokenUpper === VECHAIN_TOKENS.VTHO) {
      tokenMatches = optionAssetUpper === VECHAIN_TOKENS.VTHO;
    } else if (paymentTokenUpper === VECHAIN_TOKENS.VEUSD) {
      tokenMatches = optionAssetUpper === VECHAIN_TOKENS.VEUSD;
    } else if (paymentTokenUpper === VECHAIN_TOKENS.B3TR) {
      tokenMatches = optionAssetUpper === VECHAIN_TOKENS.B3TR;
    } else {
      // Contract address comparison - also check if option uses symbol while payment uses address
      const optionAddress = optionAssetUpper in TOKEN_REGISTRY
        ? TOKEN_REGISTRY[optionAssetUpper as keyof typeof TOKEN_REGISTRY].address.toLowerCase()
        : option.asset.toLowerCase();
      
      const paymentAddress = paymentTokenUpper in TOKEN_REGISTRY
        ? TOKEN_REGISTRY[paymentTokenUpper as keyof typeof TOKEN_REGISTRY].address.toLowerCase()
        : paymentDetails.token.toLowerCase();
      
      tokenMatches = optionAddress === paymentAddress;
    }
    
    return recipientMatches && amountMatches && tokenMatches;
  });
  
  return matchingOption || null;
}

/**
 * Error message for contract interaction transactions
 */
export const CONTRACT_INTERACTION_ERROR = 
  'Contract interaction transactions are not supported. Please use direct VET, VTHO, VEUSD, or B3TR transfers.';
