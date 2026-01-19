/**
 * AI Agent x402 Example
 * 
 * An autonomous bot that makes paid API calls using x402 protocol.
 * Demonstrates automated payment handling with retry logic and error recovery.
 */

import { x402Fetch, createPaymentPayloadWithWallet, PrivateKeyWalletAdapter } from '@x402/vechain';

// Configuration
interface AgentConfig {
  apiUrl: string;
  facilitatorUrl: string;
  privateKey: string;
  maxAmountPerRequest: string;
  pollingInterval: number; // in milliseconds
  maxRetries: number;
}

const config: AgentConfig = {
  apiUrl: process.env.API_URL || 'http://localhost:3001',
  facilitatorUrl: process.env.FACILITATOR_URL || 'http://localhost:3000',
  privateKey: process.env.AGENT_PRIVATE_KEY || '',
  maxAmountPerRequest: process.env.MAX_AMOUNT || '1000000000000000000', // 1 VET
  pollingInterval: parseInt(process.env.POLLING_INTERVAL || '60000', 10), // 1 minute
  maxRetries: 3,
};

/**
 * AI Agent class for autonomous x402 payments
 */
class X402Agent {
  private wallet: PrivateKeyWalletAdapter;
  private running: boolean = false;
  private requestCount: number = 0;
  private paymentCount: number = 0;
  private totalSpent: bigint = 0n;

  constructor(private config: AgentConfig) {
    if (!config.privateKey) {
      throw new Error('AGENT_PRIVATE_KEY environment variable is required');
    }
    
    this.wallet = new PrivateKeyWalletAdapter(config.privateKey);
  }

  /**
   * Start the agent
   */
  async start() {
    console.log('🤖 AI Agent Starting...\n');
    
    const address = await this.wallet.getAddress();
    console.log(`Wallet Address: ${address}`);
    console.log(`API URL: ${this.config.apiUrl}`);
    console.log(`Facilitator URL: ${this.config.facilitatorUrl}`);
    console.log(`Max Amount per Request: ${this.config.maxAmountPerRequest} wei`);
    console.log(`Polling Interval: ${this.config.pollingInterval / 1000}s\n`);
    
    this.running = true;
    
    // Run first task immediately
    await this.runTask();
    
    // Schedule periodic tasks
    const interval = setInterval(async () => {
      if (!this.running) {
        clearInterval(interval);
        return;
      }
      
      await this.runTask();
    }, this.config.pollingInterval);
    
    console.log('✅ Agent started. Press Ctrl+C to stop.\n');
  }

  /**
   * Stop the agent
   */
  stop() {
    console.log('\n🛑 Stopping agent...');
    this.running = false;
    this.printStats();
  }

  /**
   * Run a single task
   */
  private async runTask() {
    this.requestCount++;
    console.log(`\n[${ new Date().toISOString() }] Task #${this.requestCount}`);
    console.log('━'.repeat(60));
    
    try {
      // Fetch premium data with automatic payment
      const data = await this.fetchPremiumData();
      console.log('✅ Task completed successfully');
      console.log('Response:', JSON.stringify(data, null, 2));
    } catch (error: any) {
      console.error('❌ Task failed:', error.message);
      
      // Retry logic
      await this.retryTask();
    }
  }

  /**
   * Fetch premium data with payment
   */
  private async fetchPremiumData(): Promise<any> {
    console.log('📡 Fetching premium data...');
    
    const response = await x402Fetch(`${this.config.apiUrl}/premium/data`, {
      facilitatorUrl: this.config.facilitatorUrl,
      wallet: this.wallet,
      maxAmount: this.config.maxAmountPerRequest,
      onPaymentRequired: async (requirements) => {
        console.log('💳 Payment required!');
        console.log('Payment options:', requirements.paymentOptions);
        
        const option = requirements.paymentOptions[0];
        console.log(`💰 Paying ${option.amount} wei of ${option.asset}...`);
        
        this.paymentCount++;
        this.totalSpent += BigInt(option.amount);
        
        return null; // Let x402Fetch handle it with the wallet
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  }

  /**
   * Retry failed task
   */
  private async retryTask() {
    for (let i = 1; i <= this.config.maxRetries; i++) {
      console.log(`🔄 Retry attempt ${i}/${this.config.maxRetries}...`);
      
      // Exponential backoff
      const delay = Math.min(1000 * Math.pow(2, i - 1), 10000);
      await this.sleep(delay);
      
      try {
        const data = await this.fetchPremiumData();
        console.log('✅ Retry successful');
        console.log('Response:', JSON.stringify(data, null, 2));
        return;
      } catch (error: any) {
        console.error(`❌ Retry ${i} failed:`, error.message);
      }
    }
    
    console.error('💥 All retries exhausted');
  }

  /**
   * Print agent statistics
   */
  private printStats() {
    console.log('\n📊 Agent Statistics');
    console.log('━'.repeat(60));
    console.log(`Total Requests: ${this.requestCount}`);
    console.log(`Payments Made: ${this.paymentCount}`);
    console.log(`Total Spent: ${this.totalSpent} wei`);
    console.log(`Avg per Payment: ${this.paymentCount > 0 ? this.totalSpent / BigInt(this.paymentCount) : 0} wei`);
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Advanced agent with multiple data sources
 */
class MultiSourceAgent extends X402Agent {
  private dataSources = [
    { endpoint: '/premium/data', name: 'Premium Data' },
    { endpoint: '/premium/content', name: 'Premium Content' },
  ];

  /**
   * Fetch from multiple sources
   */
  async fetchFromAllSources() {
    console.log('\n📚 Fetching from all data sources...\n');
    
    const results = await Promise.allSettled(
      this.dataSources.map(async (source) => {
        console.log(`Fetching ${source.name}...`);
        
        const response = await x402Fetch(
          `${this.config.apiUrl}${source.endpoint}`,
          {
            facilitatorUrl: this.config.facilitatorUrl,
            wallet: this.wallet,
            maxAmount: this.config.maxAmountPerRequest,
          }
        );
        
        const data = await response.json();
        return { source: source.name, data };
      })
    );
    
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        console.log(`✅ ${this.dataSources[index].name}:`, result.value);
      } else {
        console.error(`❌ ${this.dataSources[index].name}:`, result.reason);
      }
    });
  }
}

// Main execution
async function main() {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║              x402 AI Agent - VeChain Edition              ║
╚═══════════════════════════════════════════════════════════╝
  `);

  // Validate configuration
  if (!config.privateKey) {
    console.error('❌ Error: AGENT_PRIVATE_KEY environment variable is required');
    console.error('\nSet it in your .env file or environment:');
    console.error('  export AGENT_PRIVATE_KEY=your-private-key-here\n');
    process.exit(1);
  }

  // Create and start agent
  const agent = new X402Agent(config);
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    agent.stop();
    process.exit(0);
  });
  
  process.on('SIGTERM', () => {
    agent.stop();
    process.exit(0);
  });
  
  // Start the agent
  await agent.start();
}

// Run if executed directly (cross-platform compatible check)
const scriptPath = process.argv[1] ? new URL(process.argv[1], 'file:').href : '';
if (import.meta.url === scriptPath) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { X402Agent, MultiSourceAgent };
