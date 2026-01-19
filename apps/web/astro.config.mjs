// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

// https://astro.build/config
export default defineConfig({
	integrations: [
		starlight({
			title: 'x402.vet Documentation',
			description: 'Documentation for the x402 payment protocol on VeChain',
			social: {
				github: 'https://github.com/ashutoshpw/x402-vechain',
			},
			sidebar: [
				{
					label: 'Getting Started',
					items: [
						{ label: 'Quick Start', slug: 'getting-started/quick-start' },
						{ label: 'Installation', slug: 'getting-started/installation' },
						{ label: 'First Payment', slug: 'getting-started/first-payment' },
					],
				},
				{
					label: 'API Reference',
					items: [
						{ label: 'Overview', slug: 'api/overview' },
						{ label: 'GET /supported', slug: 'api/supported' },
						{ label: 'POST /verify', slug: 'api/verify' },
						{ label: 'POST /settle', slug: 'api/settle' },
						{ label: 'Fee Delegation Endpoints', slug: 'api/fee-delegation' },
						{ label: 'Error Codes', slug: 'api/errors' },
					],
				},
				{
					label: 'SDK Guide',
					items: [
						{ label: 'Client SDK', slug: 'sdk/client' },
						{ label: 'Server SDK', slug: 'sdk/server' },
						{ label: 'Wallet Integration', slug: 'sdk/wallets' },
					],
				},
				{
					label: 'Guides',
					items: [
						{ label: 'Token Support', slug: 'guides/tokens' },
						{ label: 'Fee Delegation', slug: 'guides/fee-delegation' },
						{ label: 'Environment Configuration', slug: 'guides/environment' },
					],
				},
				{
					label: 'Troubleshooting',
					items: [
						{ label: 'Common Errors', slug: 'troubleshooting/errors' },
						{ label: 'FAQ', slug: 'troubleshooting/faq' },
					],
				},
			],
			customCss: [
				'./src/styles/custom.css',
			],
		}),
	],
});
