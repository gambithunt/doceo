# Doceo Design Language

Doceo should feel like the smartest person you have ever met — someone who knows everything, explains it brilliantly, and genuinely wants you to succeed. Not a textbook. Not a corporate LMS. A guide who makes hard things feel exciting and achievable.

The entire product runs on one shared design language. Change the tokens once, change everything. Every screen — onboarding, dashboard, lesson, revision — must feel like it belongs to the same living system.

> **Pending color system update — March 2026**
> A color revision has been agreed but not yet implemented in code. Key changes:
> - **Accent**: Electric lime green (`#4ade80`) → **Teal** (`#14B8A6` dark / `#0D9488` light)
> - **Light mode background**: Periwinkle (`#f0f4ff`) → **Neutral soft canvas** (`#F5F6F7`)
> - **Primary buttons**: Teal fill (not black, not lime green)
> - **Light mode cards**: Adopt semantic pastel variants (green=done, blue=info, yellow=task, purple=content)
> - **Shadow + pill system**: Lighter, softer — aligned with `docs/workstreams/design-color-01.md`
> - **Dark mode**: Navy base and surfaces preserved; only accent changes
> - **Gamification colors**: Unchanged (orange, gold, purple)
>
> Full decisions documented in [`docs/workstreams/design-color-01.md`](workstreams/design-color-01.md) under "Doceo Adaptation Decisions".
> When implementing, update all token values in `src/app.css` before touching components.

---

## The Personality

**Doceo is a brilliant friend, not a bureaucrat.**

- Warm, direct, and energetic. Never cold or clinical.
- Speaks to the student by name. Celebrates wins. Acknowledges effort.
- Uses adventure and mission language: quests, paths, unlocks, streaks, checkpoints.
- Never condescending. Never corporate. Never formal for the sake of it.
- The interface should feel like it's rooting for the student.

---

## Visual Identity

### Theme

Doceo is **dark by default**. Dark mode is the primary experience, not an afterthought.

- Deep navy base: rich, deep backgrounds that feel immersive, not flat black
- Cards sit one stop lighter than the background — layered depth, not a flat sheet
- Accents glow against the dark — electric and alive
- Light mode is clean and readable but must still feel warm, not clinical

### Color System (CSS Tokens)

All colors are defined as CSS custom properties on `:root`. Never hardcode hex values in components — always use tokens.

```css
/* Base surfaces */
--color-bg:           #0f1229   /* deepest background */
--color-surface:      #161b35   /* default card surface */
--color-surface-mid:  #1e2545   /* elevated card / modal */
--color-surface-high: #252d52   /* highlighted tile / hover state */
--color-border:       rgba(255,255,255,0.08)
--color-border-strong:rgba(255,255,255,0.14)

/* Text */
--color-text:         #f1f5f9   /* primary text */
--color-text-soft:    #94a3b8   /* secondary / metadata */
--color-text-muted:   #64748b   /* placeholder / disabled */

/* Accent — electric lime (primary CTA, progress, active states) */
--color-accent:       #4ade80
--color-accent-dim:   rgba(74,222,128,0.12)
--color-accent-glow:  rgba(74,222,128,0.28)

/* Subject-tone accents — use on subject icons and tinted surfaces */
--color-blue:         #60a5fa
--color-blue-dim:     rgba(96,165,250,0.12)
--color-purple:       #a78bfa
--color-purple-dim:   rgba(167,139,250,0.12)
--color-orange:       #fb923c
--color-orange-dim:   rgba(251,146,60,0.12)
--color-red:          #f87171
--color-red-dim:      rgba(248,113,113,0.12)
--color-yellow:       #fbbf24
--color-yellow-dim:   rgba(251,191,36,0.12)

/* Gamification */
--color-xp:           #fbbf24   /* XP / streak gold */
--color-streak:       #fb923c   /* streak flame orange */
--color-badge:        #a78bfa   /* badge purple */

/* Semantic */
--color-success:      #4ade80
--color-warning:      #fbbf24
--color-error:        #f87171
```

**Light mode overrides** (on `:root[data-theme='light']`):

