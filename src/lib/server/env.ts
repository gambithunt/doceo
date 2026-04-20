import { config } from 'dotenv';

config();

function readEnv(name: string): string {
  return process.env[name] ?? '';
}

export const serverEnv = {
  supabaseUrl: readEnv('PUBLIC_SUPABASE_URL') || readEnv('VITE_SUPABASE_URL'),
  supabaseAnonKey: readEnv('PUBLIC_SUPABASE_ANON_KEY') || readEnv('VITE_SUPABASE_ANON_KEY'),
  supabaseServiceRoleKey: readEnv('SUPABASE_SERVICE_ROLE_KEY'),
  githubModelsToken: readEnv('GITHUB_MODELS_TOKEN'),
  openaiApiKey: readEnv('OPENAI_API_KEY'),
  elevenlabsApiKey: readEnv('ELEVENLABS_API_KEY'),
  anthropicApiKey: readEnv('ANTHROPIC_API_KEY'),
  kimiApiKey: readEnv('KIMI_API_KEY'),
  stripeSecretKey: readEnv('STRIPE_SECRET_KEY'),
  stripeWebhookSecret: readEnv('STRIPE_WEBHOOK_SECRET'),
  stripePriceIdBasic: readEnv('STRIPE_PRICE_ID_BASIC'),
  stripePriceIdStandard: readEnv('STRIPE_PRICE_ID_STANDARD'),
  stripePriceIdPremium: readEnv('STRIPE_PRICE_ID_PREMIUM'),
  stripePriceIdBasicZar: readEnv('STRIPE_PRICE_ID_BASIC_ZAR'),
  stripePriceIdStandardZar: readEnv('STRIPE_PRICE_ID_STANDARD_ZAR'),
  stripePriceIdPremiumZar: readEnv('STRIPE_PRICE_ID_PREMIUM_ZAR')
};
