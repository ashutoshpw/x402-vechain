/**
 * VeChain Service
 * 
 * Provides blockchain interaction capabilities for VeChain network:
 * - Transaction verification and submission
 * - Balance queries
 * - Confirmation waiting
 * - Transaction decoding
 */

import {
  ThorClient,
  type TransactionReceipt,
} from '@vechain/sdk-network';
import { Address, type Hex, type TransactionClause } from '@vechain/sdk-core';
import { env, getVeChainRpcUrl } from '../config/env.js';
import {
  VECHAIN_TOKENS,
  VECHAIN_CONTRACTS,
  VECHAIN_TIMING,
} from '../config/vechain.js';

/**
 * Decoded payment details from a VeChain transaction
 */
export interface PaymentDetails {
  from: string;
  to: string;
  amount: bigint;
  token: string; // 'VET' for native token, or contract address for tokens
  clauses: TransactionClause[];
}

/**
 * VeChain Service for blockchain interactions
 */
export class VeChainService {
  private thorClient: ThorClient;

  constructor() {
    const rpcUrl = getVeChainRpcUrl();
    this.thorClient = ThorClient.fromUrl(rpcUrl);
  }

  /**
   * Verify a transaction by retrieving its receipt
   * @param txHash Transaction hash to verify
   * @returns Transaction receipt if found
   * @throws Error if transaction not found or invalid
   */
  async verifyTransaction(txHash: string): Promise<TransactionReceipt> {
    try {
      // Ensure txHash has 0x prefix
      const formattedTxHash = txHash.startsWith('0x') ? txHash : `0x${txHash}`;
      
      const receipt = await this.thorClient.transactions.getTransactionReceipt(
        formattedTxHash
      );
      
      if (!receipt) {
        throw new Error(`Transaction not found: ${txHash}`);
      }
      
      return receipt;
    } catch (error) {
      throw new Error(
        `Failed to verify transaction: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Submit a signed transaction to the VeChain network
   * @param signedTx Signed transaction in hex format
   * @returns Transaction hash
   * @throws Error if submission fails
   */
  async submitTransaction(signedTx: string): Promise<string> {
    try {
      // Ensure signedTx has 0x prefix
      const formattedTx = signedTx.startsWith('0x') ? signedTx : `0x${signedTx}`;
      
      const result = await this.thorClient.transactions.sendRawTransaction(
        formattedTx
      );
      
      if (!result || !result.id) {
        throw new Error('Transaction submission failed: No transaction ID returned');
      }
      
      return result.id;
    } catch (error) {
      throw new Error(
        `Failed to submit transaction: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get balance for an address and token
   * @param address Wallet address to check
   * @param token Token symbol ('VET', 'VTHO') or contract address
   * @returns Balance as bigint
   * @throws Error if balance query fails
   */
  async getBalance(address: string, token: string): Promise<bigint> {
    try {
      // Validate and format address
      const formattedAddress = Address.of(address);
      
      if (token.toUpperCase() === VECHAIN_TOKENS.VET) {
        // Get VET balance from account
        const account = await this.thorClient.accounts.getAccount(formattedAddress);
        if (!account) {
          throw new Error(`Account not found: ${address}`);
        }
        return BigInt(account.balance);
      } else if (token.toUpperCase() === VECHAIN_TOKENS.VTHO) {
        // Get VTHO balance from energy field
        const account = await this.thorClient.accounts.getAccount(formattedAddress);
        if (!account) {
          throw new Error(`Account not found: ${address}`);
        }
        return BigInt(account.energy);
      } else {
        // For other tokens, would need to call balanceOf on the token contract
        // This requires ABI encoding/decoding which would need additional implementation
        // TODO: Implement ERC20-like token balance queries using contract ABI calls
        // Issue: Custom token balance queries not yet supported
        throw new Error(`Token balance queries for custom tokens not yet implemented: ${token}`);
      }
    } catch (error) {
      throw new Error(
        `Failed to get balance: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Wait for transaction confirmation
   * @param txHash Transaction hash to monitor
   * @param confirmations Number of confirmations to wait for (default: 1)
   * @returns true if confirmed, false if timeout or reverted
   */
  async waitForConfirmation(
    txHash: string,
    confirmations: number = VECHAIN_TIMING.DEFAULT_CONFIRMATIONS
  ): Promise<boolean> {
    try {
      // Ensure txHash has 0x prefix
      const formattedTxHash = txHash.startsWith('0x') ? txHash : `0x${txHash}`;
      
      const maxAttempts = VECHAIN_TIMING.MAX_CONFIRMATION_ATTEMPTS;
      const pollInterval = VECHAIN_TIMING.BLOCK_TIME_MS;
      
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const receipt = await this.thorClient.transactions.getTransactionReceipt(
          formattedTxHash
        );
        
        if (receipt) {
          // Transaction found in a block
          // Check if reverted
          if (receipt.reverted) {
            return false;
          }
          
          // Get current block number
          const currentBlock = await this.thorClient.blocks.getBestBlockCompressed();
          if (!currentBlock) {
            throw new Error('Failed to get current block');
          }
          
          const confirmationCount = currentBlock.number - receipt.meta.blockNumber;
          
          if (confirmationCount >= confirmations) {
            return true;
          }
        }
        
        // Wait before next poll
        await new Promise(resolve => setTimeout(resolve, pollInterval));
      }
      
      // Timeout - transaction not confirmed within max wait time
      return false;
    } catch (error) {
      throw new Error(
        `Failed to wait for confirmation: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Decode a transaction to extract payment details
   * @param txHash Transaction hash to decode
   * @returns Payment details extracted from transaction
   * @throws Error if transaction cannot be decoded
   */
  async decodeTransaction(txHash: string): Promise<PaymentDetails> {
    try {
      // Ensure txHash has 0x prefix
      const formattedTxHash = txHash.startsWith('0x') ? txHash : `0x${txHash}`;
      
      // Get transaction
      const tx = await this.thorClient.transactions.getTransaction(
        formattedTxHash
      );
      
      if (!tx) {
        throw new Error(`Transaction not found: ${txHash}`);
      }
      
      // VeChain uses clauses (multi-operation transactions)
      // For simple payments, we'll look at the first clause
      if (!tx.clauses || tx.clauses.length === 0) {
        throw new Error('Transaction has no clauses');
      }
      
      const firstClause = tx.clauses[0];
      
      // Determine token type based on clause
      let token = VECHAIN_TOKENS.VET;
      let amount = BigInt(0);
      let to = firstClause.to || '0x0000000000000000000000000000000000000000';
      
      if (firstClause.value && BigInt(firstClause.value) > 0n) {
        // VET transfer
        token = VECHAIN_TOKENS.VET;
        amount = BigInt(firstClause.value);
      } else if (firstClause.data && firstClause.data !== '0x') {
        // Contract interaction - could be a token transfer
        // Note: Full token transfer decoding would require ABI parsing
        // For contract interactions, we mark the token type but cannot determine the amount
        // without ABI decoding. Callers should verify contract interactions separately.
        // TODO: Implement token transfer ABI decoding for accurate amount extraction
        token = VECHAIN_TOKENS.CONTRACT_INTERACTION;
        // Amount remains 0 - contract interactions require additional ABI decoding
        // to extract the actual transfer amount
        amount = BigInt(0);
      }
      
      return {
        from: tx.origin,
        to,
        amount,
        token,
        clauses: tx.clauses,
      };
    } catch (error) {
      throw new Error(
        `Failed to decode transaction: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get Thor client instance (useful for advanced operations)
   */
  getThorClient(): ThorClient {
    return this.thorClient;
  }

  /**
   * Get current network information
   */
  getNetworkInfo(): { network: string; rpcUrl: string } {
    return {
      network: env.VECHAIN_NETWORK,
      rpcUrl: getVeChainRpcUrl(),
    };
  }
}

// Export singleton instance
export const veChainService = new VeChainService();
