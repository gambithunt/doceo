import { config } from 'dotenv';

config();

function readEnv(name: string): string {
  return process.env[name] ?? '';
}

export const serverEnv = {
  supabaseUrl: readEnv('PUBLIC_SUPABASE_URL') || readEnv('VITE_SUPABASE_URL'),
  supabaseAnonKey: readEnv('PUBLIC_SUPABASE_ANON_KEY') || readEnv('VITE_SUPABASE_ANON_KEY'),
  supabaseServiceRoleKey: readEnv('SUPABASE_SERVICE_ROLE_KEY')
};
