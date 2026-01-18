import { z } from 'zod';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

/**
 * Environment variable validation schema using Zod
 * 
 * This schema ensures all required environment variables are present
 * and validates their format before the application starts.
 */
const envSchema = z.object({
  // VeChain Network Configuration
  VECHAIN_NETWORK: z
    .enum(['mainnet', 'testnet'])
    .default('testnet')
    .describe('VeChain network to use (mainnet or testnet)'),
  
  VECHAIN_MAINNET_RPC: z
    .string()
    .url()
    .default('https://mainnet.vechain.org')
    .describe('VeChain mainnet RPC endpoint URL'),
  
  VECHAIN_TESTNET_RPC: z
    .string()
    .url()
    .default('https://testnet.vechain.org')
    .describe('VeChain testnet RPC endpoint URL'),

  // Fee Delegation Configuration
  FEE_DELEGATION_ENABLED: z
    .string()
    .transform((val) => val === 'true')
    .pipe(z.boolean())
    .default('true')
    .describe('Enable fee delegation for transactions'),
  
  FEE_DELEGATION_PRIVATE_KEY: z
    .union([
      z.string().regex(/^0x[a-fA-F0-9]{64}$/, 'Must be a valid hex private key starting with 0x (66 characters total)'),
      z.literal(''),
      z.undefined()
    ])
    .optional()
    .describe('Private key for fee delegation sponsor account'),

  // Database Configuration
  DATABASE_URL: z
    .union([
      z.string()
        .url()
        .regex(/^postgresql:\/\//, 'Must be a valid PostgreSQL connection URL starting with postgresql://'),
      z.literal(''),
      z.undefined()
    ])
    .optional()
    .describe('PostgreSQL database connection URL'),

  // Authentication Configuration
  JWT_SECRET: z
    .union([
      z.string().min(32, 'JWT secret must be at least 32 characters'),
      z.literal(''),
      z.undefined()
    ])
    .optional()
    .describe('Secret key for signing JWT tokens'),

  // Rate Limiting Configuration
  RATE_LIMIT_REQUESTS_PER_MINUTE: z
    .string()
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int().positive())
    .default('100')
    .describe('Maximum requests per minute per client'),
});

/**
 * Validated environment variables
 * Type-safe access to all configuration values
 */
export type Env = z.infer<typeof envSchema>;

/**
 * Parse and validate environment variables
 * 
 * @throws {z.ZodError} If validation fails, provides detailed error messages
 * @returns {Env} Validated environment configuration
 */
function validateEnv(): Env {
  try {
    const parsed = envSchema.parse(process.env);
    return parsed;
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Environment validation failed:');
      error.issues.forEach((issue) => {
        console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
      });
      throw new Error('Invalid environment configuration');
    }
    throw error;
  }
}

/**
 * Validated and parsed environment configuration
 * Import this to access environment variables throughout the application
 */
export const env = validateEnv();

/**
 * Helper function to get the current VeChain RPC URL based on network
 * 
 * @returns {string} The appropriate RPC URL for the configured network
 */
export function getVeChainRpcUrl(): string {
  return env.VECHAIN_NETWORK === 'mainnet'
    ? env.VECHAIN_MAINNET_RPC
    : env.VECHAIN_TESTNET_RPC;
}
