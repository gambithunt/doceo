# Topic Suggestion Tile — Design Upgrade

Sprint: April 2026
Status: Ready to implement
Files: `src/lib/components/topic-discovery/TopicSuggestionTile.svelte`, `TopicSuggestionFeedback.svelte`

---

## Overview

The TopicSuggestionTile is a dashboard card that suggests topics for students to start lessons on. The current design has too many competing elements at equal visual weight, making the card hard to scan and the primary action unclear.

This document defines the complete visual and interaction upgrade for the tile.

---

## What Changed and Why

### Removed

| Element | Reason |
|---------|--------|
| `#rank` display | Internal signal that creates anxiety without helping the student choose. Position in the grid communicates order. |
| Meta line ("0 signals", "85% finish") | Noise — especially at zero state. Students don't need analytics to decide whether to start a lesson. |
| Feedback text ("Was this a good suggestion?") | Redundant — thumbs up/down icons are self-explanatory. |
| Arrow (`→`) | Was hover-only, invisible on mobile. CTA text in accent color is sufficient affordance. |

### Reduced

| Element | Change | Reason |
|---------|--------|--------|
| Badge `min-height` | Remove `1.9rem` minimum — let padding define height naturally | Less vertical bloat |
| Feedback button size | `2.25rem` → `1.6rem` | Proportional to their importance as a secondary action |
| Card internal gap | `0.9rem` → zone-managed spacing | Fewer elements need less air |

### Improved

| Element | Change |
|---------|--------|
| Topic name | Bumped to `var(--text-lg)` (1.15rem), weight 700 — dominant focal point |
| "Start lesson" CTA | Colored with `var(--accent)` teal, weight 700 — clearly signals tappability |
| Reason line | Must use student-facing language, not internal jargon |
| Feedback footer | Visually separated with subtle border-top, icons centered and muted |

---

## Card Structure

Two zones — primary (tappable) and secondary (feedback footer):

```
+-------------------------------+
|  [Badge pill]                 |   <- tone-colored kicker
|                               |
|  Topic Name                   |   <- dominant focal point (text-lg, 700)
|  Why this was suggested       |   <- student-facing reason (text-sm, soft)
|                               |
|  Start lesson                 |   <- teal accent CTA (text-base, 700)
+- - - - - - - - - - - - - - - +   <- 1px border-top at var(--border) opacity
|          thumb-up  thumb-down |   <- small (1.6rem), centered, muted
+-------------------------------+
```

**Primary zone** — the `<button>` tap target covers badge through CTA. Full card width. Transparent background, no border.

**Secondary zone** — feedback footer sits outside the button. Two small thumb icons, centered, no label text. Visually subordinate.

---

## Tone Variants

Each card has a tone derived from the suggestion source and feedback state. Tone controls the badge color and the card's tinted background gradient.

| Tone | Badge text | Badge bg | Card gradient tint |
|------|-----------|----------|-------------------|
| `candidate` | New suggestion | `color-mix(in srgb, var(--color-purple-dim) 86%, var(--surface-soft))` | Purple-dim at 62% mixed with surface |
| `ready` | Ready now | `color-mix(in srgb, var(--color-blue-dim) 82%, var(--surface-soft))` | Blue-dim at 56% mixed with surface |
| `explore` | Try something new | `color-mix(in srgb, var(--color-yellow-dim) 88%, var(--surface-soft))` | Yellow-dim at 66% mixed with surface |
| `affirmed` | Helpful | `color-mix(in srgb, var(--accent) 12%, var(--surface-soft))` | Accent-dim at 74% mixed with surface |

Card background uses a `linear-gradient(180deg, ...)` from the tinted surface-strong to surface-soft, matching the existing pattern. Border gets a tone-tinted mix with `var(--border-strong)`.

---

## Reason Line Copy

The reason line must be student-facing. Map internal labels to warm, encouraging copy:

| Internal value | Student-facing copy |
|---------------|-------------------|
| Exploration candidate | Try something new |
| Revision due | Time to revisit this |
| High completion rate | Students love this one |
| Weak signal | Build your skills here |
| Model candidate | Picked for you |

---

## Component Styles

### Card surface (`.topic-tile`)

```css
.topic-tile {
  --tile-border: color-mix(in srgb, var(--border-strong) 88%, transparent);
  --tile-bg: linear-gradient(
    180deg,
    color-mix(in srgb, var(--surface-strong) 94%, transparent),
    color-mix(in srgb, var(--surface-soft) 92%, transparent)
  );
  --tile-shadow: var(--shadow-sm);
  --tile-badge-bg: color-mix(in srgb, var(--surface-soft) 92%, transparent);
  --tile-badge-color: var(--text);

  display: grid;
  gap: 0;
  padding: 0;
  border-radius: calc(var(--radius-lg) + 0.15rem);
  border: 1px solid var(--tile-border);
  background: var(--tile-bg);
  box-shadow: var(--tile-shadow);
  transition:
    transform 200ms var(--ease-spring),
    box-shadow 200ms var(--ease-soft),
    border-color var(--motion-fast) var(--ease-soft),
    background 220ms var(--ease-soft);
}
```

### Primary zone (`.topic-launch`)

```css
.topic-launch {
  display: grid;
  gap: 0.55rem;
  width: 100%;
  padding: 1rem 1.1rem 0.85rem;
  border: none;
  background: transparent;
  color: inherit;
  text-align: left;
  font: inherit;
  cursor: pointer;
}

.topic-launch:focus-visible {
  outline: none;
}
```

### Badge pill (`.topic-badge`)

```css
.topic-badge {
  display: inline-flex;
  align-items: center;
  justify-self: start;
  padding: 0.18rem 0.55rem;
  border-radius: var(--radius-pill);
  font-size: 0.72rem;
  font-weight: 700;
  background: var(--tile-badge-bg);
  color: var(--tile-badge-color);
}
```

### Topic name

```css
.topic-body strong {
  font-size: var(--text-lg);   /* 1.15rem */
  font-weight: 700;
  line-height: 1.25;
  color: var(--text);
  letter-spacing: -0.015em;
}
```

### Reason line

```css
.topic-body p {
  font-size: var(--text-sm);   /* 0.85rem */
  font-weight: 400;
  color: var(--text-soft);
  line-height: 1.4;
}
```

### CTA

```css
.topic-cta {
  color: var(--accent);
  font-size: var(--text-base);  /* 1rem */
  font-weight: 700;
}
```

### Feedback footer

```css
.feedback-footer {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 0.5rem;
  padding: 0.6rem 1.1rem;
  border-top: 1px solid var(--border);
}

.feedback-thumb {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.6rem;
  height: 1.6rem;
  border-radius: var(--radius-pill);
  border: 1px solid color-mix(in srgb, var(--border-strong) 90%, transparent);
  background: color-mix(in srgb, var(--surface-soft) 92%, transparent);
  font-size: 0.72rem;
  cursor: pointer;
  transition:
    transform 160ms var(--ease-spring),
    border-color var(--motion-fast) var(--ease-soft),
    background 180ms var(--ease-soft),
    box-shadow 180ms var(--ease-soft);
}

.feedback-thumb:hover:not(:disabled) {
  transform: translateY(-1px);
  border-color: color-mix(in srgb, var(--accent) 34%, var(--border-strong));
  box-shadow: var(--shadow-sm);
}

.feedback-thumb.active {
  background: color-mix(in srgb, var(--accent) 14%, var(--surface-soft));
  border-color: color-mix(in srgb, var(--accent) 42%, var(--border-strong));
}
```

---

## Svelte 5 Markup

### TopicSuggestionTile.svelte

