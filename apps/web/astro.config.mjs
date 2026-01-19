// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

// https://astro.build/config
export default defineConfig({
	integrations: [
		starlight({
			title: 'x402.vet Documentation',
			description: 'Documentation for the x402 payment protocol on VeChain',
			social: [
				{
					icon: 'github',
					label: 'GitHub',
					href: 'https://github.com/ashutoshpw/x402-vechain',
				},
			],
			sidebar: [
				{
					label: 'Getting Started',
					items: [
						{ label: 'Quick Start', link: '/getting-started/quick-start/' },
						{ label: 'Installation', link: '/getting-started/installation/' },
						{ label: 'First Payment', link: '/getting-started/first-payment/' },
					],
				},
				{
					label: 'API Reference',
					items: [
						{ label: 'Overview', link: '/api/overview/' },
						{ label: 'GET /supported', link: '/api/supported/' },
						{ label: 'POST /verify', link: '/api/verify/' },
						{ label: 'POST /settle', link: '/api/settle/' },
						{ label: 'Fee Delegation Endpoints', link: '/api/fee-delegation/' },
						{ label: 'Error Codes', link: '/api/errors/' },
					],
				},
				{
					label: 'SDK Guide',
					items: [
						{ label: 'Client SDK', link: '/sdk/client/' },
						{ label: 'Server SDK', link: '/sdk/server/' },
						{ label: 'Wallet Integration', link: '/sdk/wallets/' },
					],
				},
				{
					label: 'Guides',
					items: [
						{ label: 'Token Support', link: '/guides/tokens/' },
						{ label: 'Fee Delegation', link: '/guides/fee-delegation/' },
						{ label: 'Environment Configuration', link: '/guides/environment/' },
					],
				},
				{
					label: 'Troubleshooting',
					items: [
						{ label: 'Common Errors', link: '/troubleshooting/errors/' },
						{ label: 'FAQ', link: '/troubleshooting/faq/' },
					],
				},
			],
			customCss: [
				'./src/styles/custom.css',
			],
		}),
	],
});
