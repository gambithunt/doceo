# Admin Model Selector — Implementation Plan

Move AI provider and model configuration from hard-coded environment variables to a live admin UI with persistent storage in Supabase. Operators can switch providers and models per route without touching `.env` or redeploying.

---

## Problem Statement

Today the AI configuration is entirely static:

```
GITHUB_MODELS_FAST=openai/gpt-4.1-nano
GITHUB_MODELS_DEFAULT=openai/gpt-4o-mini
GITHUB_MODELS_THINKING=openai/gpt-4.1-mini
```

This means:
- Changing a model requires a redeploy
- Only GitHub Models is wired up — there is no path to OpenAI direct, Anthropic, or other providers
- There is no way to test a new model on a specific route without affecting all routes
- Cost differences between providers are invisible at configuration time

---

## Target State

The admin Settings page has a **Model Defaults** section with:
1. A **provider dropdown** (GitHub Models / OpenAI / Anthropic / Moonshot Kimi)
2. Per-tier **model dropdowns** (Fast / Default / Thinking)
3. Per-route **override dropdowns** (optional — override the tier assignment for a specific route)
4. A **Save** button that persists to Supabase `admin_settings` table
5. Cost-per-1M-tokens shown inline next to each model option
6. The running platform reads settings from DB on each request (cached with a short TTL)

---

## Architecture

### Data Flow (current)

```
.env → model-tiers.ts → resolveModelForTier() → ai-edge.ts → github-models-tutor/index.ts
```

### Data Flow (target)

```
admin_settings (Supabase)
  └─ getAiConfig() [server, cached 30s]
       └─ ai-edge.ts → provider adapter → [GitHub Models | OpenAI | Anthropic | Kimi]
```

The `.env` vars become **defaults only** — used when no DB config exists (bootstrap / first deploy).

---

## Provider Catalogue

Each provider needs: base URL, auth header pattern, model list, token pricing.
Add the ability to run a model scan for each model provider to list all avalible models and their prices so that they can be added easily

### GitHub Models
- **Base URL**: `https://models.github.ai/inference`
- **Auth**: `Authorization: Bearer $GITHUB_MODELS_TOKEN`
- **Format**: OpenAI-compatible chat completions
- **Models**:
  | Tier | Model ID | Input $/1M | Output $/1M |
  |------|----------|-----------|------------|
  | fast | `openai/gpt-4.1-nano` | $0.10 | $0.40 |
  | default | `openai/gpt-4o-mini` | $0.15 | $0.60 |
  | thinking | `openai/gpt-4.1-mini` | $0.40 | $1.60 |

### OpenAI Direct
- **Base URL**: `https://api.openai.com/v1`
- **Auth**: `Authorization: Bearer $OPENAI_API_KEY`
- **Format**: OpenAI chat completions (native)
- **Models**:
  | Tier | Model ID | Input $/1M | Output $/1M |
  |------|----------|-----------|------------|
  | fast | `gpt-4.1-nano` | $0.10 | $0.40 |
  | default | `gpt-4o-mini` | $0.15 | $0.60 |
  | thinking | `gpt-4.1-mini` | $0.40 | $1.60 |
  | thinking | `gpt-4o` | $2.50 | $10.00 |

### Anthropic
- **Base URL**: `https://api.anthropic.com/v1`
- **Auth**: `x-api-key: $ANTHROPIC_API_KEY`
- **Format**: Anthropic Messages API (different shape — needs adapter)
- **Models**:
  | Tier | Model ID | Input $/1M | Output $/1M |
  |------|----------|-----------|------------|
  | fast | `claude-haiku-4-5-20251001` | $0.80 | $4.00 |
  | default | `claude-sonnet-4-6` | $3.00 | $15.00 |
  | thinking | `claude-opus-4-6` | $15.00 | $75.00 |

### Moonshot Kimi
- **Base URL**: `https://api.moonshot.cn/v1`
- **Auth**: `Authorization: Bearer $KIMI_API_KEY`
- **Format**: OpenAI-compatible chat completions
- **Models**:
  | Tier | Model ID | Input $/1M | Output $/1M |
  |------|----------|-----------|------------|
  | fast | `moonshot-v1-8k` | $0.12 | $0.12 |
  | default | `kimi-k2-0711-preview` | $0.60 | $2.50 |
  | thinking | `kimi-k2-0711-preview` | $0.60 | $2.50 |

---

## Implementation Phases

### Phase 0 — DB Schema
**File**: `supabase/migrations/YYYYMMDDHHMMSS_admin_settings.sql`

