/**
 * Unit tests for environment variable validation (src/config/env.ts).
 *
 * env.ts validates process.env at module-load time and throws if invalid,
 * so each scenario here resets the module registry and re-imports with a
 * freshly mutated process.env.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const ORIGINAL_ENV = { ...process.env };

describe('env validation', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.resetModules();
    process.env = { ...ORIGINAL_ENV };
  });

  it('fails safe: throws at import time when fee delegation is enabled without a private key', async () => {
    process.env.FEE_DELEGATION_ENABLED = 'true';
    delete process.env.FEE_DELEGATION_PRIVATE_KEY;

    await expect(import('../../config/env.js')).rejects.toThrow(
      'FEE_DELEGATION_PRIVATE_KEY is required when FEE_DELEGATION_ENABLED is true'
    );
  });

  it('fails safe: throws when fee delegation is enabled with an empty-string private key', async () => {
    process.env.FEE_DELEGATION_ENABLED = 'true';
    process.env.FEE_DELEGATION_PRIVATE_KEY = '';

    await expect(import('../../config/env.js')).rejects.toThrow(
      'FEE_DELEGATION_PRIVATE_KEY is required when FEE_DELEGATION_ENABLED is true'
    );
  });

  it('fails safe: rejects a malformed (non-64-char-hex) private key even when provided', async () => {
    process.env.FEE_DELEGATION_ENABLED = 'true';
    process.env.FEE_DELEGATION_PRIVATE_KEY = 'not-a-valid-hex-key';

    await expect(import('../../config/env.js')).rejects.toThrow();
  });

  it('succeeds when fee delegation is enabled with a valid 64-char hex private key', async () => {
    process.env.FEE_DELEGATION_ENABLED = 'true';
    process.env.FEE_DELEGATION_PRIVATE_KEY = 'a'.repeat(64);

    const { env } = await import('../../config/env.js');
    expect(env.FEE_DELEGATION_ENABLED).toBe(true);
    expect(env.FEE_DELEGATION_PRIVATE_KEY).toBe('a'.repeat(64));
  });

  it('defaults fee delegation to disabled and requires no key', async () => {
    delete process.env.FEE_DELEGATION_ENABLED;
    delete process.env.FEE_DELEGATION_PRIVATE_KEY;

    const { env } = await import('../../config/env.js');
    expect(env.FEE_DELEGATION_ENABLED).toBe(false);
  });
});
