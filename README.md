# RootPaywall (x402 Unlocker Demo)

RootPaywall is a complete demo of a **Rootstock (tRBTC) micropayment paywall**:

- A **frontend** (Next.js) that shows public + premium content
- A **demo backend** (Express) that returns **HTTP 402 Payment Required** until payment is verified
- A reusable **SDK package** (`@x402/unlocker`) that provides the paywall middleware + unlock flow

## What you get

- **Public page**: free content at `/public`
- **Premium page**: protected content at `/premium`
  - On 402, a payment modal appears (price + merchant address)
  - User pays with MetaMask on **Rootstock Testnet**
  - The tx hash is sent to `POST /unlock`
  - Backend returns a JWT token; frontend stores it and reloads premium content

## Features

- 🔐 Wallet connection via **MetaMask** (Rootstock Testnet)
- 💸 Paywall UX using **HTTP 402 Payment Required** + “Pay & Unlock” flow
- ⚡ Send **tRBTC** payments and unlock premium content with a verified transaction hash
- 🪪 JWT-based access tokens for premium routes (`Authorization: Bearer <token>`)
- 🎛️ Rootstock-style **dark dashboard UI** (Tailwind, gradients, glow, toasts, skeleton loaders)
- 🧩 Reusable SDK: `@x402/unlocker` middleware + unlock route for Express

## Prerequisites

- Node.js **18+**
- npm
- MetaMask (or compatible wallet)
- Rootstock Testnet added to MetaMask (Chain ID **31**) + some testnet **tRBTC**

## Quick start (run locally)

Open **two terminals**.

### 1) Start the demo backend

```bash
cd demo-backend
cp .env.example .env
```

Edit `demo-backend/.env` and set:

- `MERCHANT_ADDRESS` to your Rootstock Testnet wallet address (0x…)
- `JWT_SECRET` to any long random string (for demo, any string works)

The backend will **fail fast** on startup if `MERCHANT_ADDRESS` is missing or still the placeholder.

Then run:

```bash
cd demo-backend
npm install
npm run dev
```

Backend runs at `http://localhost:3000`.

### 2) Start the frontend

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

If port 3000 is already used, run:

```bash
PORT=3001 npm run dev
```

Open the URL printed by Next.js (e.g. `http://localhost:3000` or `http://localhost:3001`).

## Branding

- The Rootstock logo used in the navbar is served from `frontend/public/rootstock-logo.png`.

## Repo structure

```
RootPaywall/
  backend/        # @x402/unlocker SDK (middleware + unlock verification)
  demo-backend/   # Express demo API (public/premium + /unlock)
  frontend/       # Next.js UI (wallet + paywall + premium content)
```

## `@x402/unlocker` SDK (quick usage)

If you want to use the paywall in your own Express API, the core pieces are:

- `initializeX402({ rpcUrl, recipientAddress, requiredAmount, minConfirmations, jwtSecret })`
- `x402Middleware({ resourceId, price })` → returns **402** until unlocked
- `createUnlockRoute()` → `POST /unlock` issues `{ token, expiresIn }`

Full SDK documentation: `backend/README.md`.

## Readmes

- `backend/README.md` — SDK usage and API
- `demo-backend/README.md` — demo API setup, env vars, endpoints
- `frontend/README.md` — UI setup, env vars, unlock flow

## 📚 Documentation

- **Smart Contract Documentation**: Detailed contract documentation with architecture diagrams (coming soon)
- **Frontend Documentation**: Frontend setup and usage guide (`frontend/README.md`)

## 🔗 Useful Links

- Rootstock Documentation: `https://dev.rootstock.io/`
- Rootstock Explorer (Testnet): `https://explorer.testnet.rootstock.io/`
- Rootstock Explorer (Mainnet): `https://explorer.rootstock.io/`

## Contributing

We welcome community contributions! Feel free to fork the project and submit a pull request. Just make sure your changes are well-documented and scoped to the project's purpose.

## Support

If you run into any issues or have questions, please open an issue on GitHub.

## Notes

- This project is set up for **Rootstock Testnet** by default.
- For production-like deployments, use a reliable RPC provider, set strong secrets, and increase confirmation requirements.

