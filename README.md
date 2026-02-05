# Shopify Scrapper Mobile App (Monorepo)

A production-ready monorepo containing a Fastify/TypeScript backend and an Expo React Native (Expo Router) frontend. The app allows users to authenticate, purchase credits, submit Shopify store targets, and download structured CSV results. This README focuses on setup, configuration, and usage without exposing any proprietary business logic.

## Features
- Fastify backend with CORS and rate limiting
- Auth, scraping, and payment routes (high-level only)
- Supabase integration for auth/data
- CSV generation and file download flow
- Expo Router mobile app with Tailwind (NativeWind)
- Environment-based configuration for local and production

## Tech Stack
- Backend: Fastify, TypeScript, Zod, Axios
- Frontend: Expo, React Native, Expo Router, NativeWind
- Data/Auth: Supabase (`@supabase/supabase-js`)

## Repository Structure
```
backend/                 # Fastify + TypeScript API
  src/
    middleware/
    routes/              # auth, scrape, payment (high-level)
    services/
    utils/
    server.ts            # boots Fastify on PORT (default 3000)
  package.json

frontend/                # Expo app (Expo Router)
  app/
  lib/
    constants.ts         # uses EXPO_PUBLIC_* env vars
    supabase.ts          # Supabase client (configure via env)
  package.json

supabase-*.sql           # SQL helpers/migrations (optional)
shopify_scraper.py       # Helper script (optional/local)
```

## Prerequisites
- Node.js 18+ and npm
- Git
- Expo (installed via `npx` on first run)
- Supabase project (URL + API keys)

## Environment Variables
Do NOT commit secrets. `.env` files are already gitignored.

### Backend (`backend/.env`)
Create `backend/.env` with:
```
# Server
PORT=3000

# Supabase (use your project values)
SUPABASE_URL=<your-supabase-url>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
```

### Frontend (`frontend/.env` or Expo env)
Create `frontend/.env` (Expo will map `EXPO_PUBLIC_*` into the app):
```
# API base URL pointing to your backend
EXPO_PUBLIC_API_URL=http://localhost:3000

# Supabase public settings
EXPO_PUBLIC_SUPABASE_URL=<your-supabase-url>
EXPO_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
```

> Tip: When running on a physical device, replace `localhost` with your machine IP, e.g. `http://192.168.1.10:3000`.

## Install & Run
Open two terminals from the repository root.

### 1) Backend
```bash
cd backend
npm install
npm run dev   # starts Fastify on PORT (default 3000)
```
Health check:
```bash
curl http://localhost:3000/health
```

### 2) Frontend (Expo)
```bash
cd frontend
npm install
npm run start  # or: npm run android / npm run ios / npm run web
```
- Scan the QR code with Expo Go (iOS/Android) or press `w` for web.
- Ensure the device and development machine are on the same network.

## Configuration Notes
- CORS: Enabled for development; restrict origins in production.
- Rate limiting: Configured via `@fastify/rate-limit` to protect the API.
- API routes (high-level):
  - `/health` – liveness check
  - `/auth/*` – authentication flows
  - `/scrape/*` – job submission/status/download endpoints
  - `/payment/*` – credit purchase/payment notifications

## Common Scripts
- Backend:
  - `npm run dev` – watch mode (tsx)
  - `npm run build` – TypeScript build
  - `npm start` – run compiled server
- Frontend:
  - `npm run start` – start Metro/Expo
  - `npm run android` / `ios` / `web` – platform targets

## Security & Secrets
- Never commit keys; `.env` files are ignored in git.
- Use distinct keys per environment (dev/stage/prod).
- Rotate credentials on leaks or when sharing access.
- For production, restrict CORS, enforce HTTPS, and use secure storage for secrets.

## Troubleshooting
- Backend not reachable from device:
  - Use your machine IP instead of `localhost` in `EXPO_PUBLIC_API_URL`.
  - Confirm firewall allows inbound connections on the API port.
- Expo fails to load:
  - Clear cache: `npx expo start -c`.
  - Ensure Node 18+ and matching Expo SDK.
- Supabase auth/data issues:
  - Verify `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
  - Server-side operations should use the Service Role key (never expose in the app).

## Contributing
- Use feature branches and PRs.
- Keep commits focused and descriptive.
- Avoid including secrets, personal data, or proprietary logic in commits.

---
If you want, I can also convert any hardcoded credentials into env-driven config and add `.env.example` files for both apps—just say the word.
