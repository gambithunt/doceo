# Mobile-First Responsiveness — Sprint

Audit conducted 2026-03-26. Implemented same day.

Target devices:
- **Phone small:** 375px (iPhone SE, many Androids)
- **Phone standard:** 390–430px (iPhone Pro, Samsung S series)
- **Phone large:** 540px (larger Androids, iPhone Plus)
- **Tablet portrait:** 768px (iPad mini, most Android tablets)
- **Tablet landscape:** 1024px (iPad standard)
- **Desktop:** 1280px+ (primary target)

Breakpoint system used across all components:
```
≤ 540px   Phone   — stack everything, reduce gaps, full-width cards
541–767px  Phablet — phone rules largely apply
768–1023px Tablet  — sidebar visible, two-column where sensible
1024px+   Desktop  — full layout
```

---

## Phase 1 — Critical: Make phones usable ✅

### 1.1 App Shell — Mobile nav strategy
- [x] Decision made: **Bottom tab bar** (Option A) — most familiar to school students, matches iOS/Android patterns
- [x] `(app)/+layout.svelte`: Below 768px, sidebar hidden from grid; bottom nav shown via `mobile-nav-slot`
- [x] Main content gets `padding-bottom: calc(var(--mobile-nav-height) + var(--safe-bottom) + 0.5rem)` on mobile so content never hides behind nav
- [x] Lesson mode: no bottom nav (full-screen experience), uses `100svh`
- [x] `height: 100svh` used instead of `100vh` (respects iOS Safari toolbar)

### 1.2 StudentNav — Hidden on mobile
- [x] `@media (max-width: 767px)` — `.sidebar { display: none }`
- [x] Theme toggle remains accessible via Settings page on mobile

### 1.3 MobileNav.svelte — New bottom tab bar component
- [x] Created `src/lib/components/MobileNav.svelte`
- [x] 5 tabs: Home (◈), Learn (◎), Revision (↺), Progress (↗), Settings (◐)
- [x] Fixed to bottom, glass background, border-top
- [x] `padding-bottom: var(--safe-bottom)` for iPhone home indicator
- [x] `height: calc(var(--mobile-nav-height) + var(--safe-bottom))`
- [x] Active tab highlighted with `var(--accent)`, icon scales up (spring animation)
- [x] Touch targets: full tab width, min-height `var(--touch-target)` (44px)
- [x] Hover/press states consistent with design system

### 1.4 LessonWorkspace — Phone-specific pass
- [x] `@media (max-width: 780px)`: rail becomes horizontal scroll row (`grid-auto-flow: column`)
- [x] `@media (max-width: 540px)`:
  - Bubble `max-width` → `90%`
  - Concept cards `max-width` → `100%`
  - Composer becomes vertical (input on top, send below), send button full width
  - Back button label hidden on phones (arrow icon only)
  - Padding tightened throughout header, chat, input area
  - Rail cards horizontal scroll `min(17rem, 82vw)` width
  - `font-size: 16px` on textarea (prevents iOS zoom)
- [x] Lesson shell uses `max-height: 100%` to cooperate with virtual keyboard

### 1.5 RevisionWorkspace — Stack panels
- [x] Breakpoint lowered from 900px to 600px (already stacks at 900px, but now triggers for phones too)
- [x] `@media (max-width: 540px)`:
  - Topic queue becomes horizontal scroll row (`grid-auto-flow: column`, `min(14rem, 72vw)`)
  - Reduced padding on panels
  - `font-size: 16px` on textarea
  - Buttons: `min-height: var(--touch-target)`

### 1.6 ProgressView — Fix 3-column summary grid
- [x] `@media (max-width: 820px)`: 3 → 2 columns
- [x] `@media (max-width: 600px)`: 2 → 1 column
- [x] `@media (max-width: 600px)`: Session rows stack vertically, session meta becomes flex row

### 1.7 LandingView — Fix auth card overflow
- [x] `@media (max-width: 540px)`:
  - Shell padding reduced to `0.75rem`
  - `grid-template-columns: 1fr` (removes `minmax(360px, ...)` floor)
  - Card padding and border-radius reduced
  - h1 `clamp` range lowered for small screens
  - Bullet grid: single column
  - All buttons: `min-height: var(--touch-target)`
  - Inputs: `font-size: 16px`

