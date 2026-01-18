# Minimal x402 Server Example

A minimal example demonstrating how to create a payment-protected API endpoint using x402 on VeChain.

## What This Example Shows

- ✅ Simple Hono server setup
- ✅ Route-based payment configuration (the easiest approach)
- ✅ Multiple payment options (VET and VEUSD)
- ✅ Free and paid endpoints in the same server
- ✅ Automatic payment verification

## Quick Start

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Configure Environment

Copy the example environment file and update it:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```bash
FACILITATOR_URL=http://localhost:3000  # Your x402 facilitator URL
MERCHANT_ADDRESS=0xYourWalletAddress   # Where you'll receive payments
PORT=3001
```

### 3. Start the Server

```bash
pnpm dev
```

The server will start on http://localhost:3001

## Endpoints

### Free Endpoints

- **GET /** - Server information and endpoint list
- **GET /public/hello** - Free greeting endpoint

### Payment-Protected Endpoints

- **GET /premium/data** - Requires payment of 0.01 VET
- **GET /premium/content** - Requires payment of 0.05 VEUSD

## Testing

### Test Free Endpoint

```bash
curl http://localhost:3001/public/hello
```

Response:
```json
{
  "message": "Hello! This is free content."
}
```

### Test Payment-Protected Endpoint

```bash
curl http://localhost:3001/premium/data
```

Response (402 Payment Required):
```json
{
  "error": "Payment required",
  "requirements": {
    "paymentOptions": [{
      "network": "eip155:100009",
      "asset": "VET",
      "amount": "10000000000000000",
      "recipient": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
    }],
    "merchantId": "..."
  }
}
```

The response includes an `X-Payment-Required` header with the payment requirements.

### Make a Payment Request

To access the protected endpoint, you need to include an `X-Payment-Proof` header with a valid payment payload. See the [minimal-client example](../minimal-client) for a complete client implementation.

## How It Works

1. **Route Configuration**: Payment requirements are defined directly in the middleware configuration:

```typescript
app.use(paymentMiddleware({
  "GET /premium/data": {
    price: "0.01",           // Simple decimal price
    token: "VET",            // Token symbol
    network: "vechain:100009",
    payTo: MERCHANT_ADDRESS,
    facilitatorUrl: FACILITATOR_URL,
  },
}));
```

2. **Automatic Verification**: The middleware automatically:
   - Checks for the `X-Payment-Proof` header
   - Returns 402 if missing
   - Verifies the payment with the facilitator
   - Returns 403 if invalid
   - Continues to route handler if valid

3. **Access Payment Info**: In your route handler, you can access payment verification details:

```typescript
app.get('/premium/data', (c) => {
  const verification = c.get('paymentVerification');
  console.log('Paid by:', verification.senderAddress);
  // ... return content
});
```

## Key Features

### Simple Price Definition

Instead of calculating wei amounts manually, just specify the price in token units:

```typescript
price: "0.01"  // Automatically converted to wei
```

### Multiple Tokens

Support different payment tokens for different endpoints:

```typescript
{
  "GET /cheap": { price: "0.01", token: "VET" },
  "GET /expensive": { price: "10", token: "VEUSD" }
}
```

### Wildcard Routes

Protect entire route sections:

```typescript
{
  "GET /premium/*": { price: "0.1", token: "VET", ... }
}
```

## Production Considerations

1. **Facilitator URL**: Update `FACILITATOR_URL` to point to your production facilitator
2. **Merchant Address**: Use your actual VeChain wallet address
3. **HTTPS**: Always use HTTPS in production
4. **Error Handling**: Add proper error handling for production use
5. **Logging**: Implement payment logging for audit trails
6. **Database**: Store payment records in a database

## Next Steps

- **Client Integration**: Check out [minimal-client example](../minimal-client) to build a client that can make payments
- **Advanced Server**: See [content-paywall example](../content-paywall) for a more complete implementation
- **AI Agent**: Explore [ai-agent example](../ai-agent) for automated payment handling

## Related Documentation

- [x402 Protocol Specification](https://github.com/coinbase/x402)
- [@x402/vechain SDK Documentation](../../packages/x402-vechain/README.md)
- [Main API Documentation](../../apps/api/README.md)
