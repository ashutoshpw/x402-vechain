---
title: Wallet Integration
description: Complete guide to integrating VeChain wallets with x402.vet for seamless payment signing
---

This guide covers everything you need to know about integrating VeChain wallets into your x402.vet application. Learn how to connect to VeWorld, Connex, and implement custom wallet adapters.

## Overview

The x402.vet SDK provides a unified `WalletAdapter` interface that works with all major VeChain wallets. This allows your application to support multiple wallets without changing your code.

**Supported Wallets:**
- 🦊 **VeWorld** - Browser extension and mobile app
- 🔄 **Connex** - VeChain Sync and Sync2 desktop wallets
- 🔑 **Private Key** - For development and testing only

## Quick Start

### Auto-Detect Wallet

The easiest way to get started:

```typescript
import { autoDetectWallet } from '@x402/vechain';

// Automatically find and connect to available wallet
const wallet = autoDetectWallet();

if (wallet) {
  const address = await wallet.getAddress();
  console.log('Connected to:', address);
} else {
  console.error('No VeChain wallet found');
}
```

### Using with x402Fetch

```typescript
import { x402Fetch, autoDetectWallet } from '@x402/vechain';

const wallet = autoDetectWallet();

const response = await x402Fetch('https://api.example.com/premium', {
  facilitatorUrl: 'https://facilitator.example.com',
  wallet,  // Automatically signs payments
});
```

## Wallet Detection

### Detect All Available Wallets

Check which wallets are installed in the user's browser:

```typescript
import { detectWallets } from '@x402/vechain';

const wallets = detectWallets();
console.log('Available wallets:', wallets);
// Output: ['veworld', 'connex'] or ['veworld'] or []

// Check for specific wallet
if (wallets.includes('veworld')) {
  console.log('VeWorld is available');
}

if (wallets.includes('connex')) {
  console.log('Connex (VeChain Sync) is available');
}

if (wallets.length === 0) {
  console.log('No VeChain wallet detected');
  // Show installation instructions
}
```

### Detection Priority

`autoDetectWallet()` checks for wallets in this order:

1. **VeWorld** (`window.vechain`) - Mobile-friendly, modern UI
2. **Connex** (`window.connex`) - Desktop wallet, developer-focused

You can override this by manually creating a wallet adapter.

## VeWorld Integration

VeWorld is the official VeChain wallet with browser extension and mobile app support.

### Installation Check

```typescript
import { detectWallets } from '@x402/vechain';

const hasVeWorld = detectWallets().includes('veworld');

if (!hasVeWorld) {
  console.log('Please install VeWorld:');
  console.log('🌐 Browser: https://www.veworld.com/');
  console.log('📱 Mobile: Download from App Store or Google Play');
}
```

### Basic Usage

```typescript
import { VeWorldWalletAdapter } from '@x402/vechain';

// Create adapter
const wallet = new VeWorldWalletAdapter();

// Connect to wallet (prompts user)
await wallet.connect();

// Get connected address
const address = await wallet.getAddress();
console.log('Connected address:', address);

// Check connection status
const isConnected = await wallet.isConnected();
console.log('Is connected:', isConnected);
```

### Complete Integration Example

```typescript
import { VeWorldWalletAdapter, x402Fetch } from '@x402/vechain';

async function setupVeWorld() {
  // Check if VeWorld is installed
  if (!window.vechain) {
    alert('Please install VeWorld extension');
    window.open('https://www.veworld.com/', '_blank');
    return null;
  }

  // Create wallet adapter
  const wallet = new VeWorldWalletAdapter();

  try {
    // Connect (prompts user to approve connection)
    await wallet.connect();
    
    // Get address
    const address = await wallet.getAddress();
    console.log('Connected to VeWorld:', address);
    
    return wallet;
  } catch (error) {
    console.error('Failed to connect:', error);
    return null;
  }
}

// Use the wallet
const wallet = await setupVeWorld();

if (wallet) {
  const response = await x402Fetch('https://api.example.com/premium', {
    facilitatorUrl: 'https://facilitator.example.com',
    wallet,
  });
}
```

### Mobile Support

VeWorld mobile app uses QR codes for signing:

```typescript
import { VeWorldWalletAdapter } from '@x402/vechain';

const wallet = new VeWorldWalletAdapter();

try {
  // On mobile, this may show a QR code
  const signature = await wallet.signMessageHash(messageHash);
  console.log('Signature:', signature);
} catch (error) {
  if (error.message.includes('User rejected')) {
    console.log('User cancelled signing');
  }
}
```