```sql
CREATE TABLE IF NOT EXISTS admin_settings (
  key   text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Row-level: only service role reads/writes (no RLS for users)
-- No RLS policy needed — accessed only via admin server routes

-- Seed defaults (non-destructive)
INSERT INTO admin_settings (key, value) VALUES
  ('ai_config', '{
    "provider": "github-models",
    "tiers": {
      "fast":     { "model": "openai/gpt-4.1-nano" },
      "default":  { "model": "openai/gpt-4o-mini"  },
      "thinking": { "model": "openai/gpt-4.1-mini"  }
    },
    "routeOverrides": {}
  }')
ON CONFLICT (key) DO NOTHING;
```

---

### Phase 1 — Shared Provider Registry
**File**: `src/lib/ai/providers.ts`

```typescript
export type ProviderId = 'github-models' | 'openai' | 'anthropic' | 'kimi';

export interface ModelOption {
  id: string;             // e.g. "openai/gpt-4.1-nano"
  label: string;          // e.g. "GPT-4.1 Nano"
  tier: 'fast' | 'default' | 'thinking';
  inputPer1M: number;
  outputPer1M: number;
}

export interface ProviderDefinition {
  id: ProviderId;
  label: string;
  envKeyVar: string;      // env var that holds the API key
  models: ModelOption[];
}

export const PROVIDERS: ProviderDefinition[] = [ ... ];

export function getProviderById(id: ProviderId): ProviderDefinition | undefined
export function getModelById(providerId: ProviderId, modelId: string): ModelOption | undefined
export function getDefaultModelsForProvider(id: ProviderId): Record<'fast' | 'default' | 'thinking', ModelOption>
```

**Tests**: `src/lib/ai/providers.test.ts` — verify registry completeness, pricing non-zero, no duplicate model IDs within a provider.

---

### Phase 2 — Server-Side Config Loader
**File**: `src/lib/server/ai-config.ts`

```typescript
export interface AiConfig {
  provider: ProviderId;
  tiers: {
    fast:     { model: string };
    default:  { model: string };
    thinking: { model: string };
  };
  routeOverrides: Partial<Record<AiMode, { provider?: ProviderId; model?: string }>>;
}

// Cached — re-reads from DB at most once per 30 seconds
export async function getAiConfig(): Promise<AiConfig>

// Resolve the final model + provider for a given mode
export function resolveAiRoute(config: AiConfig, mode: AiMode): {
  provider: ProviderId;
  model: string;
}

// Save new config (admin only — call from settings server action)
export async function saveAiConfig(config: AiConfig): Promise<void>
```

Falls back to env vars when DB returns no row (first deploy, dev without DB).

**Tests**: `src/lib/server/ai-config.test.ts`
- `resolveAiRoute` returns route override when set
- `resolveAiRoute` falls back to tier default when no override
- `resolveAiRoute` handles missing provider gracefully
- Config merges correctly with env var fallback

---

### Phase 3 — Provider Adapters
**File**: `src/lib/server/ai-providers/index.ts`
**Files**: `src/lib/server/ai-providers/github-models.ts`, `openai.ts`, `anthropic.ts`, `kimi.ts`

Each adapter implements:

```typescript
export interface AiProviderAdapter {
  complete(params: {
    model: string;
    messages: ChatMessage[];
    systemPrompt: string;
    temperature?: number;
  }): Promise<AiCompletionResult>;
}

export interface AiCompletionResult {
  content: string;
  tokensUsed: { inputTokens: number; outputTokens: number } | null;
  latencyMs: number;
  rawResponse: unknown;
}
```

The Anthropic adapter handles the format difference (Messages API vs OpenAI chat format) and converts the response to the common shape.

**Tests**: per-adapter unit tests mock `fetch`, verify request shape and response parsing.

---

### Phase 4 — Edge Function Update
**File**: `supabase/functions/github-models-tutor/index.ts`

Rename to `supabase/functions/ai-tutor/index.ts` (or keep name, change internals).

The edge function currently hard-codes GitHub Models. Update it to:
1. Accept `provider` in the request body
2. Use the appropriate base URL and auth header per provider
3. Pass the `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `KIMI_API_KEY` as Supabase function secrets

Alternatively, keep the edge function as a proxy and move provider routing to the SvelteKit API routes (simpler, avoids function redeploy).

**Recommended approach**: move provider dispatch to SvelteKit server routes. The edge function remains as a GitHub Models proxy only. New providers call their APIs directly from SvelteKit API routes (server-side, secrets in `process.env`).

---

### Phase 5 — Settings UI
**File**: `src/routes/admin/settings/+page.server.ts`

```typescript
export async function load() {
  const aiConfig = await getAiConfig();
  return { aiConfig, providers: PROVIDERS, ... };
}

