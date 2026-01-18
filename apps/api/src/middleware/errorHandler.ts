/**
 * Error handling middleware for x402 API
 */

import { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';

export const errorHandler = (err: Error, c: Context) => {
  // Handle Hono HTTPException
  if (err instanceof HTTPException) {
    return c.json(
      {
        error: err.message,
        status: err.status,
      },
      err.status
    );
  }

  // Handle Zod validation errors
  if (err.name === 'ZodError') {
    return c.json(
      {
        error: 'Validation error',
        details: err.message,
      },
      400
    );
  }

  // Handle generic errors
  console.error('Unhandled error:', err);
  return c.json(
    {
      error: 'Internal server error',
      message: err.message || 'An unexpected error occurred',
    },
    500
  );
};
