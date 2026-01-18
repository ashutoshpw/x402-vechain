# API Key Management

This document describes the API key management system for the x402 VeChain Facilitator.

## Features

- ✅ Generate API keys with `xv_` prefix
- ✅ List/revoke keys
- ✅ Set rate limits per key
- ✅ Configure allowed domains (CORS)
- ✅ Key usage statistics
- ✅ Masked key display (`xv_****...1234`)
- ✅ Copy to clipboard functionality
- ✅ Revoke confirmation

## API Endpoints

### Create API Key
```bash
POST /api/keys
Headers:
  X-User-ID: <user-uuid>
  Content-Type: application/json

Body:
{
  "name": "Production API Key",
  "rateLimit": 1000,
  "allowedDomains": ["example.com"],
  "permissions": []
}

Response:
{
  "id": "uuid",
  "name": "Production API Key",
  "key": "xv_2c20a1b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1",
  "keyPrefix": "xv_2c20a",
  "maskedKey": "xv_2c20a****...e0f1",
  "rateLimit": 1000,
  "allowedDomains": ["example.com"],
  "permissions": [],
  "createdAt": "2024-01-18T16:10:27.563Z"
}
```

**Important:** The full API key is only returned once during creation. Store it securely!

### List API Keys
```bash
GET /api/keys
Headers:
  X-User-ID: <user-uuid>

Response:
{
  "keys": [
    {
      "id": "uuid",
      "name": "Production API Key",
      "maskedKey": "xv_2c20a****...****",
      "keyPrefix": "xv_2c20a",
      "rateLimit": 1000,
      "allowedDomains": ["example.com"],
      "permissions": [],
      "isActive": true,
      "lastUsedAt": "2024-01-18T16:10:27.563Z",
      "revokedAt": null,
      "createdAt": "2024-01-18T16:10:27.563Z"
    }
  ]
}
```

### Get API Key Details
```bash
GET /api/keys/:id
Headers:
  X-User-ID: <user-uuid>

Response:
{
  "id": "uuid",
  "name": "Production API Key",
  "maskedKey": "xv_2c20a****...****",
  "keyPrefix": "xv_2c20a",
  "rateLimit": 1000,
  "allowedDomains": ["example.com"],
  "permissions": [],
  "isActive": true,
  "lastUsedAt": "2024-01-18T16:10:27.563Z",
  "revokedAt": null,
  "createdAt": "2024-01-18T16:10:27.563Z"
}
```

### Update API Key
```bash
PATCH /api/keys/:id
Headers:
  X-User-ID: <user-uuid>
  Content-Type: application/json

Body:
{
  "name": "Updated API Key Name",
  "rateLimit": 2000,
  "allowedDomains": ["example.com", "app.example.com"]
}

Response:
{
  "id": "uuid",
  "name": "Updated API Key Name",
  "maskedKey": "xv_2c20a****...****",
  "rateLimit": 2000,
  "allowedDomains": ["example.com", "app.example.com"],
  "permissions": [],
  "updatedAt": "2024-01-18T16:10:27.563Z"
}
```

### Revoke API Key
```bash
DELETE /api/keys/:id
Headers:
  X-User-ID: <user-uuid>

Response:
{
  "message": "API key revoked successfully",
  "id": "uuid",
  "revokedAt": "2024-01-18T16:10:27.563Z"
}
```

### Get API Key Usage Statistics
```bash
GET /api/keys/:id/stats
Headers:
  X-User-ID: <user-uuid>

Response:
{
  "keyId": "uuid",
  "keyName": "Production API Key",
  "maskedKey": "xv_2c20a****...****",
  "lastUsedAt": "2024-01-18T16:10:27.563Z",
  "stats": {
    "total": 150,
    "successful": 145,
    "failed": 3,
    "pending": 2
  },
  "recentTransactions": [
    {
      "id": "uuid",
      "txHash": "0x...",
      "status": "confirmed",
      "network": "eip155:100009",
      "amount": "1000000000000000000",
      "createdAt": "2024-01-18T16:10:27.563Z"
    }
  ]
}
```

## Database Schema

The API keys are stored in the `api_keys` table with the following schema:

```sql
CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  key_hash VARCHAR(255) NOT NULL UNIQUE,
  key_prefix VARCHAR(8) NOT NULL,
  permissions JSONB DEFAULT '[]' NOT NULL,
  rate_limit INTEGER DEFAULT 1000 NOT NULL,
  allowed_domains JSONB DEFAULT '[]' NOT NULL,
  is_active BOOLEAN DEFAULT true NOT NULL,
  expires_at TIMESTAMP,
  last_used_at TIMESTAMP,
  revoked_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT now() NOT NULL,
  updated_at TIMESTAMP DEFAULT now() NOT NULL
);
```

## Security

### Key Storage
- API keys are hashed using SHA-256 before being stored in the database
- Only the hash is stored, not the plain-text key
- The full key is only shown once during creation

### Key Format
- Prefix: `xv_` (for easy identification)
- Length: 67 characters total (3 char prefix + 64 hex chars)
- Example: `xv_2c20a1b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1`

### Rate Limiting
- Each API key has a configurable rate limit (requests per hour)
- Default: 1000 requests/hour
- Rate limits are enforced per key

### CORS Configuration
- Optional `allowedDomains` field for restricting which domains can use the key
- Empty array means no CORS restrictions

## Authentication (Development)

Currently, the API uses a simple `X-User-ID` header for development purposes. 

**Production TODO:**
- Implement proper JWT-based authentication
- Add OAuth2/OpenID Connect support
- Implement session management

## Usage in Dashboard

The dashboard provides a user-friendly interface for managing API keys:

1. **View all keys**: Shows a table with masked keys, rate limits, and status
2. **Create new key**: Modal with form for key name, rate limit, and allowed domains
3. **Revoke key**: Confirmation dialog before revoking
4. **Copy key**: One-click copy to clipboard (only available immediately after creation)
5. **View statistics**: Per-key transaction statistics and recent activity

## Migration

To apply the database schema changes, run:

```bash
cd apps/api
pnpm run db:push
```

Or to generate and run migrations:

```bash
pnpm run db:generate
pnpm run db:migrate
```
