---
title: "API Key Management"
description: "Generate, list, revoke, and configure API keys for integrating with the x402 VeChain Facilitator"
category: "api"
---

# API Key Management

The API key management system allows users to generate and manage keys for integrating with the x402 VeChain Facilitator.

## Features

- Generate API keys with `xv_` prefix
- List/revoke keys
- Set rate limits per key
- Configure allowed domains (CORS)
- Key usage statistics
- Masked key display (`xv_****...1234`)
- Copy to clipboard (one-time, on creation)
- Revoke confirmation

## API Endpoints

### Create API Key

```
POST /api/keys
X-User-ID: <user-uuid>
Content-Type: application/json
```

```json
{
  "name": "Production API Key",
  "rateLimit": 1000,
  "allowedDomains": ["example.com"],
  "permissions": []
}
```

**Response:**
```json
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

> The full API key is returned **only once** at creation. Store it securely.

### List API Keys

```
GET /api/keys
X-User-ID: <user-uuid>
```

Returns all keys for the authenticated user with masked display values. Keys are ordered newest first.

### Get API Key Details

```
GET /api/keys/:id
X-User-ID: <user-uuid>
```

### Update API Key

```
PATCH /api/keys/:id
X-User-ID: <user-uuid>
Content-Type: application/json
```

```json
{
  "name": "Updated API Key Name",
  "rateLimit": 2000,
  "allowedDomains": ["example.com", "app.example.com"]
}
```

### Revoke API Key

```
DELETE /api/keys/:id
X-User-ID: <user-uuid>
```

### Get API Key Usage Statistics

```
GET /api/keys/:id/stats
X-User-ID: <user-uuid>
```

**Response:**
```json
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
  "recentTransactions": [...]
}
```

## Database Schema

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

| Feature | Detail |
|---------|--------|
| Key storage | SHA-256 hashed before storage; plain text never persisted |
| Key format | `xv_` prefix + 64 hex chars = 67 chars total |
| Rate limiting | Per-key configurable limit (default: 1000 req/hour) |
| CORS | Optional `allowedDomains`; empty array = no restriction |

## Authentication Note

The `/api/keys` routes currently use an `X-User-ID` header for development.

**Production TODO:** Replace with JWT-based authentication (see `apps/api/src/routes/apiKeys.ts`).

## Running Migrations

```bash
cd apps/api
pnpm run db:push
# or
pnpm run db:generate && pnpm run db:migrate
```