```svelte
<script lang="ts">
  import TopicSuggestionFeedback from './TopicSuggestionFeedback.svelte';
  import type { DashboardTopicDiscoverySuggestion } from '$lib/types';

  interface Props {
    suggestion: DashboardTopicDiscoverySuggestion;
    launching?: boolean;
    onLaunch?: (topicSignature: string) => void;
    onFeedback?: (topicSignature: string, feedback: 'up' | 'down') => void;
  }

  let {
    suggestion,
    launching = false,
    onLaunch,
    onFeedback
  }: Props = $props();

  const tone = $derived.by(() => {
    if (suggestion.feedback === 'up') return 'affirmed';
    if (suggestion.source === 'model_candidate') return 'candidate';
    if (suggestion.freshness === 'new' || suggestion.freshness === 'rising') return 'explore';
    return 'ready';
  });

  const badge = $derived.by(() => {
    if (suggestion.feedback === 'up') return 'Helpful';
    if (suggestion.source === 'model_candidate') return 'New suggestion';
    if (suggestion.freshness === 'new' || suggestion.freshness === 'rising') return 'Try something new';
    return 'Ready now';
  });
</script>

<article class={`topic-tile topic-tile--${tone}`} style="--i: {suggestion.rank};">
  <button
    type="button"
    class="topic-launch"
    aria-label={`Start lesson on ${suggestion.topicLabel}`}
    aria-busy={launching}
    onclick={() => onLaunch?.(suggestion.topicSignature)}
  >
    <span class="topic-badge">{badge}</span>
    <div class="topic-body">
      <strong>{suggestion.topicLabel}</strong>
      <p>{suggestion.reason}</p>
    </div>
    <span class="topic-cta">
      {#if launching}
        <span class="busy-dots" aria-hidden="true">
          <span class="busy-dot"></span>
          <span class="busy-dot"></span>
          <span class="busy-dot"></span>
        </span>
        <span>Starting...</span>
      {:else}
        <span>Start lesson</span>
      {/if}
    </span>
  </button>

  <TopicSuggestionFeedback
    topicLabel={suggestion.topicLabel}
    feedback={suggestion.feedback}
    pending={suggestion.feedbackPending}
    onFeedback={(feedback) => onFeedback?.(suggestion.topicSignature, feedback)}
  />
</article>
```

### TopicSuggestionFeedback.svelte

```svelte
<script lang="ts">
  interface Props {
    topicLabel: string;
    feedback: 'up' | 'down' | null;
    pending?: boolean;
    onFeedback?: (feedback: 'up' | 'down') => void;
  }

  let {
    topicLabel,
    feedback,
    pending = false,
    onFeedback
  }: Props = $props();
</script>

<div class="feedback-footer">
  <button
    type="button"
    class="feedback-thumb"
    class:active={feedback === 'up'}
    aria-label={`Thumbs up for ${topicLabel}`}
    aria-pressed={feedback === 'up'}
    disabled={pending}
    onclick={() => onFeedback?.('up')}
  >
    thumbs-up
  </button>
  <button
    type="button"
    class="feedback-thumb"
    class:active={feedback === 'down'}
    aria-label={`Thumbs down for ${topicLabel}`}
    aria-pressed={feedback === 'down'}
    disabled={pending}
    onclick={() => onFeedback?.('down')}
  >
    thumbs-down
  </button>
</div>
```

---

## Interaction and Motion

### Card Entry

Staggered entrance with opacity fade so cards don't pop in at full opacity mid-bounce:

```css
@keyframes tile-enter {
  0% {
    opacity: 0;
    transform: translateY(12px) scale(0.92);
  }
  60% {
    opacity: 1;
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.topic-tile {
  animation: tile-enter 0.42s cubic-bezier(0.34, 1.56, 0.64, 1) both;
  animation-delay: calc(var(--i, 0) * 0.045s);
}
```

Opacity reaches 1 at 60% — before the elastic overshoot settles — so the card is fully visible while finding its resting position.

