/**
 * Content Paywall Server
 * 
 * A full-featured backend for payment-gated content delivery
 */

import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { paymentMiddleware } from '@x402/vechain';

// Configuration
const FACILITATOR_URL = process.env.FACILITATOR_URL || 'http://localhost:3000';
const MERCHANT_ADDRESS = process.env.MERCHANT_ADDRESS || '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb';
const PORT = parseInt(process.env.PORT || '3002', 10);

const app = new Hono();

// Enable CORS for client access
app.use('*', cors());

// Content database (in-memory for demo)
const articles = [
  {
    id: '1',
    title: 'The Future of Blockchain Payments',
    author: 'Alice Chen',
    preview: 'Discover how x402 protocol is revolutionizing payment-gated APIs...',
    content: `
# The Future of Blockchain Payments

The x402 protocol represents a paradigm shift in how we think about API monetization and microtransactions. Unlike traditional payment systems that require complex integrations, account setups, and ongoing maintenance, x402 enables seamless pay-per-use access to digital resources.

## Key Innovations

1. **Protocol-Level Integration**: x402 operates at the HTTP protocol level, making it universal and framework-agnostic.

2. **Instant Settlement**: Payments are verified and settled on-chain within seconds, eliminating the need for monthly invoicing or credit systems.

3. **Micro-Transactions**: With VeChain's low fees, transactions as small as a fraction of a cent become economically viable.

4. **No Accounts Required**: Users pay with their blockchain wallet—no signup, no forms, no friction.

## Real-World Applications

- **API Monetization**: Charge per API call instead of subscription tiers
- **Content Paywalls**: Grant access to premium articles, videos, or data
- **AI Services**: Pay per query for LLM or ML model access
- **Data Feeds**: Real-time market data, weather, or IoT sensor feeds

## Why VeChain?

VeChain's enterprise-grade blockchain offers several advantages:
- Predictable transaction costs
- High throughput (10,000+ TPS)
- Fee delegation support
- Enterprise adoption

## Getting Started

Implementing x402 on VeChain takes just a few lines of code. Check out our examples at github.com/ashutoshpw/x402-vechain.

---

*This is premium content. Thank you for your payment!*
    `.trim(),
    price: '0.01',
    token: 'VET',
  },
  {
    id: '2',
    title: 'Building Decentralized Applications',
    author: 'Bob Martinez',
    preview: 'A comprehensive guide to building dApps on VeChain with modern tools...',
    content: `
# Building Decentralized Applications on VeChain

VeChain provides a robust platform for building enterprise-grade decentralized applications. This guide covers everything from setup to deployment.

## Development Stack

- **Smart Contracts**: Solidity with VeChain extensions
- **Frontend**: React/Vue with Connex integration  
- **Backend**: Node.js with VeChain SDK
- **Testing**: Hardhat/Truffle with VeChain plugins

## Architecture Patterns

### 1. Wallet Integration
Always provide multiple wallet options for better UX:
- VeWorld (mobile & browser)
- VeChain Sync (desktop)
- VeChain Sync2 (modern desktop)

### 2. Transaction Management
Handle transactions carefully:
- Use fee delegation when appropriate
- Implement proper error handling
- Provide transaction status updates

### 3. State Management
Keep blockchain state in sync:
- Poll for updates efficiently
- Use WebSocket connections where available
- Cache data to reduce RPC calls

## Best Practices

1. **Gas Optimization**: Minimize on-chain storage
2. **Security**: Audit contracts thoroughly
3. **UX**: Provide clear transaction feedback
4. **Testing**: Test on testnet extensively

## Deployment Checklist

- [ ] Smart contracts audited
- [ ] Frontend responsive design
- [ ] Wallet integration tested
- [ ] Error handling comprehensive
- [ ] Performance optimized
- [ ] Documentation complete

---

*Premium content unlocked with x402 payment*
    `.trim(),
    price: '0.02',
    token: 'VET',
  },
  {
    id: '3',
    title: 'Advanced Smart Contract Patterns',
    author: 'Carol Zhang',
    preview: 'Learn advanced patterns for writing secure and efficient smart contracts...',
    content: `
# Advanced Smart Contract Patterns

This article explores sophisticated patterns for building production-ready smart contracts on VeChain.

## Design Patterns

### 1. Proxy Pattern (Upgradeable Contracts)
Allow contract logic updates while preserving state and address.

### 2. Factory Pattern
Deploy multiple contract instances efficiently.

### 3. Registry Pattern  
Manage contract discovery and versioning.

### 4. Access Control
Implement role-based permissions securely.

## VeChain-Specific Features

### Fee Delegation
Sponsor user transactions for better UX:
- Reduces friction for new users
- Enables freemium models
- Improves adoption

### Multi-Party Payment (MPP)
Split payments across multiple parties:
- Revenue sharing
- Affiliate systems
- Partner integrations

### Meta-Transaction Relayer
Allow users to interact without holding VTHO:
- Lower barrier to entry
- Better user experience
- Wider adoption potential

## Security Considerations

1. **Reentrancy Guards**: Prevent recursive calls
2. **Integer Overflow**: Use SafeMath libraries
3. **Access Control**: Restrict sensitive functions
4. **Front-Running**: Design with MEV resistance
5. **Upgrade Safety**: Test upgrades thoroughly

## Gas Optimization Techniques

- Pack storage variables efficiently
- Use events instead of storage when possible
- Batch operations to save gas
- Optimize loop iterations
- Use view functions for reads

## Testing Strategy

1. Unit tests for each function
2. Integration tests for workflows
3. Fuzz testing for edge cases
4. Gas profiling for optimization
5. Security audits before mainnet

---

*You've unlocked expert-level content!*
    `.trim(),
    price: '0.05',
    token: 'VEUSD',
  },
];

