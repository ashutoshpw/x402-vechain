This service provides the minimal x402 protocol scaffolding for VeChain. It exposes placeholder API routes for verification, settlement, and supported assets/networks.

## x402 API Endpoints

- `GET /supported` returns supported VeChain networks and tokens with CAIP-2 IDs.
- `POST /verify` placeholder for payment verification.
- `POST /settle` placeholder for payment settlement.

### Supported Networks & Tokens

- VeChain Mainnet (`vechain:100010`)
  - VET
  - VTHO
  - VEUSD
  - B3TR

## Development

Prerequisites:

A Hono-based API implementing the x402 protocol specification for VeChain payment facilitation.

## Features

- **x402 Protocol Compliance**: Implements core facilitator endpoints
- **Request Validation**: Zod-based schema validation
- **Rate Limiting**: IP-based rate limiting (100 requests per 15 minutes)
- **CORS Support**: Configurable CORS for cross-origin requests
- **Error Handling**: Comprehensive error handling middleware
- **Type Safety**: Full TypeScript support

## Endpoints

### `GET /`
Returns API information and available endpoints.

**Response:**
```json
{
  "message": "x402 VeChain Facilitator API",
  "version": "1.0.0",
  "endpoints": [
    "POST /verify",
    "POST /settle",
    "GET /supported"
  ]
}
```

### `POST /verify`
Validates payment payloads without settling.

**Request:**
```json
{
  "paymentPayload": "base64-encoded-string",
  "paymentRequirements": {
    "paymentOptions": [{
      "network": "eip155:100009",
      "asset": "VET",
      "amount": "100",
      "recipient": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
    }],
    "merchantId": "merchant123",
    "merchantUrl": "https://example.com",
    "expiresAt": "2024-12-31T23:59:59Z"
  }
}
```

**Response (Success):**
```json
{
  "isValid": true
}
```

**Response (Failure):**
```json
{
  "isValid": false,
  "invalidReason": "No supported network found in payment options"
}
```

### `POST /settle`
Submits payment to VeChain and waits for confirmation.

**Request:**
```json
{
  "paymentPayload": "base64-encoded-string",
  "paymentRequirements": {
    "paymentOptions": [{
      "network": "eip155:100009",
      "asset": "VET",
      "amount": "100",
      "recipient": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
    }],
    "merchantId": "merchant123"
  }
}
```

**Response (Success):**
```json
{
  "success": true,
  "transactionHash": "0x1f1f1532fe47a8127a8629a177fdc4dbb08d4bf20c155434f6c0ecd1251c91d0",
  "networkId": "eip155:100009"
}
```

**Response (Failure):**
```json
{
  "success": false,
  "networkId": "eip155:100009",
  "error": "Error description"
}
```

### `GET /supported`
Returns supported networks and assets.

**Response:**
```json
{
  "networks": [{
    "network": "eip155:100009",
    "assets": ["VET", "VTHO"]
  }],
  "schemes": ["x402"]
}
```

## Rate Limiting

The API implements rate limiting with the following headers:
- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Remaining requests in current window
- `X-RateLimit-Reset`: Time when the rate limit resets (ISO 8601)

When rate limit is exceeded:
- **Status Code**: 429 Too Many Requests
- **Response**: `{ "error": "Rate limit exceeded", "retryAfter": <seconds> }`

## Development

### Prerequisites

- Node.js 20+
- npm or pnpm

### Install Dependencies

```bash
npm install
```

### Run Development Server

```bash
npm run dev
```

The API will be available at `http://localhost:3000`

### Build

```bash
npm run build
```

### Type Check

```bash
npx tsc --noEmit
```

## Project Structure

```
src/
├── index.ts              # Main application setup
├── dev.ts               # Development server entry point
├── types/
│   └── x402.ts          # TypeScript interfaces for x402 protocol
├── schemas/
│   └── x402.ts          # Zod validation schemas
├── routes/
│   └── x402.ts          # Route handlers for endpoints
└── middleware/
    ├── errorHandler.ts  # Error handling middleware
    └── rateLimiter.ts   # Rate limiting middleware
```

## Environment Configuration

The API uses environment variables for configuration:
- `NODE_ENV`: Set to 'test' to disable rate limit cleanup

## Deployment

Prerequisites:
- [Vercel CLI](https://vercel.com/docs/cli) installed globally

Deploy to Vercel:

```bash
npm install
vc deploy
```

## References

- [x402 Protocol Specification](https://github.com/coinbase/x402/blob/main/specs/facilitator.md)
- [CAIP-2 (Chain Agnostic Improvement Proposals)](https://github.com/ChainAgnostic/CAIPs/blob/master/CAIPs/caip-2.md)
- [VeChain Documentation](https://docs.vechain.org/)

## License

ISC
