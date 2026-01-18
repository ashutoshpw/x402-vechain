/**
 * Environment Variable Validation and Configuration
 * 
 * This module validates all environment variables using Zod schemas
 * and provides a type-safe configuration object for the application.
 */

import { z } from 'zod'
import { config as loadEnv } from 'dotenv'

// Load environment variables from .env file
loadEnv()

/**
 * Zod schema for environment variables validation
 * Ensures all required variables are present and have valid values
 */
const envSchema = z.object({
  // VeChain Network Configuration
  VECHAIN_NETWORK: z
    .enum(['testnet', 'mainnet'])
    .default('testnet')
    .describe('VeChain network to connect to'),
  
  VECHAIN_MAINNET_RPC: z
    .string()
    .url()
    .default('https://mainnet.vechain.org')
    .describe('VeChain mainnet RPC endpoint'),
  
  VECHAIN_TESTNET_RPC: z
    .string()
    .url()
    .default('https://testnet.vechain.org')
    .describe('VeChain testnet RPC endpoint'),

  // Fee Delegation Configuration
  FEE_DELEGATION_ENABLED: z
    .string()
    .default('false')
    .transform((val) => val === 'true')
    .describe('Enable fee delegation for transactions'),
  
  FEE_DELEGATION_PRIVATE_KEY: z
    .string()
    .optional()
    .refine((val) => !val || /^[a-fA-F0-9]{64}$/.test(val), {
      message: 'Private key must be a 64-character hexadecimal string',
    })
    .describe('Private key for fee delegation (64-character hex string)'),

  // Database Configuration
  DATABASE_URL: z
    .string()
    .min(1)
    .describe('Default database connection string'),
  
  DATABASE_URL_TESTNET: z
    .string()
    .optional()
    .describe('Testnet-specific database URL'),
  
  DATABASE_URL_MAINNET: z
    .string()
    .optional()
    .describe('Mainnet-specific database URL'),

  // Authentication
  JWT_SECRET: z
    .string()
    .optional()
    .refine((val) => !val || val.length >= 32, {
      message: 'JWT secret must be at least 32 characters',
    })
    .describe('Secret key for JWT token generation'),

  // Rate Limiting
  RATE_LIMIT_REQUESTS_PER_MINUTE: z
    .string()
    .default('100')
    .transform((val) => parseInt(val, 10))
    .describe('Maximum requests per IP per minute'),
  
  RATE_LIMIT_WINDOW_MS: z
    .string()
    .default('900000')
    .transform((val) => parseInt(val, 10))
    .describe('Rate limit time window in milliseconds'),

  // Application Configuration
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development')
    .describe('Node environment'),
  
  PORT: z
    .string()
    .default('3000')
    .transform((val) => parseInt(val, 10))
    .describe('API server port'),
})

/**
 * Validate and parse environment variables
 * Throws an error if validation fails
 */
function validateEnv() {
  try {
    const parsed = envSchema.parse(process.env)
    
    // Additional validation: Fee delegation private key required if enabled
    if (parsed.FEE_DELEGATION_ENABLED && !parsed.FEE_DELEGATION_PRIVATE_KEY) {
      throw new Error(
        'FEE_DELEGATION_PRIVATE_KEY is required when FEE_DELEGATION_ENABLED is true'
      )
    }
    
    return parsed
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.issues.map((err) => {
        const path = err.path.join('.')
        return `  - ${path}: ${err.message}`
      })
      
      throw new Error(
        `Environment variable validation failed:\n${errorMessages.join('\n')}\n\n` +
        'Please check your .env file or environment configuration.'
      )
    }
    throw error
  }
}

/**
 * Validated and typed environment configuration
 * Use this object throughout the application instead of process.env
 */
export const env = validateEnv()

/**
 * Helper function to get the current VeChain RPC URL based on network
 */
export function getVeChainRpcUrl(): string {
  return env.VECHAIN_NETWORK === 'mainnet' 
    ? env.VECHAIN_MAINNET_RPC 
    : env.VECHAIN_TESTNET_RPC
}

/**
 * Helper function to get the database URL based on network
 */
export function getDatabaseUrl(): string {
  const network = env.VECHAIN_NETWORK
  
  if (network === 'mainnet') {
    return env.DATABASE_URL_MAINNET || env.DATABASE_URL
  }
  
  return env.DATABASE_URL_TESTNET || env.DATABASE_URL
}

/**
 * Type definition for the environment configuration
 * Useful for type checking in other modules
 */
export type Env = z.infer<typeof envSchema>