// Root endpoint
app.get('/', (c) => {
  return c.json({
    message: 'Content Paywall API',
    endpoints: {
      '/articles': 'List all articles (previews)',
      '/articles/:id': 'Get full article (requires payment)',
    },
  });
});

// List articles (free - shows previews only)
app.get('/articles', (c) => {
  const previews = articles.map(article => ({
    id: article.id,
    title: article.title,
    author: article.author,
    preview: article.preview,
    price: article.price,
    token: article.token,
  }));
  
  return c.json({ articles: previews });
});

// Apply payment middleware for individual articles
app.use('/articles/:id', async (c, next) => {
  const id = c.req.param('id');
  const article = articles.find(a => a.id === id);
  
  if (!article) {
    return c.json({ error: 'Article not found' }, 404);
  }
  
  // Store article in context for use in middleware
  c.set('article', article);
  
  // Apply payment middleware dynamically
  return paymentMiddleware({
    facilitatorUrl: FACILITATOR_URL,
    getPaymentRequirements: (c) => {
      const article = c.get('article');
      return {
        paymentOptions: [{
          network: 'eip155:100009', // VeChain testnet
          asset: article.token,
          // NOTE: Assuming 18 decimals for all tokens (VET, VTHO, VEUSD, B3TR all use 18 decimals)
          amount: (parseFloat(article.price) * 1e18).toString(),
          recipient: MERCHANT_ADDRESS,
        }],
        merchantId: 'content-paywall-demo',
        merchantUrl: 'http://localhost:5173',
      };
    },
    onPaymentVerified: async (c, verification) => {
      const article = c.get('article');
      console.log(`✅ Payment received for article "${article.title}"`);
      console.log(`   From: ${verification.senderAddress}`);
      console.log(`   Amount: ${article.price} ${article.token}`);
    },
  })(c, next);
});

// Get full article (payment required)
app.get('/articles/:id', (c) => {
  const article = c.get('article') as any;
  const verification = c.get('paymentVerification') as any;
  
  return c.json({
    id: article.id,
    title: article.title,
    author: article.author,
    content: article.content,
    paidBy: verification?.senderAddress,
    paidAt: new Date().toISOString(),
  });
});

// Start server
serve({
  fetch: app.fetch,
  port: PORT,
}, (info) => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║         Content Paywall Server Running                    ║
╚═══════════════════════════════════════════════════════════╝

Server: http://localhost:${info.port}
Client: http://localhost:5173

Endpoints:
  • GET /                    - API information
  • GET /articles            - List articles (free)
  • GET /articles/:id        - Get full article (paid)

Configuration:
  • Facilitator: ${FACILITATOR_URL}
  • Merchant: ${MERCHANT_ADDRESS}
  • Articles: ${articles.length}
  `);
});

export default app;
