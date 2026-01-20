/**
 * Unit tests for /supported endpoint
 */

import { describe, it, expect } from 'vitest';
import { Hono } from 'hono';
import x402Routes from '../../routes/x402.js';
import { VECHAIN_NETWORKS } from '../../config/vechain.js';

describe('GET /supported', () => {
  const app = new Hono();
  app.route('/', x402Routes);

  it('should return supported networks and assets', async () => {
    const res = await app.request('/supported', {
      method: 'GET',
    });

    expect(res.status).toBe(200);
    
    const data = await res.json();
    
    // Verify response structure
    expect(data).toHaveProperty('networks');
    expect(data).toHaveProperty('schemes');
    
    // Verify schemes
    expect(data.schemes).toEqual(['x402']);
    
    // Verify networks
    expect(Array.isArray(data.networks)).toBe(true);
    expect(data.networks.length).toBeGreaterThan(0);
    
    // Check for VeChain testnet
    const testnetNetwork = data.networks.find(
      (n: any) => n.network === VECHAIN_NETWORKS.TESTNET
    );
    expect(testnetNetwork).toBeDefined();
    
    // Verify assets for testnet
    expect(testnetNetwork.assets).toEqual(['VET', 'VTHO', 'VEUSD', 'B3TR']);
  });

  it('should include all supported VeChain tokens', async () => {
    const res = await app.request('/supported', {
      method: 'GET',
    });

    const data = await res.json();
    const testnetNetwork = data.networks.find(
      (n: any) => n.network === VECHAIN_NETWORKS.TESTNET
    );

    // Verify all expected tokens are present
    const expectedTokens = ['VET', 'VTHO', 'VEUSD', 'B3TR'];
    expectedTokens.forEach(token => {
      expect(testnetNetwork.assets).toContain(token);
    });
  });

  it('should return consistent response format', async () => {
    const res1 = await app.request('/supported', { method: 'GET' });
    const res2 = await app.request('/supported', { method: 'GET' });

    const data1 = await res1.json();
    const data2 = await res2.json();

    // Response should be identical for multiple requests
    expect(data1).toEqual(data2);
  });
});
