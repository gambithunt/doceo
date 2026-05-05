# Workstream: lesson-visual-weight-01

## Objective

Make the lesson workspace feel physically tangible — like the smartest, friendliest person you know is guiding you through learning, not like a corporate SaaS panel. The learner should always know where they are, what to do next, and feel that completing each step matters.

Current pain points, validated against live screenshots:

- Typography is flat: heading and body text are separated by roughly 4px of size difference. The heading should dominate the card; everything else should orbit it.
- Stage badge is decorative: a small outlined pill that does not communicate chapter identity. It should read like a section marker in a well-designed textbook.
- The card has no depth: the left border is correct but the card still reads as a div on a page, not a teaching surface with presence and weight.
- The left sidebar shows a hardcoded `Aiden / Grade 9` identity pill that is placeholder data, serves no function mid-lesson, and misleads the learner.
- The history section appears the moment any AI teaching message exists, immediately branding the experience as a chat app before the learner has typed anything.
- The completed concepts sidebar is a plain text list. It should feel like a scoreboard of earned progress.
- The action bar sits on the surface. It should feel anchored and docked, like a control panel.

## Reference

Primary reference: `lesson-current-desktop.png` and `lesson-current-mobile.png` in the project root. Key design signals:

- The heading fills 28–32px and is the unambiguous visual anchor.
- Stage badge is filled solid, reads as a chapter header before the learner reads a word of content.
- Card has shadow depth with a stage-color glow; left border is structural, not decorative.
- Completed concepts feel like earned achievement tiles, not a flat list.
- The action surface (CTA + chips) reads as a docked control panel with its own z-axis presence.
- Mobile has the same visual hierarchy, not a simplified afterthought.

## Current-State Notes

- Primary UI owner: `src/lib/components/LessonWorkspace.svelte`.
- Primary UI helper: `src/lib/components/lesson-workspace-ui.ts`.
- Primary tests: `src/lib/components/LessonWorkspace.test.ts`.
- Lesson harness model and v2 checkpoint behavior are complete (lesson-harness-refine-01 and lesson-harness-design phases 1–9 all done).
- The desktop hero layout already places the image to the right of the text when `active-lesson-card-hero-with-visual` is applied — do not change that grid.
- The `.lesson-action-bar` is already extracted below the scroll area (Phase 9 Sub-task 3).
- Stage colors are already set as CSS custom properties (`--lesson-active-stage-color`, `--lesson-phase-color`) and the five identities (concept, example, your-turn, feedback, summary) are wired.
- The hardcoded learner pill at line 1082–1088 of `LessonWorkspace.svelte` reads `Aiden / Grade 9` and has no dynamic data binding.
- The `hasHistoryRegion` condition (line 316) shows the history section as soon as any `visibleMessages` or `collapsedMessages` exist, including the initial AI teaching message — before the learner has responded.
- The `.lesson-concepts-sidebar` renders concept names as text inside cards; there is no visual fill or achievement aesthetic.

## Constraints

- Only implement the phase currently assigned.
- Do not implement future-phase behavior early.
- Maintain both light and dark mode for every visual change.
- Preserve all existing lesson behavior, harness moment contract, TTS, message routing, v2 progression, and Svelte 5 runes patterns.
- No new AI routes, lesson stages, persistence changes, or app-state schema changes.
- No new components unless duplication within a phase makes a snippet mandatory.
- Every interactive element that looks pressable must do something or be removed.
- Strict RED → GREEN → REFACTOR per phase.
- Each phase leaves the app stable and all tests passing before the next begins.
- Update this document after each phase by marking completed tasks.
- Move to `docs/workstreams/completed/` only after all phases are verified.

## Phase Plan

1. **Sidebar Cleanup**: Remove the hardcoded learner identity pill and strip the left rail to only functional controls.
2. **Typography Hierarchy**: Establish a clear 3-tier size cascade so the heading dominates and body reads comfortably.
3. **Stage Badge as Chapter Marker**: Redesign the stage badge from an outlined pill to a solid filled stage-color chip that reads as a chapter header.
4. **Card Elevation and Depth**: Add stage-color shadow glow, thicker left border, and a richer surface gradient so the card feels physically present.
5. **History Surface Intelligence**: Suppress the history heading and transcript section until the learner has actually submitted a response.
6. **Completed Concepts Achievement Tiles**: Redesign the concepts sidebar from a text list to visual achievement tiles with color bar, emoji, name, and progress counter.
7. **Action Bar Elevation**: Give the action bar a docked-to-floor shadow and the CTA a dimensional gradient so the control surface feels grounded.

