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
  githubModelsEndpoint:
    readEnv('GITHUB_MODELS_ENDPOINT') || 'https://models.github.ai/inference/chat/completions',
  githubModelsModel: readEnv('GITHUB_MODELS_MODEL') || 'openai/gpt-4.1-mini'
};
