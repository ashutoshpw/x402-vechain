# Environment Configuration

This document describes all environment variables used in the x402-vechain project.

## Quick Start

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` with your actual values (never commit this file!)

3. The application will automatically validate all environment variables on startup using Zod.

## Environment Variables

### VeChain Network Configuration

#### `VECHAIN_NETWORK`
- **Type**: `string` (enum: `mainnet` | `testnet`)
- **Default**: `testnet`
- **Required**: No
- **Description**: Specifies which VeChain network to use. Use `testnet` for development and testing, `mainnet` for production.

#### `VECHAIN_MAINNET_RPC`
- **Type**: `string` (URL)
- **Default**: `https://mainnet.vechain.org`
- **Required**: No
- **Description**: RPC endpoint URL for the VeChain mainnet. Used when `VECHAIN_NETWORK=mainnet`.

#### `VECHAIN_TESTNET_RPC`
- **Type**: `string` (URL)
- **Default**: `https://testnet.vechain.org`
- **Required**: No
- **Description**: RPC endpoint URL for the VeChain testnet. Used when `VECHAIN_NETWORK=testnet`.

### Fee Delegation Configuration

#### `FEE_DELEGATION_ENABLED`
- **Type**: `boolean`
- **Default**: `true`
- **Required**: No
- **Description**: Enables or disables fee delegation for transactions. When enabled, a sponsor account pays the gas fees for user transactions.

#### `FEE_DELEGATION_PRIVATE_KEY`
- **Type**: `string` (hex private key)
- **Default**: None
- **Required**: No (required if `FEE_DELEGATION_ENABLED=true`)
- **Description**: Private key of the account that will sponsor transaction fees. Format: `0x` followed by 64 hexadecimal characters.
- **Security**: ⚠️ Keep this secret! Never commit to version control or share publicly.

### Database Configuration

#### `DATABASE_URL`
- **Type**: `string` (PostgreSQL connection URL)
- **Default**: None
- **Required**: No (required for database features)
- **Description**: PostgreSQL database connection string.
- **Format**: `postgresql://username:password@host:port/database`
- **Example**: `postgresql://user:password@localhost:5432/vechain_db`

### Authentication Configuration

#### `JWT_SECRET`
- **Type**: `string`
- **Default**: None
- **Required**: No (required for authentication features)
- **Minimum Length**: 32 characters
- **Description**: Secret key used for signing JWT tokens. Use a strong, randomly generated string.
- **Generate**: Use `openssl rand -base64 32` to generate a secure secret.
- **Security**: ⚠️ Keep this secret! Never commit to version control or share publicly.

### Rate Limiting Configuration

#### `RATE_LIMIT_REQUESTS_PER_MINUTE`
- **Type**: `number` (positive integer)
- **Default**: `100`
- **Required**: No
- **Description**: Maximum number of requests allowed per minute per client IP address. Helps prevent abuse and ensures fair usage.

## Usage in Code

The environment variables are validated and typed using Zod. Import and use them in your code:

```typescript
import { env, getVeChainRpcUrl } from './config/env';

// Access environment variables with type safety
console.log(env.VECHAIN_NETWORK); // 'mainnet' | 'testnet'
console.log(env.RATE_LIMIT_REQUESTS_PER_MINUTE); // number

// Use helper functions
const rpcUrl = getVeChainRpcUrl(); // Returns the appropriate RPC URL
```

## Validation

All environment variables are validated on application startup using Zod. If validation fails, you'll see detailed error messages:

```
❌ Environment validation failed:
  - JWT_SECRET: String must contain at least 32 character(s)
  - DATABASE_URL: Required
```

## Security Best Practices

1. **Never commit `.env` files**: The `.env` file is in `.gitignore` to prevent accidental commits.
2. **Use strong secrets**: Generate JWT secrets and private keys using cryptographically secure methods.
3. **Rotate secrets regularly**: Especially in production environments.
4. **Use environment-specific values**: Different values for development, staging, and production.
5. **Limit access**: Only grant access to production secrets to authorized personnel.

## Development vs Production

### Development
- Use `VECHAIN_NETWORK=testnet`
- Use test private keys (with no real value)
- Can use shorter JWT secrets for convenience

### Production
- Use `VECHAIN_NETWORK=mainnet`
- Use secure, randomly generated secrets
- Ensure all required variables are set
- Use environment variable management tools (e.g., AWS Secrets Manager, HashiCorp Vault)