Each phase is independently testable and does not depend on phases that follow it.

---

## Phase 1: Sidebar Cleanup

### Goal

Remove the hardcoded `Aiden / Grade 9` learner identity pill from the lesson shell so the left rail contains only controls that serve the learner during the lesson.

### Scope

Included:
- Delete the `.lesson-side-learner` div and its contents from the markup.
- Delete the associated CSS for `.lesson-side-learner`, `.lesson-side-avatar`.
- Keep the Notes toggle button in the sidebar footer.
- Keep the Doceo brand mark and collapse affordance at the top of the rail.

Excluded:
- Any visual redesign of the rail itself.
- Adding dynamic learner profile data.
- Changing the Notes behavior.

### Tasks

- [x] RED: add a failing `LessonWorkspace.test.ts` assertion that no element with text `Aiden` or class `lesson-side-learner` is rendered in the lesson workspace.
- [x] GREEN: remove the `.lesson-side-learner` div (lines 1082–1088) and its CSS.
- [x] REFACTOR: check for any remaining references to `.lesson-side-avatar` or `.lesson-side-learner` selectors and remove dead CSS.

### TDD Plan

RED
```
test('does not render a hardcoded learner identity pill in the lesson sidebar', () => {
  render(LessonWorkspace, { state: renderV2Workspace([]) });
  expect(document.querySelector('.lesson-side-learner')).toBeNull();
  expect(screen.queryByText('Aiden')).toBeNull();
});
```

GREEN
- Delete the `.lesson-side-learner` div block.
- Delete the two CSS rules.

REFACTOR
- Grep for any remaining `.lesson-side-avatar` usage; remove if dead.

### Touch Points

- `src/lib/components/LessonWorkspace.svelte`
- `src/lib/components/LessonWorkspace.test.ts`

### Done Criteria

- Tasks complete.
- Tests passing.
- No `Aiden`, no `.lesson-side-learner`, no `.lesson-side-avatar` in component.
- Left rail still contains brand mark and Notes toggle.

---

## Phase 2: Typography Hierarchy

### Goal

Make visual weight map to semantic importance. The lesson heading should be the single dominant element on the card — 2–3× larger than surrounding text. The stage label reads as metadata, not as body copy.

### Scope

Included:
- Push the base `h3` inside `.active-lesson-card` to `clamp(2rem, 3.2vw, 2.8rem)`, weight 800, line-height 1.05.
- The compact override (`.active-lesson-card-compact h3`) remains smaller but still hierarchy-aware: `clamp(1.4rem, 2.2vw, 1.9rem)`.
- Make `.active-lesson-card-context` clearly subordinate: `0.92rem`, `color: var(--text-soft)`, `opacity: 0.82`.
- Make `.active-lesson-card-body` text clearly distinct from heading: `1.05rem`, full `color: var(--text)`, line-height `1.78`.
- Cover both light and dark mode; confirm all responsive breakpoints.

Excluded:
- Stage badge redesign (Phase 3).
- Card background or shadow changes (Phase 4).
- Mobile layout structural changes.

### Tasks

- [x] RED: add CSS-content assertions that `.active-lesson-card h3` contains `clamp(2rem` and a weight of at least `800`, and that `.active-lesson-card-context` has a font-size below `1rem`.
- [x] GREEN: update the three typographic rules — heading, context copy, body text.
- [x] REFACTOR: remove any intermediate overrides at responsive breakpoints that undershoot the new baseline.

### TDD Plan

RED
```
test('active lesson card heading uses a dominant font-size', () => {
  const css = readWorkspaceFile('src/lib/components/LessonWorkspace.svelte');
  expect(css).toContain('clamp(2rem');
  expect(css).toMatch(/\.active-lesson-card h3[\s\S]{0,200}font-weight:\s*800/);
});

test('active lesson card context copy is subordinate to the heading', () => {
  const css = readWorkspaceFile('src/lib/components/LessonWorkspace.svelte');
  expect(css).toMatch(/\.active-lesson-card-context[\s\S]{0,200}font-size:\s*0\.9[0-9]rem/);
});
```

