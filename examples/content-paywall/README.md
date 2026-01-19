# Content Paywall Example

A full-stack payment-gated content platform demonstrating x402 protocol on VeChain. Users can browse article previews for free and pay to unlock full content.

## What This Example Shows

- ✅ Full-stack application (client + server)
- ✅ Browse free previews
- ✅ Pay-per-article access
- ✅ Dynamic payment requirements
- ✅ Multiple payment tokens (VET, VEUSD)
- ✅ Professional UI/UX
- ✅ Wallet integration
- ✅ Payment verification
- ✅ Content delivery after payment

## Architecture

```
┌─────────────────────┐
│   Client (Vite)     │
│   React-like UI     │
│   Port: 5173        │
└──────────┬──────────┘
           │
           │ HTTP + x402
           │
┌──────────▼──────────┐
│   Server (Hono)     │
│   Content API       │
│   Port: 3002        │
└──────────┬──────────┘
           │
           │ Verification
           │
┌──────────▼──────────┐
│   Facilitator       │
│   x402 Protocol     │
│   Port: 3000        │
└─────────────────────┘
```

## Quick Start

### Prerequisites

1. **VeChain Wallet** (VeWorld or VeChain Sync)
2. **Testnet VET/VEUSD** from [faucet](https://faucet.vecha.in/)
3. **Running Facilitator** (from apps/api)

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env`:
```bash
FACILITATOR_URL=http://localhost:3000
MERCHANT_ADDRESS=0xYourWalletAddress
PORT=3002
```

### 3. Start Development

Start both client and server:
```bash
pnpm dev
```

Or start them separately:
```bash
# Terminal 1: Server
pnpm dev:server

# Terminal 2: Client
pnpm dev:client
```

### 4. Access the Application

Open your browser to http://localhost:5173

## Features

### Content Library
- Browse article previews (free)
- See prices before purchasing
- Multiple articles with different pricing

### Payment System
- Automatic payment handling
- Multiple payment tokens
- Wallet integration
- Payment confirmation
- Receipt tracking

### User Experience
- Clean, modern interface
- One-click article access
- Wallet connection status
- Loading states
- Error handling
- Modal content viewer

## How It Works

### 1. Browse Articles (Free)

```typescript
// GET /articles - Returns previews
const response = await fetch(`${API_URL}/articles`);
const { articles } = await response.json();
```

Returns:
```json
{
  "articles": [
    {
      "id": "1",
      "title": "Article Title",
      "author": "Author Name",
      "preview": "First 100 characters...",
      "price": "0.01",
      "token": "VET"
    }
  ]
}
```

### 2. Purchase Article (Paid)

```typescript
// GET /articles/:id - Requires payment
const response = await x402Fetch(`${API_URL}/articles/${id}`, {
  facilitatorUrl: FACILITATOR_URL,
  wallet,
  maxAmount: '100000000000000000000', // Safety limit
});

const article = await response.json();
```

**Payment Flow:**
1. Client requests article
2. Server returns 402 Payment Required
3. Client creates payment with wallet
4. User approves in wallet
5. Client submits payment proof
6. Server verifies with facilitator
7. Server returns full article content

### 3. Server-Side Protection

```typescript
app.use('/articles/:id', paymentMiddleware({
  getPaymentRequirements: (c) => {
    const article = c.get('article');
    return {
      paymentOptions: [{
        network: 'eip155:100009',
        asset: article.token,
        amount: (parseFloat(article.price) * 1e18).toString(),
        recipient: MERCHANT_ADDRESS,
      }],
      merchantId: 'content-paywall-demo',
    };
  },
  onPaymentVerified: async (c, verification) => {
    console.log(`Payment received: ${verification.senderAddress}`);
  },
}));
```

## Sample Content

The example includes 3 premium articles:

1. **"The Future of Blockchain Payments"** - 0.01 VET
   - Introduction to x402 protocol
   - Use cases and benefits

2. **"Building Decentralized Applications"** - 0.02 VET
   - VeChain dApp development
   - Best practices and patterns

3. **"Advanced Smart Contract Patterns"** - 0.05 VEUSD
   - Proxy patterns
   - Security considerations
   - Gas optimization

## Customization

### Adding Articles

Edit `server/index.ts`:

```typescript
const articles = [
  {
    id: '4',
    title: 'Your Article Title',
    author: 'Your Name',
    preview: 'A compelling preview...',
    content: `Full article content in markdown...`,
    price: '0.01',
    token: 'VET',
  },
  // ... more articles
];
```

### Changing Prices

Update the `price` field:
```typescript
price: '0.01',  // In token units (not wei)
token: 'VET',   // or 'VEUSD', 'VTHO', etc.
```

### Styling

Modify the CSS in `index.html` to match your brand.

### Adding Features

Examples of extensions:
- User accounts and payment history
- Article ratings and comments
- Author profiles
- Categories and search
- Subscription bundles
- Referral system

## Production Deployment

### Build for Production

```bash
pnpm build
```

### Deploy Server

```bash
# Production server
NODE_ENV=production node dist/server/index.js
```

### Deploy Client

The built client is in `dist/client/` and can be deployed to:
- Vercel
- Netlify
- AWS S3 + CloudFront
- Any static hosting service

### Environment Variables

Set in your production environment:
```bash
FACILITATOR_URL=https://your-facilitator.com
MERCHANT_ADDRESS=0xYourMainnetAddress
PORT=3002
NODE_ENV=production
```

## Security Considerations

1. **Server-Side Verification**
   - Always verify payments on the server
   - Never trust client-side payment data
   - Use the facilitator for verification

2. **Content Protection**
   - Don't expose full content in previews
   - Require valid payment proof
   - Log all access attempts

3. **Wallet Security**
   - Users control their keys
   - No private keys on server
   - Payment amounts clearly displayed

4. **Rate Limiting**
   - Limit requests per IP
   - Prevent payment replay
   - Track nonce usage

## Troubleshooting

### "Wallet not detected"
- Install VeWorld or VeChain Sync
- Refresh the page
- Check browser console

### "Failed to load articles"
- Ensure server is running (port 3002)
- Check API_URL in client code
- Verify CORS is enabled

### "Payment failed"
- Check wallet has sufficient balance
- Verify facilitator is running
- Check network (testnet vs mainnet)
- See browser console for errors

### "Article doesn't unlock"
- Verify payment was successful
- Check server logs for errors
- Ensure facilitator verification passed

## Development Tips

### Hot Reload

Both client and server have hot reload enabled in development mode:
- Client: Vite HMR
- Server: tsx watch mode

### Debugging

Enable detailed logging:
```typescript
// In client
console.log('Payment requirements:', requirements);

// In server
console.log('Payment verified:', verification);
```

### Testing

Test the payment flow:
1. Connect wallet with testnet funds
2. Click an article
3. Approve payment in wallet
4. Verify article unlocks
5. Check server logs for payment confirmation

## Performance Optimization

1. **Caching**
   - Cache article previews
   - Cache facilitator responses
   - Use CDN for static content

2. **Lazy Loading**
   - Load articles on demand
   - Paginate large lists
   - Defer non-critical resources

3. **Bundle Size**
   - Code splitting
   - Tree shaking
   - Minimize dependencies

## Monetization Strategies

### Pay-Per-Article
Current implementation - simple and effective.

### Subscription Bundles
Offer unlimited access for a monthly fee:
```typescript
{
  price: "10",
  token: "VET",
  validity: "30 days"
}
```

### Author Revenue Sharing
Split payments between platform and authors:
```typescript
paymentOptions: [
  { recipient: platformAddress, amount: "70%" },
  { recipient: authorAddress, amount: "30%" }
]
```

### Tiered Pricing
Different prices for different user levels:
- Guest: 0.05 VET
- Member: 0.03 VET
- Premium: Free

## Analytics

Track key metrics:
- Articles viewed
- Conversion rate (preview → purchase)
- Revenue by article
- Revenue by token
- Popular content
- User behavior

Add to `onPaymentVerified`:
```typescript
onPaymentVerified: async (c, verification) => {
  await analytics.trackPurchase({
    articleId: article.id,
    payer: verification.senderAddress,
    amount: article.price,
    token: article.token,
    timestamp: new Date(),
  });
}
```

## Next Steps

- **Scale Up**: Add more articles and categories
- **User Accounts**: Implement authentication
- **Payment History**: Track user purchases
- **Recommendations**: Suggest related content
- **Mobile App**: Build native mobile apps
- **API Integration**: Expose content via API

## Related Examples

- [Minimal Server](../minimal-server) - Simple server setup
- [Minimal Client](../minimal-client) - Basic client integration
- [AI Agent](../ai-agent) - Automated payment bot

## Related Documentation

- [x402 Protocol](https://github.com/coinbase/x402)
- [@x402/vechain SDK](../../packages/x402-vechain/README.md)
- [VeChain Documentation](https://docs.vechain.org/)
- [Hono Documentation](https://hono.dev/)
