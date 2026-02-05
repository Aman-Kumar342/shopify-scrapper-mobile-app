# DataFlow - Shopify Scraper App

## Project Overview
A mobile SaaS app that lets users paste a public Shopify store URL, scrape product data, and download it as a CSV after authentication and payment.

## Tech Stack

### Frontend (Mobile)
- React Native
- Expo (managed workflow)
- TypeScript
- Expo Router
- NativeWind (Tailwind CSS)
- Supabase JS SDK
- Expo SecureStore

### Backend
- Node.js
- Fastify
- TypeScript
- Zod (validation)
- Supabase Admin SDK
- Axios

### Infrastructure
- Supabase (Authentication + PostgreSQL + Storage)
- Railway or Render (backend hosting)

## Project Structure

```
ShopifyScrapper/
├── backend/
│   ├── src/
│   │   ├── middleware/
│   │   │   └── auth.ts          # JWT verification
│   │   ├── routes/
│   │   │   ├── auth.ts          # Auth endpoints
│   │   │   ├── payment.ts       # Payment & credits
│   │   │   └── scrape.ts        # Scraping & CSV
│   │   ├── types/
│   │   │   └── index.ts         # TypeScript types
│   │   ├── utils/
│   │   │   └── supabase.ts      # Supabase client
│   │   └── server.ts            # Fastify server
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── onboarding/      # Onboarding screens
│   │   │   └── login/           # Login screen
│   │   ├── (app)/
│   │   │   ├── home/            # Dashboard
│   │   │   ├── validation/      # Store validation
│   │   │   ├── results/         # Scrape results
│   │   │   ├── billing/         # Credits & billing
│   │   │   ├── download/        # Download & export
│   │   │   ├── history/         # Scrape history
│   │   │   └── settings/        # Profile & settings
│   │   ├── _layout.tsx
│   │   └── index.tsx
│   ├── components/              # Shared components
│   ├── lib/
│   │   ├── auth.ts              # Auth functions
│   │   ├── constants.ts         # App constants
│   │   └── supabase.ts          # Supabase client
│   ├── package.json
│   ├── tsconfig.json
│   ├── tailwind.config.js
│   └── babel.config.js
├── supabase-schema.sql          # Database schema
├── plan.txt                     # Development plan
└── SETUP.md                     # This file
```

## Setup Instructions

### 1. Supabase Setup

1. Create a new Supabase project at https://supabase.com
2. Go to SQL Editor and run the contents of `supabase-schema.sql`
3. Get your project credentials:
   - Project URL
   - Anon/Public key
   - Service Role key (for backend)

### 2. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Edit .env with your Supabase credentials:
# SUPABASE_URL=your_project_url
# SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Run development server
npm run dev
```

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Edit .env with your credentials:
# EXPO_PUBLIC_API_URL=http://localhost:3000
# EXPO_PUBLIC_SUPABASE_URL=your_project_url
# EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

# Start Expo
npx expo start
```

### 4. Run on Mobile

#### Using Expo Go (Recommended for testing)
1. Install Expo Go app on your phone (iOS/Android)
2. Scan the QR code from the terminal

#### Using iOS Simulator
```bash
npx expo run:ios
```

#### Using Android Emulator
```bash
npx expo run:android
```

## Screens Implemented

1. **Onboarding** - Welcome screens with app intro
2. **Login** - Email OTP / Magic Link authentication
3. **Home/Dashboard** - Store URL input, recent scrapes
4. **Store Validation** - Validate Shopify store before scraping
5. **Scrape Results** - Preview data with stats
6. **Credits & Billing** - Purchase credits with pricing plans
7. **Download & Export** - CSV download and export options
8. **Scrape History** - View and manage past scrapes
9. **Profile & Settings** - User profile and app settings

## API Endpoints

### Auth
- `POST /auth/send-otp` - Send login code
- `POST /auth/verify-otp` - Verify code and login
- `POST /auth/refresh` - Refresh session

### Scrape
- `POST /scrape/validate-store` - Validate Shopify store URL
- `POST /scrape/start` - Start scraping job
- `GET /scrape/status/:jobId` - Get job status
- `GET /scrape/history` - Get scrape history
- `GET /scrape/download/:jobId` - Download CSV

### Payment
- `GET /payment/credits` - Get user credits
- `POST /payment/purchase` - Purchase credits
- `POST /payment/deduct-credits` - Deduct credits (internal)

## Environment Variables

### Backend (.env)
```
PORT=3000
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Frontend (.env)
```
EXPO_PUBLIC_API_URL=http://localhost:3000
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

## Features

- ✅ Email OTP Authentication (Supabase Auth)
- ✅ Shopify Store Validation
- ✅ Product Scraping with pagination
- ✅ CSV Generation & Download
- ✅ Credit-based Payment System
- ✅ Scrape History
- ✅ User Profile & Settings
- ✅ Dark Mode UI
- ✅ Responsive Design

## Notes

- Scraping uses Shopify's public `/products.json` endpoint
- CSV files are generated on-demand (not stored permanently)
- Credits system: 5 credits per successful scrape
- Free 5 credits on signup
- All screens match the provided UI designs exactly