GREEN
- Update `.active-lesson-card h3`: `font-size: clamp(2rem, 3.2vw, 2.8rem); font-weight: 800; line-height: 1.05`.
- Update `.active-lesson-card-compact h3`: `clamp(1.4rem, 2.2vw, 1.9rem)`.
- Update `.active-lesson-card-context`: `font-size: 0.92rem; color: var(--text-soft); opacity: 0.82`.
- Update `.active-lesson-card-body`: `font-size: 1.05rem; line-height: 1.78; color: var(--text)`.

REFACTOR
- Check all responsive `@media` overrides for the heading and remove any that pull the size back below the new base without a justified reason.

### Touch Points

- `src/lib/components/LessonWorkspace.svelte`
- `src/lib/components/LessonWorkspace.test.ts`

### Risks / Edge Cases

- Very long lesson titles may wrap to 3+ lines at the large size; `line-height: 1.05` handles this but check edge case with a 60-character title.
- The compact state is triggered only when `stateLabel === 'Start'` and transcript is active; confirm this override is still legible at the reduced but still-dominant size.

### Done Criteria

- Tasks complete.
- Tests passing.
- Heading is visually 2–3× larger than body text at desktop and mobile viewports.
- Context copy reads as metadata, not as competing body content.
- Dark mode heading remains high contrast.

---

## Phase 3: Stage Badge as Chapter Marker

### Goal

Replace the outlined `.active-lesson-card-state` pill with a solid filled chip using the current stage color. The badge should feel like a chapter marker — the first thing the learner reads before the heading — not a small label.

### Scope

Included:
- Change `.active-lesson-card-state` from outlined + tinted background to solid stage color fill with white/contrast text.
- Increase padding: `0.38rem 0.95rem`.
- Increase font size slightly: `0.78rem`.
- Ensure the five stage identities (concept, example, your-turn, feedback, summary) each produce a visually distinct filled chip.
- Cover both light and dark mode.

Excluded:
- Changing the stage badge text content or its data source.
- Card background or shadow changes (Phase 4).
- Progress rail nodes.

### Tasks

- [x] RED: add CSS-content assertion that `.active-lesson-card-state` contains a `background:` rule using `var(--lesson-phase-color)` as a solid fill (not `color-mix` at less than 50%), and a `color:` rule targeting contrast.
- [x] GREEN: update the `.active-lesson-card-state` CSS to solid fill with contrast text.
- [x] REFACTOR: remove the `border:` rule from `.active-lesson-card-state` if it is now redundant; verify dark mode produces sufficient contrast.

### TDD Plan

RED
```
test('stage badge uses a solid stage-color background not a tinted outline', () => {
  const css = readWorkspaceFile('src/lib/components/LessonWorkspace.svelte');
  expect(css).toMatch(/\.active-lesson-card-state[\s\S]{0,300}background:\s*var\(--lesson-phase-color\)/);
});
```

GREEN
- Change `.active-lesson-card-state`:
  ```css
  background: var(--lesson-phase-color);
  color: var(--accent-contrast, white);
  border: none;
  padding: 0.38rem 0.95rem;
  font-size: 0.78rem;
  ```
- Dark mode override: verify the filled stage color has sufficient contrast against the dark card surface; adjust `color` if needed.

REFACTOR
- Delete the `border:` property if border is gone.
- Confirm the compact state badge inherits correctly and does not regress to an outline.

### Touch Points

- `src/lib/components/LessonWorkspace.svelte`
- `src/lib/components/LessonWorkspace.test.ts`

### Risks / Edge Cases

- The stage color in dark mode may be too light for white text; test `concept` (blue) and `example` (yellow/amber). Amber on white text is a known contrast problem — use `var(--text)` or a darkened contrast token for the `example` stage if needed.
- The badge sits inside `active-lesson-card-your-turn`, which overrides the card background to yellow. Verify the badge chip is still readable.

### Done Criteria