```css
/* Base surfaces */
--color-bg:           #f0f4ff   /* soft periwinkle page base — warm, not sterile white */
--color-surface:      #ffffff   /* card surface */
--color-surface-mid:  #eef2ff   /* elevated card / modal */
--color-surface-high: #e4e9ff   /* highlighted tile / hover state */
--color-border:       rgba(0,0,0,0.08)
--color-border-strong:rgba(0,0,0,0.14)

/* Text */
--color-text:         #0f172a   /* near-black — strong contrast */
--color-text-soft:    #475569   /* secondary labels */
--color-text-muted:   #94a3b8   /* placeholder / disabled */

/* Accent — same lime, adjusted glow opacity for light backgrounds */
--color-accent:       #16a34a   /* darker green so it stays readable on white */
--color-accent-dim:   rgba(22,163,74,0.10)
--color-accent-glow:  rgba(22,163,74,0.20)

/* Subject-tone accents — slightly deeper so they read on light surfaces */
--color-blue:         #2563eb
--color-blue-dim:     rgba(37,99,235,0.10)
--color-purple:       #7c3aed
--color-purple-dim:   rgba(124,58,237,0.10)
--color-orange:       #ea580c
--color-orange-dim:   rgba(234,88,12,0.10)
--color-red:          #dc2626
--color-red-dim:      rgba(220,38,38,0.10)
--color-yellow:       #d97706
--color-yellow-dim:   rgba(217,119,6,0.10)

/* Gamification — deeper so they pop on light backgrounds */
--color-xp:           #b45309   /* amber-gold */
--color-streak:       #ea580c   /* darker orange */
--color-badge:        #7c3aed   /* deeper purple */

/* Semantic */
--color-success:      #16a34a
--color-warning:      #d97706
--color-error:        #dc2626

/* Shadows — lighter and crisper on light backgrounds */
--shadow-sm:          0 1px 3px rgba(0,0,0,0.10);
--shadow-md:          0 4px 12px rgba(0,0,0,0.12);
--shadow-lg:          0 8px 24px rgba(0,0,0,0.14);
--shadow-glow-accent: 0 0 12px rgba(22,163,74,0.20);
--shadow-glow-blue:   0 0 12px rgba(37,99,235,0.18);
```

Light mode is not just a token inversion. The accent shifts from neon lime (`#4ade80`) to a deeper forest green (`#16a34a`) so CTAs stay readable on white surfaces. Subject-tone colors deepen for the same reason. Shadows become lighter and crisper — depth is created by border and edge definition rather than dark shadow spread.

### Radius

Use generous, consistent radius. Pill shapes for CTAs. Rounded for cards.

```css
--radius-sm:   0.5rem    /* chips, tags, badges */
--radius-md:   1rem      /* inputs, small cards */
--radius-lg:   1.4rem    /* standard cards, tiles */
--radius-xl:   1.8rem    /* hero cards, modals */
--radius-pill: 99px      /* buttons, level pills */
```

### Shadow

```css
--shadow-sm:  0 1px 4px rgba(0,0,0,0.3);
--shadow-md:  0 4px 16px rgba(0,0,0,0.4);
--shadow-lg:  0 8px 32px rgba(0,0,0,0.5);
--shadow-glow-accent: 0 0 16px var(--color-accent-glow);
--shadow-glow-blue:   0 0 16px rgba(96,165,250,0.28);
```

---

## Typography

Use `Inter` as the primary font. Bold, clean, modern. IBM Plex Sans is acceptable if Inter is unavailable.

Hierarchy must be immediately scannable. The student should never have to hunt for what to do next.

### Scale

```css
--text-xs:   0.72rem   /* timestamps, micro-labels */
--text-sm:   0.85rem   /* metadata, secondary labels */
--text-base: 1rem      /* body copy, card content */
--text-lg:   1.15rem   /* section leads, card titles */
--text-xl:   1.35rem   /* screen section headings */
--text-2xl:  1.7rem    /* screen titles */
--text-3xl:  2.2rem    /* hero greetings, big numbers */
```

### Weights

- **800 / ExtraBold**: hero greetings, big numbers (streaks, mastery %)
- **700 / Bold**: card titles, screen headings, CTA labels
- **600 / SemiBold**: section headings, active nav labels
- **400 / Regular**: body copy, descriptions, metadata

### Rules

