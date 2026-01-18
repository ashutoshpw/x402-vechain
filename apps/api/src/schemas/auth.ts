/**
 * Authentication Request/Response Schemas
 * Validation schemas for wallet-based authentication
 */

import { z } from 'zod'

/**
 * Challenge Request Schema
 * Request a nonce for wallet signature
 */
export const ChallengeRequestSchema = z.object({
  walletAddress: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid VeChain wallet address format')
    .describe('VeChain wallet address'),
})

/**
 * Challenge Response Schema
 */
export const ChallengeResponseSchema = z.object({
  nonce: z.string().describe('Nonce to be signed by the wallet'),
  message: z.string().describe('Full message to be signed'),
  expiresAt: z.string().describe('ISO timestamp when nonce expires'),
})

/**
 * Verify Request Schema
 * Verify wallet signature and issue JWT
 */
export const VerifyRequestSchema = z.object({
  walletAddress: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid VeChain wallet address format')
    .describe('VeChain wallet address'),
  signature: z
    .string()
    .min(1)
    .describe('Signature from wallet signing the challenge message'),
  nonce: z.string().describe('Nonce that was signed'),
})

/**
 * Verify Response Schema
 */
export const VerifyResponseSchema = z.object({
  success: z.boolean(),
  token: z.string().optional().describe('JWT token (httpOnly cookie also set)'),
  user: z
    .object({
      id: z.string().uuid(),
      walletAddress: z.string(),
      createdAt: z.string(),
      lastLogin: z.string().optional(),
    })
    .optional(),
  error: z.string().optional(),
})

/**
 * User Profile Response Schema
 */
export const UserProfileSchema = z.object({
  id: z.string().uuid(),
  walletAddress: z.string(),
  email: z.string().optional(),
  name: z.string().optional(),
  createdAt: z.string(),
  lastLogin: z.string().optional(),
})

export type ChallengeRequest = z.infer<typeof ChallengeRequestSchema>
export type ChallengeResponse = z.infer<typeof ChallengeResponseSchema>
export type VerifyRequest = z.infer<typeof VerifyRequestSchema>
export type VerifyResponse = z.infer<typeof VerifyResponseSchema>
export type UserProfile = z.infer<typeof UserProfileSchema>
