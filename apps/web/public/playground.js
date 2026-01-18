// @ts-nocheck
/* eslint-disable */

// Playground JavaScript - Client-side only

// State management
let walletAdapter = null;
let connectedAddress = null;
let paymentRequirements = null;

// Wallet detection
function detectWallets() {
  const wallets = [];
  if (typeof window !== 'undefined') {
    if (window.vechain) {
      wallets.push('veworld');
    }
    if (window.connex) {
      wallets.push('connex');
    }
  }
  return wallets;
}

// Update wallet status UI
function updateWalletStatus(connected, address) {
  const statusIndicator = document.querySelector('.status-indicator');
  const statusText = document.querySelector('.status-text');
  const walletAddress = document.getElementById('wallet-address');
  const signButton = document.getElementById('sign-payment');
  const simulateButton = document.getElementById('simulate-402');

  if (statusIndicator && statusText) {
    if (connected && address) {
      statusIndicator.classList.remove('disconnected');
      statusIndicator.classList.add('connected');
      statusText.textContent = 'Connected';
      
      if (walletAddress) {
        walletAddress.textContent = 'Address: ' + address;
        walletAddress.classList.remove('hidden');
      }

      if (signButton) signButton.disabled = false;
      if (simulateButton) simulateButton.disabled = false;
    } else {
      statusIndicator.classList.remove('connected');
      statusIndicator.classList.add('disconnected');
      statusText.textContent = 'Not Connected';
      
      if (walletAddress) {
        walletAddress.classList.add('hidden');
      }

      if (signButton) signButton.disabled = true;
      if (simulateButton) simulateButton.disabled = true;
    }
  }
}

// Connect VeWorld wallet
async function connectVeWorld() {
  const errorEl = document.getElementById('wallet-error');
  
  try {
    if (!window.vechain) {
      throw new Error('VeWorld wallet not detected. Please install VeWorld extension.');
    }

    const accounts = await window.vechain.request({
      method: 'wallet_connect'
    });

    if (accounts && accounts.length > 0) {
      connectedAddress = accounts[0];
      updateWalletStatus(true, connectedAddress);
      
      if (errorEl) errorEl.classList.add('hidden');
    }
  } catch (error) {
    console.error('VeWorld connection error:', error);
    if (errorEl) {
      errorEl.textContent = 'Error: ' + error.message;
      errorEl.classList.remove('hidden');
    }
  }
}

// Connect Connex wallet
async function connectConnex() {
  const errorEl = document.getElementById('wallet-error');
  
  try {
    if (!window.connex) {
      throw new Error('Connex not detected. Please install VeChain Sync2 wallet.');
    }

    const connex = window.connex;
    
    // Request certificate to get address
    const certResponse = await connex.vendor.sign('cert', {
      purpose: 'identification',
      payload: {
        type: 'text',
        content: 'x402 Playground Connection',
      },
    }).request();

    if (certResponse && certResponse.annex && certResponse.annex.signer) {
      connectedAddress = certResponse.annex.signer;
      updateWalletStatus(true, connectedAddress);
      
      if (errorEl) errorEl.classList.add('hidden');
    }
  } catch (error) {
    console.error('Connex connection error:', error);
    if (errorEl) {
      errorEl.textContent = 'Error: ' + error.message;
      errorEl.classList.remove('hidden');
    }
  }
}

// Update JSON preview
function updateJsonPreview() {
  const networkValue = document.getElementById('network')?.value || 'testnet';
  const network = networkValue === 'testnet' ? 'eip155:100009' : 'eip155:100010';
  const token = document.getElementById('token')?.value || 'VET';
  const amount = document.getElementById('amount')?.value || '1000000000000000000';
  const recipient = document.getElementById('recipient')?.value || '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb';
  const merchantId = document.getElementById('merchant-id')?.value || 'merchant123';
  const merchantUrl = document.getElementById('merchant-url')?.value || '';

  paymentRequirements = {
    paymentOptions: [
      {
        network,
        asset: token,
        amount,
        recipient
      }
    ],
    merchantId
  };

  if (merchantUrl) {
    paymentRequirements.merchantUrl = merchantUrl;
  }

  const preview = document.getElementById('json-preview');
  if (preview) {
    preview.innerHTML = '<code>' + JSON.stringify(paymentRequirements, null, 2) + '</code>';
  }
}

// Copy JSON to clipboard
function copyJson() {
  if (paymentRequirements) {
    navigator.clipboard.writeText(JSON.stringify(paymentRequirements, null, 2));
    const btn = document.getElementById('copy-json');
    if (btn) {
      const originalText = btn.textContent;
      btn.textContent = 'Copied!';
      setTimeout(() => {
        btn.textContent = originalText;
      }, 2000);
    }
  }
}

