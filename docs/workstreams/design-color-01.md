# 🎨 Soft UI Interface System (Inspired by Reference Design)

## Overview

This system is not just a color palette — it’s a **design language** built around soft surfaces, emotional color, and tactile UI elements.

Think:

* Floating cards
* Gentle color meaning
* Minimal borders
* Clear hierarchy

---

# 🎨 1. Core Color System

## 🌑 Base Layers (Foundation)

```css
--bg-main: #F5F6F7;        /* soft neutral canvas */
--bg-surface: #FFFFFF;     /* primary cards */
--bg-elevated: #FAFAFA;    /* subtle layering */
--bg-dark: #0B0B0C;        /* header / navigation */
```

**Guidelines:**

* Avoid pure white backgrounds
* Use dark only for anchors (headers, nav, key actions)

---

## 🎯 Accent System (Category Colors)

```css
--green-soft: #CFEED6;
--green-accent: #A8E6B0;

--blue-soft: #D6EEF6;
--purple-soft: #E6D6F6;
--yellow-soft: #F6E7C9;
--pink-soft: #F6D6E6;
```

**Usage:**

* Backgrounds only (cards, highlights)
* Never use for primary text
* Each color represents meaning, not decoration

---

## ⚫ Text Hierarchy

```css
--text-primary: #111111;
--text-secondary: #6B6B6B;
--text-tertiary: #A0A0A0;
--text-inverse: #FFFFFF;
```

**Rules:**

* Use primary for headings
* Secondary for descriptions
* Tertiary for metadata
* Avoid full black everywhere

---

## 🟢 State Colors

```css
--success: #BEEAC7;
--success-strong: #4CAF50;

--warning: #F6E7C9;
--danger: #F8D7DA;

--neutral-pill: #EAEAEA;
```

---

# 🧱 2. Component System

## 🧩 Cards (Primary Container)

```css
.card {
  background: var(--bg-surface);
  border-radius: 20px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
}
```

### Variant Cards

```css
.card--green { background: var(--green-soft); }
.card--blue { background: var(--blue-soft); }
.card--purple { background: var(--purple-soft); }
.card--yellow { background: var(--yellow-soft); }
.card--pink { background: var(--pink-soft); }
```

**Rules:**

* No borders
* Color defines grouping
* Rounded corners always

---

## 🟢 Pills (Status Indicators)

```css
.pill {
  padding: 6px 12px;
  border-radius: 999px;
  font-size: 12px;
}

.pill--success {
  background: var(--success);
}

.pill--neutral {
  background: var(--neutral-pill);
}
```

**Usage:**

* Status (Completed, Upcoming, etc.)
* Tags / metadata
* Lightweight UI signals

---

## ⚫ Buttons (Action Anchors)

```css
.btn-primary {
  background: #000;
  color: #fff;
  border-radius: 999px;
  padding: 10px 16px;
}

.btn-icon {
  background: #000;
  color: #fff;
  width: 36px;
  height: 36px;
  border-radius: 50%;
}
```

**Rules:**

* Black = strong action
* Avoid multiple competing primary buttons

---

# 🌫 3. Shadow & Depth System

```css
--shadow-soft: 0 4px 12px rgba(0,0,0,0.05);
--shadow-hover: 0 8px 20px rgba(0,0,0,0.08);
```

**Guidelines:**

* Keep shadows subtle
* No harsh elevation jumps
* Everything feels slightly floating

---

# 🧭 4. Layout Principles

## Rule 1: No Hard Lines

* Remove borders
* Use spacing and color instead

---

## Rule 2: Floating UI

* Cards feel like objects, not panels
* Consistent spacing between elements

---

## Rule 3: Color = Meaning

| Color  | Meaning             |
| ------ | ------------------- |
| Green  | Completed / success |
| Purple | Media / content     |
| Blue   | Information         |
| Yellow | Tasks / attention   |
| Pink   | Social / playful    |

---

# 🎮 5. Interaction Design

## Hover States

```css
.card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-hover);
}
```

---

## Tap / Click Feedback

```css
.card:active {
  transform: scale(0.97);
  box-shadow: 0 2px 6px rgba(0,0,0,0.05);
}
```

