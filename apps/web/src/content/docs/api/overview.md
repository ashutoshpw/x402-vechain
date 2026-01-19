---
title: API Overview
description: Overview of the x402.vet facilitator API
---

The x402.vet facilitator API implements the [x402 protocol specification](https://github.com/coinbase/x402) for VeChain blockchain. It provides endpoints for payment verification, settlement, and querying supported networks.

## Base URL

```
https://your-facilitator.example.com
```

For local development:
```
http://localhost:3000
```

## Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/` | API information and health check |
| `GET` | `/supported` | Get supported networks and assets |
| `POST` | `/verify` | Verify payment without settlement |
| `POST` | `/settle` | Submit payment to blockchain |
| `GET` | `/fee-delegation/status` | Fee delegation status |
| `GET` | `/fee-delegation/stats/:address` | Delegation stats for address |
| `GET` | `/fee-delegation/total-spent` | Total VTHO spent on delegation |

## Authentication

Most endpoints are public and don't require authentication. However, rate limiting is applied based on IP address.

## Rate Limiting

The API implements rate limiting to prevent abuse:

- **Default Limit**: 100 requests per 15 minutes per IP address
- **Configurable**: Set via `RATE_LIMIT_REQUESTS_PER_MINUTE` environment variable

### Rate Limit Headers

Every response includes rate limit information:

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 2024-12-31T23:59:59Z
```

### Rate Limit Exceeded

When rate limit is exceeded, the API returns:

**Status Code**: `429 Too Many Requests`

**Response**:
```json
{
  "error": "Rate limit exceeded",
  "retryAfter": 900
}
```

## CORS

The API supports Cross-Origin Resource Sharing (CORS) to allow requests from web browsers.

**Allowed Origins**: Configurable via environment
**Allowed Methods**: `GET, POST, OPTIONS`
**Allowed Headers**: `Content-Type, Authorization, X-Payment-Proof`

## Content Types

### Request Content Type

```http
Content-Type: application/json
```

### Response Content Type

```http
Content-Type: application/json
```

## Error Handling

All errors follow a consistent format:

```json
{
  "error": "Error message",
  "details": "Optional additional details"
}
```

### HTTP Status Codes

| Code | Description |
|------|-------------|
| `200` | Success |
| `400` | Bad Request - Invalid input |
| `402` | Payment Required |
| `403` | Forbidden - Invalid payment |
| `404` | Not Found |
| `429` | Too Many Requests - Rate limit exceeded |
| `500` | Internal Server Error |

## Network Identifiers

The API uses [CAIP-2](https://github.com/ChainAgnostic/CAIPs/blob/master/CAIPs/caip-2.md) format for network identifiers:

- **VeChain Testnet**: `eip155:100009`
- **VeChain Mainnet**: `eip155:100010`

Alternative format `vechain:100009` is also accepted and normalized to `eip155:100009`.

## Asset Identifiers

- **VET** (native): `VET` or `native`
- **VTHO**: `VTHO`
- **VEUSD**: `VEUSD`
- **B3TR**: `B3TR`
- **VIP-180 Tokens**: Contract address (e.g., `0x...`)

## Amount Format

Amounts are always specified as **strings** in **wei** (smallest unit):

- 1 VET = `1000000000000000000` wei
- 1 VTHO = `1000000000000000000` wei

**Why strings?** JavaScript numbers lose precision with large values. Always use strings for amounts.

## Next Steps

- [GET /supported](/api/supported) - Query supported networks and assets
- [POST /verify](/api/verify) - Verify payments without settlement
- [POST /settle](/api/settle) - Submit payments to blockchain
- [Fee Delegation Endpoints](/api/fee-delegation) - Fee delegation API
- [Error Codes](/api/errors) - Complete error reference
