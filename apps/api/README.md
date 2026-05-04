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
    "assets": ["VET", "VTHO", "VEUSD", "B3TR"]
  }],
  "schemes": ["x402"]
}
```

## Fee Delegation (Gas Sponsorship)

The API supports fee delegation using VeChain's Multi-Party Payment (MPP) protocol. This allows users to submit transactions without holding VTHO for gas fees.

**See [FEE_DELEGATION_USAGE.md](./FEE_DELEGATION_USAGE.md) for detailed client implementation guide.**

### How It Works

1. User creates and signs a transaction with their private key
2. User sends the unsigned transaction body and their signature to the `/settle` endpoint
3. The facilitator adds its signature as the fee delegator (gas sponsor)
4. The facilitator submits the dual-signed transaction to VeChain
5. The facilitator pays the gas fees on behalf of the user

### Usage

To use fee delegation in the `/settle` endpoint, the client must:

1. Create a transaction with `reserved.features = 1` to mark it for delegation
2. Sign the transaction as the sender using their private key
3. Send the sender-signed transaction and sender address to the facilitator

Include both `senderSignedTransaction` and `senderAddress` in the payment payload:

```json
{
  "paymentPayload": "base64-encoded-payload",
  "paymentRequirements": { /* ... */ }
}
```

Where the decoded `paymentPayload` contains:
```json
{
  "senderSignedTransaction": "0x...",
  "senderAddress": "0x..."
}
```

The facilitator will:
1. Verify the transaction is marked for delegation
2. Check rate limits and spending limits
3. Add its signature as the gas payer
4. Submit the fully-signed transaction to VeChain

### Monitoring Endpoints

#### `GET /fee-delegation/status`
Returns fee delegation configuration and current status.

**Response:**
```json
{
  "enabled": true,
  "delegatorAddress": "0x...",
  "balanceVtho": "1234.56",
  "isBalanceLow": false,
  "lowBalanceThreshold": 1000,
  "maxVthoPerTx": 10,
  "network": "testnet"
}
```

#### `GET /fee-delegation/stats/:address`
Returns delegation statistics for a specific address.

**Query Parameters:**
- `hours` (optional): Time window in hours (default: 24)

**Response:**
```json
{
  "address": "0x...",
  "timeWindowHours": 24,
  "transactionCount": 5,
  "totalVthoSpent": "0.125000",
  "lastDelegatedAt": "2024-12-31T23:59:59.000Z"
}
```

#### `GET /fee-delegation/total-spent`
Returns total VTHO spent by the delegation service.

**Query Parameters:**
- `hours` (optional): Time window in hours (default: 24)

**Response:**
```json
{
  "timeWindowHours": 24,
  "totalVthoSpent": "12.345678",
  "network": "testnet"
}
```

### Security Features

- **Rate Limiting**: Maximum 10 fee-delegated transactions per address per hour
- **Spending Limits**: Maximum VTHO per transaction configurable via `FEE_DELEGATION_MAX_VTHO_PER_TX`
- **Balance Monitoring**: Automatic low-balance alerts when VTHO falls below threshold
- **Audit Logging**: All fee delegation events are logged in the database

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

### Testing

The API includes comprehensive unit tests covering all endpoints and services.

```bash
# Run all tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with UI
npm run test:ui

# Run tests with coverage report
npm run test:coverage
```

**Test Coverage:**
- ✅ 70 test cases
- ✅ `/verify`, `/settle`, `/supported` endpoints
- ✅ VeChain service (transaction verification, submission, balance queries)
- ✅ Payment verification service (signature validation, nonce checking)
- ✅ Mocked VeChain SDK for fast, deterministic tests

See [TESTING.md](./TESTING.md) for detailed testing documentation.

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

The API requires proper environment configuration. Copy `.env.example` to `.env` and configure the variables:

```bash
cp .env.example .env
```

### Environment Variables

All environment variables are validated using Zod schemas. The application will fail to start if required variables are missing or invalid.

#### VeChain Network Configuration

- **`VECHAIN_NETWORK`** (required)
  - Values: `testnet` or `mainnet`
  - Default: `testnet`
  - Determines which VeChain network the API will connect to

- **`VECHAIN_MAINNET_RPC`** (required)
  - Default: `https://mainnet.vechain.org`
  - VeChain mainnet RPC endpoint URL

- **`VECHAIN_TESTNET_RPC`** (required)
  - Default: `https://testnet.vechain.org`
  - VeChain testnet RPC endpoint URL

#### Fee Delegation Configuration

Fee delegation (gas sponsorship) allows users to submit transactions without holding VTHO for gas fees. The facilitator pays gas on behalf of users using VeChain's Multi-Party Payment (MPP) protocol.

- **`FEE_DELEGATION_ENABLED`** (required)
  - Values: `true` or `false`
  - Default: `false`
  - Enable/disable fee delegation for transactions

- **`FEE_DELEGATION_PRIVATE_KEY`** (conditional)
  - Format: 64-character hexadecimal string (without 0x prefix)
  - Required when `FEE_DELEGATION_ENABLED=true`
  - Private key for the fee delegation account
  - ⚠️ **WARNING**: Never commit this to version control
  - Generate a new wallet for delegation and fund it with VTHO

- **`FEE_DELEGATION_MAX_VTHO_PER_TX`** (optional)
  - Default: `10`
  - Maximum VTHO allowed per delegated transaction
  - Prevents abuse by limiting gas sponsorship per transaction

- **`FEE_DELEGATION_LOW_BALANCE_THRESHOLD`** (optional)
  - Default: `1000`
  - VTHO balance threshold for low-balance alerts
  - Logs warnings when delegation account balance falls below this value

#### Database Configuration

- **`DATABASE_URL`** (required)
  - Format: `postgresql://username:password@host:port/database`
  - Default/fallback database connection string

- **`DATABASE_URL_TESTNET`** (optional)
  - Overrides `DATABASE_URL` when `VECHAIN_NETWORK=testnet`

- **`DATABASE_URL_MAINNET`** (optional)
  - Overrides `DATABASE_URL` when `VECHAIN_NETWORK=mainnet`

#### Authentication

- **`JWT_SECRET`** (optional)
  - Minimum length: 32 characters
  - Secret key for JWT token generation and validation
  - Generate with: `openssl rand -base64 32`
  - ⚠️ **WARNING**: Never commit this to version control

#### Rate Limiting

- **`RATE_LIMIT_REQUESTS_PER_MINUTE`** (required)
  - Default: `100`
  - Maximum number of requests per IP address per minute

- **`RATE_LIMIT_WINDOW_MS`** (optional)
  - Default: `900000` (15 minutes)
  - Rate limit time window in milliseconds

#### Application Configuration

- **`NODE_ENV`** (required)
  - Values: `development`, `production`, or `test`
  - Default: `development`
  - Application environment

- **`PORT`** (optional)
  - Default: `3000`
  - API server port

### Configuration Validation

The application validates all environment variables at startup using the `src/config/env.ts` module. If validation fails, you'll see a detailed error message indicating which variables are missing or invalid.

Example validation error:
```
Environment variable validation failed:
  - VECHAIN_NETWORK: Invalid enum value. Expected 'testnet' | 'mainnet', received 'invalid'
  - DATABASE_URL: Required
  
Please check your .env file or environment configuration.
```

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