- Hero greetings are large (2xl–3xl), bold (800), white. First person. "Hey Liam! Ready?"
- Card titles are bold (700), white, text-lg or xl.
- Descriptions are regular (400), text-soft, text-sm or base.
- Metadata (dates, stage info, counts) is small (xs–sm), muted.
- Never use ALL CAPS as a design decision. It reads as shouting or bureaucratic.
- Mono type is reserved for code or numeric indices only. Do not use it for kickers, labels, or personality.

---

## Layout

Every screen has a **primary zone** and optional **supporting zones**. Never let supporting zones compete with the primary.

### App Shell

```
[ sidebar nav ]  [ main content area ]  [ optional right rail ]
```

- Sidebar: fixed, dark, contains nav links with icon + label
- Main area: scrollable, contains the primary module
- Right rail: optional — streak, stats, next-step — subordinate to main

### Spacing

```css
--space-1:  0.25rem
--space-2:  0.5rem
--space-3:  0.75rem
--space-4:  1rem
--space-5:  1.25rem
--space-6:  1.5rem
--space-8:  2rem
--space-10: 2.5rem
--space-12: 3rem
```

Card internal padding: `--space-5` to `--space-6`.
Gap between cards in a grid: `--space-4` to `--space-5`.
Section spacing (between distinct blocks): `--space-8` to `--space-10`.

### Grid

Subject/path tiles: responsive CSS grid, `repeat(auto-fill, minmax(220px, 1fr))`.
Stats row: fixed 2–3 column grid in rail, or a flex row.
Never stretch a sparse grid to fill the full width with only 1–2 items.

---

## Core Components

These components are the system. Implement them once. Reuse them everywhere.

### Surface Card (`.card`)

The base unit of every screen. All cards share the same surface language.

```css
.card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-5) var(--space-6);
  box-shadow: var(--shadow-sm);
}

.card--elevated {
  background: var(--color-surface-mid);
  box-shadow: var(--shadow-md);
}

.card--hero {
  background: var(--color-surface-mid);
  border-radius: var(--radius-xl);
  padding: var(--space-8);
  box-shadow: var(--shadow-lg);
}
```

Cards never use bright flat fills. Accent color appears as a tinted border, a glow, or a gradient overlay — not a solid background block.

### Primary Button (`.btn-primary`)

Pill-shaped. Electric lime. Bold label. The one action that matters on a surface.

```css
.btn-primary {
  background: var(--color-accent);
  color: #0a1a10;         /* dark text on lime */
  font-weight: 700;
  border-radius: var(--radius-pill);
  padding: 0.65rem 1.4rem;
  border: none;
  cursor: pointer;
  transition: box-shadow 0.15s ease, transform 0.1s ease;
}

.btn-primary:hover {
  box-shadow: var(--shadow-glow-accent);
  transform: translateY(-1px);
}

.btn-primary:active {
  transform: translateY(0);
}
```

One primary button per surface. If two actions compete, demote one to secondary.

### Secondary Button (`.btn-secondary`)

```css
.btn-secondary {
  background: var(--color-surface-high);
  color: var(--color-text);
  font-weight: 600;
  border-radius: var(--radius-pill);
  padding: 0.6rem 1.2rem;
  border: 1px solid var(--color-border-strong);
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease;
}

.btn-secondary:hover {
  background: color-mix(in srgb, var(--color-accent-dim) 80%, var(--color-surface-high));
  border-color: color-mix(in srgb, var(--color-accent) 30%, var(--color-border-strong));
}
```

### Icon Button Container

For subject icons, badge icons, or any circular/rounded icon block:

```css
.icon-block {
  width: 2.8rem;
  height: 2.8rem;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.4rem;
}

/* Subject-tinted variants */
.icon-block--blue   { background: var(--color-blue-dim);   }
.icon-block--green  { background: var(--color-accent-dim); }
.icon-block--purple { background: var(--color-purple-dim); }
.icon-block--orange { background: var(--color-orange-dim); }
.icon-block--red    { background: var(--color-red-dim);    }
.icon-block--yellow { background: var(--color-yellow-dim); }
```

### Progress Bar (`.progress-bar`)

```css
.progress-bar {
  height: 6px;
  background: var(--color-border);
  border-radius: var(--radius-pill);
  overflow: hidden;
}

.progress-bar__fill {
  height: 100%;
  border-radius: var(--radius-pill);
  background: linear-gradient(90deg, var(--color-blue), var(--color-accent));
  transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}
```

