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
  TOKEN_REGISTRY,
} from '../config/vechain.js';
import {
  decodeTransfer,
  decodeTransferWithAuthorization,
  isTokenTransfer,
} from '../utils/vip180.js';

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
   * Ensure transaction hash has 0x prefix
   * @param hash Hash string to format
   * @returns Formatted hash with 0x prefix
   */
  private formatHexString(hash: string): string {
    return hash.startsWith('0x') ? hash : `0x${hash}`;
  }

  /**
   * Get account information from blockchain
   * @param address Address to query
   * @returns Account information
   * @throws Error if account not found
   */
  private async getAccount(address: string) {
    const formattedAddress = Address.of(address);
    const account = await this.thorClient.accounts.getAccount(formattedAddress);
    
    if (!account) {
      throw new Error(`Account not found: ${address}`);
    }
    
    return account;
  }

  /**
   * Verify a transaction by retrieving its receipt
   * @param txHash Transaction hash to verify
   * @returns Transaction receipt if found
   * @throws Error if transaction not found or invalid
   */
  async verifyTransaction(txHash: string): Promise<TransactionReceipt> {
    try {
      const formattedTxHash = this.formatHexString(txHash);
      
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
      const formattedTx = this.formatHexString(signedTx);
      
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
   * @param token Token symbol ('VET', 'VTHO', 'VEUSD', 'B3TR') or contract address
   * @returns Balance as bigint
   * @throws Error if balance query fails
   */
  async getBalance(address: string, token: string): Promise<bigint> {
    try {
      if (token.toUpperCase() === VECHAIN_TOKENS.VET) {
        // Get VET balance from account
        const account = await this.getAccount(address);
        return BigInt(account.balance);
      } else if (token.toUpperCase() === VECHAIN_TOKENS.VTHO) {
        // Get VTHO balance from energy field
        const account = await this.getAccount(address);
        return BigInt(account.energy);
      } else {
        // For VIP-180 tokens, call balanceOf on the token contract
        let contractAddress: string;

        // Check if token is a known symbol or a contract address
        const tokenUpper = token.toUpperCase();
        if (tokenUpper in TOKEN_REGISTRY) {
          contractAddress = TOKEN_REGISTRY[tokenUpper as keyof typeof TOKEN_REGISTRY].address;
        } else if (token.startsWith('0x') && token.length === 42) {
          // Assume it's a contract address
          contractAddress = token;
        } else {
          throw new Error(`Unknown token: ${token}`);
        }

        // Define balanceOf ABI fragment
        const balanceOfAbi = {
          constant: true,
          inputs: [{ name: 'owner', type: 'address' }],
          name: 'balanceOf',
          outputs: [{ name: 'balance', type: 'uint256' }],
          type: 'function',
        };

        // Call the balanceOf function
        const result = await this.thorClient.contracts.executeCall(
          contractAddress,
          balanceOfAbi as any,
          [address],
          {}
        );

        if (!result || !result.success) {
          throw new Error(result?.result?.errorMessage || 'Contract call failed');
        }

        // The result.result.plain is the decoded balance
        const balance = result.result.plain;
        if (balance === undefined || balance === null) {
          throw new Error('No balance returned from contract call');
        }

        return BigInt(balance.toString());
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
      const formattedTxHash = this.formatHexString(txHash);
      
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
      const formattedTxHash = this.formatHexString(txHash);
      
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
      } else if (firstClause.data && firstClause.data !== '0x' && firstClause.data !== '0x0') {
        // Contract interaction - check if it's a VIP-180 token transfer
        if (isTokenTransfer(firstClause.data)) {
          // Try to decode as standard transfer first
          const transferData = decodeTransfer(firstClause.data);
          if (transferData) {
            // Standard VIP-180 transfer
            to = transferData.to;
            amount = transferData.amount;
            
            // Determine which token by contract address
            const contractAddress = firstClause.to?.toLowerCase();
            if (contractAddress === VECHAIN_CONTRACTS.VTHO.toLowerCase()) {
              token = VECHAIN_TOKENS.VTHO;
            } else if (contractAddress === VECHAIN_CONTRACTS.VEUSD.toLowerCase()) {
              token = VECHAIN_TOKENS.VEUSD;
            } else if (contractAddress === VECHAIN_CONTRACTS.B3TR.toLowerCase()) {
              token = VECHAIN_TOKENS.B3TR;
            } else {
              // Unknown VIP-180 token - use contract address as identifier
              token = contractAddress || VECHAIN_TOKENS.CONTRACT_INTERACTION;
            }
          } else {
            // Try to decode as transferWithAuthorization
            const authTransferData = decodeTransferWithAuthorization(firstClause.data);
            if (authTransferData) {
              to = authTransferData.to;
              amount = authTransferData.amount;
              
              // Determine which token by contract address
              const contractAddress = firstClause.to?.toLowerCase();
              if (contractAddress === VECHAIN_CONTRACTS.VTHO.toLowerCase()) {
                token = VECHAIN_TOKENS.VTHO;
              } else if (contractAddress === VECHAIN_CONTRACTS.VEUSD.toLowerCase()) {
                token = VECHAIN_TOKENS.VEUSD;
              } else if (contractAddress === VECHAIN_CONTRACTS.B3TR.toLowerCase()) {
                token = VECHAIN_TOKENS.B3TR;
              } else {
                // Unknown VIP-180 token - use contract address as identifier
                token = contractAddress || VECHAIN_TOKENS.CONTRACT_INTERACTION;
              }
            } else {
              // Not a recognized token transfer - mark as contract interaction
              token = VECHAIN_TOKENS.CONTRACT_INTERACTION;
              amount = BigInt(0);
            }
          }
        } else {
          // Non-token contract interaction
          token = VECHAIN_TOKENS.CONTRACT_INTERACTION;
          amount = BigInt(0);
        }
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