// Simulate 402 response
async function simulate402() {
  const statusEl = document.getElementById('payment-status');
  if (!statusEl) return;

  statusEl.textContent = 'Simulating 402 Payment Required response...';
  statusEl.className = 'payment-status loading';
  statusEl.classList.remove('hidden');

  // Simulate API response
  setTimeout(() => {
    statusEl.textContent = 'Received 402 Payment Required response with PaymentRequirements';
    statusEl.className = 'payment-status success';
  }, 1000);
}

// Sign and submit payment
async function signAndSubmitPayment() {
  const statusEl = document.getElementById('payment-status');
  const resultSection = document.getElementById('result-section');
  const resultEl = document.getElementById('transaction-result');
  
  if (!statusEl || !resultSection || !resultEl) return;
  if (!connectedAddress) {
    alert('Please connect your wallet first');
    return;
  }

  try {
    statusEl.textContent = 'Generating payment payload...';
    statusEl.className = 'payment-status loading';
    statusEl.classList.remove('hidden');

    // Generate nonce
    const nonce = Math.random().toString(36).substring(2, 15);
    const validUntil = Math.floor(Date.now() / 1000) + 300; // 5 minutes

    const paymentPayload = {
      scheme: 'exact',
      network: paymentRequirements.paymentOptions[0].network,
      payTo: paymentRequirements.paymentOptions[0].recipient,
      amount: paymentRequirements.paymentOptions[0].amount,
      asset: paymentRequirements.paymentOptions[0].asset,
      nonce,
      validUntil
    };

    statusEl.textContent = 'Please sign the payment in your wallet...';

    // Sign with wallet
    let signature;
    if (window.vechain) {
      const message = JSON.stringify(paymentPayload);
      const result = await window.vechain.request({
        method: 'personal_sign',
        params: [message, connectedAddress]
      });
      signature = result;
    } else if (window.connex) {
      const connex = window.connex;
      const message = JSON.stringify(paymentPayload);
      
      const certResponse = await connex.vendor.sign('cert', {
        purpose: 'agreement',
        payload: {
          type: 'text',
          content: message,
        },
      }).request();
      
      signature = certResponse.signature;
    }

    if (!signature) {
      throw new Error('Failed to get signature from wallet');
    }

    statusEl.textContent = 'Submitting payment to facilitator...';

    // Submit to facilitator (mock for now)
    const facilitatorUrl = 'http://localhost:3000';
    const response = await fetch(facilitatorUrl + '/settle', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        paymentPayload: btoa(JSON.stringify({
          signature,
          payload: paymentPayload
        })),
        paymentRequirements
      })
    });

    const result = await response.json();

    if (result.success && result.transactionHash) {
      statusEl.textContent = 'Payment successful!';
      statusEl.className = 'payment-status success';

      // Show transaction result
      const explorerUrl = paymentRequirements.paymentOptions[0].network.includes('100009')
        ? 'https://explore-testnet.vechain.org/transactions/' + result.transactionHash
        : 'https://explore.vechain.org/transactions/' + result.transactionHash;

      resultEl.innerHTML = `
        <p><strong>Transaction Hash:</strong></p>
        <p style="word-break: break-all; font-family: monospace;">${result.transactionHash}</p>
        <p style="margin-top: 1rem;">
          <a href="${explorerUrl}" target="_blank" rel="noopener noreferrer">
            View on VeChain Explorer
          </a>
        </p>
      `;
      resultSection.classList.remove('hidden');
    } else {
      throw new Error(result.error || 'Payment failed');
    }
  } catch (error) {
    console.error('Payment error:', error);
    statusEl.textContent = 'Error: ' + error.message;
    statusEl.className = 'payment-status error';
  }
}

// Initialize event listeners
document.addEventListener('DOMContentLoaded', () => {
  // Wallet connection buttons
  document.getElementById('connect-veworld')?.addEventListener('click', connectVeWorld);
  document.getElementById('connect-connex')?.addEventListener('click', connectConnex);

  // Form inputs - update JSON preview on change
  const formInputs = ['network', 'token', 'amount', 'recipient', 'merchant-id', 'merchant-url'];
  formInputs.forEach(id => {
    document.getElementById(id)?.addEventListener('input', updateJsonPreview);
  });

  // Action buttons
  document.getElementById('copy-json')?.addEventListener('click', copyJson);
  document.getElementById('simulate-402')?.addEventListener('click', simulate402);
  document.getElementById('sign-payment')?.addEventListener('click', signAndSubmitPayment);

  // Initialize JSON preview
  updateJsonPreview();

  // Check for available wallets
  const wallets = detectWallets();
  console.log('Available wallets:', wallets);
});
