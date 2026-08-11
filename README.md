# x402 VeChain Facilitator

A TypeScript monorepo implementing the [x402 payment protocol](https://github.com/coinbase/x402/blob/main/specs/facilitator.md) for VeChain blockchain. This project enables seamless cryptocurrency payment facilitation using VeChain's native tokens (VET, VTHO, B3TR) with support for testnet and mainnet environments.

> **Note on stablecoins:** VeChain currently has no actively supported USD stablecoin — VeUSD's custodian, Prime Trust, went bankrupt in 2023, and the token is effectively dead. Stablecoin support will be revisited if a bridged USDC (or equivalent) becomes available on VeChain.

## 🏗️ Project Structure

This monorepo consists of:

### Applications
- **[apps/api](/apps/api)** - Hono-based REST API implementing the x402 protocol facilitator endpoints
- **[apps/dashboard](/apps/dashboard)** - React Router admin dashboard for managing payments
- **[apps/web](/apps/web)** - Astro marketing website

### Examples
- **[examples/](/examples)** - Practical integration examples and templates
  - [Minimal Server](/examples/minimal-server) - Simple paid API
  - [Minimal Client](/examples/minimal-client) - Browser wallet integration
  - [AI Agent](/examples/ai-agent) - Autonomous payment bot
  - [Content Paywall](/examples/content-paywall) - Full-stack paywall

## 🚀 Quick Start

### Prerequisites

- **Node.js** 20 or higher
- **pnpm** 10.12.4 (install with `npm install -g pnpm@10.12.4`)
- **PostgreSQL** database (for API)
- VeChain RPC access (testnet/mainnet)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/ashutoshpw/x402-vechain.git
cd x402-vechain
```

2. Install dependencies:
```bash
pnpm install
```

3. Configure environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Start development servers:
```bash
pnpm dev
```

This will start all applications concurrently:
- API: http://localhost:3000
- Dashboard: http://localhost:5173 (default React Router dev port)
- Web: http://localhost:4321 (default Astro dev port)

## 📦 Available Scripts

### Development
```bash
pnpm dev              # Run all apps in development mode
pnpm build            # Build all apps for production
```

### Individual App Commands
```bash
# API
pnpm --filter api dev              # Start API dev server
pnpm --filter api build            # Build API for production
pnpm --filter api db:generate      # Generate database migrations
pnpm --filter api db:migrate       # Run database migrations
pnpm --filter api db:push          # Push schema changes to database
pnpm --filter api db:studio        # Open Drizzle Studio

# Dashboard
pnpm --filter dashboard dev        # Start dashboard dev server
pnpm --filter dashboard build      # Build dashboard for production

# Web
pnpm --filter web dev              # Start web dev server
pnpm --filter web build            # Build web for production
```

## 🔧 Technology Stack

### Build & Package Management
- **Turbo** - Monorepo build orchestration with intelligent caching
- **pnpm** - Fast, disk space efficient package manager

### Backend (API)
- **Hono** - Lightweight, fast web framework
- **Drizzle ORM** - TypeScript-first ORM for PostgreSQL
- **Zod** - TypeScript-first schema validation
- **@vechain/sdk** - VeChain blockchain integration

### Frontend
- **React Router 7** (Dashboard) - Full-stack React framework
- **Astro 5** (Web) - Modern static site generator
- **Tailwind CSS** - Utility-first CSS framework

### Database & Blockchain
- **PostgreSQL** - Relational database
- **VeChain** - Layer-1 blockchain platform

## 🌐 x402 Protocol Implementation

The API implements the x402 facilitator specification with the following endpoints:

### `GET /supported`
Returns supported VeChain networks and assets. Each running instance is deployed against exactly one network (see [Deployment Model](#-deployment-model) below), so the response always contains a single network entry matching that instance's `VECHAIN_NETWORK`.

**Response (testnet instance):**
```json
{
  "networks": [{
    "network": "eip155:100009",
    "assets": ["VET", "VTHO", "B3TR"]
  }],
  "schemes": ["x402"]
}
```

**Response (mainnet instance):**
```json
{
  "networks": [{
    "network": "eip155:100010",
    "assets": ["VET", "VTHO", "B3TR"]
  }],
  "schemes": ["x402"]
}
```

### `POST /verify`
Validates payment payloads without settling on-chain.

### `POST /settle`
Submits payment to VeChain and waits for confirmation.

For detailed API documentation, see [apps/api/README.md](/apps/api/README.md).

## 🌍 Deployment Model

The API is a **per-network deployment**: one running instance serves exactly one VeChain network, selected by `VECHAIN_NETWORK` (`testnet` or `mainnet`). There is no multi-network runtime — no network column on the nonces table, no switching networks per-request. `SUPPORTED_NETWORKS` (and the `/supported` response) is derived from `VECHAIN_NETWORK` and is always a single-element list.

To serve both networks, run two separate instances, each with its own `VECHAIN_NETWORK` and database:

```bash
# Testnet instance
VECHAIN_NETWORK=testnet
DATABASE_URL_TESTNET=postgresql://user:password@localhost:5432/x402_testnet

# Mainnet instance
VECHAIN_NETWORK=mainnet
DATABASE_URL_MAINNET=postgresql://user:password@localhost:5432/x402_mainnet
```

## ⚙️ Environment Configuration

Key environment variables (see `.env.example` for complete list):

```bash
# VeChain Network — determines which single network this instance serves
VECHAIN_NETWORK=testnet              # or 'mainnet'
VECHAIN_TESTNET_RPC=https://testnet.vechain.org
VECHAIN_MAINNET_RPC=https://mainnet.vechain.org

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/x402_testnet
# Optional network-specific overrides (used instead of DATABASE_URL when set):
DATABASE_URL_TESTNET=postgresql://user:password@localhost:5432/x402_testnet
DATABASE_URL_MAINNET=postgresql://user:password@localhost:5432/x402_mainnet

# Fee Delegation (optional)
FEE_DELEGATION_ENABLED=false
FEE_DELEGATION_PRIVATE_KEY=          # Required if enabled

# Security
JWT_SECRET=                          # Generate: openssl rand -base64 32

# Rate Limiting
RATE_LIMIT_REQUESTS_PER_MINUTE=100

# Application
NODE_ENV=development
PORT=3000
```

⚠️ **Security Note**: Never commit `.env` files containing secrets to version control.

## 🗄️ Database Setup

The API uses PostgreSQL with Drizzle ORM. Database operations:

```bash
# Generate migration files from schema changes
pnpm --filter api db:generate

# Apply migrations to database
pnpm --filter api db:migrate

# Push schema changes directly (dev only)
pnpm --filter api db:push

# Open Drizzle Studio (database GUI)
pnpm --filter api db:studio
```

Database schema is defined in `apps/api/src/db/schema.ts`.

## 📚 Documentation

Each application has its own detailed README:

- **[API Documentation](/apps/api/README.md)** - Complete API reference, authentication, rate limiting
- **[Dashboard Documentation](/apps/dashboard/README.md)** - Dashboard features and usage
- **[Web Documentation](/apps/web/README.md)** - Marketing site information

## 💡 Examples

Learn by example! Check out our practical integration examples:

- **[Minimal Server](/examples/minimal-server)** - Simple paid API endpoint (~50 lines)
- **[Minimal Client](/examples/minimal-client)** - Browser wallet payment integration
- **[AI Agent](/examples/ai-agent)** - Autonomous payment bot with retry logic
- **[Content Paywall](/examples/content-paywall)** - Full-stack payment-gated content platform

[**View all examples →**](/examples/README.md)

## 🏗️ Architecture

```
┌─────────────────┐
│   Marketing     │
│   Website       │  Astro 5
│   (apps/web)    │
└─────────────────┘

┌─────────────────┐
│   Dashboard     │
│   Admin Panel   │  React Router 7
│ (apps/dashboard)│
└────────┬────────┘
         │
         │ API Calls
         │
         ▼
┌─────────────────┐
│   x402 API      │
│   Facilitator   │  Hono + PostgreSQL
│   (apps/api)    │
└────────┬────────┘
         │
         │ VeChain SDK
         │
         ▼
┌─────────────────┐
│   VeChain       │
│   Blockchain    │  Testnet / Mainnet
└─────────────────┘
```

## 🔐 Security Features

- **Request Validation** - Zod schema validation on all API inputs
- **Rate Limiting** - IP-based rate limiting (configurable)
- **CORS** - Configurable cross-origin resource sharing
- **Environment Validation** - Startup validation of all required environment variables
- **Fee Delegation** - Optional gas fee sponsorship for users
- **JWT Authentication** - Token-based authentication support

## 🚢 Deployment

### API Deployment (Vercel)

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
pnpm --filter api install
vc deploy
```

Configure environment variables in the Vercel dashboard.

## 📖 References

- [x402 Protocol Specification](https://github.com/coinbase/x402/blob/main/specs/facilitator.md)
- [VeChain Documentation](https://docs.vechain.org/)
- [CAIP-2 Chain Identifiers](https://github.com/ChainAgnostic/CAIPs/blob/master/CAIPs/caip-2.md)
- [Hono Framework](https://hono.dev/)
- [Drizzle ORM](https://orm.drizzle.team/)
- [Turbo Documentation](https://turbo.build/)

## 📄 License

ISC

## 🤝 Contributing

This is a monorepo managed with pnpm and Turbo. When contributing:

1. Use `pnpm install` to install dependencies
2. Run `pnpm dev` to start all apps in development mode
3. Ensure TypeScript types are correct
4. Build successfully with `pnpm build`
5. Follow existing code style and conventions
6. See [.github/copilot-instructions.md](.github/copilot-instructions.md) for detailed development guidelines

## 🌟 Supported Networks & Assets

Each deployed instance supports one of the two networks below, per its `VECHAIN_NETWORK` setting. VET is native (no contract address); VTHO and B3TR are VIP-180 tokens.

### VeChain Testnet (`eip155:100009`)

| Asset | Contract Address |
|-------|-------------------|
| VET | native |
| VTHO | `0x0000000000000000000000000000456E65726779` |
| B3TR | `0x026771d1be764467f8bdb78bb230df10c924b00d` |

### VeChain Mainnet (`eip155:100010`)

| Asset | Contract Address |
|-------|-------------------|
| VET | native |
| VTHO | `0x0000000000000000000000000000456E65726779` |
| B3TR | `0x5ef79995FE8a89e0812330E4378eB2660ceDe699` |

VTHO is VeChain's built-in energy contract and shares the same address on both networks; B3TR is a deployed VIP-180 token with a different address per network.

No USD stablecoin is currently supported. VeUSD's custodian, Prime Trust, went bankrupt in 2023, leaving VeChain without a healthy USD stablecoin; support will be revisited if a bridged USDC (or equivalent) becomes available.
