/**
 * Fee Delegation Service
 * 
 * Implements VTHO fee delegation (gas sponsorship) for VeChain transactions
 * using Multi-Party Payment (MPP) protocol.
 * 
 * Features:
 * - Transaction signing with fee delegation (reserved field)
 * - VTHO balance monitoring
 * - Spending limits per transaction
 * - Low-balance alerts
 * - Per-address rate limiting
 */

import {
  Transaction,
  Secp256k1,
  Address,
  type TransactionBody,
  type TransactionClause,
} from '@vechain/sdk-core';
import { ThorClient } from '@vechain/sdk-network';
import { env, getVeChainRpcUrl } from '../config/env.js';
import { db } from '../db/index.js';
import { feeDelegationLogs } from '../db/schema.js';
import { eq, and, sql, gte } from 'drizzle-orm';
import { logger } from '../utils/logger.js';

/**
 * Result of fee delegation operation
 */
export interface DelegationResult {
  success: boolean;
  signedTransaction?: string;
  error?: string;
  vthoSpent?: string;
}

/**
 * Fee delegation statistics for an address
 */
export interface DelegationStats {
  userAddress: string;
  totalVthoSpent: string;
  transactionCount: number;
  lastDelegatedAt: Date | null;
}

/**
 * VeChain gas estimation constants
 */
const GAS_CONSTANTS = {
  BASE_GAS_PER_CLAUSE: 5000n,
  ZERO_BYTE_GAS: 68n,
  NON_ZERO_BYTE_GAS: 200n,
  SAFETY_BUFFER_PERCENT: 120n,
} as const;

/**
 * Fee delegation rate limiting constants
 */
const RATE_LIMIT_CONSTANTS = {
  MAX_TRANSACTIONS_PER_HOUR: 10,
} as const;

/**
 * Fee Delegation Service
 */
export class FeeDelegationService {
  private thorClient: ThorClient;
  // SECURITY NOTE: Private key is stored in memory as a Buffer.
  // In production, consider using a hardware security module (HSM),
  // key management service (KMS), or secure enclave for key storage.
  private delegatorPrivateKey: Buffer | null;
  private delegatorAddress: string | null;

  constructor() {
    const rpcUrl = getVeChainRpcUrl();
    this.thorClient = ThorClient.fromUrl(rpcUrl);
    
    // Initialize delegator private key if fee delegation is enabled
    if (env.FEE_DELEGATION_ENABLED && env.FEE_DELEGATION_PRIVATE_KEY) {
      this.delegatorPrivateKey = Buffer.from(env.FEE_DELEGATION_PRIVATE_KEY, 'hex');
      
      // Derive delegator address from private key
      const publicKey = Secp256k1.derivePublicKey(this.delegatorPrivateKey);
      this.delegatorAddress = Address.ofPublicKey(publicKey).toString();
    } else {
      this.delegatorPrivateKey = null;
      this.delegatorAddress = null;
    }
  }

  /**
   * Check if fee delegation is enabled and configured
   */
  isEnabled(): boolean {
    return env.FEE_DELEGATION_ENABLED && this.delegatorPrivateKey !== null;
  }

  /**
   * Get delegator account address
   */
  getDelegatorAddress(): string | null {
    return this.delegatorAddress;
  }

  /**
   * Get VTHO balance of the delegator account
   * @returns VTHO balance as bigint
   */
  async getDelegatorBalance(): Promise<bigint> {
    if (!this.delegatorAddress) {
      throw new Error('Fee delegation is not enabled');
    }

    const account = await this.thorClient.accounts.getAccount(
      Address.of(this.delegatorAddress)
    );

    if (!account) {
      throw new Error('Failed to get delegator account');
    }

    return BigInt(account.energy);
  }

  /**
   * Check if delegator balance is below threshold
   * @returns true if balance is low
   */
  async isBalanceLow(): Promise<boolean> {
    const balance = await this.getDelegatorBalance();
    const threshold = BigInt(Math.floor(env.FEE_DELEGATION_LOW_BALANCE_THRESHOLD * 1e18)); // Convert to Wei
    return balance < threshold;
  }

