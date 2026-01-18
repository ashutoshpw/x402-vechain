# AI Agent x402 Example

An autonomous bot that makes paid API calls using the x402 protocol on VeChain. Demonstrates automated payment handling with retry logic and error recovery.

## What This Example Shows

- ✅ Autonomous payment handling
- ✅ Private key wallet integration
- ✅ Automatic retry logic with exponential backoff
- ✅ Periodic task scheduling
- ✅ Payment tracking and statistics
- ✅ Error handling and recovery
- ✅ Multiple data source fetching

## Use Cases

This pattern is useful for:

- **Data Aggregation Bots** - Collect data from paid APIs automatically
- **Monitoring Services** - Pay-per-query monitoring endpoints
- **Automated Trading** - Access paid market data feeds
- **Content Scrapers** - Access premium content programmatically
- **API Testing** - Automated testing of payment-protected endpoints

## Quick Start

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Configure Environment

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` and add your configuration:

```bash
# Required: Private key for the agent's wallet
AGENT_PRIVATE_KEY=your-private-key-here

# Optional: Customize these if needed
API_URL=http://localhost:3001
FACILITATOR_URL=http://localhost:3000
MAX_AMOUNT=1000000000000000000  # 1 VET in wei
POLLING_INTERVAL=60000           # 1 minute
```

**⚠️ Security Warning**: Never commit your `.env` file with real private keys!

### 3. Get Testnet Funds

The agent needs VET to make payments. Get free testnet VET:

1. Generate an address from your private key
2. Visit [VeChain Faucet](https://faucet.vecha.in/)
3. Request testnet VET

### 4. Run the Agent

```bash
pnpm start
```

The agent will:
1. Start up and display configuration
2. Make its first paid API request immediately
3. Continue making requests at the configured interval
4. Automatically handle payments
5. Retry failed requests with exponential backoff
6. Display statistics when stopped (Ctrl+C)

## How It Works

### Basic Flow

```typescript
// 1. Create wallet from private key
const wallet = new PrivateKeyWalletAdapter(privateKey);

// 2. Make paid API request
const response = await x402Fetch(apiUrl, {
  facilitatorUrl,
  wallet,
  maxAmount: '1000000000000000000', // Safety limit
});

// 3. Payment is handled automatically!
const data = await response.json();
```

### Architecture

```
┌─────────────────────────────────────────────┐
│           AI Agent (Autonomous)             │
│                                             │
│  ┌────────────────────────────────────┐    │
│  │  Task Scheduler (Periodic)         │    │
│  └────────────┬───────────────────────┘    │
│               │                             │
│               ▼                             │
│  ┌────────────────────────────────────┐    │
│  │  x402 Client (Automatic Payment)   │    │
│  └────────────┬───────────────────────┘    │
│               │                             │
│               ▼                             │
│  ┌────────────────────────────────────┐    │
│  │  Private Key Wallet (Auto-Sign)    │    │
│  └────────────────────────────────────┘    │
└───────────────┬─────────────────────────────┘
                │
                ▼
┌───────────────────────────────────────────┐
│        Payment-Protected API Server       │
└───────────────────────────────────────────┘
```

### Agent Features

**1. Automatic Payment Handling**
```typescript
const response = await x402Fetch(url, {
  wallet,
  onPaymentRequired: async (requirements) => {
    console.log('💰 Making payment...');
    // Wallet signs automatically!
  },
});
```

**2. Retry Logic**
```typescript
for (let i = 1; i <= maxRetries; i++) {
  const delay = Math.min(1000 * Math.pow(2, i - 1), 10000);
  await sleep(delay);
  // Retry with exponential backoff
}
```

**3. Statistics Tracking**
```typescript
private requestCount = 0;
private paymentCount = 0;
private totalSpent = 0n;
```

## Configuration Options

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `AGENT_PRIVATE_KEY` | Private key for agent's wallet | - | ✅ Yes |
| `API_URL` | Payment-protected API endpoint | `http://localhost:3001` | No |
| `FACILITATOR_URL` | x402 facilitator URL | `http://localhost:3000` | No |
| `MAX_AMOUNT` | Max spend per request (wei) | `1000000000000000000` | No |
| `POLLING_INTERVAL` | Time between requests (ms) | `60000` | No |

### Safety Limits

The `MAX_AMOUNT` setting prevents excessive spending:

