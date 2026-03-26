# Mobile-First Responsiveness — Sprint

Audit conducted 2026-03-26. Doceo currently looks great on a PC browser. This document captures every change needed to make mobile and tablet first-class citizens — equal quality, not an afterthought.

Target devices:
- **Phone small:** 375px (iPhone SE, many Androids)
- **Phone standard:** 390–430px (iPhone Pro, Samsung S series)
- **Phone large:** 540px (larger Androids, iPhone Plus)
- **Tablet portrait:** 768px (iPad mini, most Android tablets)
- **Tablet landscape:** 1024px (iPad standard — currently the only breakpoint in the app shell)
- **Desktop:** 1280px+ (current primary target — already works well)

---

## Diagnosis: What's Broken and Why

### Root Cause 1 — Sidebar never collapses until 1024px

The app shell uses:
```css
grid-template-columns: minmax(244px, 296px) minmax(0, 1fr);
```
At 375px this means the sidebar takes 244px out of 375px, leaving ~103px for content. **Everything is unusable on phones until this is solved.** This is the single most important fix.

### Root Cause 2 — No breakpoints below 700–780px on most components

Almost every component has one breakpoint somewhere between 700px–1024px (tablet range). Nothing handles 375–540px (phone range). The result: layouts that work on desktop and tablet but are broken on phones.

### Root Cause 3 — Fixed min-widths that fight narrow screens

Several layouts use `minmax(260px, ...)` or `minmax(360px, ...)` which force a minimum width larger than a phone's available space after padding.

---

## Component-by-Component Status

| Component | 375px | 540px | 768px | Status |
|-----------|-------|-------|-------|--------|
| `(app)/+layout.svelte` (shell) | ❌ | ❌ | ⚠️ | Sidebar takes 65% of width |
| `StudentNav.svelte` | ❌ | ❌ | ⚠️ | No responsive rules at all |
| `DashboardView.svelte` | ❌ | ⚠️ | ✓ | Gaps too large, some grids too wide |
| `LessonWorkspace.svelte` | ❌ | ❌ | ✓ | Right rail (18rem) breaks layout |
| `LandingView.svelte` | ❌ | ⚠️ | ✓ | Auth card `minmax(360px)` overflows |
| `ProgressView.svelte` | ❌ | ⚠️ | ⚠️ | 3-column summary grid at 375px |
| `RevisionWorkspace.svelte` | ❌ | ❌ | ⚠️ | Sidebar panel takes 69% of width |
| `SubjectView.svelte` | ⚠️ | ✓ | ✓ | Minor — no small-phone handling |
| `SettingsView.svelte` | ⚠️ | ✓ | ✓ | Minor — acceptable |
| `OnboardingWizard.svelte` | ⚠️ | ✓ | ✓ | Best coverage — has 680px breakpoint |

Legend: ❌ Broken/unusable · ⚠️ Works but not optimised · ✓ Good

---

## Tasks

Work in priority order. Phase 1 unblocks phone use entirely. Phase 2 polishes the experience. Phase 3 sets up the design system for long-term maintainability.

---

### Phase 1 — Critical: Make phones usable

#### 1.1 App Shell — Mobile nav strategy (BLOCKER)

**File:** `src/routes/(app)/+layout.svelte`

**Problem:** The two-column shell (`sidebar + content`) is never phone-friendly. Sidebar takes 244–296px on a 375px screen.

**Decision needed before coding:** Choose a mobile nav pattern:
- **Option A — Bottom tab bar** (recommended): Hide sidebar, show a 5-tab bottom bar with icons + labels. Widely understood, no extra gesture needed.
- **Option B — Hamburger drawer**: Show a menu icon in a top bar; sidebar slides in from the left as an overlay on tap.

