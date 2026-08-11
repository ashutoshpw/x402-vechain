---
title: GET /supported
description: Get supported networks and assets
---

Returns a list of blockchain networks and assets supported by the facilitator.

The facilitator is a **per-network deployment**: each running instance serves exactly one VeChain network, selected by the `VECHAIN_NETWORK` environment variable (`testnet` or `mainnet`). `/supported` always returns a single-element `networks` array for the network that instance is deployed against — never both at once. To support both networks, run two separate instances (e.g. `facilitator-testnet.example.com` and `facilitator.example.com`), each with its own `DATABASE_URL` and `VECHAIN_NETWORK`.

## Endpoint

```
GET /supported
```

## Request

No parameters required.

### Example Request

```bash
curl https://facilitator.example.com/supported
```

## Response

### Success (200 OK)

A testnet-deployed instance (`VECHAIN_NETWORK=testnet`) responds with:

```json
{
  "networks": [
    {
      "network": "eip155:100009",
      "assets": ["VET", "VTHO", "B3TR"]
    }
  ],
  "schemes": ["x402"]
}
```

A mainnet-deployed instance (`VECHAIN_NETWORK=mainnet`) responds with:

```json
{
  "networks": [
    {
      "network": "eip155:100010",
      "assets": ["VET", "VTHO", "B3TR"]
    }
  ],
  "schemes": ["x402"]
}
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `networks` | Array | List of supported networks |
| `networks[].network` | String | CAIP-2 network identifier |
| `networks[].assets` | String[] | Supported assets on this network |
| `schemes` | String[] | Supported payment schemes (always `["x402"]`) |

## Network Details

Each deployed instance only supports one of the following, per its `VECHAIN_NETWORK` setting.

### VeChain Testnet

**Network ID**: `eip155:100009`

**Supported Assets**:
- `VET` - VeChain Token (native)
- `VTHO` - VeThor Token
- `B3TR` - Better Token

**RPC URL**: `https://testnet.vechain.org`

### VeChain Mainnet

**Network ID**: `eip155:100010`

**Supported Assets**:
- `VET` - VeChain Token (native)
- `VTHO` - VeThor Token
- `B3TR` - Better Token

**RPC URL**: `https://mainnet.vechain.org`

No USD stablecoin is currently supported. VeUSD's custodian, Prime Trust, went bankrupt in 2023, leaving VeChain without a healthy USD stablecoin; support will be revisited if a bridged USDC (or equivalent) becomes available.

## Usage in Client Applications

Use this endpoint to:

1. **Discover available networks** - Check which VeChain network the facilitator supports
2. **Validate payment options** - Ensure requested asset is supported
3. **Display payment options** - Show users available payment methods

### Example: Query Supported Networks

```typescript
import { getSupported } from '@x402/vechain';

const supported = await getSupported('https://facilitator.example.com');

console.log('Supported networks:', supported.networks);
// [{ network: 'eip155:100009', assets: ['VET', 'VTHO', 'B3TR'] }]

// Check if VET is supported
const hasVET = supported.networks.some(n => 
  n.assets.includes('VET')
);
```

### Example: Validate Payment Option

```typescript
async function validatePaymentOption(
  facilitatorUrl: string,
  network: string,
  asset: string
): Promise<boolean> {
  const supported = await getSupported(facilitatorUrl);
  
  const networkSupport = supported.networks.find(
    n => n.network === network
  );
  
  return networkSupport?.assets.includes(asset) ?? false;
}

// Usage
const isValid = await validatePaymentOption(
  'https://facilitator.example.com',
  'eip155:100009',
  'VET'
);
```

## Error Responses

### 500 Internal Server Error

```json
{
  "error": "Internal server error"
}
```

## Rate Limiting

This endpoint is subject to rate limiting. See [API Overview](/api/overview#rate-limiting) for details.

## Next Steps

- [POST /verify](/api/verify) - Verify payments
- [POST /settle](/api/settle) - Submit payments
- [Token Support](/guides/tokens) - Learn about supported tokens