### Account Switching

VeWorld supports multiple accounts. Detect when users switch:

```typescript
// Listen for account changes (VeWorld-specific)
if (window.vechain) {
  window.vechain.on('accountsChanged', (accounts) => {
    console.log('Active account changed to:', accounts[0]);
    // Re-connect wallet
    const wallet = new VeWorldWalletAdapter();
    // Update UI
  });
}
```

## Connex Integration

Connex is the standard interface for VeChain DApps, used by VeChain Sync desktop wallet.

### Installation Check

```typescript
import { detectWallets } from '@x402/vechain';

const hasConnex = detectWallets().includes('connex');

if (!hasConnex) {
  console.log('Please install VeChain Sync:');
  console.log('🖥️ Desktop: https://sync.vecha.in/');
}
```

### Basic Usage

```typescript
import { ConnexWalletAdapter } from '@x402/vechain';

// Use default window.connex
const wallet = new ConnexWalletAdapter();

// Get address (no explicit connection needed)
const address = await wallet.getAddress();
console.log('Connex address:', address);

// Check connection
const isConnected = await wallet.isConnected();
```

### With Custom Connex Instance

```typescript
import { ConnexWalletAdapter } from '@x402/vechain';
import Connex from '@vechain/connex';

// Create custom Connex instance
const connex = new Connex({
  node: 'https://testnet.vechain.org',
  network: 'test'
});

// Use custom instance
const wallet = new ConnexWalletAdapter(connex);
```

### Complete Integration Example

```typescript
import { ConnexWalletAdapter, x402Fetch } from '@x402/vechain';

async function setupConnex() {
  // Check if Connex is available
  if (!window.connex) {
    alert('Please install VeChain Sync');
    window.open('https://sync.vecha.in/', '_blank');
    return null;
  }

  // Create wallet adapter
  const wallet = new ConnexWalletAdapter();

  try {
    // Get address
    const address = await wallet.getAddress();
    console.log('Connected to Connex:', address);
    
    // Check network
    const network = window.connex.thor.genesis.id;
    console.log('Network:', network);
    
    return wallet;
  } catch (error) {
    console.error('Failed to connect:', error);
    return null;
  }
}

// Use the wallet
const wallet = await setupConnex();

if (wallet) {
  const response = await x402Fetch('https://api.example.com/premium', {
    facilitatorUrl: 'https://facilitator.example.com',
    wallet,
  });
}
```

### Network Detection

Check which VeChain network the user is connected to:

```typescript
const wallet = new ConnexWalletAdapter();

// Get genesis block ID
const genesisId = window.connex.thor.genesis.id;

// Check network
if (genesisId === '0x00000000851caf3cfdb6e899cf5958bfb1ac3413d346d43539627e6be7ec1b4a') {
  console.log('Connected to VeChain Mainnet');
} else if (genesisId === '0x000000000b2bce3c70bc649a02749e8687721b09ed2e15997f466536b20bb127') {
  console.log('Connected to VeChain Testnet');
} else {
  console.log('Connected to custom network');
}
```

## Private Key Wallet (Development)

For development and automated testing only. **Never use in production browsers!**

### Basic Usage

```typescript
import { PrivateKeyWalletAdapter } from '@x402/vechain';

// From environment variable
const wallet = new PrivateKeyWalletAdapter(process.env.PRIVATE_KEY);

// Get address
const address = await wallet.getAddress();
console.log('Address:', address);

// Always returns true
const isConnected = await wallet.isConnected();
```

### Testing Example

```typescript
import { x402Fetch, PrivateKeyWalletAdapter } from '@x402/vechain';

// Test private key (testnet only!)
const TEST_PRIVATE_KEY = process.env.TEST_PRIVATE_KEY;

async function runTest() {
  const wallet = new PrivateKeyWalletAdapter(TEST_PRIVATE_KEY);
  
  const response = await x402Fetch('http://localhost:3000/api/test', {
    facilitatorUrl: 'http://localhost:3000',
    wallet,
  });
  
  const data = await response.json();
  console.log('Test response:', data);
}

runTest();
```

### Security Warning

⚠️ **Never use PrivateKeyWalletAdapter in:**
- Production client applications
- Browser environments
- Public repositories (hardcoded keys)

✅ **Safe uses:**
- Backend services (Node.js)
- Automated testing scripts
- Development environments

## Wallet Adapter Interface

All wallets implement the `WalletAdapter` interface. You can create custom adapters by implementing this interface.

### Interface Definition