### Subject / Path Tile (`.subject-tile`)

The subject tile is the core discovery unit. Rounded card, icon block, title, description, level badge, and a trailing arrow.

```css
.subject-tile {
  /* extends .card */
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.subject-tile:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

/* Level badge inside a tile */
.level-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  background: var(--color-surface-high);
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-pill);
  padding: 0.25rem 0.7rem;
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--color-text-soft);
}
```

### Stat Card (`.stat-card`)

Used in sidebar or right rail for streak, mastery %, XP. Bold number, short label.

```css
.stat-card {
  /* extends .card--elevated */
  text-align: center;
}

.stat-card__number {
  font-size: var(--text-3xl);
  font-weight: 800;
  color: var(--color-xp); /* or --color-accent depending on context */
  line-height: 1;
}

.stat-card__label {
  font-size: var(--text-sm);
  color: var(--color-text-soft);
  margin-top: var(--space-1);
}
```

### Chip / Tag (`.chip`)

```css
.chip {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  background: var(--color-surface-high);
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-pill);
  padding: 0.2rem 0.65rem;
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--color-text-soft);
}

.chip--accent {
  background: var(--color-accent-dim);
  border-color: color-mix(in srgb, var(--color-accent) 30%, transparent);
  color: var(--color-accent);
}
```

### Input (`.input`)

```css
.input {
  background: var(--color-surface-high);
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-md);
  padding: var(--space-3) var(--space-4);
  color: var(--color-text);
  font-size: var(--text-base);
  width: 100%;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.input:focus {
  outline: none;
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px var(--color-accent-glow);
}

.input::placeholder {
  color: var(--color-text-muted);
}
```

---

## Gamification Components

These are core to the Doceo identity. They live on the dashboard, lesson header, and right rail.

### Streak Display

```
🔥 12 Days
   Daily Streak
```

- Large bold number in `--color-streak` (orange)
- Flame emoji or icon
- Short label in text-soft
- Lives in a stat-card or a compact inline chip

### XP / Mastery Meter

- Circular progress ring or bold `75%` number in `--color-xp` (gold)
- Label: "Mastery" or "Weekly Goal"
- Keep it prominent in the right rail or dashboard hero

### Level Pill

```
Level 4
```

- Pill-shaped chip with level number
- Background: `--color-surface-high`
- On active / earned subject: use `--color-accent-dim` surface

### Badge

- Small rounded icon block in `--color-badge` (purple)
- Used in achievement rows, profile, and lesson completion moments

---

## Screen-Level Patterns

### Dashboard

**Primary zone**: Hero greeting card. Student name bold and large. Current mission inside the card with a progress bar and a green `Resume` CTA button.

**Secondary zones**:
- "Your Path" — subject tile grid, 2–4 columns
- "Pick up where you left off" — recent lesson rows
- Right rail: streak stat card, mastery stat card, badges

**Greeting copy pattern**: `Hey [Name]! [One encouraging observation].`
Example: "Hey Liam! You've unlocked 3 new topics this week."

Never use "Choose what to learn" as a heading. It's bureaucratic. Use "Your Path", "What's next?", or "Keep going."

### Lesson World

The lesson experience is the heart of the product. It should feel like entering a focused learning session — immersive, guided, energised.

- Dark header with lesson title and chapter progress
- Chat area is the primary zone — generous width, good line length
- Stage progress shown **once** — a step rail or chapter markers, not both
- Right rail: current mission summary, helper prompts, next stage CTA
- Concept cards feel like premium knowledge cards, not plain accordions
- The AI assistant's voice is warm and direct — like a tutor explaining over their shoulder

### Onboarding

- One focused task per screen
- Uses subject tiles with icon blocks and level pills
- Warm copy: "Which subjects are you tackling this year?"
- Green primary CTA advances the flow
- No CAPS kickers, no grey labels, no corporate field labels

---

## Tone And Copy Rules

- **Address the student directly**: "You", "your", their name where available
- **Mission language**: "mission", "quest", "path", "unlock", "checkpoint", "adventure"
- **Celebrate progress**: "You're on a roll", "Keep it up", "Nice work on that one"
- **Encourage action**: "Let's go", "Keep going", "Ready?", "You've got this"
- **Short sentences**: subject-verb-object. No corporate padding.
- **Avoid**: "Please select", "You have chosen", "This section contains", "Overview", "Details"
- **Emoji**: use sparingly but allowed where they add warmth — streak flame, stage emoji, celebration. Not on every label.

