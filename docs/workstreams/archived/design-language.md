# Design Language

This is the current UI source of truth. The canonical implementation lives in `src/app.css` and the active learner/admin components.

## Core Direction

- Typography: `Inter`
- Theme default: light mode
- Supported themes: light and dark
- Tone: warm, clear, direct, restrained
- Product feel: modern study tool, not corporate LMS, not playful toy UI

## Token Rules

- Use CSS custom properties from `src/app.css`.
- Do not hardcode new hex values in components when an existing token already fits.
- Always update both light and dark mode behavior.

Current token families include:

- surface tokens: `--bg`, `--surface`, `--surface-soft`, `--surface-strong`, `--surface-tint`
- text tokens: `--text`, `--text-soft`, `--muted`
- action tokens: `--accent`, `--accent-dim`, `--accent-glow`
- subject and semantic tones: `--color-blue`, `--color-purple`, `--color-orange`, `--color-red`, `--color-yellow`, `--color-green`
- motion and shape tokens: `--radius-*`, `--motion-*`, `--ease-*`

## Layout Patterns

- Most pages are card-first layouts with one clear primary zone and supporting secondary tiles.
- Hero sections should establish the next action quickly.
- Tiles and section cards should feel elevated, not flat and border-only.
- Dashboard, settings, and revision all reuse the same visual family instead of route-specific micro-systems.

## Component Patterns To Preserve

- Hero cards for the main action or summary
- Section cards for grouped content
- Tinted subject pills and status chips
- Soft glass or elevated tile treatments for interactive cards
- Mission-oriented copy blocks with short, scannable supporting text

## Interaction Rules

- Mobile support is mandatory. Respect safe-area tokens and current touch-target assumptions.
- Inputs on mobile must remain at or above 16px to avoid iOS zoom.
- Preserve the app's current motion restraint. Use meaningful transitions, not decorative noise.
- Keep quick actions and next-step actions obvious in lesson and revision workspaces.

## Copy Rules

- Keep copy concise.
- Speak directly to the learner.
- Avoid bureaucratic or LMS-style phrasing.
- Avoid over-explaining UI labels when the surrounding context already carries the meaning.

## Implementation Checks

- Before UI edits, confirm the matching route or component already has a pattern you can extend.
- If a new component needs status colors, start from the existing tone and semantic tokens.
- When changing page structure, verify both desktop and mobile layouts, plus light and dark mode.