  /**
   * Log a warning if balance is low
   */
  private async checkAndLogLowBalance(): Promise<void> {
    if (await this.isBalanceLow()) {
      const balance = await this.getDelegatorBalance();
      const balanceVtho = Number(balance) / 1e18;
      logger.warn(
        'Fee delegation account balance is low',
        {
          balanceVtho: balanceVtho.toFixed(2),
          threshold: env.FEE_DELEGATION_LOW_BALANCE_THRESHOLD,
          delegatorAddress: this.delegatorAddress,
        }
      );
    }
  }

  /**
   * Get delegation statistics for a user address
   * @param userAddress User wallet address
   * @param timeWindowHours Time window in hours (default: 24)
   * @returns Delegation statistics
   */
  async getUserDelegationStats(
    userAddress: string,
    timeWindowHours: number = 24
  ): Promise<DelegationStats> {
    const timeWindowMs = timeWindowHours * 60 * 60 * 1000;
    const cutoffTime = new Date(Date.now() - timeWindowMs);

    const logs = await db
      .select()
      .from(feeDelegationLogs)
      .where(
        and(
          eq(feeDelegationLogs.userAddress, userAddress.toLowerCase()),
          gte(feeDelegationLogs.createdAt, cutoffTime)
        )
      );

    const totalVthoSpent = logs.reduce(
      (sum, log) => sum + BigInt(log.vthoSpent),
      BigInt(0)
    );

    const lastDelegatedAt = logs.length > 0
      ? logs.reduce((latest, log) => 
          log.createdAt > latest ? log.createdAt : latest, 
          logs[0].createdAt
        )
      : null;

    return {
      userAddress,
      totalVthoSpent: totalVthoSpent.toString(),
      transactionCount: logs.length,
      lastDelegatedAt,
    };
  }

  /**
   * Check if user has exceeded delegation limits
   * @param userAddress User wallet address
   * @returns true if limits are exceeded
   */
  async hasExceededDelegationLimit(userAddress: string): Promise<boolean> {
    const stats = await this.getUserDelegationStats(userAddress, 1); // 1 hour window
    
    return stats.transactionCount >= RATE_LIMIT_CONSTANTS.MAX_TRANSACTIONS_PER_HOUR;
  }

  /**
   * Estimate gas cost for transaction clauses
   * @param clauses Transaction clauses
   * @returns Estimated VTHO cost
   */
  private async estimateGasCost(clauses: TransactionClause[]): Promise<bigint> {
    // VeChain gas calculation based on transaction data
    // Reference: https://docs.vechain.org/core-concepts/transactions/transaction-calculation
    
    let totalGas = BigInt(0);
    
    for (const clause of clauses) {
      totalGas += GAS_CONSTANTS.BASE_GAS_PER_CLAUSE;
      
      if (clause.data && clause.data !== '0x') {
        const data = clause.data.startsWith('0x') ? clause.data.slice(2) : clause.data;
        const dataBytes = Buffer.from(data, 'hex');
        
        for (const byte of dataBytes) {
          totalGas += byte === 0 ? GAS_CONSTANTS.ZERO_BYTE_GAS : GAS_CONSTANTS.NON_ZERO_BYTE_GAS;
        }
      }
    }
    
    // Add safety buffer for estimation accuracy
    totalGas = (totalGas * GAS_CONSTANTS.SAFETY_BUFFER_PERCENT) / 100n;
    
    return totalGas;
  }

