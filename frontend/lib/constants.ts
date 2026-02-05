// API Configuration
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

// Supabase Configuration
export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

// App Config
export const APP_NAME = 'DataFlow';
export const CREDITS_PER_SCRAPE = 5;

// Pricing Plans (INR)
export const PRICING_PLANS = [
  {
    id: 'starter',
    name: 'Starter Pack',
    description: 'Perfect for occasional market research',
    price: 499,
    credits: 10,
    features: ['Instant activation', 'No expiry'],
  },
  {
    id: 'growth',
    name: 'Growth Bundle',
    description: 'For active Shopify store monitoring',
    price: 1999,
    originalPrice: 2499,
    credits: 50,
    popular: true,
    features: ['20% bundle discount applied', 'Priority processing speed'],
  },
  {
    id: 'pro',
    name: 'Scale Pro',
    description: 'Unlimited market research potential',
    price: 6999,
    credits: 200,
    features: ['Dedicated account manager support'],
  },
];
