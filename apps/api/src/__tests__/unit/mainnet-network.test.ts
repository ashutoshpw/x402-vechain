/**
 * Unit tests for the per-network-deployment model.
 *
 * The rest of the suite runs with env.VECHAIN_NETWORK fixed to 'testnet'
 * (see src/__tests__/setup.ts, which sets it before any imports run).
 * These tests exercise the *other* half of that model — a mainnet
 * deployment — by resetting the module registry and re-importing the
 * config/routes with VECHAIN_NETWORK='mainnet' set first, so every
 * module-level `env.VECHAIN_NETWORK` read picks up 'mainnet' fresh.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Hono } from 'hono';

const ORIGINAL_ENV = { ...process.env };

describe('Mainnet deployment (VECHAIN_NETWORK=mainnet)', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.VECHAIN_NETWORK = 'mainnet';
  });

  afterEach(() => {
    vi.resetModules();
    process.env = { ...ORIGINAL_ENV };
  });

  it('resolves SUPPORTED_NETWORKS to only the mainnet CAIP-2 id', async () => {
    const { SUPPORTED_NETWORKS, VECHAIN_NETWORKS, ACTIVE_NETWORK } = await import(
      '../../config/vechain.js'
    );

    expect(ACTIVE_NETWORK).toBe('mainnet');
    expect(SUPPORTED_NETWORKS).toEqual([VECHAIN_NETWORKS.MAINNET]);
    expect(SUPPORTED_NETWORKS).not.toContain(VECHAIN_NETWORKS.TESTNET);
  });

  it('resolves ACTIVE_TOKEN_REGISTRY / ACTIVE_CONTRACTS to the verified mainnet addresses', async () => {
    const { ACTIVE_CONTRACTS, ACTIVE_TOKEN_REGISTRY } = await import('../../config/vechain.js');

    // VTHO is the same built-in energy contract on both networks.
    expect(ACTIVE_CONTRACTS.VTHO).toBe('0x0000000000000000000000000000456E65726779');
    // B3TR is deployed separately per network; this is the verified mainnet address.
    expect(ACTIVE_CONTRACTS.B3TR).toBe('0x5ef79995FE8a89e0812330E4378eB2660ceDe699');

    expect(ACTIVE_TOKEN_REGISTRY.B3TR.address).toBe('0x5ef79995FE8a89e0812330E4378eB2660ceDe699');
    expect(ACTIVE_TOKEN_REGISTRY.VTHO.address).toBe(
      '0x0000000000000000000000000000456E65726779'
    );
    // Confirms it did NOT fall back to the testnet B3TR address.
    expect(ACTIVE_TOKEN_REGISTRY.B3TR.address).not.toBe(
      '0x026771d1be764467f8bdb78bb230df10c924b00d'
    );
  });

  it('GET /supported advertises only the mainnet network with VET/VTHO/B3TR assets', async () => {
    const { default: x402Routes } = await import('../../routes/x402.js');
    const { VECHAIN_NETWORKS } = await import('../../config/vechain.js');

    const app = new Hono();
    app.route('/', x402Routes);

    const res = await app.request('/supported', { method: 'GET' });
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.networks).toHaveLength(1);
    expect(data.networks[0].network).toBe(VECHAIN_NETWORKS.MAINNET);
    expect(data.networks[0].assets).toEqual(['VET', 'VTHO', 'B3TR']);

    // The testnet network id must not be advertised by a mainnet deployment.
    const testnetEntry = data.networks.find(
      (n: any) => n.network === VECHAIN_NETWORKS.TESTNET
    );
    expect(testnetEntry).toBeUndefined();
  });
});