**Stagger ceiling:** Cap at 8 cards (max delay `0.36s`). Beyond that, remaining cards enter simultaneously. A stagger exceeding one second feels like a loading state.

### Hover (Desktop Only)

```css
.topic-tile:hover {
  transform: translateY(-3px);
  box-shadow: var(--shadow-md);
  border-color: color-mix(in srgb, var(--accent) 28%, var(--tile-border));
}

.topic-tile:hover .topic-cta {
  text-shadow: 0 0 8px rgba(20, 184, 166, 0.25);
}
```

CTA gains a subtle teal glow on card hover. Desktop-only enhancement — invisible on mobile where the accent color alone carries the affordance. Transition: `200ms ease-out`.

### Press and Release

**Press (`:active`):**

```css
.topic-tile:has(.topic-launch:active) {
  transform: translateY(-1px) scale(0.985);
  box-shadow: var(--shadow-sm);
  transition: transform 80ms ease, box-shadow 80ms ease;
}
```

Scale is `0.985` — slightly less compression than the standard `0.99` because the card is compact. The same absolute compression would feel proportionally too aggressive.

**Release:** Spring-back with `cubic-bezier(0.22, 1, 0.36, 1)` over `200ms`. The card returns with slight momentum.

**Mobile touch:** Press state activates immediately on `touchstart` via native CSS `:active`. The 80ms compression is fast enough that even a quick tap registers visually before the page transitions.

### Focus Ring

Two-ring system from the design language:

```css
.topic-tile:has(.topic-launch:focus-visible) {
  outline: none;
  border-color: color-mix(in srgb, var(--accent) 56%, var(--tile-border));
  box-shadow:
    0 0 0 2px var(--color-bg),
    0 0 0 4px var(--accent),
    var(--shadow-sm);
}
```

Background-color gap between card edge and teal ring creates a halo. Dark mode: navy gap + teal ring = soft aquatic glow. Light mode: white gap + teal-600 = crisp and professional.

### Badge Tone Change

When tone changes (e.g., after feedback upgrades a card from candidate to affirmed):

```css
.topic-badge {
  transition: background-color 280ms ease, color 280ms ease;
}
```

Background crossfades to the new tone color. A subtle `scale(1.06)` pulse at the midpoint (60ms up, 100ms settle) confirms the change.

### Feedback Thumb Tap

**Press:**

```css
.feedback-thumb:active:not(:disabled) {
  transform: scale(0.88);
  transition: transform 60ms ease;
}
```

**After selection — confirming pulse:**

```css
@keyframes thumb-confirm {
  0%   { transform: scale(0.88); }
  50%  { transform: scale(1.08); }
  100% { transform: scale(1); }
}

.feedback-thumb.active {
  animation: thumb-confirm 220ms cubic-bezier(0.34, 1.56, 0.64, 1);
  background: color-mix(in srgb, var(--accent) 14%, var(--surface-soft));
  border-color: color-mix(in srgb, var(--accent) 42%, var(--border-strong));
}
```

One beat. Thumb compresses, springs slightly past resting, settles. Accent-tinted background fades in during settle phase. No text change.

**Unselected thumb** fades to `opacity: 0.45` over `200ms`. Remains tappable (students can change their mind) but visually recedes.

### Loading State

**Phase 1 — Immediate (0ms):**
- CTA text crossfades "Start lesson" → "Starting..." over `160ms`
- Card border transitions to accent at 38% mix

**Phase 2 — Sustained (after 200ms):**
- Busy-dot indicator replaces CTA text
- Card border pulses slowly:

```css
@keyframes tile-loading {
  0%, 100% { border-color: color-mix(in srgb, var(--accent) 22%, var(--tile-border)); }
  50%      { border-color: color-mix(in srgb, var(--accent) 44%, var(--tile-border)); }
}

.topic-tile[aria-busy] {
  animation: tile-loading 1.8s ease-in-out infinite;
}
```

This is the only permitted loop — loading states are the exception because the student needs ongoing confirmation that something is happening. The pulse is barely perceptible (22% to 44% accent mix).

