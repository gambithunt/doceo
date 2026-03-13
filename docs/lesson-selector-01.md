# Lesson Selector 01

## Objective

Replace the rigid `Start new` dashboard form with an LLM-assisted lesson selector that is fast for students to use and still maps their intent onto a formal curriculum section.

## Interaction Flow

1. Student chooses a subject.
2. Student answers one open prompt:
   - `What do you want to work on?`
3. The request is sent to the lesson-selector AI matcher.
4. The matcher returns:
   - suggested formal section
   - confidence
   - short friendly explanation
   - candidate follow-up options when confidence is low
5. The UI reveals the result with gentle streaming / fade behavior.
6. The student chooses:
   - `Lesson`
   - `Revision`
7. If `Lesson`:
   - create or resume a structured lesson session
8. If `Revision`:
   - ask one follow-up:
     - `What part do you want to revise?`
   - then start a revision flow

## UX Rules

- Subject choice remains structured.
- Section input is natural language only.
- Suggested-section dropdown is removed.
- Loaders should feel calm, clear, and modern.
- If confidence is low, the student should confirm the match before continuing.
- If confidence is high, the student can move directly to lesson or revision.

## AI Contract

The lesson selector matcher should return JSON with:

- `studentIntent`
- `matchedSection`
- `matchedTopic`
- `confidence`
- `reasoning`
- `clarificationNeeded`
- `candidateSections`

## Dashboard Changes

- Remove the previous rigid `Start new` controls.
- Let the card take more space.
- Remove the `Recommended next` card.
- Keep `Recent lessons` and improve the empty state.
- Use friendly learning animation where whitespace remains.

## Implementation Notes

- Prefer GitHub Models through the same existing integration pattern used elsewhere.
- Keep a deterministic local fallback matcher.
- The UI can simulate streamed assistant reveal client-side if the backend returns final JSON.
- Store both:
  - original student wording
  - matched formal section
