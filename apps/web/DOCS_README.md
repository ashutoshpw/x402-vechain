# x402.vet Documentation

This directory contains comprehensive documentation for the x402.vet payment protocol on VeChain, built with [Astro Starlight](https://starlight.astro.build/).

## 📚 Documentation Structure

The documentation is organized into the following sections:

### Getting Started
- **Quick Start** - 5-minute integration guide
- **Installation** - SDK and API setup instructions
- **First Payment** - Complete payment flow walkthrough

### API Reference
- **Overview** - API basics, authentication, rate limiting
- **GET /supported** - Query supported networks and assets
- **POST /verify** - Verify payments without settlement
- **POST /settle** - Submit payments to blockchain
- **Fee Delegation Endpoints** - Monitor gas sponsorship
- **Error Codes** - Complete error reference

### SDK Guide
- **Client SDK** - Browser and Node.js client integration (comprehensive 19KB guide)
- **Server SDK** - Hono middleware for payment verification (20KB guide)
- **Wallet Integration** - VeWorld, Connex, and custom wallets (18KB guide)

### Guides
- **Token Support** - Supported networks and assets (VET, VTHO, VEUSD, B3TR)
- **Fee Delegation** - Gasless transactions guide
- **Environment Configuration** - Setup and configuration

### Troubleshooting
- **Common Errors** - Error solutions and debugging
- **FAQ** - Frequently asked questions

## 🚀 Development

### Prerequisites
- Node.js 20+
- pnpm 10.12.4

### Install Dependencies
```bash
pnpm install
```

### Start Development Server
```bash
pnpm dev
```

The documentation will be available at `http://localhost:4321/`

### Build for Production
```bash
pnpm build
```

## 📝 Content Location

All documentation content is in `src/content/docs/`:

```
src/content/docs/
├── index.mdx                    # Documentation homepage
├── getting-started/
│   ├── quick-start.md
│   ├── installation.md
│   └── first-payment.md
├── api/
│   ├── overview.md
│   ├── supported.md
│   ├── verify.md
│   ├── settle.md
│   ├── fee-delegation.md
│   └── errors.md
├── sdk/
│   ├── client.md
│   ├── server.md
│   └── wallets.md
├── guides/
│   ├── tokens.md
│   ├── fee-delegation.md
│   └── environment.md
└── troubleshooting/
    ├── errors.md
    └── faq.md
```

## ⚙️ Configuration

The Starlight configuration is in `astro.config.mjs`:

- **Title**: x402.vet Documentation
- **Description**: Documentation for the x402 payment protocol on VeChain
- **Social**: GitHub link
- **Sidebar**: Complete navigation structure
- **Custom CSS**: `src/styles/custom.css`

## 🎨 Customization

### Custom Styles

Custom CSS variables are defined in `src/styles/custom.css`:

```css
:root {
  --sl-color-accent-low: #e6f7ff;
  --sl-color-accent: #1890ff;
  --sl-color-accent-high: #0050b3;
}
```

### Adding New Pages

1. Create a new `.md` or `.mdx` file in `src/content/docs/`
2. Add frontmatter:
   ```yaml
   ---
   title: Page Title
   description: Page description
   ---
   ```
3. Add the page to the sidebar in `astro.config.mjs`

## 🔗 Integration with Marketing Site

The documentation site currently coexists with the marketing site in the same Astro project. For production deployment, consider one of these approaches:

### Option 1: Separate Documentation Site (Recommended)
Deploy documentation as a separate Astro project at `docs.x402.vet`

### Option 2: Subdirectory Routing
Configure Starlight to serve docs at `/docs` path

### Option 3: Marketing on Subdomain
Keep docs at root, move marketing to `www.x402.vet`

## 📖 Writing Documentation

### Markdown Features

Starlight supports enhanced Markdown features:

- Code syntax highlighting
- Admonitions (:::tip, :::note, :::caution)
- File trees
- Tabs
- Cards

Example:

```markdown
:::tip
This is a helpful tip!
:::

```typescript
// Code with syntax highlighting
const example = "Hello World";
```
```

### Cross-References

Link to other documentation pages using relative paths:

```markdown
See the [API Reference](/api/overview/) for more details.
```

## 🚢 Deployment

### Vercel
```bash
vercel deploy
```

### Netlify
```bash
netlify deploy
```

### GitHub Pages
Configure in repository settings or use GitHub Actions

## 📄 License

ISC

## 🤝 Contributing

Contributions are welcome! Please ensure:

1. Documentation is clear and accurate
2. Code examples are tested
3. Links work correctly
4. Markdown formatting is consistent

## 📞 Support

- **GitHub Issues**: [x402-vechain/issues](https://github.com/ashutoshpw/x402-vechain/issues)
- **GitHub Discussions**: [x402-vechain/discussions](https://github.com/ashutoshpw/x402-vechain/discussions)
