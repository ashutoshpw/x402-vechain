/**
 * Fee Delegation Monitoring Routes
 * 
 * Provides endpoints to monitor fee delegation status and statistics
 */

import { Hono } from 'hono';
import { feeDelegationService } from '../services/FeeDelegationService.js';
import { env } from '../config/env.js';
import { isValidAddress } from '../utils/validation.js';

const feeDelegationRoutes = new Hono();

/**
 * GET /fee-delegation/status
 * Returns fee delegation configuration and status
 */
feeDelegationRoutes.get('/status', async (c) => {
  if (!feeDelegationService.isEnabled()) {
    return c.json({
      enabled: false,
      message: 'Fee delegation is not enabled',
    }, 200);
  }

  try {
    const balance = await feeDelegationService.getDelegatorBalance();
    const isLow = await feeDelegationService.isBalanceLow();
    const balanceVtho = Number(balance) / 1e18;

    return c.json({
      enabled: true,
      delegatorAddress: feeDelegationService.getDelegatorAddress(),
      balanceVtho: balanceVtho.toFixed(2),
      isBalanceLow: isLow,
      lowBalanceThreshold: env.FEE_DELEGATION_LOW_BALANCE_THRESHOLD,
      maxVthoPerTx: env.FEE_DELEGATION_MAX_VTHO_PER_TX,
      network: env.VECHAIN_NETWORK,
    }, 200);
  } catch (error) {
    return c.json({
      enabled: true,
      error: `Failed to get status: ${error instanceof Error ? error.message : 'Unknown error'}`,
    }, 500);
  }
});

/**
 * GET /fee-delegation/stats/:address
 * Returns delegation statistics for a specific address
 */
feeDelegationRoutes.get('/stats/:address', async (c) => {
  if (!feeDelegationService.isEnabled()) {
    return c.json({
      error: 'Fee delegation is not enabled',
    }, 400);
  }

  const address = c.req.param('address');
  const timeWindowHours = parseInt(c.req.query('hours') || '24', 10);

  if (!address || !isValidAddress(address)) {
    return c.json({
      error: 'Invalid address format',
    }, 400);
  }

  try {
    const stats = await feeDelegationService.getUserDelegationStats(address, timeWindowHours);
    const vthoSpent = Number(stats.totalVthoSpent) / 1e18;

    return c.json({
      address: stats.userAddress,
      timeWindowHours,
      transactionCount: stats.transactionCount,
      totalVthoSpent: vthoSpent.toFixed(6),
      lastDelegatedAt: stats.lastDelegatedAt?.toISOString() || null,
    }, 200);
  } catch (error) {
    return c.json({
      error: `Failed to get stats: ${error instanceof Error ? error.message : 'Unknown error'}`,
    }, 500);
  }
});

/**
 * GET /fee-delegation/total-spent
 * Returns total VTHO spent by the delegation service
 */
feeDelegationRoutes.get('/total-spent', async (c) => {
  if (!feeDelegationService.isEnabled()) {
    return c.json({
      error: 'Fee delegation is not enabled',
    }, 400);
  }

  const timeWindowHours = parseInt(c.req.query('hours') || '24', 10);

  try {
    const totalSpent = await feeDelegationService.getTotalVthoSpent(timeWindowHours);
    const totalVtho = Number(totalSpent) / 1e18;

    return c.json({
      timeWindowHours,
      totalVthoSpent: totalVtho.toFixed(6),
      network: env.VECHAIN_NETWORK,
    }, 200);
  } catch (error) {
    return c.json({
      error: `Failed to get total spent: ${error instanceof Error ? error.message : 'Unknown error'}`,
    }, 500);
  }
});

export default feeDelegationRoutes;
