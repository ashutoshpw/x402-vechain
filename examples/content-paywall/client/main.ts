/**
 * Content Paywall Client
 * 
 * Frontend for payment-gated content access
 */

import { x402Fetch, autoDetectWallet } from '@x402/vechain';

// Configuration
const API_URL = 'http://localhost:3002';
const FACILITATOR_URL = 'http://localhost:3000';

// State
let wallet: any = null;
let walletAddress: string | null = null;
let articles: any[] = [];

// DOM Elements
const connectBtn = document.getElementById('connectBtn') as HTMLButtonElement;
const walletStatus = document.getElementById('walletStatus') as HTMLElement;
const statusIndicator = document.getElementById('statusIndicator') as HTMLElement;
const articlesContainer = document.getElementById('articlesContainer') as HTMLElement;
const articleModal = document.getElementById('articleModal') as HTMLElement;
const modalContent = document.getElementById('modalContent') as HTMLElement;

/**
 * Update wallet status
 */
function updateWalletStatus(connected: boolean, address?: string) {
  if (connected && address) {
    walletStatus.textContent = `Connected: ${address.slice(0, 6)}...${address.slice(-4)}`;
    statusIndicator.classList.add('connected');
    connectBtn.textContent = 'Wallet Connected';
    connectBtn.disabled = true;
  } else {
    walletStatus.textContent = 'No wallet connected';
    statusIndicator.classList.remove('connected');
    connectBtn.textContent = 'Connect Wallet';
    connectBtn.disabled = false;
  }
}

/**
 * Connect wallet
 */
async function connectWallet() {
  try {
    wallet = autoDetectWallet();
    
    if (!wallet) {
      alert('No VeChain wallet detected. Please install VeWorld or VeChain Sync.');
      return;
    }

    if (wallet.connect) {
      await wallet.connect();
    }

    walletAddress = await wallet.getAddress();
    updateWalletStatus(true, walletAddress);
  } catch (error: any) {
    console.error('Failed to connect wallet:', error);
    alert(`Failed to connect wallet: ${error.message}`);
  }
}

/**
 * Load articles list
 */
async function loadArticles() {
  try {
    const response = await fetch(`${API_URL}/articles`);
    const data = await response.json();
    articles = data.articles;
    
    renderArticles();
  } catch (error: any) {
    console.error('Failed to load articles:', error);
    articlesContainer.innerHTML = `
      <div class="error">
        <strong>Failed to load articles</strong><br>
        ${error.message}
      </div>
    `;
  }
}

/**
 * Render articles grid
 */
function renderArticles() {
  if (articles.length === 0) {
    articlesContainer.innerHTML = '<p style="text-align: center; color: #718096;">No articles available</p>';
    return;
  }

  articlesContainer.innerHTML = '';
  articlesContainer.className = 'articles-grid';
  
  articles.forEach(article => {
    const card = document.createElement('div');
    card.className = 'article-card';
    card.onclick = () => viewArticle(article.id);
    
    card.innerHTML = `
      <h3>${article.title}</h3>
      <div class="article-author">By ${article.author}</div>
      <p class="article-preview">${article.preview}</p>
      <div class="article-price">💎 ${article.price} ${article.token}</div>
    `;
    
    articlesContainer.appendChild(card);
  });
}

/**
 * View full article (with payment)
 */
async function viewArticle(id: string) {
  if (!wallet) {
    alert('Please connect your wallet first to access premium content.');
    return;
  }

  // Show loading state
  modalContent.innerHTML = `
    <div class="loading">
      <div class="spinner"></div>
      <p>Loading article...</p>
      <p style="color: #718096; font-size: 14px; margin-top: 10px;">
        Payment may be required. Please approve in your wallet if prompted.
      </p>
    </div>
  `;
  articleModal.classList.add('active');

  try {
    const response = await x402Fetch(`${API_URL}/articles/${id}`, {
      facilitatorUrl: FACILITATOR_URL,
      wallet,
      maxAmount: '100000000000000000000', // Max 100 tokens
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const article = await response.json();
    renderArticleContent(article);
  } catch (error: any) {
    console.error('Failed to load article:', error);
    modalContent.innerHTML = `
      <div class="error">
        <strong>Failed to load article</strong><br>
        ${error.message}
      </div>
      <button onclick="closeModal()" style="margin-top: 20px;">Close</button>
    `;
  }
}

/**
 * Render full article content
 */
function renderArticleContent(article: any) {
  // Convert markdown-style content to HTML
  let contentHtml = article.content
    .split('\n')
    .map((line: string) => {
      // Headers
      if (line.startsWith('# ')) {
        return `<h1>${line.substring(2)}</h1>`;
      }
      if (line.startsWith('## ')) {
        return `<h2>${line.substring(3)}</h2>`;
      }
      if (line.startsWith('### ')) {
        return `<h3>${line.substring(4)}</h3>`;
      }
      
      // Lists
      if (line.startsWith('- ') || line.startsWith('* ')) {
        return `<li>${line.substring(2)}</li>`;
      }
      
      // Empty lines
      if (line.trim() === '') {
        return '<br>';
      }
      
      // Regular paragraphs
      return `<p>${line}</p>`;
    })
    .join('\n')
    // Wrap consecutive list items in ul
    .replace(/(<li>.*<\/li>\n?)+/g, (match) => `<ul>${match}</ul>`)
    // Clean up extra breaks
    .replace(/(<br>\s*){3,}/g, '<br><br>');

  modalContent.innerHTML = `
    <div class="article-full">
      <div class="success">
        ✅ Payment successful! Enjoy your premium content.
      </div>
      <h1>${article.title}</h1>
      <div class="meta">
        <strong>Author:</strong> ${article.author}<br>
        <strong>Paid by:</strong> ${article.paidBy}<br>
        <strong>Paid at:</strong> ${new Date(article.paidAt).toLocaleString()}
      </div>
      <div class="content">
        ${contentHtml}
      </div>
    </div>
  `;
}

/**
 * Close modal
 */
(window as any).closeModal = function() {
  articleModal.classList.remove('active');
};

// Event listeners
connectBtn.addEventListener('click', connectWallet);

// Close modal when clicking outside
articleModal.addEventListener('click', (e) => {
  if (e.target === articleModal) {
    (window as any).closeModal();
  }
});

// Initialize
window.addEventListener('load', async () => {
  // Check for wallet
  const detectedWallet = autoDetectWallet();
  if (detectedWallet) {
    updateWalletStatus(false);
  }
  
  // Load articles
  await loadArticles();
});
