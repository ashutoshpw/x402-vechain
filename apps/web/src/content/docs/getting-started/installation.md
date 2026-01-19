---
title: Installation
description: Install and configure x402.vet for your project
---

This guide covers installing the x402.vet SDK and setting up the facilitator API.

## SDK Installation

### For Client or Server Applications

Install the `@x402/vechain` package:

```bash
# npm
npm install @x402/vechain

# pnpm
pnpm add @x402/vechain

# yarn
yarn add @x402/vechain
```

### Peer Dependencies

The SDK requires these peer dependencies for full functionality:

```bash
# For server-side usage (Hono middleware)
npm install hono

# For VeChain blockchain interactions
npm install @vechain/sdk-core @vechain/sdk-network
```

## Facilitator API Setup

If you want to run your own facilitator API instead of using a hosted one:

### Prerequisites

- **Node.js** 20 or higher
- **pnpm** 10.12.4 (`npm install -g pnpm@10.12.4`)
- **PostgreSQL** database
- VeChain RPC access (testnet or mainnet)

### Clone the Repository

```bash
git clone https://github.com/ashutoshpw/x402-vechain.git
cd x402-vechain
```

### Install Dependencies

```bash
pnpm install
```

### Configure Environment

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```bash
# VeChain Network
VECHAIN_NETWORK=testnet
VECHAIN_TESTNET_RPC=https://testnet.vechain.org

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/x402_testnet

# Optional: Fee Delegation
FEE_DELEGATION_ENABLED=false

# Security
JWT_SECRET=your-secret-here  # Generate: openssl rand -base64 32

# Rate Limiting
RATE_LIMIT_REQUESTS_PER_MINUTE=100

# Server
NODE_ENV=development
PORT=3000
```

### Run Database Migrations

```bash
pnpm --filter api db:migrate
```

### Start the Development Server

```bash
# Start all apps (API + Dashboard + Web)
pnpm dev

# Or start only the API
pnpm --filter api dev
```

The API will be available at `http://localhost:3000`.

### Verify Installation

Test the API is running:

```bash
curl http://localhost:3000/supported
```

Expected response:

```json
{
  "networks": [{
    "network": "eip155:100009",
    "assets": ["VET", "VTHO", "VEUSD", "B3TR"]
  }],
  "schemes": ["x402"]
}
```

## TypeScript Configuration

The SDK is written in TypeScript and includes type definitions. For the best experience, ensure your `tsconfig.json` includes:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  }
}
```

## Browser Support

For client-side usage, the SDK requires:

- Modern browsers with ES2020 support
- WebAssembly support (for cryptographic operations)
- VeWorld or Connex wallet extension/integration

### Supported Wallets

- **VeWorld** - Browser extension and mobile app
- **Connex** - VeChain Sync, Sync2 browsers
- **Custom** - Implement the `WalletAdapter` interface

## Next Steps

- [First Payment](/getting-started/first-payment) - Create your first payment flow
- [Environment Configuration](/guides/environment) - Detailed configuration guide
- [Client SDK](/sdk/client) - Client SDK usage
- [Server SDK](/sdk/server) - Server SDK usage
