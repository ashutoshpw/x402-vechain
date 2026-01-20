/**
 * Unit tests for Payment Verification Service
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  parseCAIP2Network,
  normalizeNetworkIdentifier,
  validateTokenAddress,
} from '../../services/PaymentVerificationService.js';
import { VECHAIN_NETWORKS, VECHAIN_TOKENS, VECHAIN_CONTRACTS } from '../../config/vechain.js';

describe('PaymentVerificationService', () => {
  describe('parseCAIP2Network', () => {
    it('should parse valid eip155 network identifiers', () => {
      const result = parseCAIP2Network('eip155:100009');
      expect(result).toEqual({
        namespace: 'eip155',
        reference: '100009',
      });
    });

    it('should parse valid vechain network identifiers', () => {
      const result = parseCAIP2Network('vechain:100009');
      expect(result).toEqual({
        namespace: 'vechain',
        reference: '100009',
      });
    });

    it('should return null for invalid format', () => {
      expect(parseCAIP2Network('invalid')).toBeNull();
      expect(parseCAIP2Network('invalid:format:extra')).toBeNull();
      expect(parseCAIP2Network('')).toBeNull();
    });

    it('should return null for unsupported namespaces', () => {
      expect(parseCAIP2Network('cosmos:100009')).toBeNull();
      expect(parseCAIP2Network('polkadot:100009')).toBeNull();
    });

    it('should handle testnet and mainnet references', () => {
      const testnet = parseCAIP2Network(VECHAIN_NETWORKS.TESTNET);
      expect(testnet).toEqual({
        namespace: 'eip155',
        reference: '100009',
      });

      const mainnet = parseCAIP2Network(VECHAIN_NETWORKS.MAINNET);
      expect(mainnet).toEqual({
        namespace: 'eip155',
        reference: '100010',
      });
    });
  });

  describe('normalizeNetworkIdentifier', () => {
    it('should convert vechain namespace to eip155', () => {
      const result = normalizeNetworkIdentifier('vechain:100009');
      expect(result).toBe('eip155:100009');
    });

    it('should keep eip155 namespace unchanged', () => {
      const result = normalizeNetworkIdentifier('eip155:100009');
      expect(result).toBe('eip155:100009');
    });

    it('should return original value for invalid format', () => {
      const invalid = 'invalid-format';
      const result = normalizeNetworkIdentifier(invalid);
      expect(result).toBe(invalid);
    });

    it('should handle testnet and mainnet', () => {
      expect(normalizeNetworkIdentifier('vechain:100009')).toBe(VECHAIN_NETWORKS.TESTNET);
      expect(normalizeNetworkIdentifier('vechain:100010')).toBe(VECHAIN_NETWORKS.MAINNET);
    });
  });

  describe('validateTokenAddress', () => {
    it('should validate native token identifier', () => {
      expect(validateTokenAddress('native')).toBe(true);
    });

    it('should validate VET token', () => {
      expect(validateTokenAddress('VET')).toBe(true);
      expect(validateTokenAddress('vet')).toBe(true);
      expect(validateTokenAddress(VECHAIN_TOKENS.VET)).toBe(true);
    });

    it('should validate VTHO token', () => {
      expect(validateTokenAddress('VTHO')).toBe(true);
      expect(validateTokenAddress('vtho')).toBe(true);
      expect(validateTokenAddress(VECHAIN_TOKENS.VTHO)).toBe(true);
    });

    it('should validate VEUSD token', () => {
      expect(validateTokenAddress('VEUSD')).toBe(true);
      expect(validateTokenAddress('veusd')).toBe(true);
      expect(validateTokenAddress(VECHAIN_TOKENS.VEUSD)).toBe(true);
    });

    it('should validate B3TR token', () => {
      expect(validateTokenAddress('B3TR')).toBe(true);
      expect(validateTokenAddress('b3tr')).toBe(true);
      expect(validateTokenAddress(VECHAIN_TOKENS.B3TR)).toBe(true);
    });

    it('should validate VTHO contract address', () => {
      expect(validateTokenAddress(VECHAIN_CONTRACTS.VTHO)).toBe(true);
    });

    it('should validate valid contract addresses', () => {
      const validAddress = '0x1234567890123456789012345678901234567890';
      expect(validateTokenAddress(validAddress)).toBe(true);
    });

    it('should reject invalid contract addresses', () => {
      expect(validateTokenAddress('0xinvalid')).toBe(false);
      expect(validateTokenAddress('not-an-address')).toBe(false);
      expect(validateTokenAddress('')).toBe(false);
    });

    it('should reject addresses without 0x prefix', () => {
      const noPrefix = '1234567890123456789012345678901234567890';
      expect(validateTokenAddress(noPrefix)).toBe(false);
    });

    it('should reject addresses with wrong length', () => {
      expect(validateTokenAddress('0x1234')).toBe(false);
      expect(validateTokenAddress('0x' + '1'.repeat(50))).toBe(false);
    });
  });
});