---

## Completion Feedback

* Pill transitions from neutral → green
* Optional:

  * subtle scale pop
  * micro confetti animation
  * icon change (✓)

---

# 🧩 6. System Rules (Very Important)

## ❌ Avoid

* Hard borders
* Pure white everywhere
* Too many button styles
* Flat, lifeless layouts

## ✅ Enforce

* One card system
* One pill system
* One button system
* One shadow system

Everything else = composition

---

# 🛠 7. Migration Plan

## Step 1: Replace Base Colors

* Introduce soft background
* Remove harsh contrast

---

## Step 2: Remove Borders

Replace with:

* spacing
* shadow
* color grouping

---

## Step 3: Introduce Card Types

Instead of:

* identical cards

Move to:

* meaning-driven color cards

---

## Step 4: Normalize Components

Reduce UI to:

* Cards
* Pills
* Buttons
* Icons

---

# 🧠 8. Design Philosophy

This system works because:

* It avoids rigid enterprise styling
* It introduces softness and tactility
* It treats UI as physical objects

Think:

* index cards
* sticky notes
* soft plastic controls

Not:

* spreadsheets
* dashboards
* rigid panels

---

# ⚡ Optional Next Steps

* Convert into Tailwind config
* Build Svelte 5 component library
* Apply to your current UI screens
* Add animation system (micro-interactions)

---

End of system.

---

# 🎯 Doceo Adaptation Decisions (March 2026)

These decisions were agreed during a design review. They supersede the generic defaults above where they conflict. Implement from here, not from the generic sections.

---

## Accent Color — Teal

Replaces electric lime green (`#4ade80` dark / `#16a34a` light) across all accent usages.

```css
/* Dark mode */
--color-accent:      #14B8A6   /* teal-400 — glows well on navy */
--color-accent-dim:  rgba(20,184,166,0.12)
--color-accent-glow: rgba(20,184,166,0.28)

/* Light mode */
--color-accent:      #0D9488   /* teal-600 — deeper for contrast on white */
--color-accent-dim:  rgba(13,148,136,0.10)
--color-accent-glow: rgba(13,148,136,0.20)
```

---

## Primary Button — Teal, Not Black

The reference doc uses `#000` for buttons. We are not adopting that. The accent teal becomes the button fill.

```css
/* Dark mode button */
background: #14B8A6;
color: #042f2e;    /* very dark teal — high contrast, ~7.8:1 ratio */

/* Light mode button */
background: #0D9488;
color: #ffffff;    /* white — passes AA at ~4.7:1 */
```

Rules unchanged: pill-shaped, one primary per surface, glow on hover.

---

## Light Mode Surfaces — Neutral Canvas (Replaces Periwinkle)

The current `#f0f4ff` / `#eef2ff` blue-tinted light mode base is being removed. Replace with a warm neutral canvas from this reference doc.

```css
--color-bg:           #F5F6F7   /* soft neutral canvas */
--color-surface:      #FFFFFF   /* white cards */
--color-surface-mid:  #FAFAFA   /* subtle elevation */
--color-surface-high: #F0F1F2   /* hover / active tile */
--color-border:       rgba(0,0,0,0.06)
--color-border-strong:rgba(0,0,0,0.10)
```

Light mode shadows should be lighter to match:
```css
--shadow-sm:  0 2px 8px rgba(0,0,0,0.04);
--shadow-md:  0 4px 12px rgba(0,0,0,0.07);
--shadow-lg:  0 8px 20px rgba(0,0,0,0.09);
```

---

## Dark Mode — Preserve Current Navy

Dark mode is not changing structurally. Keep all current navy surfaces (`#0f1229`, `#161b35`, etc.) and shadow values. The only change is swapping lime green for teal accent above.

---

## Semantic Pastel Card Variants

Adopt the soft pastel card backgrounds for **light mode only**. Dark mode equivalents use the existing `--color-*-dim` rgba tints.