- Tasks complete.
- Tests passing.
- Badge reads as a filled solid chip in all five stage identities.
- Contrast passes at both light and dark mode for all five colors.
- Badge is visually the first element the eye finds before reading the heading.

---

## Phase 4: Card Elevation and Depth

### Goal

Give the active lesson card physical presence — it should appear lifted off the background surface, with a shadow that carries a hint of the current stage color and a left border thick enough to read as a structural element, not a decoration.

### Scope

Included:
- Increase left border thickness to `7px`.
- Replace the current diffuse shadow with a two-layer shadow: a tight ambient layer and a spread stage-color glow layer.
- Boost the card's inner radial gradient top-left stop to `32%` opacity (from 26%) for the base state.
- For `.active-lesson-card-with-transcript`, boost the gradient to `28%` (from 22%) so the with-transcript state retains stage identity.
- Cover both light and dark mode.

Excluded:
- Card layout structure changes.
- Typography changes (Phase 2).
- Badge changes (Phase 3).
- Action bar changes (Phase 7).

### Tasks

- [x] RED: add CSS-content assertions that the left border is at least `7px` and that the box-shadow contains `var(--lesson-phase-color)`.
- [x] GREEN: update `.active-lesson-card` border-left, box-shadow, and radial gradient stops.
- [x] REFACTOR: check dark mode shadow override and confirm the glow does not bleed outside the card container on small viewports.

### TDD Plan

RED
```
test('active lesson card uses a 7px or thicker stage-color left border', () => {
  const css = readWorkspaceFile('src/lib/components/LessonWorkspace.svelte');
  expect(css).toMatch(/\.active-lesson-card[\s\S]{0,400}border-left:\s*7px/);
});

test('active lesson card shadow references the stage phase color', () => {
  const css = readWorkspaceFile('src/lib/components/LessonWorkspace.svelte');
  expect(css).toMatch(/\.active-lesson-card[\s\S]{0,600}box-shadow[\s\S]{0,200}lesson-phase-color/);
});
```

GREEN
- Update `.active-lesson-card`:
  - `border-left: 7px solid var(--lesson-active-stage-color)`
  - Replace box-shadow with:
    ```css
    box-shadow:
      0 2px 0 color-mix(in srgb, var(--lesson-phase-color) 40%, transparent),
      0 8px 36px color-mix(in srgb, var(--lesson-phase-color) 18%, rgba(15, 23, 42, 0.14)),
      0 32px 72px color-mix(in srgb, var(--lesson-phase-color) 8%, rgba(15, 23, 42, 0.08));
    ```
  - Boost radial gradient from `26%` to `32%`.
- Update `.active-lesson-card-with-transcript` radial gradient from `22%` to `28%`.
- Confirm dark mode shadow does not create a washed-out glow on the dark surface.

REFACTOR
- Remove the old single-layer shadow if replaced.
- Confirm the mobile card does not overflow horizontally due to the shadow spread.

### Touch Points

- `src/lib/components/LessonWorkspace.svelte`
- `src/lib/components/LessonWorkspace.test.ts`

### Risks / Edge Cases

- The `your-turn` card variant already has its own shadow using `--color-yellow`; verify the Phase 4 base shadow does not conflict with that override.
- On very narrow viewports the 7px left border can visually crowd the card padding; check at 320px.

### Done Criteria

- Tasks complete.
- Tests passing.
- Card casts a visible, stage-colored shadow that clearly lifts it from the background.
- Left border reads as structural framing, not accent decoration.
- Shadow is present and correct in both light and dark mode.

---

## Phase 5: History Surface Intelligence

### Goal

Suppress the transcript history section until the learner has actually sent a response, so the first thing a learner sees is the lesson card and the action bar — not a "LESSON HISTORY" label implying they are in a chat application.

### Scope

Included:
- Add a derived boolean `hasLearnerResponse` that is true only when `conversationView.visibleMessages` or `conversationView.collapsedMessages` contains at least one message with `role === 'user'`.
- Gate the `hasHistoryRegion` display so the history section and its heading only render when `hasLearnerResponse` is true — OR when `activeLessonCard` is null (free chat / post-completion states where the full history is wanted).
- Preserve all existing collapsed transcript toggle behavior and pending assistant state.
- Keep the "Answer feedback" heading text unchanged when the history does render.

