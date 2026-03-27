// Auth is checked client-side in +layout.svelte using the Supabase browser session.
// Server-side data loads use createServerSupabaseAdmin() (service role) which is
// not user-scoped, so the client-side role check is the access gate.
export async function load() {
  return {};
}