| Meaning         | Light mode surface | Dark mode surface          |
|-----------------|--------------------|----------------------------|
| Completed/done  | `#CFEED6`          | `rgba(20,184,166,0.10)`    |
| Info/learning   | `#D6EEF6`          | `rgba(96,165,250,0.10)`    |
| Task/attention  | `#F6E7C9`          | `rgba(251,191,36,0.10)`    |
| Content/media   | `#E6D6F6`          | `rgba(167,139,250,0.10)`   |
| Warm/social     | `#F6D6E6`          | `rgba(251,113,133,0.10)`   |

Color carries meaning — do not use these for decoration.

---

## Pills — Adopt From This System

```css
.pill {
  padding: 5px 12px;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 600;
}

.pill--success  { background: #CFEED6; color: #166534; }  /* light */
.pill--neutral  { background: #EAEAEA; color: #4B5563; }  /* light */
.pill--info     { background: #D6EEF6; color: #1e40af; }  /* light */

/* Dark mode equivalents use rgba tints + text-soft */
```

---

## Gamification Colors — Unchanged

Orange streak, gold XP, purple badges carry emotional meaning. Do not soften them to pastels.

```css
--color-streak: #fb923c   /* preserved */
--color-xp:     #fbbf24   /* preserved */
--color-badge:  #a78bfa   /* preserved */
```

---

## What Was Rejected From This Reference Doc

- `#000000` black buttons — too generic, kills brand identity
- Light-mode-only approach — Doceo is dark-first
- No dark mode story in original doc — addressed above
- Soft pastel gamification — would deflate streak/XP energy

---

# ✨ Interaction & Motion Delight

These additions layer tactile feel and purposeful motion on top of the color decisions above. Every enhancement here justifies itself — nothing is decoration for its own sake.

---

## Teal Glow System

Teal behaves differently from lime green at the same opacity — it's cooler and doesn't fight the navy. Lean into this by letting the glow spread slightly more than the old green did.

```
Hover glow:      0 0 16px rgba(20,184,166,0.30)
Focus ring:      0 0 0 3px rgba(20,184,166,0.25)
Active pulse:    0 0 24px rgba(20,184,166,0.40)  (brief, fades in 80ms)
```

In dark mode, the teal glow against navy creates a soft aquatic luminance — more premium than lime. In light mode, the glow is tighter and crisper; it reads as precision rather than radiance.

---

## Primary Button — Tactile Press

The button should feel like pressing a soft, slightly elastic surface. Three states:

**Resting** — no shadow, flat teal fill, pill shape.

**Hover** — lift `translateY(-2px)` + spread glow. Duration: `180ms ease-out`. The lift is small; the glow is what you notice first.

**Press (`:active`)** — compress back to baseline `translateY(0)` + `scale(0.975)`. Shadow collapses. Duration: `80ms`. The snap-back on release uses `cubic-bezier(0.34, 1.56, 0.64, 1)` — a brief elastic overshoot that makes the release feel physical, not just a reversal.

**Loading state** — fill dims to `rgba(20,184,166,0.5)`, label fades, a small spinner appears inline. Scale holds at `0.985` throughout.

**Success state** — fill pulses briefly brighter (`#2DD4BF`), label swaps to a checkmark, `scale(1.02)` for 120ms then settles. The pulse is one beat only — it signals completion without lingering.

```
Transition: transform 180ms ease-out, box-shadow 180ms ease-out
Active snap: cubic-bezier(0.34, 1.56, 0.64, 1) at 80ms
Success pulse: 120ms scale overshoot then ease-out to 1.0
```

---

## Cards — Float and Sink

Cards feel like physical objects on a surface, not painted rectangles.

**Hover** — `translateY(-3px)` + shadow steps up one level (`shadow-sm → shadow-md`). Duration: `200ms ease-out`. Subtle — just enough to signal interactivity.

**Press** — `translateY(-1px)` + `scale(0.99)`. Shadow drops back toward resting. Duration: `80ms`. Feels like pressing down on a slightly springy surface.

**Release** — springs back with `cubic-bezier(0.22, 1, 0.36, 1)` over `200ms`. The card doesn't just reverse — it returns with a small amount of momentum.

**Semantic pastel cards** — when a card transitions into a semantic state (e.g. neutral → completed/green), the background color change should crossfade over `300ms ease`. Never snap. The student should feel the card "turning green" as confirmation, not just see it.

---

## Pill State Transitions