export const actions = {
  saveAiConfig: async ({ request }) => {
    const data = await request.formData();
    const config = parseAiConfigFromFormData(data);
    await saveAiConfig(config);
    return { success: true };
  }
};
```

**File**: `src/routes/admin/settings/+page.svelte`

Replace the static "Model Tier Defaults" table with:

```
┌─ AI Models ────────────────────────────────────────────────────┐
│                                                                  │
│  Provider    [GitHub Models ▼]                                   │
│                                                                  │
│  Tier        Model                          Cost                 │
│  ─────────────────────────────────────────────────────          │
│  Fast        [GPT-4.1 Nano ▼]              $0.10/$0.40 /1M     │
│  Default     [GPT-4o Mini ▼]               $0.15/$0.60 /1M     │
│  Thinking    [GPT-4.1 Mini ▼]              $0.40/$1.60 /1M     │
│                                                                  │
│  ▸ Route overrides (optional)                                    │
│    lesson-chat   [inherit from Default ▼]                        │
│    lesson-plan   [inherit from Thinking ▼]                       │
│    topic-shortlist [inherit from Fast ▼]                         │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

When provider changes:
- Model dropdowns repopulate with that provider's model list
- Inline pricing updates in real time (no server round-trip)
- Dropdowns show model label + pricing hint e.g. "GPT-4o Mini — $0.15 in / $0.60 out per 1M"

---

### Phase 6 — Wire API Routes to Config
**Files**: `src/routes/api/ai/lesson-chat/+server.ts`, `lesson-plan`, `topic-shortlist`, `subject-hints`, `lesson-selector`

Each route currently calls `invokeAuthenticatedAiEdge`. Update to:
1. Call `getAiConfig()` at the top of the handler
2. Call `resolveAiRoute(config, mode)` to get `{ provider, model }`
3. Route to the correct adapter

```typescript
const config = await getAiConfig();
const { provider, model } = resolveAiRoute(config, 'lesson-chat');

if (provider === 'github-models') {
  // existing edge function path
} else {
  // direct provider adapter
  const adapter = getProviderAdapter(provider);
  const result = await adapter.complete({ model, messages, systemPrompt });
}
```

---

## File Inventory

```
src/lib/ai/
  providers.ts                     — provider + model registry
  providers.test.ts                — registry validation tests

src/lib/server/
  ai-config.ts                     — DB-backed config loader + resolver
  ai-config.test.ts                — resolver unit tests
  ai-providers/
    index.ts                       — factory: getProviderAdapter(id)
    github-models.ts               — GitHub Models adapter
    openai.ts                      — OpenAI direct adapter
    anthropic.ts                   — Anthropic adapter (format conversion)
    kimi.ts                        — Kimi / Moonshot adapter

src/routes/admin/settings/
  +page.server.ts                  — load config + saveAiConfig action
  +page.svelte                     — provider dropdown + tier model dropdowns

supabase/migrations/
  YYYYMMDDHHMMSS_admin_settings.sql  — admin_settings table + seed row

supabase/functions/ai-tutor/
  index.ts                         — renamed/updated edge function
                                     (or: keep github-models-tutor, add openai-tutor etc.)
```

---

## New Env Vars Required

```
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
KIMI_API_KEY=sk-...
```

These are secrets — never exposed to the client. Store in Supabase function secrets AND in `.env` for local dev. The existing `GITHUB_MODELS_TOKEN` remains.

---

## TDD Checkpoints

| File | Tests to write first (RED) |
|------|---------------------------|
| `providers.test.ts` | All provider IDs exist · Each provider has ≥1 model per tier · Pricing > 0 |
| `ai-config.test.ts` | resolveAiRoute uses override when set · falls back to tier · falls back to env |
| `github-models.test.ts` | Builds correct request shape · Parses response tokens |
| `openai.test.ts` | Auth header uses OPENAI_API_KEY · Response parsed correctly |
| `anthropic.test.ts` | Converts OpenAI message format to Anthropic Messages API · Parses input_tokens/output_tokens |
| `kimi.test.ts` | OpenAI-compatible — same shape as github-models adapter |

---

## Execution Order

1. `admin_settings` migration
2. `providers.ts` + tests (RED → GREEN)
3. `ai-config.ts` + tests (RED → GREEN)
4. `github-models.ts` adapter + tests (RED → GREEN) — refactor existing edge function logic
5. `openai.ts` adapter + tests (RED → GREEN)
6. `anthropic.ts` adapter + tests (RED → GREEN)
7. `kimi.ts` adapter + tests (RED → GREEN)
8. Settings UI — load from DB, dropdowns, save action
9. Wire each API route to use `resolveAiRoute`
10. Smoke test: switch provider in admin UI, send a lesson-chat message, verify `ai_interactions` logs correct provider + model + real cost

---

## Out of Scope (this workstream)

- Streaming responses (all providers currently return full JSON)
- Per-user provider overrides
- Model A/B testing / traffic splitting
- Automatic failover when a provider is down (future: circuit breaker)
- Billing/quota management per provider
