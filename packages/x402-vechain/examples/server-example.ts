/**
 * Example: Server-side usage of x402-vechain SDK
 * Demonstrates Hono middleware integration
 */

import { Hono } from 'hono';
import { paymentMiddleware, verifyPayment, settlePayment } from '../src/index.js';
import type { PaymentRequirements } from '../src/index.js';

// Configuration
const FACILITATOR_URL = process.env.FACILITATOR_URL || 'https://facilitator.example.com';
const MERCHANT_ADDRESS = process.env.MERCHANT_ADDRESS || '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb';

/**
 * Example 1: Basic payment middleware
 */
function example1BasicMiddleware() {
  const app = new Hono();
  
  // Public endpoint - no payment required
  app.get('/public', (c) => {
    return c.json({ message: 'This is free content' });
  });
  
  // Protected endpoint - requires payment
  app.use('/premium/*', paymentMiddleware({
    facilitatorUrl: FACILITATOR_URL,
    getPaymentRequirements: () => ({
      paymentOptions: [{
        network: 'eip155:100009', // VeChain testnet
        asset: 'VET',
        amount: '1000000000000000000', // 1 VET
        recipient: MERCHANT_ADDRESS,
      }],
      merchantId: 'example-service',
      merchantUrl: 'https://example.com',
    }),
  }));
  
  app.get('/premium/content', (c) => {
    return c.json({ data: 'Premium content' });
  });
  
  return app;
}

/**
 * Example 2: Dynamic pricing based on content
 */
function example2DynamicPricing() {
  const app = new Hono();
  
  // Content prices (in wei)
  const prices = {
    article: '100000000000000000', // 0.1 VET
    video: '500000000000000000',   // 0.5 VET
    premium: '1000000000000000000', // 1 VET
  };
  
  app.use('/content/*', paymentMiddleware({
    facilitatorUrl: FACILITATOR_URL,
    getPaymentRequirements: (c) => {
      const contentType = c.req.query('type') || 'article';
      const price = prices[contentType as keyof typeof prices] || prices.article;
      
      return {
        paymentOptions: [{
          network: 'eip155:100009',
          asset: 'VET',
          amount: price,
          recipient: MERCHANT_ADDRESS,
        }],
        merchantId: 'content-service',
      };
    },
    onPaymentVerified: async (c, verification) => {
      console.log(`Payment received from: ${verification.senderAddress}`);
      // Update user credits, log payment, etc.
    },
  }));
  
  app.get('/content/:id', (c) => {
    const contentId = c.req.param('id');
    return c.json({ id: contentId, content: 'Premium content...' });
  });
  
  return app;
}

/**
 * Example 3: Custom payment verification
 */
function example3CustomVerification() {
  const app = new Hono();
  
  app.use('/api/*', paymentMiddleware({
    getPaymentRequirements: () => ({
      paymentOptions: [{
        network: 'eip155:100009',
        asset: 'VET',
        amount: '1000000000000000000',
        recipient: MERCHANT_ADDRESS,
      }],
      merchantId: 'custom-service',
    }),
    // Custom verification logic (without facilitator)
    verifyPayment: async (payload, requirements) => {
      // Implement custom validation
      const option = requirements.paymentOptions[0];
      
      // Basic checks
      if (payload.payload.amount !== option.amount) {
        return { isValid: false, error: 'Amount mismatch' };
      }
      
      if (payload.payload.payTo.toLowerCase() !== option.recipient.toLowerCase()) {
        return { isValid: false, error: 'Recipient mismatch' };
      }
      
      // Add custom business logic here
      // e.g., check against database, validate user, etc.
      
      return { isValid: true };
    },
  }));
  
  app.get('/api/data', (c) => {
    return c.json({ data: 'Protected data' });
  });
  
  return app;
}

/**
 * Example 4: Manual payment verification
 */
async function example4ManualVerification() {
  // Simulated payment payload (base64 encoded)
  const paymentPayload = 'eyJzaWduYXR1cmUiOiIuLi4iLCJwYXlsb2FkIjp7Li4ufX0=';
  
  const requirements: PaymentRequirements = {
    paymentOptions: [{
      network: 'eip155:100009',
      asset: 'VET',
      amount: '1000000000000000000',
      recipient: MERCHANT_ADDRESS,
    }],
    merchantId: 'manual-verification',
  };
  
  try {
    // Verify payment
    const verifyResult = await verifyPayment(
      FACILITATOR_URL,
      paymentPayload,
      requirements
    );
    
    if (verifyResult.isValid) {
      console.log('Payment is valid');
      
      // Settle payment
      const settleResult = await settlePayment(
        FACILITATOR_URL,
        paymentPayload,
        requirements
      );
      
      if (settleResult.success) {
        console.log('Payment settled. Transaction:', settleResult.transactionHash);
      } else {
        console.error('Settlement failed:', settleResult.error);
      }
    } else {
      console.error('Payment verification failed:', verifyResult.invalidReason);
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

/**
 * Example 5: Multi-token support
 */
function example5MultiToken() {
  const app = new Hono();
  
  app.use('/premium/*', paymentMiddleware({
    facilitatorUrl: FACILITATOR_URL,
    getPaymentRequirements: () => ({
      paymentOptions: [
        {
          network: 'eip155:100009',
          asset: 'VET',
          amount: '1000000000000000000', // 1 VET
          recipient: MERCHANT_ADDRESS,
        },
        {
          network: 'eip155:100009',
          asset: 'VTHO',
          amount: '5000000000000000000', // 5 VTHO
          recipient: MERCHANT_ADDRESS,
        },
      ],
      merchantId: 'multi-token-service',
    }),
  }));
  
  app.get('/premium/data', (c) => {
    return c.json({ data: 'Premium data' });
  });
  
  return app;
}

// Export examples
export {
  example1BasicMiddleware,
  example2DynamicPricing,
  example3CustomVerification,
  example4ManualVerification,
  example5MultiToken,
};

// Example usage
// const app = example1BasicMiddleware();
// export default app;