Pills are status signals. When they change state (pending → done, locked → active), the change should feel earned.

**Neutral → Success:**
1. Background crossfades `EAEAEA → CFEED6` over `280ms`
2. Text color crossfades `#4B5563 → #166534` over `280ms`
3. At the midpoint, a subtle `scale(1.05)` pulse (50ms up, 100ms settle) — a small "pop" that confirms the change

**Success → Neutral (undo/reset):**
- Reverse crossfade only. No pop. The absence of celebration is intentional.

**Appearing pills (new status, not a transition):**
- Fade in + `scale(0.85 → 1.0)` over `200ms ease-out`

---

## Focus Ring — Accessible and Beautiful

The default browser focus ring is replaced with the teal glow ring. It must be visible at all times for keyboard navigation but should feel designed, not clinical.

```
outline: none;
box-shadow: 0 0 0 2px var(--color-bg), 0 0 0 4px var(--color-accent);
```

The inner gap (2px in the background color) creates a two-ring effect — the card/surface color punches through between the element edge and the teal ring. This makes focus feel deliberate rather than bolted on.

In dark mode: the navy gap + teal outer ring looks like a soft halo.
In light mode: the white gap + teal-600 outer ring is crisp and professional.

---

## Input Focus — Border Bloom

When an input receives focus, the border doesn't just change color — it appears to bloom outward slightly.

**Resting** — thin border `rgba(0,0,0,0.10)` (light) or `rgba(255,255,255,0.08)` (dark). No shadow.

**Focus** — border color transitions to `--color-accent` + a teal glow ring appears around the field. The glow starts small and expands slightly over `200ms ease-out`, giving the impression the field "opened up" to receive input.

```
Transition: border-color 160ms ease, box-shadow 200ms ease-out
```

Do not animate the border width — it causes layout shift. Only animate color and box-shadow.

---

## Theme Crossfade (Dark ↔ Light)

When the user toggles the theme, surfaces should not snap. All color-bearing properties should transition together.

```css
*, *::before, *::after {
  transition: background-color 220ms ease, border-color 220ms ease, color 160ms ease;
}
```

Exceptions — do NOT transition:
- SVG fills (flickers on some browsers)
- `box-shadow` on the toggle button itself (it has its own transition)
- Any element currently mid-animation (press state, etc.)

The result: the interface breathes from dark to light rather than cutting. The teal accent — being close in hue between its two values — barely moves during the transition, creating an anchor of continuity while the surfaces shift.

---

## Gamification Moments

These are the highest-emotion interactions in the product. They deserve the most considered delight.

**Streak increment (+1 day):**
- The streak number counts up digit by digit over `400ms`
- A brief orange radial pulse emanates from the flame icon (scale 1 → 1.6, opacity 1 → 0, `300ms ease-out`)
- The flame icon itself does a short `rotate(-10deg → 0)` wiggle — 2 cycles, `150ms` each

**Lesson completion:**
- The stage progress rail fills its final segment with the teal accent
- A flash of `rgba(20,184,166,0.15)` washes across the entire lesson card (`opacity 0 → 1 → 0`, `600ms`)
- The completion pill pops in (scale + crossfade, as described above)

**XP / mastery increase:**
- The mastery number counts up from old value to new over `600ms` with `ease-out` easing (starts fast, slows near the end — makes the new number feel "settled")
- Gold radial pulse from the mastery icon, same pattern as streak but in gold

**None of these should loop or repeat.** One beat. Done. Lingering celebration is noise.

---

## Restrained by Design

These elements are intentionally kept static or minimal. Do not add delight here.

| Element | Reason for restraint |
|---|---|
| Sidebar nav labels | Text in motion while navigating is disorienting |
| Chat message stream | Messages appear once; animating the tutor's text mid-render is distracting |
| Progress bar during lesson | Updates continuously — animating every update creates visual noise |
| Semantic card backgrounds (non-interactive) | Static context cards should not move; motion implies interactivity |
| Error states | Errors need immediate clarity, not softened animation |
| Lesson stage indicators | Students reference these constantly; movement between checks would be confusing |

The contrast between calm static elements and the few expressive interactive ones is what makes the delight land. If everything moves, nothing matters.
