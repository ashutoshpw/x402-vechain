---
title: "Wallet-Based Authentication"
description: "Sign-In-With-VeChain (SIWV) authentication flow using JWT and httpOnly cookies"
category: "auth"
---

# Wallet-Based Authentication

The authentication system uses Sign-In-With-VeChain (SIWV) pattern to authenticate users via their VeChain wallet (VeWorld or Sync2). Upon successful authentication, users receive a JWT token stored in an httpOnly cookie for session management.

## Authentication Flow

### 1. User Connects Wallet
- User clicks "Connect VeChain Wallet" button
- Frontend requests wallet access using VeChain's wallet API
- User approves connection in their wallet app

### 2. Challenge Generation
```
POST /auth/challenge
Content-Type: application/json

{
  "walletAddress": "0x..."
}
```

**Response:**
```json
{
  "nonce": "random_32_byte_hex_string",
  "message": "Sign this message to authenticate with x402 VeChain Dashboard\n\nWallet: 0x...\nNonce: ...\nExpires: ...",
  "expiresAt": "2024-01-18T16:00:00.000Z"
}
```

### 3. Sign Challenge
- Frontend requests wallet to sign the challenge message
- User approves signature in their wallet app
- Wallet returns signed message

### 4. Verify Signature
```
POST /auth/verify
Content-Type: application/json

{
  "walletAddress": "0x...",
  "signature": "0x...",
  "nonce": "..."
}
```

**Response:**
```json
{
  "success": true,
  "token": "jwt_token...",
  "user": {
    "id": "uuid",
    "walletAddress": "0x...",
    "createdAt": "...",
    "lastLogin": "..."
  }
}
```

The JWT token is also set as an httpOnly cookie named `auth_token`.

### 5. Access Protected Routes
All subsequent requests include the JWT token either:
- As an httpOnly cookie (automatic from browser)
- In the Authorization header: `Bearer <token>`

### 6. Logout
```
POST /auth/logout
```

Clears the authentication cookie and invalidates the session.

## Security Features

### Nonce Management
- Each authentication attempt gets a unique nonce
- Nonces expire after 15 minutes
- Used nonces are deleted immediately after verification (replay attack prevention)
- Expired nonces are cleaned up periodically

### JWT Tokens
- Tokens expire after 7 days
- Signed using HMAC SHA256 with JWT_SECRET
- Include user ID and wallet address in payload
- Stored in httpOnly cookies to prevent XSS attacks

### Database Schema
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address VARCHAR(42) UNIQUE NOT NULL,
  email VARCHAR(255),
  name VARCHAR(255),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT now() NOT NULL,
  updated_at TIMESTAMP DEFAULT now() NOT NULL,
  last_login TIMESTAMP
);

CREATE TABLE nonces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address VARCHAR(42) NOT NULL,
  nonce VARCHAR(255) NOT NULL,
  used_at TIMESTAMP DEFAULT now() NOT NULL,
  expires_at TIMESTAMP NOT NULL
);
```

## Frontend Usage

### AuthProvider
Wrap your app with `AuthProvider` to provide authentication context:

```tsx
import { AuthProvider } from './lib/auth'

function App() {
  return (
    <AuthProvider>
      <YourApp />
    </AuthProvider>
  )
}
```

### useAuth Hook
Access authentication state and methods:

```tsx
import { useAuth } from '~/lib/auth'

function MyComponent() {
  const { user, isAuthenticated, login, logout } = useAuth()

  if (isAuthenticated) {
    return <div>Welcome {user.walletAddress}</div>
  }

  return <button onClick={() => {/* trigger login */}}>Login</button>
}
```

### WalletConnector Component
Pre-built component for wallet connection:

```tsx
import { WalletConnector } from '~/components/WalletConnector'

function LoginPage() {
  return (
    <WalletConnector
      onSuccess={() => navigate('/dashboard')}
    />
  )
}
```

### Protected Routes
Routes automatically redirect to login if not authenticated:

```tsx
export default function Dashboard() {
  const { isAuthenticated, isLoading } = useAuth()

  useEffect(() => {
    if (!isAuthenticated && !isLoading) {
      navigate('/login')
    }
  }, [isAuthenticated, isLoading])

  // Your dashboard content
}
```

## API Routes

### Public Routes
- `POST /auth/challenge` — Generate authentication challenge
- `POST /auth/verify` — Verify signature and issue JWT
- `POST /auth/logout` — Clear session

### Protected Routes
- `GET /auth/me` — Get current user profile

## Environment Variables

```bash
# JWT secret for token signing (minimum 32 characters)
JWT_SECRET=your_secret_key_here

# Database connection
DATABASE_URL=postgresql://user:password@localhost:5432/x402_testnet

# VeChain network configuration
VECHAIN_NETWORK=testnet
VECHAIN_TESTNET_RPC=https://testnet.vechain.org
```

## Testing

### With VeWorld Browser Extension
1. Install VeWorld extension
2. Create or import a wallet
3. Visit the dashboard login page
4. Click "Connect VeChain Wallet"
5. Approve connection and signature requests

### With Sync2 Desktop
1. Install Sync2 desktop app
2. Create or import a wallet
3. Visit the dashboard (must be on localhost)
4. Click "Connect VeChain Wallet"
5. Approve connection and signature requests in Sync2

## Troubleshooting

**"VeChain wallet not found"**
- Ensure VeWorld extension is installed and enabled, or Sync2 desktop app is running
- Refresh the page

**"Invalid or expired nonce"**
- Nonces expire after 15 minutes — request a new challenge if expired
- Check system clock is synchronized

**"Signature verification failed"**
- Ensure you're signing with the correct wallet
- Wallet address must match the one used in challenge
- Check that signature is complete and not truncated

## Resources

- [VeWorld Extension](https://www.veworld.net/)
- [Sync2 Desktop](https://sync.vecha.in/)
- [VeChain Developer Documentation](https://docs.vechain.org/)
- [VeChain SDK](https://github.com/vechain/vechain-sdk)