```typescript
interface WalletAdapter {
  /**
   * Get the wallet address
   */
  getAddress(): Promise<string>;

  /**
   * Sign a message hash (32 bytes)
   * @param messageHash - Uint8Array of 32 bytes
   * @returns Hex-encoded signature
   */
  signMessageHash(messageHash: Uint8Array): Promise<string>;

  /**
   * Check if wallet is connected
   */
  isConnected(): Promise<boolean>;

  /**
   * Optional: Connect to wallet
   */
  connect?(): Promise<void>;
}
```

### Custom Wallet Adapter

Create your own wallet adapter:

```typescript
import type { WalletAdapter } from '@x402/vechain';

class CustomWalletAdapter implements WalletAdapter {
  private address: string | null = null;

  async connect(): Promise<void> {
    // Connect to your custom wallet
    this.address = await window.customWallet.connect();
  }

  async getAddress(): Promise<string> {
    if (!this.address) {
      throw new Error('Wallet not connected');
    }
    return this.address;
  }

  async signMessageHash(messageHash: Uint8Array): Promise<string> {
    if (!this.address) {
      throw new Error('Wallet not connected');
    }
    
    // Sign with your custom wallet
    const signature = await window.customWallet.sign(messageHash);
    return signature;
  }

  async isConnected(): Promise<boolean> {
    return this.address !== null;
  }
}

// Use your custom adapter
const wallet = new CustomWalletAdapter();
await wallet.connect();

const response = await x402Fetch(url, {
  facilitatorUrl,
  wallet,
});
```

## UI Integration Patterns

### React Hook

```typescript
import { useState, useEffect } from 'react';
import { autoDetectWallet, detectWallets } from '@x402/vechain';
import type { WalletAdapter } from '@x402/vechain';

export function useWallet() {
  const [wallet, setWallet] = useState<WalletAdapter | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [availableWallets, setAvailableWallets] = useState<string[]>([]);

  useEffect(() => {
    // Detect available wallets
    const wallets = detectWallets();
    setAvailableWallets(wallets);

    // Auto-connect if available
    const w = autoDetectWallet();
    if (w) {
      setWallet(w);
      w.getAddress().then(setAddress);
    }
  }, []);

  const connect = async () => {
    const w = autoDetectWallet();
    if (!w) {
      alert('No VeChain wallet found');
      return;
    }

    if (w.connect) {
      await w.connect();
    }

    setWallet(w);
    const addr = await w.getAddress();
    setAddress(addr);
  };

  const disconnect = () => {
    setWallet(null);
    setAddress(null);
  };

  return {
    wallet,
    address,
    availableWallets,
    connect,
    disconnect,
    isConnected: !!wallet,
  };
}

// Usage in component
function MyComponent() {
  const { wallet, address, connect, isConnected } = useWallet();

  if (!isConnected) {
    return <button onClick={connect}>Connect Wallet</button>;
  }

  return <div>Connected: {address}</div>;
}
```

### Vue Composable

```typescript
import { ref, onMounted, computed } from 'vue';
import { autoDetectWallet, detectWallets } from '@x402/vechain';
import type { WalletAdapter } from '@x402/vechain';

export function useWallet() {
  const wallet = ref<WalletAdapter | null>(null);
  const address = ref<string | null>(null);
  const availableWallets = ref<string[]>([]);

  onMounted(() => {
    availableWallets.value = detectWallets();
    
    const w = autoDetectWallet();
    if (w) {
      wallet.value = w;
      w.getAddress().then(addr => {
        address.value = addr;
      });
    }
  });

  const connect = async () => {
    const w = autoDetectWallet();
    if (!w) {
      alert('No VeChain wallet found');
      return;
    }

    if (w.connect) {
      await w.connect();
    }

    wallet.value = w;
    address.value = await w.getAddress();
  };

  const disconnect = () => {
    wallet.value = null;
    address.value = null;
  };

  return {
    wallet,
    address,
    availableWallets,
    connect,
    disconnect,
    isConnected: computed(() => !!wallet.value),
  };
}
```

### Wallet Selection UI

Allow users to choose their preferred wallet:

