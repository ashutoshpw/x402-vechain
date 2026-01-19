---
title: Error Codes
description: Complete reference of API error codes and responses
---

This page documents all error codes and responses returned by the x402.vet facilitator API.

## HTTP Status Codes

| Code | Status | Description |
|------|--------|-------------|
| `200` | OK | Request succeeded |
| `400` | Bad Request | Invalid input or malformed request |
| `402` | Payment Required | Payment is required to access resource |
| `403` | Forbidden | Payment verification failed |
| `404` | Not Found | Resource not found |
| `429` | Too Many Requests | Rate limit exceeded |
| `500` | Internal Server Error | Server-side error |

## Error Response Format

All errors follow this format:

```json
{
  "error": "Error message",
  "details": "Optional additional details",
  "reason": "Optional specific reason"
}
```

## 400 Bad Request Errors

### Missing Required Field

```json
{
  "error": "Invalid request",
  "details": "paymentPayload is required"
}
```

**Cause**: Required field missing from request body

**Solution**: Include all required fields

### Invalid JSON

```json
{
  "error": "Invalid JSON",
  "details": "Unexpected token"
}
```

**Cause**: Malformed JSON in request body

**Solution**: Validate JSON syntax

### Invalid Base64

```json
{
  "error": "Invalid payment payload",
  "details": "Not a valid base64 string"
}
```

**Cause**: `paymentPayload` is not valid base64

**Solution**: Encode payload correctly

### Invalid Address Format

```json
{
  "error": "Invalid address format",
  "details": "Address must start with 0x and be 42 characters"
}
```

**Cause**: Malformed VeChain address

**Solution**: Use valid 0x-prefixed address

## 402 Payment Required

Returned by protected endpoints when no payment is provided.

```json
{
  "error": "Payment required",
  "requirements": {
    "paymentOptions": [{
      "network": "eip155:100009",
      "asset": "VET",
      "amount": "100000000000000000",
      "recipient": "0x..."
    }],
    "merchantId": "merchant-id"
  }
}
```

**Cause**: Request to protected resource without payment

**Solution**: Include `X-Payment-Proof` header with valid payment

## 403 Forbidden Errors

### Payment Verification Failed

```json
{
  "error": "Payment verification failed",
  "reason": "Payment amount does not match requirements"
}
```

**Common Reasons**:
- `No supported network found in payment options`
- `Asset not supported on network`
- `Payment amount does not match requirements`
- `Payment recipient does not match requirements`
- `Invalid payment signature`
- `Payment has expired`
- `Payment nonce already used`

**Solution**: Create valid payment matching requirements

### Invalid Signature

```json
{
  "error": "Invalid payment signature"
}
```

**Cause**: Signature verification failed

**Solution**: Ensure transaction is signed correctly

## 404 Not Found Errors

### Endpoint Not Found

```json
{
  "error": "Not found"
}
```

**Cause**: Invalid endpoint URL

**Solution**: Check API documentation for correct endpoint

### Fee Delegation Not Available

```json
{
  "error": "Fee delegation is not enabled"
}
```

**Cause**: Accessing fee delegation endpoints when feature is disabled

**Solution**: Enable fee delegation or use standard transactions

## 429 Too Many Requests

### Rate Limit Exceeded

```json
{
  "error": "Rate limit exceeded",
  "retryAfter": 900
}
```

**Headers**:
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 2024-12-31T23:59:59Z
```

**Cause**: Too many requests from IP address

**Solution**: Wait for rate limit to reset (check `retryAfter` seconds)

### Fee Delegation Rate Limit

```json
{
  "error": "Fee delegation rate limit exceeded",
  "details": "Maximum 10 transactions per hour per address"
}
```

**Cause**: Too many fee-delegated transactions

**Solution**: Wait one hour or use standard transactions

## 500 Internal Server Error

### Transaction Submission Failed

```json
{
  "error": "Failed to submit transaction to blockchain",
  "details": "Connection timeout"
}
```

**Cause**: Blockchain node unavailable or timeout

**Solution**: Retry request

### Database Error

```json
{
  "error": "Database error"
}
```

**Cause**: Database connection or query failed

**Solution**: Retry request, contact support if persistent

### Insufficient Balance

```json
{
  "error": "Insufficient VTHO balance in delegation account"
}
```

**Cause**: Fee delegation account out of VTHO

**Solution**: Contact facilitator admin to fund delegation account

## Blockchain-Level Errors

These errors occur during transaction settlement:

### Insufficient Balance for Transfer

```json
{
  "success": false,
  "error": "Insufficient balance for transfer",
  "networkId": "eip155:100009"
}
```

**Cause**: Sender doesn't have enough VET/tokens

**Solution**: Fund sender wallet

### Insufficient VTHO for Gas

```json
{
  "success": false,
  "error": "Insufficient VTHO for gas",
  "networkId": "eip155:100009"
}
```

**Cause**: Sender doesn't have VTHO for gas fees

**Solution**: Add VTHO to wallet or use fee delegation

### Transaction Reverted

```json
{
  "success": false,
  "error": "Transaction reverted",
  "networkId": "eip155:100009"
}
```

**Cause**: Smart contract execution failed

**Solution**: Check token contract, verify token balance

### Transaction Gas Exceeds Maximum

```json
{
  "success": false,
  "error": "Transaction gas exceeds maximum limit",
  "details": "Gas required: 15 VTHO, maximum: 10 VTHO"
}
```

**Cause**: Transaction requires too much gas for fee delegation

**Solution**: Reduce transaction complexity or use standard flow

## Client-Side Error Handling

### Example: Comprehensive Error Handler

```typescript
async function handleSettlement(payload, requirements) {
  try {
    const response = await fetch('https://facilitator.example.com/settle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paymentPayload: payload, paymentRequirements: requirements }),
    });

    const data = await response.json();

    switch (response.status) {
      case 200:
        if (data.success) {
          console.log('✓ Payment settled:', data.transactionHash);
          return data;
        } else {
          console.error('✗ Settlement failed:', data.error);
          // Handle blockchain-level errors
          return null;
        }

      case 400:
        console.error('✗ Bad request:', data.details);
        // Fix request format
        return null;

      case 403:
        console.error('✗ Payment invalid:', data.reason);
        // Create new payment
        return null;

      case 429:
        console.warn('⏳ Rate limited, retry after', data.retryAfter, 'seconds');
        // Wait and retry
        await new Promise(resolve => setTimeout(resolve, data.retryAfter * 1000));
        return handleSettlement(payload, requirements);

      case 500:
        console.error('✗ Server error:', data.error);
        // Retry after delay
        await new Promise(resolve => setTimeout(resolve, 5000));
        return handleSettlement(payload, requirements);

      default:
        console.error('✗ Unexpected error:', response.status);
        return null;
    }
  } catch (error) {
    console.error('✗ Network error:', error.message);
    return null;
  }
}
```

## Next Steps

- [Troubleshooting](/troubleshooting/errors) - Common issues and solutions
- [FAQ](/troubleshooting/faq) - Frequently asked questions
- [API Overview](/api/overview) - Complete API reference
