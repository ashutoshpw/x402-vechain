# Database Setup

This directory contains the PostgreSQL database schema and migration files for the X402 VeChain API.

## Overview

The database schema includes four main tables:

1. **users** - Stores wallet addresses and user profiles
2. **api_keys** - Stores API key hashes and permissions
3. **transactions** - Stores settlement history
4. **nonces** - Cache for replay attack prevention

## Environment Configuration

Create a `.env` file in the `apps/api` directory with the following variables:

```bash
# VeChain Network Configuration
VECHAIN_NETWORK=testnet # or mainnet

# Database URLs
DATABASE_URL_TESTNET=postgresql://user:password@localhost:5432/x402_testnet
DATABASE_URL_MAINNET=postgresql://user:password@localhost:5432/x402_mainnet

# Default database URL (used if network-specific URL is not set)
DATABASE_URL=postgresql://user:password@localhost:5432/x402_testnet
```

See `.env.example` for a template.

## Database Separation

The application supports separate databases for testnet and mainnet environments:

- Set `VECHAIN_NETWORK=testnet` to use the testnet database
- Set `VECHAIN_NETWORK=mainnet` to use the mainnet database

The appropriate database URL will be selected based on the `VECHAIN_NETWORK` environment variable.

## Running Migrations

### Generate Migration Files

After modifying the schema in `src/db/schema.ts`, generate migration files:

```bash
pnpm db:generate
```

### Apply Migrations

To apply migrations to your database:

```bash
pnpm db:migrate
```

Or use the migration utility directly:

```bash
tsx src/db/migrate.ts
```

### Push Schema Changes (Development)

For rapid development, you can push schema changes directly without generating migration files:

```bash
pnpm db:push
```

⚠️ **Warning**: This should only be used in development. Always use migrations for production.

### Drizzle Studio

To explore and manage your database with a visual interface:

```bash
pnpm db:studio
```

This will open Drizzle Studio in your browser at `https://local.drizzle.studio`.

## Connection Pooling

The database connection is configured with connection pooling:

- Maximum connections: 10
- Idle timeout: 20 seconds
- Connection timeout: 10 seconds
- Prepared statements: Disabled (for pgBouncer compatibility)

## Schema Details

### Users Table

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| wallet_address | VARCHAR(42) | VeChain wallet address (unique) |
| email | VARCHAR(255) | Optional email |
| name | VARCHAR(255) | Optional display name |
| metadata | JSONB | Additional user data |
| created_at | TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | Last update timestamp |

### API Keys Table

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | Foreign key to users |
| name | VARCHAR(255) | API key name/label |
| key_hash | VARCHAR(255) | Hashed API key (unique) |
| permissions | JSONB | Array of permission strings |
| is_active | BOOLEAN | Whether the key is active |
| expires_at | TIMESTAMP | Optional expiration date |
| last_used_at | TIMESTAMP | Last usage timestamp |
| created_at | TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | Last update timestamp |

### Transactions Table

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | Foreign key to users |
| api_key_id | UUID | Foreign key to api_keys (nullable) |
| tx_hash | VARCHAR(66) | Transaction hash (unique) |
| from_address | VARCHAR(42) | Sender address |
| to_address | VARCHAR(42) | Recipient address |
| amount | VARCHAR(78) | Transaction amount (as string) |
| token_address | VARCHAR(42) | Token contract address |
| network | VARCHAR(50) | 'testnet' or 'mainnet' |
| status | VARCHAR(50) | 'pending', 'confirmed', 'failed' |
| block_number | BIGINT | Block number |
| gas_used | VARCHAR(78) | Gas used |
| metadata | JSONB | Additional transaction data |
| created_at | TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | Last update timestamp |

### Nonces Table

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| wallet_address | VARCHAR(42) | Wallet address |
| nonce | VARCHAR(255) | Nonce value |
| used_at | TIMESTAMP | When the nonce was used |
| expires_at | TIMESTAMP | When the nonce expires |

## Usage Example

```typescript
import { db } from './db'
import { users, apiKeys, transactions, nonces } from './db/schema'
import { eq } from 'drizzle-orm'

// Create a new user
const newUser = await db.insert(users).values({
  walletAddress: '0x1234567890123456789012345678901234567890',
  name: 'John Doe',
  email: 'john@example.com',
}).returning()

// Query users
const allUsers = await db.select().from(users)
const userByWallet = await db.select().from(users)
  .where(eq(users.walletAddress, '0x1234...'))

// Create an API key
const newApiKey = await db.insert(apiKeys).values({
  userId: newUser[0].id,
  name: 'Production API Key',
  keyHash: 'hashed_key_value',
  permissions: ['read', 'write'],
}).returning()

// Record a transaction
const transaction = await db.insert(transactions).values({
  userId: newUser[0].id,
  apiKeyId: newApiKey[0].id,
  txHash: '0xabcdef...',
  fromAddress: '0x1234...',
  toAddress: '0x5678...',
  amount: '1000000000000000000',
  network: 'testnet',
  status: 'pending',
}).returning()
```

## Additional Resources

- [Drizzle ORM Documentation](https://orm.drizzle.team)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [VeChain Developer Documentation](https://docs.vechain.org)
