# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2024-01-18

### Added

- Initial release of @x402/vechain SDK
- Client-side utilities for browser wallet integration
  - `createPaymentPayload()` - Create signed payment payloads
  - `x402Fetch()` - Enhanced fetch with automatic payment handling
  - `getSupported()` - Query facilitator for supported networks/assets
  - `generateNonce()` - Generate secure random nonces
- Server-side middleware for Hono framework
  - `paymentMiddleware()` - Protect routes with payment verification
  - `verifyPayment()` - Standalone payment verification function
  - `settlePayment()` - Submit payments to blockchain via facilitator
- Complete TypeScript type definitions
  - Payment protocol types (PaymentRequirements, PaymentPayload, etc.)
  - Client and server interfaces
- Comprehensive documentation
  - Main README with API reference
  - Client and server usage examples
  - Integration patterns and best practices
- Support for VeChain blockchain
  - Testnet (eip155:100009)
  - Mainnet (eip155:100010)
  - VET and VTHO assets
- x402 protocol compliance
  - CAIP-2 network identifiers
  - Signature verification (secp256k1)
  - Nonce-based replay protection

### Security

- Cryptographic signature verification using VeChain SDK
- Replay attack prevention with nonce tracking
- Timestamp validation for payment expiration

[0.1.0]: https://github.com/ashutoshpw/x402-vechain/releases/tag/v0.1.0