```typescript
import { VeWorldWalletAdapter, ConnexWalletAdapter, detectWallets } from '@x402/vechain';

function WalletSelector() {
  const [wallet, setWallet] = useState(null);
  const availableWallets = detectWallets();

  const connectVeWorld = async () => {
    if (!availableWallets.includes('veworld')) {
      window.open('https://www.veworld.com/', '_blank');
      return;
    }

    const w = new VeWorldWalletAdapter();
    await w.connect();
    setWallet(w);
  };

  const connectConnex = async () => {
    if (!availableWallets.includes('connex')) {
      window.open('https://sync.vecha.in/', '_blank');
      return;
    }

    const w = new ConnexWalletAdapter();
    setWallet(w);
  };

  return (
    <div>
      <button onClick={connectVeWorld}>
        🦊 Connect VeWorld
        {!availableWallets.includes('veworld') && ' (Install)'}
      </button>
      
      <button onClick={connectConnex}>
        🔄 Connect Connex
        {!availableWallets.includes('connex') && ' (Install)'}
      </button>
    </div>
  );
}
```

## Best Practices

### 1. Check Wallet Availability

Always check if a wallet is installed before trying to use it:

```typescript
const wallets = detectWallets();

if (wallets.length === 0) {
  // Show installation instructions
  showInstallPrompt();
  return;
}

const wallet = autoDetectWallet();
```

### 2. Handle Connection Failures

Not all connection attempts succeed:

```typescript
try {
  const wallet = new VeWorldWalletAdapter();
  await wallet.connect();
} catch (error) {
  if (error.message.includes('rejected')) {
    console.log('User rejected connection');
  } else {
    console.error('Connection failed:', error);
  }
}
```

### 3. Provide Clear UI Feedback

Show users what's happening:

```typescript
async function connectWallet() {
  setStatus('Connecting to VeWorld...');
  
  try {
    const wallet = new VeWorldWalletAdapter();
    await wallet.connect();
    
    setStatus('Getting address...');
    const address = await wallet.getAddress();
    
    setStatus(`Connected: ${address.slice(0, 6)}...${address.slice(-4)}`);
    return wallet;
  } catch (error) {
    setStatus('Connection failed');
    throw error;
  }
}
```

### 4. Validate Addresses

Ensure addresses are valid before using:

```typescript
function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

const address = await wallet.getAddress();
if (!isValidAddress(address)) {
  throw new Error('Invalid address format');
}
```

### 5. Cache Wallet Instance

Reuse wallet instances instead of recreating:

```typescript
let walletInstance: WalletAdapter | null = null;

async function getWallet(): Promise<WalletAdapter> {
  if (walletInstance) {
    const isConnected = await walletInstance.isConnected();
    if (isConnected) {
      return walletInstance;
    }
  }

  walletInstance = autoDetectWallet();
  
  if (!walletInstance) {
    throw new Error('No wallet available');
  }

  if (walletInstance.connect) {
    await walletInstance.connect();
  }

  return walletInstance;
}
```

## Troubleshooting

### Wallet Not Detected

**Problem:** `autoDetectWallet()` returns `null`

**Solutions:**
1. Check if wallet extension is installed
2. Refresh the page after installing
3. Check browser console for errors
4. Verify `window.vechain` or `window.connex` exists

```typescript
console.log('VeWorld:', window.vechain ? 'Found' : 'Not found');
console.log('Connex:', window.connex ? 'Found' : 'Not found');
```

### Connection Rejected

**Problem:** `wallet.connect()` throws error

**Solutions:**
1. User may have cancelled the connection prompt
2. Wallet may be locked (ask user to unlock)
3. Check for wallet-specific errors

```typescript
try {
  await wallet.connect();
} catch (error) {
  console.error('Connection error:', error.message);
  // Show user-friendly message
}
```

### Signature Fails

**Problem:** `signMessageHash()` throws error

**Solutions:**
1. Ensure message hash is exactly 32 bytes
2. User may have rejected signing
3. Wallet may be locked

```typescript
const messageHash = new Uint8Array(32); // Must be 32 bytes
await wallet.signMessageHash(messageHash);
```

### Wrong Network

**Problem:** Wallet is on mainnet but app expects testnet

**Solutions:**
1. Check network before making requests
2. Prompt user to switch networks
3. Use correct network ID in payment requirements

```typescript
// Check network (Connex)
const genesisId = window.connex?.thor.genesis.id;
const expectedTestnetId = '0x000000000b2bce3c70bc649a02749e8687721b09ed2e15997f466536b20bb127';

if (genesisId !== expectedTestnetId) {
  alert('Please switch to VeChain Testnet');
}
```

## Next Steps

- [Client SDK](/sdk/client) - Learn about payment handling
- [Server SDK](/sdk/server) - Implement payment verification
- [API Reference](/api/overview) - Explore facilitator endpoints
- [Examples](https://github.com/ashutoshpw/x402-vechain/tree/main/examples) - Working code examples