**Sibling cards:** `opacity: 0.45; pointer-events: none;` with `200ms` fade. Focuses attention on the loading card and prevents double-taps.

---

## Motion Token Summary

| Moment | Duration | Easing | Property |
|--------|----------|--------|----------|
| Card entry | 420ms | `cubic-bezier(0.34, 1.56, 0.64, 1)` | transform, opacity |
| Hover lift | 200ms | ease-out | transform, box-shadow, border-color |
| CTA glow (hover) | 200ms | ease-out | text-shadow |
| Press | 80ms | ease | transform, box-shadow |
| Release | 200ms | `cubic-bezier(0.22, 1, 0.36, 1)` | transform, box-shadow |
| Thumb press | 60ms | ease | transform |
| Thumb confirm | 220ms | `cubic-bezier(0.34, 1.56, 0.64, 1)` | transform, background, border |
| Loading pulse | 1.8s | ease-in-out | border-color (loop) |
| Sibling dim | 200ms | ease | opacity |
| Badge tone change | 280ms | ease | background-color, color |

---

## Intentional Restraint

These elements are deliberately kept static or minimal:

| Element | Reason |
|---------|--------|
| Badge pill | No independent entry animation — arrives with the card. Separate motion fragments the entrance. |
| Reason text | No hover effect — subordinate copy. Highlighting it competes with the title. |
| Feedback footer | No border glow or shadow — secondary zone must stay visually quiet. |
| Card background gradient | No animation — animated gradients are expensive and feel restless on a grid of cards. |
| CTA text | No underline on hover — underlines feel web-link-ish, not app-like. Teal color is the affordance. |
| Skeleton loading cards | Existing opacity pulse only — no shimmer or gradient sweep. |

The contrast between calm static elements and the few expressive interactive ones is what makes the delight land. If everything moves, nothing matters.

---

## Mobile Considerations

- No hover-dependent affordances — CTA color and text are always visible
- Touch targets: primary zone is full card width; feedback buttons are 1.6rem with padding (above 44px minimum)
- Badge, title, reason, and CTA stack cleanly in narrow columns (220px minimum grid width)
- Feedback footer is centered, not spread — works at any card width
- Press state activates on `touchstart` natively — no JavaScript hover shim needed

---

## Grid Behavior

Cards sit in `repeat(auto-fill, minmax(220px, 1fr))`. At 220px minimum width, all content stacks comfortably. The reduced element count means cards are shorter, so more cards are visible above the fold.

---

## Color Reference

All colors come from the design language tokens. Never hardcode hex values.

**Dark mode base:**
- `--color-bg: #0f1229`
- `--color-surface: #161b35`
- `--color-accent: #14B8A6`
- `--color-accent-dim: rgba(20,184,166,0.12)`

**Light mode base:**
- `--color-bg: #F5F6F7`
- `--color-surface: #FFFFFF`
- `--color-accent: #0D9488`
- `--color-accent-dim: rgba(13,148,136,0.10)`

**Tone accent dims:**
- Purple: `--color-purple-dim` / `rgba(167,139,250,0.12)` dark, `rgba(124,58,237,0.10)` light
- Blue: `--color-blue-dim` / `rgba(96,165,250,0.12)` dark, `rgba(37,99,235,0.10)` light
- Yellow: `--color-yellow-dim` / `rgba(251,191,36,0.12)` dark, `rgba(217,119,6,0.10)` light
- Teal (affirmed): uses `--color-accent-dim`

**Shadows (light mode):**
- `--shadow-sm: 0 2px 8px rgba(0,0,0,0.04)`
- `--shadow-md: 0 4px 12px rgba(0,0,0,0.07)`

**Shadows (dark mode):**
- `--shadow-sm: 0 1px 4px rgba(0,0,0,0.3)`
- `--shadow-md: 0 4px 16px rgba(0,0,0,0.4)`
