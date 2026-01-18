/**
 * Example: Route-based payment middleware configuration
 * Demonstrates the new simplified API for payment middleware
 */

import { Hono } from 'hono';
import { paymentMiddleware } from '../src/index.js';

// Configuration
const FACILITATOR_URL = process.env.FACILITATOR_URL || 'http://localhost:3000';
const MERCHANT_ADDRESS = process.env.MERCHANT_ADDRESS || '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb';

/**
 * Example 1: Basic route-based configuration
 * The simplest way to protect routes with payment requirements
 */
function example1BasicRouteConfig() {
  const app = new Hono();
  
  // Public endpoint - no payment required
  app.get('/public', (c) => {
    return c.json({ message: 'This is free content' });
  });
  
  // Apply payment middleware with route-based configuration
  app.use(paymentMiddleware({
    "GET /api/premium": {
      price: "0.01",        // 0.01 VET (will be converted to wei)
      token: "VET",
      network: "vechain:100009",  // VeChain testnet
      payTo: MERCHANT_ADDRESS,
      facilitatorUrl: FACILITATOR_URL,
    },
    "POST /api/data": {
      price: "0.05",        // 0.05 VEUSD
      token: "VEUSD",
      network: "vechain:100009",
      payTo: MERCHANT_ADDRESS,
      facilitatorUrl: FACILITATOR_URL,
    },
  }));
  
  // Protected routes - automatically require payment
  app.get('/api/premium', (c) => {
    return c.json({ data: 'Premium content' });
  });
  
  app.post('/api/data', (c) => {
    return c.json({ success: true, data: 'Data submitted' });
  });
  
  return app;
}

/**
 * Example 2: Multiple payment options for the same route
 * Use wildcard patterns to cover multiple routes
 */
function example2WildcardRoutes() {
  const app = new Hono();
  
  app.use(paymentMiddleware({
    // Protect all /premium/* routes
    "GET /premium/*": {
      price: "1",           // 1 VET
      token: "VET",
      network: "vechain:100009",
      payTo: MERCHANT_ADDRESS,
      facilitatorUrl: FACILITATOR_URL,
    },
    // Different price for API endpoints
    "POST /api/*": {
      price: "0.5",         // 0.5 VET
      token: "VET",
      network: "vechain:100009",
      payTo: MERCHANT_ADDRESS,
      facilitatorUrl: FACILITATOR_URL,
    },
  }));
  
  app.get('/premium/article/:id', (c) => {
    const id = c.req.param('id');
    return c.json({ id, content: 'Premium article content' });
  });
  
  app.get('/premium/video/:id', (c) => {
    const id = c.req.param('id');
    return c.json({ id, content: 'Premium video stream' });
  });
  
  app.post('/api/submit', (c) => {
    return c.json({ success: true });
  });
  
  return app;
}

/**
 * Example 3: Different tokens for different routes
 */
function example3MultiTokenRoutes() {
  const app = new Hono();
  
  app.use(paymentMiddleware({
    "GET /content/article": {
      price: "0.1",         // 0.1 VET
      token: "VET",
      network: "vechain:100009",
      payTo: MERCHANT_ADDRESS,
      facilitatorUrl: FACILITATOR_URL,
    },
    "GET /content/video": {
      price: "5",           // 5 VTHO (cheaper in VTHO)
      token: "VTHO",
      network: "vechain:100009",
      payTo: MERCHANT_ADDRESS,
      facilitatorUrl: FACILITATOR_URL,
    },
    "GET /content/premium": {
      price: "1",           // 1 VEUSD (stablecoin)
      token: "VEUSD",
      network: "vechain:100009",
      payTo: MERCHANT_ADDRESS,
      facilitatorUrl: FACILITATOR_URL,
    },
  }));
  
  app.get('/content/article', (c) => {
    return c.json({ type: 'article', content: '...' });
  });
  
  app.get('/content/video', (c) => {
    return c.json({ type: 'video', url: '...' });
  });
  
  app.get('/content/premium', (c) => {
    return c.json({ type: 'premium', content: '...' });
  });
  
  return app;
}

/**
 * Example 4: Enhanced configuration with callbacks
 */
function example4EnhancedConfig() {
  const app = new Hono();
  
  app.use(paymentMiddleware({
    routes: {
      "GET /api/premium": {
        price: "0.01",
        token: "VET",
        network: "vechain:100009",
        payTo: MERCHANT_ADDRESS,
        merchantId: "my-service",
        merchantUrl: "https://example.com",
      },
    },
    facilitatorUrl: FACILITATOR_URL,
    onPaymentVerified: async (c, verification) => {
      console.log(`✅ Payment verified from: ${verification.senderAddress}`);
      // Record payment in database, update credits, etc.
    },
  }));
  
  app.get('/api/premium', (c) => {
    const verification = c.get('paymentVerification');
    return c.json({
      content: 'Premium content',
      paidBy: verification.senderAddress,
    });
  });
  
  return app;
}

/**
 * Example 5: Method-specific pricing
 */
function example5MethodSpecificPricing() {
  const app = new Hono();
  
  app.use(paymentMiddleware({
    // GET is cheaper
    "GET /api/data": {
      price: "0.01",
      token: "VET",
      network: "vechain:100009",
      payTo: MERCHANT_ADDRESS,
      facilitatorUrl: FACILITATOR_URL,
    },
    // POST is more expensive
    "POST /api/data": {
      price: "0.1",
      token: "VET",
      network: "vechain:100009",
      payTo: MERCHANT_ADDRESS,
      facilitatorUrl: FACILITATOR_URL,
    },
  }));
  
  app.get('/api/data', (c) => {
    return c.json({ data: 'Read operation' });
  });
  
  app.post('/api/data', (c) => {
    return c.json({ success: true, message: 'Write operation' });
  });
  
  return app;
}

/**
 * Example 6: Combining route-based and traditional middleware
 */
function example6MixedApproach() {
  const app = new Hono();
  
  // Use route-based config for simple routes
  app.use(paymentMiddleware({
    "GET /simple": {
      price: "0.01",
      token: "VET",
      network: "vechain:100009",
      payTo: MERCHANT_ADDRESS,
      facilitatorUrl: FACILITATOR_URL,
    },
  }));
  
  // Use traditional config for dynamic pricing
  app.use('/dynamic/*', paymentMiddleware({
    facilitatorUrl: FACILITATOR_URL,
    getPaymentRequirements: (c) => {
      const tier = c.req.query('tier') || 'basic';
      const prices: Record<string, string> = {
        basic: '100000000000000000',    // 0.1 VET
        premium: '500000000000000000',  // 0.5 VET
        enterprise: '1000000000000000000', // 1 VET
      };
      
      return {
        paymentOptions: [{
          network: 'eip155:100009',
          asset: 'VET',
          amount: prices[tier] || prices.basic,
          recipient: MERCHANT_ADDRESS,
        }],
        merchantId: 'dynamic-service',
      };
    },
  }));
  
  app.get('/simple', (c) => {
    return c.json({ content: 'Simple content' });
  });
  
  app.get('/dynamic/content', (c) => {
    return c.json({ content: 'Dynamic priced content' });
  });
  
  return app;
}

// Export examples
export {
  example1BasicRouteConfig,
  example2WildcardRoutes,
  example3MultiTokenRoutes,
  example4EnhancedConfig,
  example5MethodSpecificPricing,
  example6MixedApproach,
};

// Example usage
// const app = example1BasicRouteConfig();
// export default app;