```typescript
maxAmount: '1000000000000000000'  // Won't pay more than 1 VET
```

If a request requires more than this amount, it will be rejected.

## Example Output

```
╔═══════════════════════════════════════════════════════════╗
║              x402 AI Agent - VeChain Edition              ║
╚═══════════════════════════════════════════════════════════╝

🤖 AI Agent Starting...

Wallet Address: 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb
API URL: http://localhost:3001
Facilitator URL: http://localhost:3000
Max Amount per Request: 1000000000000000000 wei
Polling Interval: 60s

✅ Agent started. Press Ctrl+C to stop.

[2024-01-18T20:00:00.000Z] Task #1
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📡 Fetching premium data...
💳 Payment required!
💰 Paying 10000000000000000 wei of VET...
✅ Task completed successfully
Response: {
  "message": "Here is your premium data!",
  "data": {
    "secret": "The answer is 42",
    "timestamp": "2024-01-18T20:00:00.000Z"
  }
}

[2024-01-18T20:01:00.000Z] Task #2
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
...

^C
🛑 Stopping agent...

📊 Agent Statistics
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total Requests: 5
Payments Made: 5
Total Spent: 50000000000000000 wei
Avg per Payment: 10000000000000000 wei
```

## Advanced Usage

### Multi-Source Agent

Fetch from multiple endpoints:

```typescript
import { MultiSourceAgent } from './agent.js';

const agent = new MultiSourceAgent(config);
await agent.fetchFromAllSources();
```

### Custom Agent

Extend the base agent:

```typescript
class CustomAgent extends X402Agent {
  async processData(data: any) {
    // Your custom logic
  }
}
```

## Error Handling

The agent handles various error scenarios:

**Network Errors**
- Automatic retry with exponential backoff
- Configurable retry count

**Payment Failures**
- Logs payment errors
- Continues to next scheduled task

**Insufficient Funds**
- Agent stops and reports error
- Check wallet balance

## Monitoring

### Real-time Logs

The agent provides detailed logging:
- Task execution timestamps
- Payment amounts and assets
- Success/failure status
- Retry attempts

### Statistics

Press Ctrl+C to see statistics:
- Total requests made
- Payments completed
- Total amount spent
- Average cost per request

## Production Considerations

1. **Key Management**
   - Use secure key storage (e.g., AWS KMS, HashiCorp Vault)
   - Never commit keys to version control
   - Rotate keys regularly

2. **Monitoring**
   - Add external monitoring (Datadog, New Relic, etc.)
   - Set up alerts for failures
   - Track spending limits

3. **Rate Limiting**
   - Respect API rate limits
   - Add backoff for rate limit errors
   - Monitor request patterns

4. **Error Handling**
   - Log errors to external service
   - Implement circuit breakers
   - Add dead letter queue for failed requests

5. **Budget Control**
   - Set daily/monthly spending limits
   - Monitor wallet balance
   - Auto-refill mechanism

## Security Best Practices

1. **Private Key Security**
   ```bash
   # Generate a new key for testing
   openssl rand -hex 32
   
   # Never use production keys in test environments
   # Never commit .env files
   ```

2. **Network Security**
   - Use HTTPS for all API calls
   - Verify TLS certificates
   - Use VPN for sensitive operations

3. **Access Control**
   - Limit agent permissions
   - Use separate keys per environment
   - Implement least privilege principle

## Troubleshooting

### "AGENT_PRIVATE_KEY is required"
Set the private key in `.env`:
```bash
AGENT_PRIVATE_KEY=your-64-character-hex-key
```

### "Insufficient funds"
Get testnet VET from the faucet:
https://faucet.vecha.in/

### Payment verification fails
- Check facilitator is running
- Verify network configuration
- Check wallet has enough VTHO for gas

### Connection refused
- Ensure API server is running on correct port
- Check firewall settings
- Verify URLs in configuration

## Next Steps

- **Content Paywall**: See a full-stack example in [content-paywall](../content-paywall)
- **Minimal Server**: Learn server setup in [minimal-server](../minimal-server)
- **SDK Documentation**: Read [@x402/vechain docs](../../packages/x402-vechain/README.md)

## Related Documentation

- [x402 Protocol Specification](https://github.com/coinbase/x402)
- [VeChain SDK](https://github.com/vechain/vechain-sdk-js)
- [VeChain Documentation](https://docs.vechain.org/)
