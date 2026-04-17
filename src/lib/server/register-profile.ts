import type { SupabaseClient } from '@supabase/supabase-js';

export async function createProfileOnRegistration(
  supabase: SupabaseClient,
  userId: string,
  fullName: string,
  email: string
) {
  return supabase.from('profiles').upsert({
    id: userId,
    auth_user_id: userId,
    full_name: fullName,
    email,
    role: 'student'
  });
}