Excluded:
- Changing message ordering or derivation logic.
- Any visual redesign of the transcript bubbles themselves.
- Changing behavior for the completed lesson state.

### Tasks

- [x] RED: add a failing test proving that when an active lesson card is present and the session's only messages are AI-authored (no `role: 'user'` messages), no history region is rendered.
- [x] RED: add a passing test proving the history region DOES render when the session contains at least one `role: 'user'` message.
- [x] GREEN: derive `hasLearnerResponse` and gate the history section render condition.
- [x] REFACTOR: remove any now-dead CSS selectors tied only to the suppressed state.

### TDD Plan

RED
```ts
test('does not render a history region when only AI messages exist and a lesson card is active', () => {
  const state = renderV2Workspace([
    { role: 'assistant', type: 'teaching', content: 'Here is the example.' }
  ]);
  render(LessonWorkspace, { state });
  expect(screen.queryByRole('region', { name: 'Lesson history' })).toBeNull();
  expect(screen.queryByRole('region', { name: 'Answer feedback' })).toBeNull();
});

test('renders history region once the learner has sent a response', () => {
  const state = renderV2Workspace([
    { role: 'assistant', type: 'teaching', content: 'Here is the example.' },
    { role: 'user', content: 'I think it is about supply.' }
  ]);
  render(LessonWorkspace, { state });
  expect(screen.getByRole('region', { name: 'Answer feedback' })).toBeInTheDocument();
});
```

GREEN
- Derive `const hasLearnerResponse = $derived(...)` by checking `conversationView.visibleMessages` and `conversationView.collapsedMessages` for any `role === 'user'` entry.
- Change the `{#if hasHistoryRegion}` condition to `{#if hasHistoryRegion && (hasLearnerResponse || !activeLessonCard)}`.

REFACTOR
- Inspect for any CSS that was written specifically for the "AI-only messages + active card" state and delete it if superseded.

### Touch Points

- `src/lib/components/LessonWorkspace.svelte`
- `src/lib/components/LessonWorkspace.test.ts`
- `src/lib/components/lesson-workspace-ui.ts` — `conversationView` derivation if needed

### Risks / Edge Cases

- The `pendingAssistantSessionId` condition in `hasHistoryRegion` shows a loading state; this should still appear even with no learner response, so include `viewState.ui.pendingAssistantSessionId === lessonSession?.id` as a bypass in the new gate.
- Post-completion state must still show the full history regardless of `hasLearnerResponse`.
- Collapsed transcript toggle must not appear visually broken if the section is suppressed.

### Done Criteria

- Tasks complete.
- Tests passing.
- Fresh lesson card loads without any history section visible.
- The moment the learner submits their first response, the history section appears and shows both the learner's response and the AI feedback.
- Pending assistant state still renders while the AI responds.
- Completion state unaffected.

---

## Phase 6: Completed Concepts Achievement Tiles

### Goal

Transform the right-panel concepts sidebar from a text list into visual achievement tiles that feel earned. Each concept gets a colored left stripe, the concept emoji, a bold name, and the one-line definition. The section header shows a filled progress counter.

### Scope

Included:
- Replace the current plain concept card markup in `.lesson-concepts-sidebar` with a tile structure: left colored stripe (stage concept color), emoji, concept name in bold, `oneLineDefinition` as a small subtitle.
- Add a progress counter and a thin fill bar at the top of the sidebar: `X of Y concepts covered`.
- The tile uses the concept emoji from the existing `conceptEmoji()` helper.
- The tile's left stripe uses `--stage-concept-color` (always concept-stage color since these are concept tiles regardless of current checkpoint).
- Cover both light and dark mode.
- On mobile: sidebar stacks below the card (already the case); tiles render the same structure.

Excluded:
- Changing the `activeLessonCard.conceptMiniCards` data source.
- Adding click behavior or navigation to concept tiles.
- Persisting concept visit counts.
- Notes integration.

### Tasks

- [x] RED: add failing tests — each concept tile has a visible `oneLineDefinition` text, an emoji, and the progress counter renders `X of Y` text.
- [x] GREEN: update the concept tile markup to include the stripe, emoji, name, and one-liner; add the progress counter and fill bar above the list.
- [x] REFACTOR: remove any now-redundant concept card CSS from the old plain-list style.

