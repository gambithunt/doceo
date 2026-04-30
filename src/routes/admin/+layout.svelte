<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { supabase } from '$lib/supabase';
  import { syncAdminSessionCookie } from '$lib/admin-auth';

  const { children } = $props();

  const navItems = [
    { id: 'overview',  label: 'Overview',   icon: '◈', path: '/admin',          color: 'var(--color-blue)'   },
    { id: 'users',     label: 'Users',      icon: '◉', path: '/admin/users',    color: 'var(--color-purple)' },
    { id: 'learning',  label: 'Learning',   icon: '↗', path: '/admin/learning', color: 'var(--accent)'       },
    { id: 'messages',  label: 'Messages',   icon: '◎', path: '/admin/messages', color: 'var(--color-orange)' },
    { id: 'content',   label: 'Content',    icon: '◫', path: '/admin/content',  color: 'var(--color-yellow)' },
    { id: 'graph',     label: 'Graph',      icon: '◇', path: '/admin/graph',    color: 'var(--color-blue)'   },
    { id: 'revenue',   label: 'Revenue',    icon: '$', path: '/admin/revenue',  color: 'var(--accent)'       },
    { id: 'ai',        label: 'AI & Costs', icon: '⬡', path: '/admin/ai',       color: 'var(--color-purple)' },
    { id: 'system',    label: 'System',     icon: '◐', path: '/admin/system',   color: 'var(--color-blue)'   },
    { id: 'settings',  label: 'Settings',   icon: '◧', path: '/admin/settings', color: 'var(--muted)'        },
  ];

  function isActive(path: string): boolean {
    const pathname = $page.url.pathname;
    if (path === '/admin') return pathname === '/admin';
    return pathname.startsWith(path);
  }

  onMount(() => {
    if (!supabase) {
      return;
    }

    const syncTokenCookie = (session: { access_token?: string | null } | null | undefined) => {
      syncAdminSessionCookie(document, session, {
        secure: window.location.protocol === 'https:'
      });
    };

    let subscription: { unsubscribe: () => void } | null = null;

    void (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      syncTokenCookie(session);

      const { data } = supabase.auth.onAuthStateChange((_event, updated) => {
        syncTokenCookie(updated);
        if (!updated?.user) {
          void goto('/');
        }
      });
      subscription = data.subscription;
    })();

    return () => {
      subscription?.unsubscribe();
    };
  });
</script>

<div class="admin-shell">
  <aside class="admin-sidebar">
    <div class="admin-brand">
      <div class="brand-mark" aria-hidden="true">D</div>
      <div class="brand-copy">
        <span class="brand-name">Doceo</span>
        <span class="brand-badge">Admin</span>
      </div>
    </div>

    <nav aria-label="Admin navigation">
      {#each navItems as item}
        <a
          href={item.path}
          class="nav-item"
          class:active={isActive(item.path)}
          style:--nav-color={item.color}
          aria-current={isActive(item.path) ? 'page' : undefined}
        >
          <span class="nav-icon" aria-hidden="true">{item.icon}</span>
          <span class="nav-label">{item.label}</span>
        </a>
      {/each}
    </nav>

    <div class="sidebar-footer">
      <a href="/" class="back-link">
        <span aria-hidden="true">←</span> Back to app
      </a>
    </div>
  </aside>

  <main class="admin-main">
    {@render children()}
  </main>
</div>

<style>
  /* ── Admin shell ── */
  .admin-shell {
    display: grid;
    grid-template-columns: 232px 1fr;
    min-height: 100vh;
  }

  /* ── Sidebar ── */
  .admin-sidebar {
    display: grid;
    grid-template-rows: auto 1fr auto;
    padding: 1.25rem 0.875rem;
    background: var(--surface-soft);
    border-right: 1px solid var(--border);
    position: sticky;
    top: 0;
    height: 100vh;
    overflow-y: auto;
  }

  /* Brand */
  .admin-brand {
    display: flex;
    align-items: center;
    gap: 0.7rem;
    padding: 0.25rem 0.5rem 1.25rem;
    border-bottom: 1px solid var(--border);
    margin-bottom: 0.75rem;
  }

  .brand-mark {
    width: 2.25rem;
    height: 2.25rem;
    border-radius: 0.65rem;
    background: var(--accent);
    color: var(--accent-contrast);
    font-size: 1rem;
    font-weight: 900;
    display: grid;
    place-items: center;
    flex-shrink: 0;
    box-shadow: 0 0 0 1px var(--accent-glow), 0 4px 14px var(--accent-glow);
    letter-spacing: -0.02em;
  }

  .brand-copy {
    display: flex;
    align-items: center;
    gap: 0.45rem;
  }

  .brand-name {
    font-size: 1rem;
    font-weight: 800;
    color: var(--text);
    letter-spacing: -0.02em;
  }

  .brand-badge {
    font-size: 0.6rem;
    font-weight: 800;
    background: var(--color-yellow-dim);
    color: var(--color-yellow);
    border: 1px solid color-mix(in srgb, var(--color-yellow) 28%, transparent);
    border-radius: 999px;
    padding: 0.18rem 0.5rem;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  /* Nav */
  nav {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
  }

  .nav-item {
    display: flex;
    align-items: center;
    gap: 0.65rem;
    padding: 0.6rem 0.8rem;
    border-radius: 0.65rem;
    border: 1px solid transparent;
    text-decoration: none;
    font-size: 0.9rem;
    font-weight: 500;
    color: var(--text-soft);
    transition: background 130ms, color 130ms, box-shadow 130ms, border-color 130ms;
  }

  .nav-item:hover {
    background: var(--surface-strong);
    color: var(--text);
    transform: none; /* override global button hover lift */
  }

  .nav-item:hover .nav-icon {
    color: var(--nav-color);
  }

  .nav-item.active {
    background: color-mix(in srgb, var(--nav-color) 12%, transparent);
    border-color: color-mix(in srgb, var(--nav-color) 20%, transparent);
    color: var(--text);
    font-weight: 600;
    box-shadow: inset 3px 0 0 var(--nav-color);
  }

  .nav-item.active .nav-icon {
    color: var(--nav-color);
  }

  .nav-icon {
    font-size: 0.88rem;
    width: 1.15rem;
    text-align: center;
    flex-shrink: 0;
    color: var(--muted);
    transition: color 130ms;
    line-height: 1;
  }

  .nav-label { flex: 1; }

  /* Footer */
  .sidebar-footer {
    padding-top: 0.75rem;
    border-top: 1px solid var(--border);
  }

  .back-link {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.82rem;
    font-weight: 500;
    color: var(--muted);
    text-decoration: none;
    padding: 0.45rem 0.75rem;
    border-radius: 0.6rem;
    transition: color 130ms, background 130ms;
  }

  .back-link:hover {
    color: var(--text-soft);
    background: var(--surface-strong);
    transform: none;
  }

  /* Main */
  .admin-main {
    min-height: 100vh;
    overflow-y: auto;
  }

  @media (max-width: 900px) {
    .admin-shell {
      grid-template-columns: 1fr;
    }

    .admin-sidebar {
      position: static;
      height: auto;
      grid-template-rows: auto auto auto;
      gap: 0.85rem;
    }

    nav {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 0.35rem;
    }

    .sidebar-footer {
      border-top: none;
      padding-top: 0;
    }
  }

  @media (max-width: 640px) {
    .admin-sidebar {
      padding: 1rem 0.75rem;
    }

    nav {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }
</style>