**Implementation scope:**
- [ ] Decide: Bottom nav (Option A) or drawer (Option B) — recommend Option A for this product
- [ ] `(app)/+layout.svelte`: Below 768px, remove sidebar from grid; add bottom nav bar or drawer button
- [ ] Add `padding-bottom` to main content on phones to account for bottom nav height (~64px)
- [ ] Lesson mode (no sidebar): already single-column, but needs padding-bottom for bottom nav

---

#### 1.2 StudentNav — Mobile navigation component

**File:** `src/lib/components/StudentNav.svelte`

**Problem:** No responsive rules. Sidebar is fixed width on all screens.

**Implementation scope (bottom nav approach):**
- [ ] Add CSS `@media (max-width: 767px)` that hides `.sidebar` entirely (`display: none`)
- [ ] Create a new `MobileNav.svelte` component (bottom tab bar):
  - 5 icon tabs matching the 5 nav links
  - Fixed to bottom (`position: fixed; bottom: 0; left: 0; right: 0`)
  - Height ~60–64px
  - Active tab highlighted with accent colour
  - Touch targets ≥ 44px
  - Safe area inset support: `padding-bottom: env(safe-area-inset-bottom)`
- [ ] Render `MobileNav.svelte` only when viewport ≤ 767px (via CSS or `window.innerWidth`)
- [ ] Theme toggle: move to Settings page on mobile (sidebar footer isn't visible)

---

#### 1.3 LessonWorkspace — Stack rail below chat on phones

**File:** `src/lib/components/LessonWorkspace.svelte`

**Problem:** Right rail (`18rem`) pushes into a 375px screen before the 780px breakpoint.

**Current breakpoint:** 780px — already stacks to 1 column (good), but needs a phone-specific pass below 540px.

**Implementation scope:**
- [ ] `@media (max-width: 540px)`: Reduce padding in `.lesson-header` and `.chat-area`
- [ ] `@media (max-width: 540px)`: Bubble `max-width` → `90%` (currently 68%)
- [ ] `@media (max-width: 540px)`: Concept cards panel `max-width` → `100%`
- [ ] `@media (max-width: 540px)`: `.lesson-rail` horizontal scroll of cards (`grid-auto-flow: column; overflow-x: auto`) rather than stacking vertically — keeps them compact
- [ ] `@media (max-width: 540px)`: Quick-action chips reduce padding, font-size slightly smaller
- [ ] `@media (max-width: 540px)`: Top bar title goes to centre-aligned single line; back button icon-only
- [ ] `@media (max-width: 540px)`: Progress rail dots slightly smaller (`1.3rem`) to fit all 6 on screen
- [ ] Timeline breadcrumb already has `overflow-x: auto` — verify this works correctly at 375px

---

#### 1.4 RevisionWorkspace — Stack panels on phones

**File:** `src/lib/components/RevisionWorkspace.svelte`

**Problem:** Topic panel sidebar (`minmax(260px, 320px)`) takes 260px of a 375px screen. Only stacks at 900px.

**Implementation scope:**
- [ ] Lower stacking breakpoint from 900px to 600px
- [ ] `@media (max-width: 600px)`: Panel becomes a horizontal scroll list or a collapsible drawer above the recall area
- [ ] Topic panel on mobile: consider a compact pill-row of topics instead of a full sidebar column

---

#### 1.5 ProgressView — Fix 3-column summary grid

**File:** `src/lib/components/ProgressView.svelte`

**Problem:** Summary grid is `repeat(3, minmax(0, 1fr))`. At 375px each card is ~125px wide — text like "Lessons completed" doesn't fit.

**Implementation scope:**
- [ ] `@media (max-width: 600px)`: `summary-grid` → `grid-template-columns: 1fr` (single column)
- [ ] `@media (max-width: 768px)`: `summary-grid` → `grid-template-columns: repeat(2, 1fr)` (two columns on tablet)

---

#### 1.6 LandingView — Fix auth card overflow

**File:** `src/lib/components/LandingView.svelte`

**Problem:** Auth card column uses `minmax(360px, 0.85fr)`. On a 375px phone, 360px min forces horizontal scroll.

**Implementation scope:**
- [ ] `@media (max-width: 540px)`: Auth card becomes `width: 100%` with no minmax floor
- [ ] `@media (max-width: 540px)`: Reduce side padding on `.landing-shell` from `1.75rem` to `1rem`
- [ ] Verify form inputs, buttons, and error messages all work at 375px

---

### Phase 2 — Polish: Optimise spacing, typography, touch targets

#### 2.1 Global spacing reduction at small screens

**File:** `src/app.css`

**Problem:** Section gaps (`1.75rem`) and card padding (`1.6rem 1.8rem`) feel spacious on desktop but waste vertical space on phones where every pixel counts.

- [ ] Add global `@media (max-width: 540px)` rules that reduce:
  - Container / section gap: `1.75rem` → `1rem`
  - Hero card padding: `1.6rem 1.8rem` → `1.1rem 1.2rem`
  - Section-block padding: `1.25rem 1.35rem` → `0.9rem 1rem`
- [ ] Keep the design tokens intact — adjust via scoped selectors in each component or global modifier

---

#### 2.2 Touch targets — Enlarge small interactive elements

**Problem:** Several interactive elements are below the 44px minimum recommended by Apple HIG (48px by Material Design):
- Progress rail dots: `1.55rem × 1.55rem` = ~24.8px ❌
- Nav items in sidebar: `0.7rem` y-padding = ~11px + line-height ≈ 36px ❌
- Stage connector lines: not interactive, but tap proximity matters

**Implementation scope:**
- [ ] Mobile nav tabs: min 44px height each
- [ ] Lesson rail dots: `@media (max-width: 768px)` → `2.2rem × 2.2rem`; non-interactive visually but consider tappability if we add stage-jump
- [ ] Quick-action chips in composer: ensure `min-height: 40px` on mobile
- [ ] All `.btn` elements: verify `min-height` is ≥ 40px on mobile (currently 2.5rem = 40px ✓)
- [ ] `.btn-compact`: currently `2.1rem = 33.6px` ❌ → `@media (max-width: 540px)` → `min-height: 2.6rem`

---

#### 2.3 DashboardView — Tighten mobile spacing

**File:** `src/lib/components/DashboardView.svelte`

- [ ] `@media (max-width: 540px)`: View gap `1.75rem` → `1rem`
- [ ] `@media (max-width: 540px)`: Mission card padding `1.6rem 1.8rem` → `1.1rem 1.2rem`
- [ ] `@media (max-width: 540px)`: Mission card title `1.55rem` → `1.3rem`
- [ ] `@media (max-width: 540px)`: Recent-card inline actions stack vertically (Resume on top, Restart + Archive below as a row)
- [ ] `@media (max-width: 540px)`: Subject switcher pills `font-size: 0.82rem` → `0.78rem` to fit more pills
- [ ] `@media (max-width: 768px)`: `stats-footer` becomes 2-column grid instead of flex row

---

#### 2.4 SubjectView — Minor phone pass

**File:** `src/lib/components/SubjectView.svelte`

- [ ] `@media (max-width: 540px)`: Hero padding reduction
- [ ] `@media (max-width: 540px)`: Subtopic cards spacing tightened

---

#### 2.5 SettingsView — Minor phone pass

**File:** `src/lib/components/SettingsView.svelte`

- [ ] `@media (max-width: 540px)`: Form grid padding and font size tightening
- [ ] Verify all form inputs (`<select>`, `<input>`) have `font-size: 16px` to prevent iOS zoom-on-focus

---

#### 2.6 OnboardingWizard — Tighten 375px handling

**File:** `src/lib/components/OnboardingWizard.svelte`

Already has the best mobile coverage in the codebase (has 680px breakpoint). Minor gaps:
- [ ] `@media (max-width: 540px)`: Step progress strip → icon-only (hide text labels)
- [ ] `@media (max-width: 540px)`: Sticky footer buttons stack vertically, full width
- [ ] Verify iOS safe area insets don't clip the sticky footer (`padding-bottom: env(safe-area-inset-bottom)`)

---

### Phase 3 — Foundation: Design system & safe areas

#### 3.1 iOS safe area insets

Modern iPhones (notch, Dynamic Island, home indicator) have insets that can clip UI if not handled.

- [ ] Add to `src/app.css` global body/html:
  ```css
  body {
    padding-bottom: env(safe-area-inset-bottom);
    padding-left: env(safe-area-inset-left);
    padding-right: env(safe-area-inset-right);
  }
  ```
- [ ] Mobile nav (bottom bar): use `padding-bottom: env(safe-area-inset-bottom)` on the bar itself
- [ ] Lesson composer: ensure it sits above the home indicator on iPhones

---

#### 3.2 Viewport meta tag

- [ ] Confirm `src/app.html` (or layout) has:
  ```html
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  ```
  `viewport-fit=cover` is needed for safe area insets to work.

---

#### 3.3 Scroll behaviour & overscroll

- [ ] `body`: `overscroll-behavior-y: none` to prevent pull-to-refresh interfering with in-app scroll
- [ ] Chat area: already has `overscroll-behavior: contain` ✓
- [ ] Lesson rail: verify `overscroll-behavior: contain` on its scroll container

---

#### 3.4 Input & keyboard handling on mobile

On mobile, the virtual keyboard can push content or resize the viewport, breaking fixed-position composers.

- [ ] Lesson workspace composer: test on iOS Safari and Android Chrome with keyboard open
- [ ] Consider using `dvh` (dynamic viewport height) instead of `vh` for the lesson shell height:
  ```css
  .lesson-shell { height: 100dvh; }
  ```
  `dvh` shrinks when the keyboard appears; `vh` does not.
- [ ] All `<textarea>` and `<input>` elements: ensure `font-size: 16px` minimum to prevent iOS auto-zoom
- [ ] Verify `autocomplete`, `autocorrect`, `autocapitalize` attributes are correct on lesson composer (likely want `autocorrect="off"` for a tutor chat)

---

#### 3.5 CSS custom property additions

- [ ] Add responsive spacing tokens to `src/app.css`:
  ```css
  :root {
    --touch-target: 2.75rem;   /* 44px */
    --safe-bottom: env(safe-area-inset-bottom, 0px);
    --safe-top: env(safe-area-inset-top, 0px);
  }
  ```

---

## Recommended Breakpoint System

Use these consistently across all components:

```
≤ 540px   Phone   — stack everything, reduce gaps, full-width cards
541–767px  Phablet — mostly phone rules still apply
768–1023px Tablet  — two-column where it makes sense, sidebar optional
1024px+   Desktop  — current primary target, already works
```

The simplest way to apply these is three media query blocks per component:

```css
@media (max-width: 540px)  { /* phone */ }
@media (max-width: 767px)  { /* phablet */ }
@media (max-width: 1023px) { /* tablet */ }
```

---

## Out of Scope for This Sprint

- Landscape orientation optimisation (phones in landscape)
- PWA / installable app manifest
- Native app (React Native / Expo)
- Print styles
- TV / large-screen (≥ 1920px)

---

## Testing Checklist (once implemented)

- [ ] iPhone SE (375px) — Chrome DevTools emulation
- [ ] iPhone 14 Pro (393px) — Safari on device or DevTools
- [ ] Samsung Galaxy S21 (360px) — Chrome DevTools
- [ ] iPad mini portrait (768px) — Chrome DevTools
- [ ] iPad standard portrait (810px) — Chrome DevTools
- [ ] All pages: LandingView, Dashboard, Lesson, Subject, Progress, Revision, Settings, Onboarding
- [ ] Lesson workspace: open keyboard, send message, verify composer stays visible
- [ ] All touch targets ≥ 44px verified with DevTools accessibility inspector
- [ ] No horizontal scroll on any page at 375px