### TDD Plan

RED
```ts
test('renders a progress counter showing how many concepts have been covered', () => {
  const state = renderV2WorkspaceWithConcepts([concept1, concept2]);
  render(LessonWorkspace, { state });
  expect(screen.getByText(/1 of 2/)).toBeInTheDocument();
});

test('renders the concept one-line definition inside each concept tile', () => {
  const state = renderV2WorkspaceWithConcepts([concept1]);
  render(LessonWorkspace, { state });
  expect(screen.getByText(concept1.oneLineDefinition)).toBeInTheDocument();
});

test('renders the concept emoji in each tile', () => {
  const state = renderV2WorkspaceWithConcepts([concept1]);
  render(LessonWorkspace, { state });
  const sidebar = screen.getByRole('complementary', { name: 'Completed concepts' });
  expect(sidebar.querySelector('.concept-tile-emoji')).toBeTruthy();
});
```

GREEN
- Update `.concept-card-mini` markup to:
  ```html
  <div class="concept-tile">
    <span class="concept-tile-stripe" aria-hidden="true"></span>
    <span class="concept-tile-emoji" aria-hidden="true">{conceptEmoji(concept, i)}</span>
    <div class="concept-tile-copy">
      <strong class="concept-tile-name">{concept.name}</strong>
      <p class="concept-tile-tagline">{concept.oneLineDefinition}</p>
    </div>
  </div>
  ```
- Add progress counter above the list:
  ```html
  <div class="concepts-progress">
    <span>{completedConceptCount} of {totalConceptCount}</span>
    <div class="concepts-progress-bar">
      <div class="concepts-progress-fill" style="width: {(completedConceptCount/totalConceptCount)*100}%"></div>
    </div>
  </div>
  ```
- Add CSS for `.concept-tile`, `.concept-tile-stripe` (2px left border using `--stage-concept-color`), `.concept-tile-emoji`, `.concept-tile-copy`, `.concept-tile-name`, `.concept-tile-tagline`.
- Derive `completedConceptCount` as the number of concepts in `activeLessonCard.conceptMiniCards`; derive `totalConceptCount` from `lesson.flowV2?.concepts?.length`.

REFACTOR
- Remove `.concept-card-body`, `.concept-card-mini` old CSS if replaced by tile CSS.

### Touch Points

- `src/lib/components/LessonWorkspace.svelte`
- `src/lib/components/LessonWorkspace.test.ts`
- `src/lib/components/lesson-workspace-ui.ts` — `conceptMiniCards` source

### Risks / Edge Cases

- `oneLineDefinition` may be undefined on older lesson data; render `concept.summary` as fallback.
- Progress counter fraction division must not divide by zero when a lesson has no concepts defined.
- The concept tile emoji renders an accessible `aria-hidden` span so screen readers get the text name instead.

### Done Criteria

- Tasks complete.
- Tests passing.
- Each concept tile shows stripe, emoji, bold name, and one-liner.
- Progress counter shows `X of Y concepts covered` with a fill bar.
- Tiles render correctly in both light and dark mode.
- Mobile stacked layout is usable.

---

## Phase 7: Action Bar Elevation

### Goal

Make the action bar read as a docked control surface — the physical floor of the lesson — rather than a div that happens to contain buttons. The CTA should feel pressable and the bar should cast a shadow upward, anchoring it visually.

### Scope

Included:
- Add an upward `box-shadow` to `.lesson-action-bar` using a stage-color tint: `0 -6px 28px color-mix(in srgb, var(--lesson-active-stage-color) 12%, rgba(0,0,0,0.10))`.
- Add a subtle top-to-bottom gradient to `.lesson-support-cta` (the primary CTA button) so it feels dimensional: lighter at top, stage color at bottom.
- Increase `.lesson-support-cta` border-radius slightly for a more tactile pill-button feel.
- Add a clear pressed / `:active` scale transform (`scale(0.97)`) to the CTA only.
- Respect `prefers-reduced-motion` for the scale transform.
- Cover both light and dark mode.

