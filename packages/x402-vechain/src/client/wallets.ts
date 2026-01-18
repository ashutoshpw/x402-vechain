/**
 * VeChain wallet adapters for x402 payment signing
 * Supports VeWorld, Connex (Sync/Sync2), and custom wallet implementations
 */

import { Secp256k1, Keccak256, Hex, Address } from '@vechain/sdk-core';
import type { PaymentPayload } from '../types/index.js';

/**
 * Base interface for VeChain wallet adapters
 */
export interface WalletAdapter {
  /**
   * Get the current connected wallet address
   */
  getAddress(): Promise<string>;

  /**
   * Sign a message hash with the wallet
   * @param messageHash - Hash of the message to sign (32 bytes)
   * @returns Signature as hex string (without 0x prefix)
   */
  signMessageHash(messageHash: Uint8Array): Promise<string>;

  /**
   * Check if wallet is available and connected
   */
  isConnected(): Promise<boolean>;

  /**
   * Connect to the wallet (if not already connected)
   */
  connect?(): Promise<void>;
}

/**
 * Connex wallet adapter for VeChain Sync and Sync2
 * Requires @vechain/connex to be installed
 */
export class ConnexWalletAdapter implements WalletAdapter {
  private connex: any;
  private cachedAddress?: string;

  constructor(connex?: any) {
    // Try to get Connex from window if not provided
    if (connex) {
      this.connex = connex;
    } else if (typeof window !== 'undefined' && (window as any).connex) {
      this.connex = (window as any).connex;
    } else {
      throw new Error('Connex not found. Please provide Connex instance or ensure VeChain Sync is installed.');
    }
  }

  async getAddress(): Promise<string> {
    if (this.cachedAddress) {
      return this.cachedAddress;
    }

    // Request certificate to get user's address
    const certResponse = await this.connex.vendor.sign('cert', {
      purpose: 'identification',
      payload: {
        type: 'text',
        content: 'x402 Payment Authentication',
      },
    }).request();

    if (!certResponse || !certResponse.annex || !certResponse.annex.signer) {
      throw new Error('Failed to get address from Connex');
    }

    this.cachedAddress = certResponse.annex.signer;
    return certResponse.annex.signer;
  }

  async signMessageHash(messageHash: Uint8Array): Promise<string> {
    // Convert message hash to hex for Connex
    const messageHashHex = '0x' + Buffer.from(messageHash).toString('hex');

    // Request signature from Connex
    const signingResponse = await this.connex.vendor.sign('tx', [
      {
        comment: 'Sign x402 Payment',
        // Connex requires transaction clauses, but we're using cert instead
      },
    ]).request();

    // For message signing, use cert with the hash
    const certResponse = await this.connex.vendor.sign('cert', {
      purpose: 'agreement',
      payload: {
        type: 'text',
        content: messageHashHex,
      },
    }).request();

    if (!certResponse || !certResponse.signature) {
      throw new Error('Failed to sign message with Connex');
    }

    // Remove 0x prefix if present
    return certResponse.signature.startsWith('0x') 
      ? certResponse.signature.slice(2) 
      : certResponse.signature;
  }

  async isConnected(): Promise<boolean> {
    try {
      await this.getAddress();
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * VeWorld wallet adapter
 * Works with VeWorld browser extension and mobile app
 */
export class VeWorldWalletAdapter implements WalletAdapter {
  private vechain: any;
  private cachedAddress?: string;

  constructor() {
    if (typeof window !== 'undefined' && (window as any).vechain) {
      this.vechain = (window as any).vechain;
    } else {
      throw new Error('VeWorld not found. Please install VeWorld extension or app.');
    }
  }

  async connect(): Promise<void> {
    try {
      await this.vechain.request({
        method: 'wallet_connect',
      });
    } catch (error) {
      throw new Error(`Failed to connect to VeWorld: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getAddress(): Promise<string> {
    if (this.cachedAddress) {
      return this.cachedAddress;
    }

    try {
      const accounts = await this.vechain.request({
        method: 'wallet_getAccounts',
      });

      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts found in VeWorld');
      }

      this.cachedAddress = accounts[0];
      return accounts[0];
    } catch (error) {
      throw new Error(`Failed to get address from VeWorld: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async signMessageHash(messageHash: Uint8Array): Promise<string> {
    // Convert to hex
    const messageHashHex = '0x' + Buffer.from(messageHash).toString('hex');

    try {
      // VeWorld uses personal_sign for message signing
      const signature = await this.vechain.request({
        method: 'personal_sign',
        params: [messageHashHex, await this.getAddress()],
      });

      if (!signature) {
        throw new Error('No signature returned from VeWorld');
      }

      // Remove 0x prefix if present
      return signature.startsWith('0x') ? signature.slice(2) : signature;
    } catch (error) {
      throw new Error(`Failed to sign message with VeWorld: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async isConnected(): Promise<boolean> {
    try {
      const accounts = await this.vechain.request({
        method: 'wallet_getAccounts',
      });
      return accounts && accounts.length > 0;
    } catch {
      return false;
    }
  }
}

/**
 * Private key wallet adapter (for development/testing)
 * WARNING: Never use this with hardcoded keys in production
 */
export class PrivateKeyWalletAdapter implements WalletAdapter {
  private privateKey: string;
  private address: string;

  constructor(privateKey: string) {
    // Clean private key
    this.privateKey = privateKey.startsWith('0x') ? privateKey.slice(2) : privateKey;

    // Derive address from private key
    const privateKeyBytes = Hex.of(this.privateKey).bytes;
    const publicKey = Secp256k1.derivePublicKey(privateKeyBytes);
    const publicKeyHash = Keccak256.of(publicKey.slice(1)).bytes; // Remove 0x04 prefix
    this.address = '0x' + Buffer.from(publicKeyHash.slice(-20)).toString('hex');
  }

  async getAddress(): Promise<string> {
    return this.address;
  }

  async signMessageHash(messageHash: Uint8Array): Promise<string> {
    const privateKeyBytes = Hex.of(this.privateKey).bytes;
    const signature = Secp256k1.sign(messageHash, privateKeyBytes);
    return Buffer.from(signature).toString('hex');
  }

  async isConnected(): Promise<boolean> {
    return true;
  }
}

/**
 * Detect available VeChain wallets in the browser
 * @returns Array of detected wallet types
 */
export function detectWallets(): string[] {
  if (typeof window === 'undefined') {
    return [];
  }

  const wallets: string[] = [];

  if ((window as any).connex) {
    wallets.push('connex');
  }

  if ((window as any).vechain) {
    wallets.push('veworld');
  }

  return wallets;
}

/**
 * Auto-detect and create a wallet adapter
 * Prioritizes VeWorld, then Connex
 * @returns WalletAdapter instance or null if no wallet detected
 */
export function autoDetectWallet(): WalletAdapter | null {
  if (typeof window === 'undefined') {
    return null;
  }

  // Try VeWorld first (more modern)
  if ((window as any).vechain) {
    try {
      return new VeWorldWalletAdapter();
    } catch {
      // Fall through to next option
    }
  }

  // Try Connex
  if ((window as any).connex) {
    try {
      return new ConnexWalletAdapter();
    } catch {
      // Fall through
    }
  }

  return null;
}
