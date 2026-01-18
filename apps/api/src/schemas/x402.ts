/**
 * Zod validation schemas for x402 protocol requests
 */

import { z } from 'zod';

// Payment Option schema
export const PaymentOptionSchema = z.object({
  network: z.string().min(1, 'Network is required'),
  asset: z.string().min(1, 'Asset is required'),
  amount: z.string().min(1, 'Amount is required'),
  recipient: z.string().min(1, 'Recipient is required'),
});

// Payment Requirements schema
export const PaymentRequirementsSchema = z.object({
  paymentOptions: z.array(PaymentOptionSchema).min(1, 'At least one payment option is required'),
  merchantId: z.string().min(1, 'Merchant ID is required'),
  merchantUrl: z.string().url().optional(),
  expiresAt: z.string().refine((val) => {
    if (!val) return true;
    const date = new Date(val);
    return !isNaN(date.getTime());
  }, {
    message: 'Invalid datetime format',
  }).optional(),
});

// Verify request schema
export const VerifyRequestSchema = z.object({
  paymentPayload: z.string().min(1, 'Payment payload is required'),
  paymentRequirements: PaymentRequirementsSchema,
});

// Settle request schema
export const SettleRequestSchema = z.object({
  paymentPayload: z.string().min(1, 'Payment payload is required'),
  paymentRequirements: PaymentRequirementsSchema,
});
