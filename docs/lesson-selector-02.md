# Lesson Selector Assistant Stage

## Goal
Keep the lesson selector visually calm while making the assistant feel responsive and helpful.

## Layout
- The `Start new` card remains the primary dashboard surface.
- The card uses a two-column layout on desktop:
  - left: form, generated match text, lesson/revision actions
  - right: fixed-height assistant stage
- The assistant stage must not grow when generated text grows.
- On smaller screens, the assistant stage stacks below the form and keeps the same internal behavior.

## Assistant Stage
- The assistant stage is a fixed-height visual panel.
- It reacts to interaction state instead of reacting to text height.
- It does not contain long explanatory copy.
- It can contain:
  - animated path
  - floating notebook/book motif
  - small status label
  - matched section badge

## States

### Idle
- Shown before the student submits anything.
- Calm floating illustration.
- Short label such as `Ready to map your idea`.

### Matching
- Triggered after `Find my section`.
- Gentle loader remains alive.
- Path animates forward.
- Dots pulse in sequence.
- Label changes to `Matching your idea to the curriculum`.

### Matched
- Triggered when a confident match returns.
- Motion settles slightly.
- A floating badge appears with the matched section name.
- Label changes to `Best match found`.

### Clarify
- Triggered when multiple candidate sections need confirmation.
- Path can visually branch or show multiple highlighted stops.
- Label changes to `Choose the closest section`.
- Candidate choices remain in the left result panel, not inside the stage.

### Error
- Triggered when matching fails.
- Animation quiets.
- Label changes to `Unable to match right now`.

## Content Rules
- All reasoning text stays on the left in the assistant result card.
- The right stage only shows:
  - compact status copy
  - matched badge when available
  - motion reacting to state
- The stage must remain useful even if the left panel becomes tall.

## Motion Direction
- Use restrained, polished motion:
  - fade
  - subtle float
  - path trace
  - dot pulse
  - matched badge reveal
- Avoid cartoon motion or constant busy looping.
- Respect `prefers-reduced-motion`.

## Intended Student Experience
- The student writes naturally.
- The system visibly “works” on the request.
- The match feels confirmed and grounded.
- The layout stays stable, readable, and easy to scan.
