This service provides the minimal x402 protocol scaffolding for VeChain. It exposes placeholder API routes for verification, settlement, and supported assets/networks.

## x402 API Endpoints

- `GET /supported` returns supported VeChain networks and tokens with CAIP-2 IDs.
- `POST /verify` placeholder for payment verification.
- `POST /settle` placeholder for payment settlement.

### Supported Networks & Tokens

- VeChain Mainnet (`vechain:100010`)
  - VET
  - VTHO
  - VEUSD
  - B3TR

## Development

Prerequisites:

- [Vercel CLI](https://vercel.com/docs/cli) installed globally

To develop locally:

```
npm install
vc dev
```

```
open http://localhost:3000
```

To build locally:

```
npm install
vc build
```

To deploy:

```
npm install
vc deploy
```
