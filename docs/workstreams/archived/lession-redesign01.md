# Lesson Workspace Redesign — Sprint 01

Tasks derived from the ui-review + ui-delight session on 2026-03-26. Work in priority order.

---

## 1. Top Chrome — Collapse & Clean

- [x] **Remove the full-width green progress line** under the "Stage 1 of 6" pill — redundant with the breadcrumb
- [x] **Remove the "Stage X of 6 · [name]" pill row** entirely — the breadcrumb conveys this already
- [x] **Remove the Light/Dark toggle** from the top bar — already decided in dashboard sprint, lives in sidebar
- [x] **Demote the back button** — replace "Back to dashboard" pill with a small `←` icon + short label; should not compete with the lesson title
- [x] **Fix lesson title casing** — "Transformations Of Functions" → "Transformations of functions" (sentence case)
- [x] **Fix subject kicker casing** — "MATHEMATICS" → "Mathematics" or remove all-caps treatment entirely

---

## 2. Stage Breadcrumb — Redesign

- [x] **Redesign as a timeline-style indicator** — dots connected by a line; completed stages get a filled checkmark dot; current stage gets an accent pill with label; upcoming stages are muted dots
- [x] **Sliding active indicator** — the accent underline or filled dot slides horizontally to the new position when stage changes (CSS transition, not a snap)
- [x] **Remove the separate full-width progress bar** — the timeline dot connector line IS the progress indicator

---

## 3. Main Chat Area — Structure

- [x] **Remove the redundant stage section header** inside the chat area ("01 ◎ Orientation" + subtext) — replaced with a minimal centered pill showing stage name transition
- [x] **Attach the composer closer to the last message** — eliminated the large empty gap by removing lesson-summary block; chat area now has full height
- [x] **Visually distinguish AI messages from the surface** — apply glass treatment consistent with design system (--glass-bg-tile / --glass-blur-tile / --glass-inset-tile)
- [x] **Separate the tutor's closing prompt** (last paragraph) — italic, lighter colour, separator border-top so it reads as an invitation
- [x] **Auto-scroll to latest message** as conversation grows; add a "↓ New message" floating pill if the student has scrolled up

---

## 4. Right Rail — Reorder & Rewrite

- [x] **Reorder rail cards** — correct order: (1) Next Up, (2) Lesson progress — most important action first, reference last
- [x] **Rewrite all-caps kickers** — "LESSON MISSION" → "Your mission", "NEED ANOTHER ANGLE?" → "Need a different take?", "NEXT UP" → "Up next"
- [x] **Replace "8% of this lesson complete"** with "Stage 1 of 6" — raw percentage is discouraging at lesson start; stage count is clearer and more motivating
- [x] **Replace flat progress bar in lesson mission card** with a circular progress arc (SVG ring) — more satisfying, matches gamified feel
- [x] **Rename "Ask Doceo for backup"** → "Ask for help" — simpler, warmer
- [x] **Rename "Help me with this"** → "Explain differently" / "Walk me through it" — more specific based on context
- [x] **Consolidate rail into 2 cards max** — help buttons merged into Next Up card as secondary actions; last stage shows a dedicated help card

---

## 5. Bottom Composer — Polish

- [x] **Fix Send button icon** — "Send ↑" → "Send →" (↑ implies upload, not send)
- [x] **Make composer label context-aware** — default: "Reply or ask anything..."; when AI ends with a question, placeholder becomes "Type your answer..."
- [x] **Rename quick chips** for better tone:
  - "Check me ✅" → "Test me 🎯"
  - "I have a question 🤔" → "Go deeper 🔍"
  - Keep: "Slow down 🐢", "Different example ✨"
- [x] **Prevent chip wrapping** — horizontal scroll with `overflow-x: auto`, `scrollbar-width: none`; chips stay on one line
- [x] **Apply focus ring to textarea** — accent glow (`box-shadow: 0 0 0 3px accent-12%`) on focus
- [x] **Composer expand on focus** — textarea gently grows from 1 row to 2 rows when focused; contracts when blurred and empty

---

## 6. Motion & Delight

- [x] **AI message entrance animation** — new messages slide up + fade in (`translateY(12px) → 0`, `opacity 0 → 1`, 350ms ease-out); each message in a restored conversation staggers in on load
- [x] **Typing indicator** — "Doceo is thinking..." bubble with three animated dots; aria-label updated; styling consistent with design system
- [x] **Stage advance celebration** — on stage completion: the breadcrumb dot for the completed stage scales up briefly (dot-celebrate keyframe) via `celebratingStage` reactive state
- [x] **Stage content crossfade** — stage transition markers fade up with badge-arrive animation on stage change
- [x] **Quick chip hover spring** — chips scale to 1.03 on hover (`cubic-bezier(0.34, 1.56, 0.64, 1)`); compress to 0.95 on press then snap back
- [x] **Send button ready state** — when student has typed something, Send button does a scale-in (0.92 → 1.0) to signal it's ready; on send: pulses once via send-pulse keyframe
- [x] **Right rail Next Up card entrance** — slides in from the right on first load via slide-from-right keyframe (360ms)

---

## 7. Copy & Labels

- [x] **All kicker labels to sentence case** — audit entire lesson workspace for ALL_CAPS labels — all kickers now sentence case, no uppercase/monospace treatment
- [x] **Lesson title to sentence case** — apply `toSentenceCase()` (added inline, same pattern as dashboard sprint)
- [x] **Subject kicker** — lowercase, no text-transform: uppercase
- [x] **"Type your response or ask a question..."** → "Reply or ask anything..." (or "Type your answer..." context-aware)
- [x] **Stage names in breadcrumb** — wrapped with `toSentenceCase()` consistently

---

## 8. Consistency with Dashboard Design System

- [x] **Glass treatment on AI message cards** — `--glass-bg-tile` / `--glass-blur-tile` / `--glass-inset-tile` applied to `.bubble` base styles
- [x] **Right rail cards** — `--glass-bg-tile` / `--glass-blur-tile` / `--glass-inset-tile` + `--border-strong` border
- [x] **Border radius** — lesson-body uses `--radius-lg`; rail cards use `--radius-lg`
- [x] **Remove ThemeToggle import** from lesson workspace header — import removed, component not used

---

## Out of Scope for This Sprint

- Full lesson completion/celebration screen
- Revision mode UI
- Mobile layout (lesson workspace is desktop-first)
- Reteach loop UI variations
