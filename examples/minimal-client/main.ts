/**
 * Minimal x402 Client Example
 * 
 * Demonstrates browser wallet integration for x402 payments on VeChain
 */

import { x402Fetch, autoDetectWallet, getSupported } from '@x402/vechain';

// State
let wallet: any = null;
let walletAddress: string | null = null;

// DOM Elements
const statusDiv = document.getElementById('status')!;
const connectBtn = document.getElementById('connectBtn') as HTMLButtonElement;
const checkSupportedBtn = document.getElementById('checkSupportedBtn') as HTMLButtonElement;
const apiUrlInput = document.getElementById('apiUrl') as HTMLInputElement;
const facilitatorUrlInput = document.getElementById('facilitatorUrl') as HTMLInputElement;

const fetchFreeBtn = document.querySelector('.fetch-free') as HTMLButtonElement;
const fetchPremiumDataBtn = document.querySelector('.fetch-premium-data') as HTMLButtonElement;
const fetchPremiumContentBtn = document.querySelector('.fetch-premium-content') as HTMLButtonElement;

const freeResponseDiv = document.getElementById('freeResponse')!;
const premiumDataResponseDiv = document.getElementById('premiumDataResponse')!;
const premiumContentResponseDiv = document.getElementById('premiumContentResponse')!;

/**
 * Update status message
 */
function updateStatus(message: string, type: 'info' | 'success' | 'error' | 'warning' = 'info') {
    statusDiv.className = `status ${type}`;
    
    const walletStatus = type === 'success' ? 'connected' : 'disconnected';
    statusDiv.innerHTML = `
        <span class="wallet-status ${walletStatus}"></span>
        <span>${message}</span>
    `;
}

/**
 * Display response in a response div
 */
function displayResponse(element: HTMLElement, data: any, error: boolean = false) {
    element.style.display = 'block';
    if (error) {
        element.style.color = '#f56565';
    } else {
        element.style.color = '#48bb78';
    }
    element.textContent = JSON.stringify(data, null, 2);
}

/**
 * Connect to wallet
 */
async function connectWallet() {
    try {
        updateStatus('Connecting to wallet...', 'info');
        
        wallet = autoDetectWallet();
        
        if (!wallet) {
            updateStatus('No wallet detected. Please install VeWorld or VeChain Sync.', 'error');
            return;
        }

        // Try to connect (for wallets that require explicit connection)
        if (wallet.connect) {
            await wallet.connect();
        }

        walletAddress = await wallet.getAddress();
        
        updateStatus(`Connected: ${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`, 'success');
        
        // Enable premium buttons
        fetchPremiumDataBtn.disabled = false;
        fetchPremiumContentBtn.disabled = false;
        
        connectBtn.textContent = 'Wallet Connected';
        connectBtn.disabled = true;
    } catch (error: any) {
        console.error('Failed to connect wallet:', error);
        updateStatus(`Failed to connect: ${error.message}`, 'error');
    }
}

/**
 * Check supported networks
 */
async function checkSupported() {
    try {
        const facilitatorUrl = facilitatorUrlInput.value;
        updateStatus('Checking supported networks...', 'info');
        
        const supported = await getSupported(facilitatorUrl);
        
        displayResponse(freeResponseDiv, {
            message: 'Supported networks fetched successfully',
            ...supported,
        });
        
        updateStatus(
            `Facilitator supports ${supported.networks.length} network(s)`,
            'success'
        );
    } catch (error: any) {
        console.error('Failed to check supported:', error);
        displayResponse(freeResponseDiv, { error: error.message }, true);
        updateStatus(`Failed: ${error.message}`, 'error');
    }
}

/**
 * Fetch free content
 */
async function fetchFreeContent() {
    try {
        const apiUrl = apiUrlInput.value;
        updateStatus('Fetching free content...', 'info');
        
        const response = await fetch(`${apiUrl}/public/hello`);
        const data = await response.json();
        
        displayResponse(freeResponseDiv, data);
        updateStatus('Free content fetched successfully!', 'success');
    } catch (error: any) {
        console.error('Failed to fetch free content:', error);
        displayResponse(freeResponseDiv, { error: error.message }, true);
        updateStatus(`Failed: ${error.message}`, 'error');
    }
}

/**
 * Fetch premium data with payment
 */
async function fetchPremiumData() {
    if (!wallet) {
        updateStatus('Please connect your wallet first', 'error');
        return;
    }

    try {
        const apiUrl = apiUrlInput.value;
        const facilitatorUrl = facilitatorUrlInput.value;
        
        updateStatus('Fetching premium data (may require payment)...', 'info');
        
        const response = await x402Fetch(`${apiUrl}/premium/data`, {
            facilitatorUrl,
            wallet,
            maxAmount: '10000000000000000000', // Max 10 VET
        });

        const data = await response.json();
        
        displayResponse(premiumDataResponseDiv, data);
        updateStatus('Premium data fetched successfully! Payment handled.', 'success');
    } catch (error: any) {
        console.error('Failed to fetch premium data:', error);
        displayResponse(premiumDataResponseDiv, { error: error.message }, true);
        updateStatus(`Failed: ${error.message}`, 'error');
    }
}

/**
 * Fetch premium content with payment
 */
async function fetchPremiumContent() {
    if (!wallet) {
        updateStatus('Please connect your wallet first', 'error');
        return;
    }

    try {
        const apiUrl = apiUrlInput.value;
        const facilitatorUrl = facilitatorUrlInput.value;
        
        updateStatus('Fetching premium content (may require payment)...', 'info');
        
        const response = await x402Fetch(`${apiUrl}/premium/content`, {
            facilitatorUrl,
            wallet,
            maxAmount: '100000000000000000000', // Max 100 VEUSD
        });

        const data = await response.json();
        
        displayResponse(premiumContentResponseDiv, data);
        updateStatus('Premium content fetched! Payment handled.', 'success');
    } catch (error: any) {
        console.error('Failed to fetch premium content:', error);
        displayResponse(premiumContentResponseDiv, { error: error.message }, true);
        updateStatus(`Failed: ${error.message}`, 'error');
    }
}

// Event listeners
connectBtn.addEventListener('click', connectWallet);
checkSupportedBtn.addEventListener('click', checkSupported);
fetchFreeBtn.addEventListener('click', fetchFreeContent);
fetchPremiumDataBtn.addEventListener('click', fetchPremiumData);
fetchPremiumContentBtn.addEventListener('click', fetchPremiumContent);

// Auto-detect wallet on load
window.addEventListener('load', async () => {
    const detectedWallet = autoDetectWallet();
    if (detectedWallet) {
        updateStatus('Wallet detected! Click "Connect Wallet" to connect.', 'info');
    } else {
        updateStatus('No wallet detected. Please install VeWorld or VeChain Sync.', 'warning');
    }
});
