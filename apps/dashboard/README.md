# x402 VeChain Dashboard

Web dashboard for managing x402 VeChain Facilitator API keys and monitoring transactions.

## Features

- 🔐 **Wallet-Based Authentication**: Sign in with VeWorld or Sync2 wallet
- 🔑 **API Key Management**: Create and manage API keys for the facilitator
- 📊 **Transaction Monitoring**: View transaction history and status
- 🔒 **Secure Sessions**: JWT-based authentication with httpOnly cookies

## Getting Started

### Prerequisites

- Node.js 18+ and pnpm
- VeChain wallet (VeWorld extension or Sync2 desktop)
- Running x402 API server

### Installation

```bash
# Install dependencies
pnpm install

# Set up environment variables (optional)
# VITE_API_URL defaults to http://localhost:3000

# Start development server
pnpm dev
```

The dashboard will be available at `http://localhost:5173`

### Building for Production

```bash
pnpm build
pnpm start
```

## Authentication

The dashboard uses wallet-based authentication. Users authenticate by:

1. Connecting their VeChain wallet (VeWorld or Sync2)
2. Signing a challenge message
3. Receiving a JWT token stored in an httpOnly cookie

See [AUTHENTICATION.md](../../AUTHENTICATION.md) for detailed documentation.

## Project Structure

```
app/
├── components/          # Reusable UI components
│   └── WalletConnector.tsx
├── lib/                 # Utilities and hooks
│   ├── api.ts          # API client
│   └── auth.tsx        # Authentication context
├── routes/             # Application routes
│   ├── home.tsx        # Landing page
│   ├── login.tsx       # Login page
│   └── dashboard.tsx   # Protected dashboard
├── app.css             # Global styles
├── root.tsx            # Root layout
└── routes.ts           # Route configuration
```

## Environment Variables

```bash
# API server URL (default: http://localhost:3000)
VITE_API_URL=http://localhost:3000
```

## Technology Stack

- **React Router v7**: Full-stack React framework
- **Hono Client**: Type-safe API client
- **TailwindCSS**: Utility-first CSS framework
- **VeChain dApp Kit**: Wallet integration
- **TypeScript**: Type safety

## Development

### Type Safety

The dashboard uses Hono's RPC client for type-safe API calls:

```tsx
import { client } from '~/lib/api'

// Fully typed API calls
const res = await client['auth']['me'].$get()
const user = await res.json() // Type: UserProfile
```

### Adding New Routes

1. Create route file in `app/routes/`
2. Add route to `app/routes.ts`
3. Generate types: `npx react-router typegen`

## License

ISC