---

## Motion

- Hover: `transform: translateY(-2px)` + shadow lift on interactive cards and tiles
- CTA hover: glow shadow via `--shadow-glow-accent`
- Progress bars: width transitions with `cubic-bezier(0.4, 0, 0.2, 1)`
- Chat messages: fade-in + slight upward slide (`opacity 0→1`, `translateY 6px→0`)
- Stage transitions: fade through a brief chapter marker
- No motion that exists purely as decoration. Every animation tells the student something changed.

---

## Implementation Checklist

Before shipping any screen or component, check every item:

**Visual**
- [ ] All colors use CSS tokens — no hardcoded hex values
- [ ] Background is deep navy (dark) or soft blue-white (light), never plain grey
- [ ] Cards use `--color-surface` or `--color-surface-mid`, not white in dark mode
- [ ] Accent (lime green) is used for the primary CTA only — not scattered decoratively
- [ ] No bright flat fills. Accent appears as glow, tint, or border.

**Layout**
- [ ] There is one clearly dominant action per surface
- [ ] Supporting zones are visually subordinate to the primary zone
- [ ] Grid is packed — not stretching 2 items across 4 columns
- [ ] No repeated status signals — stage indicator shown once per screen

**Typography**
- [ ] Greeting / hero text is large, bold, white, student-facing
- [ ] Card titles are bold and scannable
- [ ] Metadata is small and muted — not competing with the title
- [ ] No ALL CAPS kickers or mono personality text

**Tone**
- [ ] Copy speaks directly to the student ("you", "your", their name)
- [ ] Primary CTA is encouraging and action-oriented
- [ ] Empty states give a clear, friendly next action — not just "No items found"

**Gamification**
- [ ] Dashboard shows streak and mastery prominently
- [ ] Lesson progress uses a level/stage system, not dry step numbers
- [ ] Completion moments celebrate — they don't just disappear

**Reuse**
- [ ] Does this reuse an existing component before inventing a new one?
- [ ] If a new variant is needed, is it expressed as a modifier class on an existing component?

---

## Admin Panel Design Language

The admin panel is a separate design surface from the student-facing app. It is aimed at a power user (the operator/founder) rather than a student, so it leans professional and data-dense — but it must still feel part of the same product family. It always runs in **dark mode** regardless of the user's system preference.

### Theme

Admin forces `data-theme="dark"` on mount via a Svelte `$effect`, restoring the previous theme on unmount. This means the deep navy background, electric lime accent, and dark glass card surfaces are always active in admin. Do not use light mode in admin.

### Layout

```
[ sidebar 232px ] [ main content area ]
```

- Sidebar: `var(--surface-soft)` background, sticky, `border-right: 1px solid var(--border)`
- Main: transparent (inherits the dark navy + gradient background from `:root[data-theme='dark']`)
- Page body padding: `1.75rem 2rem 3rem`
- Gap between sections: `1.5rem`
- Max width for settings/forms: `720px`

### Entrance Animation

Every admin page body animates in on navigation. Apply this to `.page-body`:

```css
.page-body {
  animation: page-in 280ms var(--ease-spring) both;
}

@keyframes page-in {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
```

### Sidebar

The sidebar uses **per-section accent colors** to add visual identity without noise. Each nav item carries a `--nav-color` CSS custom property set inline.

**Section color map:**

| Section    | Color               |
|------------|---------------------|
| Overview   | `var(--color-blue)` |
| Users      | `var(--color-purple)` |
| Learning   | `var(--accent)` |
| Messages   | `var(--color-orange)` |
| Content    | `var(--color-yellow)` |
| Revenue    | `var(--accent)` |
| AI & Costs | `var(--color-purple)` |
| System     | `var(--color-blue)` |
| Settings   | `var(--muted)` |

**Active state**: left inset shadow in the section's color + a very subtle tinted background. No solid fills.