---

## Phase 2 — Polish: Spacing, touch targets, per-component ✅

### 2.1 Global spacing reduction
- [x] `src/app.css`: Safe area tokens (`--safe-top/bottom/left/right`)
- [x] `--mobile-nav-height: 60px` token
- [x] `--touch-target: 2.75rem` (44px) token
- [x] `overscroll-behavior-y: none` on body (prevents pull-to-refresh on iOS)
- [x] `.btn-compact` enlarged to `min-height: var(--touch-target)` on mobile

### 2.2 DashboardView — Mobile spacing
- [x] `@media (max-width: 768px)`: view gap `1.75rem` → `1.25rem`
- [x] `@media (max-width: 540px)`:
  - View gap → `1rem`
  - Mission card padding tightened
  - Hero greeting font clamped smaller
  - Subject pills: smaller font for more on screen
  - Path grid: `grid-template-columns: 1fr` (single column tiles on phones)
  - Recent card actions: stack vertically, full-width buttons
  - Stats footer: column layout on phones
  - Section blocks: reduced padding, `--radius-lg`

### 2.3 SubjectView — Phone pass
- [x] `@media (max-width: 540px)`: hero padding and radius reduced, h2 clamped
- [x] `font-size: 16px` on inputs/selects

### 2.4 SettingsView — Phone pass
- [x] `@media (max-width: 540px)`: card padding and radius reduced
- [x] Hero actions stack vertically, buttons full width
- [x] `font-size: 16px` on inputs/selects

### 2.5 OnboardingWizard — Tighten 375px
- [x] `@media (max-width: 540px)`: tighter padding-inline
- [x] Sticky footer has `padding-bottom: var(--safe-bottom)` for home indicator
- [x] All footer buttons: `min-height: var(--touch-target)`
- [x] `font-size: 16px` on all inputs/selects

---

## Phase 3 — Foundation ✅

### 3.1 iOS safe area insets
- [x] `--safe-top/bottom/left/right` tokens in `src/app.css` using `env(safe-area-inset-*)`
- [x] MobileNav: `padding-bottom: var(--safe-bottom)`, height accounts for safe area
- [x] Main content: `padding-bottom` in layout accounts for nav + safe area
- [x] OnboardingWizard sticky footer: `padding-bottom: var(--safe-bottom)`

### 3.2 Viewport meta tag
- [x] `src/app.html`: updated to `viewport-fit=cover` — required for safe area insets to work on iPhones

### 3.3 Scroll behaviour
- [x] `overscroll-behavior-y: none` on body
- [x] Chat area: `overscroll-behavior: contain` (already had this)
- [x] MobileNav horizontal pill lists use `scrollbar-width: none`

### 3.4 Input & keyboard handling
- [x] All `<input>`, `<select>`, `<textarea>` get `font-size: max(16px, 1em)` via global rule in `app.css` at `≤767px` — prevents iOS auto-zoom
- [x] Per-component `font-size: 16px` overrides added as belt-and-suspenders
- [x] App shell in lesson mode uses `height: 100svh` (dynamic viewport — shrinks when keyboard appears)

### 3.5 CSS custom properties
- [x] `--safe-top`, `--safe-bottom`, `--safe-left`, `--safe-right`
- [x] `--mobile-nav-height: 60px`
- [x] `--touch-target: 2.75rem`

---

## Testing Checklist

- [ ] iPhone SE (375px) — Chrome DevTools emulation
- [ ] iPhone 14 Pro (393px) — Safari on device or DevTools
- [ ] Samsung Galaxy S21 (360px) — Chrome DevTools
- [ ] iPad mini portrait (768px) — Chrome DevTools
- [ ] iPad standard portrait (810px) — Chrome DevTools
- [ ] All pages: LandingView, Dashboard, Lesson, Subject, Progress, Revision, Settings, Onboarding
- [ ] Lesson workspace: open keyboard, send message, verify composer stays visible
- [ ] All touch targets ≥ 44px verified
- [ ] No horizontal scroll on any page at 375px
- [ ] MobileNav safe area: home indicator not obscuring tabs on iPhone
- [ ] Dark mode + mobile: all surfaces correct
