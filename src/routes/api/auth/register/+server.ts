import { json } from '@sveltejs/kit';
import { z } from 'zod';
import { createServerSupabaseAdmin } from '$lib/server/supabase';
import { createProfileOnRegistration } from '$lib/server/register-profile';
import {
  getRegistrationMode,
  findInviteByNormalizedEmail,
  normalizeEmail,
  acceptInvite
} from '$lib/server/invite-system';

const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  fullName: z.string().min(1)
});

export async function POST({ request }) {
  const raw = await request.json();
  const parsed = RegisterSchema.safeParse(raw);

  if (!parsed.success) {
    return json({ error: 'Invalid request: email, password, and fullName are required' }, { status: 400 });
  }

  const { email, password, fullName } = parsed.data;
  const normalizedEmail = normalizeEmail(email);

  const supabase = createServerSupabaseAdmin();

  if (!supabase) {
    return json({ error: 'Server configuration error' }, { status: 500 });
  }

  const mode = await getRegistrationMode(supabase);

  if (mode === 'closed') {
    return json({ error: 'Registration is currently closed' }, { status: 403 });
  }

  if (mode === 'invite_only') {
    const invite = await findInviteByNormalizedEmail(supabase, normalizedEmail);
    if (!invite) {
      return json({ error: 'This email requires an invitation to register' }, { status: 403 });
    }
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } }
  });

  if (error) {
    return json({ error: error.message }, { status: 400 });
  }

  if (data.user && mode === 'invite_only') {
    await acceptInvite(supabase, normalizedEmail);
  }

  if (data.user) {
    await createProfileOnRegistration(supabase, data.user.id, fullName, email);
  }

  return json({
    user: data.user,
    session: data.session
  });
}