```css
.nav-item.active {
  background: color-mix(in srgb, var(--nav-color) 12%, transparent);
  border-color: color-mix(in srgb, var(--nav-color) 20%, transparent);
  box-shadow: inset 3px 0 0 var(--nav-color);
  font-weight: 600;
}

.nav-item.active .nav-icon,
.nav-item:hover .nav-icon {
  color: var(--nav-color);
}
```

**Brand mark**: the "D" logo uses `var(--accent)` background with a double glow:
```css
box-shadow: 0 0 0 1px var(--accent-glow), 0 4px 14px var(--accent-glow);
```

### KPI Cards (`AdminKpiCard`)

KPI cards communicate a single metric. The design prioritises the number above everything else.

**Structure (top to bottom):**
1. Header row: uppercase muted label (left) + colored icon badge (right)
2. Large number in the card's color
3. Optional delta line

**Left border**: each card has a `3px` left border in its metric color — this is the only place that color appears as a solid fill.

```css
.kpi-card {
  border-left: 3px solid var(--card-color);
  border-radius: 1rem;
  padding: 1.35rem 1.4rem 1.25rem;
}

.kpi-label {
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: var(--muted);
}

.kpi-value {
  font-size: 2.25rem;
  font-weight: 800;
  letter-spacing: -0.04em;
  color: var(--card-color);
}

.kpi-icon {
  width: 2rem; height: 2rem;
  border-radius: 0.55rem;
  background: [colorDim];
  color: [colorVar];
}
```

**Hover**: lift + shadow via `transform: translateY(-2px)` + `var(--shadow)`.

**Color map for metrics** (use semantically, not decoratively):

| Color    | Use case |
|----------|----------|
| `accent` | Neutral positive counts (lessons started, completion) |
| `blue`   | User counts |
| `purple` | Totals / aggregate metrics |
| `yellow` | Cost / spend (caution) |
| `red`    | Errors / alerts |
| `orange` | Warnings |

### Page Header (`AdminPageHeader`)

```css
.page-title {
  font-size: 1.75rem;
  font-weight: 800;
  letter-spacing: -0.035em;
}

.page-desc {
  font-size: 0.9rem;
  color: var(--text-soft);
}

.page-header {
  padding: 2rem 2rem 1.5rem;
  border-bottom: 1px solid var(--border);
}
```

### Time Range Selector (`AdminTimeRange`)

Active button uses a **solid accent fill** (not just a dim tint) so the selected period is always immediately obvious:

```css
.range-btn.active {
  background: var(--accent);
  color: var(--accent-contrast);
  box-shadow: 0 2px 8px var(--accent-glow);
}
```

### Chart Cards

All chart/data cards share the same base:

```css
.chart-card {
  background: var(--surface);
  border: 1px solid var(--border-strong);
  border-radius: 1rem;
  padding: 1.35rem 1.5rem 1.4rem;
  box-shadow: var(--shadow);
}
```

Chart title: `0.875rem / weight 700`. Period label: `0.73rem / weight 400 / var(--muted)`.

Bar chart fill: `var(--accent-dim)` → `var(--accent)` on hover.
Route bar fill: `linear-gradient(90deg, var(--accent), var(--color-blue))`.

### Save / Action Buttons in Admin Forms

The save button cycles through three states using CSS class modifiers:

| State    | Class              | Appearance |
|----------|--------------------|------------|
| `idle`   | `.save-btn--idle`  | Solid accent background |
| `saving` | `.save-btn--saving`| 60% dimmed accent, `scale(0.98)`, spinner |
| `saved`  | `.save-btn--saved` | Green background, `scale(1.02)`, animated ✓ checkmark |

The checkmark uses `cubic-bezier(0.34, 1.56, 0.64, 1)` for a brief elastic overshoot that makes confirmation feel physical.

### Admin Checklist

Before shipping any admin screen:

- [ ] `data-theme="dark"` is forced by the admin layout — do not re-set it per page
- [ ] Page body has the `page-in` entrance animation
- [ ] KPI cards use the semantic color map — not arbitrary colors
- [ ] Nav items carry `--nav-color` inline for correct active state coloring
- [ ] Chart cards use `var(--shadow)` — not just a border
- [ ] Buttons provide loading and success state feedback (no silent submits)
- [ ] Section titles are `0.95rem / weight 700`, not ALL CAPS
- [ ] Form sections have `box-shadow: var(--shadow)` for depth