  /**
   * Sign a transaction with fee delegation
   * Takes a transaction already signed by the sender and adds the delegator (gas payer) signature
   * 
   * @param senderSignedTx Hex-encoded transaction already signed by the sender
   * @param senderAddress Address of the transaction sender
   * @returns Delegation result with fully signed transaction
   */
  async sponsorTransaction(
    senderSignedTx: string,
    senderAddress: string
  ): Promise<DelegationResult> {
    if (!this.isEnabled()) {
      return {
        success: false,
        error: 'Fee delegation is not enabled',
      };
    }

    if (!this.delegatorPrivateKey || !this.delegatorAddress) {
      return {
        success: false,
        error: 'Fee delegation is not configured',
      };
    }

    try {
      // Check rate limits
      if (await this.hasExceededDelegationLimit(senderAddress)) {
        return {
          success: false,
          error: 'Rate limit exceeded for fee delegation',
        };
      }

      // Decode the sender-signed transaction
      const txBytes = Buffer.from(
        senderSignedTx.startsWith('0x') ? senderSignedTx.slice(2) : senderSignedTx,
        'hex'
      );
      
      // Decode as a partially-signed delegated transaction
      // Second parameter (false) indicates the transaction is not fully signed yet
      const transaction = Transaction.decode(txBytes, false);

      // Verify it's a delegated transaction
      if (!transaction.isDelegated) {
        return {
          success: false,
          error: 'Transaction is not marked for delegation (reserved.features must be 1)',
        };
      }

      // Estimate gas cost
      const estimatedGas = await this.estimateGasCost(transaction.body.clauses);
      const maxVtho = BigInt(Math.floor(env.FEE_DELEGATION_MAX_VTHO_PER_TX * 1e18));

      if (estimatedGas > maxVtho) {
        return {
          success: false,
          error: `Transaction gas exceeds maximum limit (${env.FEE_DELEGATION_MAX_VTHO_PER_TX} VTHO)`,
        };
      }

      // Check delegator balance
      const delegatorBalance = await this.getDelegatorBalance();
      if (delegatorBalance < estimatedGas) {
        return {
          success: false,
          error: 'Insufficient VTHO balance in delegation account',
        };
      }

      // Sign as gas payer (delegator)
      const fullySignedTx = transaction.signAsGasPayer(
        Address.of(senderAddress),
        this.delegatorPrivateKey
      );

      // Get encoded transaction
      const encodedTx = fullySignedTx.encoded;
      const signedTxHex = '0x' + Buffer.from(encodedTx).toString('hex');

      // Check for low balance and log warning
      await this.checkAndLogLowBalance();

      return {
        success: true,
        signedTransaction: signedTxHex,
        vthoSpent: estimatedGas.toString(),
      };
    } catch (error) {
      return {
        success: false,
        error: `Fee delegation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Log a fee delegation event
   * @param txHash Transaction hash
   * @param userAddress User address
   * @param vthoSpent VTHO spent
   * @param status Transaction status
   */
  async logDelegation(
    txHash: string,
    userAddress: string,
    vthoSpent: string,
    status: 'success' | 'failed' | 'reverted',
    blockNumber?: number
  ): Promise<void> {
    try {
      await db.insert(feeDelegationLogs).values({
        txHash,
        userAddress: userAddress.toLowerCase(),
        vthoSpent,
        network: env.VECHAIN_NETWORK,
        blockNumber,
        status,
        metadata: {},
      });
    } catch (error) {
      logger.error('Failed to log fee delegation', error, {
        txHash,
        userAddress,
        vthoSpent,
        status,
      });
      // Don't throw - logging failures shouldn't break the main flow
    }
  }

  /**
   * Get total VTHO spent by the delegation service
   * @param timeWindowHours Time window in hours
   * @returns Total VTHO spent
   */
  async getTotalVthoSpent(timeWindowHours: number = 24): Promise<bigint> {
    const timeWindowMs = timeWindowHours * 60 * 60 * 1000;
    const cutoffTime = new Date(Date.now() - timeWindowMs);

    const result = await db
      .select({
        total: sql<string>`COALESCE(SUM(CAST(${feeDelegationLogs.vthoSpent} AS NUMERIC)), 0)`,
      })
      .from(feeDelegationLogs)
      .where(gte(feeDelegationLogs.createdAt, cutoffTime));

    return BigInt(result[0]?.total || '0');
  }
}

// Export singleton instance
export const feeDelegationService = new FeeDelegationService();