Excluded:
- Changing the action bar content, button labels, or behavior.
- Adding new buttons.
- Motion that is not directly tied to the CTA press interaction.

### Tasks

- [x] RED: add CSS-content assertion that `.lesson-action-bar` contains a `box-shadow` and that `.lesson-support-cta` contains a `background` with a gradient and an `:active` rule.
- [x] GREEN: update the two CSS rules.
- [x] REFACTOR: verify that existing hover/active box-shadow overrides on `.lesson-support-cta` compose correctly with the new gradient background and do not fight each other.

### TDD Plan

RED
```ts
test('lesson action bar has an upward shadow', () => {
  const css = readWorkspaceFile('src/lib/components/LessonWorkspace.svelte');
  expect(css).toMatch(/\.lesson-action-bar[\s\S]{0,400}box-shadow/);
});

test('lesson support CTA has a gradient background and a pressed active state', () => {
  const css = readWorkspaceFile('src/lib/components/LessonWorkspace.svelte');
  expect(css).toMatch(/\.lesson-support-cta[\s\S]{0,400}linear-gradient/);
  expect(css).toMatch(/\.lesson-support-cta:active[\s\S]{0,200}scale/);
});
```

GREEN
- Add to `.lesson-action-bar`:
  ```css
  box-shadow: 0 -6px 28px color-mix(in srgb, var(--lesson-active-stage-color) 12%, rgba(0, 0, 0, 0.10));
  ```
- Update `.lesson-support-cta` background to a gradient:
  ```css
  background: linear-gradient(
    180deg,
    color-mix(in srgb, var(--lesson-active-stage-color) 82%, white 18%),
    var(--lesson-active-stage-color)
  );
  ```
- Add:
  ```css
  .lesson-support-cta:active {
    transform: scale(0.97);
  }
  @media (prefers-reduced-motion: reduce) {
    .lesson-support-cta:active { transform: none; }
  }
  ```

REFACTOR
- Ensure the hover `box-shadow` on `.lesson-support-cta:hover` does not conflict with the new gradient; update if the combined result looks flat.

### Touch Points

- `src/lib/components/LessonWorkspace.svelte`
- `src/lib/components/LessonWorkspace.test.ts`

### Risks / Edge Cases

- The upward shadow on the action bar may bleed into the chat scroll area on short-content sessions; add `overflow: hidden` or `clip-path` to the bar container if needed.
- The scale transform must not cause layout shift in adjacent buttons; use `will-change: transform` on the CTA if jank occurs.

### Done Criteria

- Tasks complete.
- Tests passing.
- Action bar casts a visible upward shadow in both light and dark mode.
- CTA button has a gradient that gives it depth and responds to press with a subtle scale.
- Reduced-motion users see no transform.
- No layout shift from the press animation.

---

## Cross-Phase Rules

- No early future-phase work.
- No refactor beyond the active phase.
- App stable after each phase.
- Prefer extension over duplication.
- Keep changes small for review.
- Use Svelte 5 runes for new component state.
- Reuse existing stores, helpers, tests, TTS controls, and lesson message routes.
- Preserve all existing lesson progression and AI harness behavior.
- Update this workstream doc after each phase by marking only completed tasks in the completed phase.
- Move this workstream to `docs/workstreams/completed/` only after all phases are completed.
- Every visual change must cover both light and dark mode.
- Every interaction that appears clickable must be functional, disabled with a clear reason, or removed.
- The lesson should feel wonderful and tactile, not like corporate SaaS.

## Open Questions / Assumptions

- Assumption: `--accent-contrast` resolves to white in both light and dark themes for the filled stage badge. If not, a per-stage contrast token may be needed for amber/yellow stages.
- Assumption: `oneLineDefinition` is present on v2 concept items; the implementation falls back to `concept.summary` if missing.
- Open question: should the progress counter in Phase 6 show only concepts that have been formally "completed" (covered by a checked loop) or all concepts that have appeared in the sidebar? Safer default is to count concepts present in `conceptMiniCards` (already filtered by the UI helper).
- Open question: should the Phase 5 history suppression also apply to the `conversationView.completedUnits` memory shelf, or only the transcript history region? Current assumption: memory shelf is always shown when present since it is a positive progress signal, not a chat log.
