# Lesson Experience Plan

## Product Goal
Make the lesson screen feel like a calm, structured place to learn one thing at a time.

The learner has already chosen:
- subject
- section
- lesson or revision

At this point the interface should stop feeling like a curriculum debugger and start feeling like guided learning.

## Current Problems
- The top area is fragmented into too many equal cards.
- `Deeper Explanation` and `Mastery Retry Loop` read like internal system language, not learner language.
- The page does not clearly answer: `What should I read first? What should I do next? Where can I ask for help?`
- Practice and support are present, but they are not organized around learner momentum.
- `Progress Snapshot` is useful, but it is occupying premium space too early in the reading flow.

## Learner-First Model
The lesson page should support two simultaneous needs:
- progressive learning at the learner’s pace
- immediate help when they get stuck or want clarification

The system should feel like:
- a clear guide
- a patient explainer
- a responsive helper

Not like:
- a curriculum database
- a stack of unrelated cards
- an assessment screen with lesson text attached

## Layout Direction

### 1. Header
- Keep a very clean lesson header.
- Show:
  - subject
  - section
  - lesson title
  - mastery pill
- Tone should be quiet and high-confidence.

### 2. Overview Banner
- `Overview` should stretch across the full horizontal width near the top.
- It should act as the anchor for the lesson.
- It should answer:
  - what this part is about
  - what the learner should notice
  - what they should be able to do after this lesson

### 3. Guided Lesson Flow
- Replace the equal-card grid with a sequential learning path.
- Suggested structure:
  - `Overview`
  - `Key idea 1`
  - `Key idea 2`
  - `Worked example`
  - `Try it`
- Each step should feel like part of one lesson, not a separate dashboard tile.

### 4. Ask-While-Learning Support
- The learner should always have an easy way to ask a focused question without leaving the lesson context.
- This should be integrated into the lesson flow, not hidden in a separate area.
- Good pattern:
  - small helper card or inline prompt:
    - `Need help with this part?`
    - `Ask a question`
- The app should feel like it is always “listening” for confusion.

### 5. Practice Area
- Practice should sit after explanation, not compete with it at the top.
- It should focus on one current question at a time.
- It should support:
  - answer input
  - show working
  - gentle feedback
  - hint path
- The practice area should feel central, not like a side widget.

### 6. Progress Strip
- `Progress Snapshot` should move to the bottom.
- It should stretch horizontally.
- It should be compact and secondary.
- It should summarize:
  - completion state
  - current stage
  - time spent
  - weak areas
  - recent answers

## Content Renames
- `Deeper Explanation` should be removed as a visible label.
- `Mastery Retry Loop` should be removed entirely from learner UI.
- Replace system-facing labels with learner-facing labels such as:
  - `What to notice`
  - `How it works`
  - `Worked example`
  - `Try this`
  - `Need help?`

## Interaction Model

### Primary Path
1. Learner lands in lesson.
2. Reads the overview banner.
3. Moves through one idea at a time.
4. Reaches a worked example.
5. Attempts one focused practice task.
6. Receives feedback and either continues or asks for help.

### Support Path
- At any point, the learner can ask:
  - for a simpler explanation
  - for another example
  - what a specific line means
  - why their answer is wrong

### Pacing
- Avoid dumping all lesson content as equally weighted blocks.
- Use spacing, sequencing, and disclosure to create pace.
- The learner should always know what the next useful action is.

## Visual Direction
- Apple-like simplicity:
  - fewer boxes
  - stronger hierarchy
  - more breathing room
  - softer transitions
  - restrained motion
- The top of the lesson should feel spacious and focused.
- The page should read vertically as a guided narrative, not a control panel.

## Proposed Screen Structure

### Top
- Header
- Full-width overview banner

### Middle
- Guided lesson stack:
  - key explanation block
  - follow-up explanation block
  - worked example block
  - ask-for-help inline block
  - practice block

### Bottom
- Full-width progress strip

## Implementation Tasks

### Phase 1: Structural Rewrite
- Refactor `LessonWorkspace.svelte` away from the current equal-card dashboard layout.
- Build a vertical lesson flow with clear section ordering.
- Make `Overview` full-width at the top.
- Remove `Deeper Explanation` and `Mastery Retry Loop` from the UI.
- Move progress summary to a full-width footer strip.

### Phase 2: Learner Language
- Rename visible lesson section labels to learner-friendly language.
- Rewrite helper copy to sound direct, calm, and supportive.
- Remove internal/system terms from the lesson interface.

### Phase 3: Guided Support
- Add an inline support surface inside the lesson:
  - `Ask a question`
  - `Explain this more simply`
  - `Show another example`
- Keep support contextual to the current lesson section.

### Phase 4: Practice Experience
- Redesign practice into a single focused block.
- Improve answer input hierarchy.
- Make hints progressive rather than dumping all help immediately.
- Keep feedback readable and supportive.

### Phase 5: Motion and Polish
- Add subtle section-entry fades.
- Add gentle state transitions between explanation, example, and practice.
- Keep motion light and optional under `prefers-reduced-motion`.

### Phase 6: Data/Model Follow-Up
- Review whether the current lesson data shape is sufficient for multi-step guided lessons.
- If not, extend lesson content to support:
  - multiple explanation steps
  - inline support prompts
  - richer worked examples
  - practice variants

## Open Product Decisions
- Should the learner move through lesson sections manually, or should there be a `Next step` button?
- Should inline help open inside the lesson page, or slide into a side panel/sheet?
- Should practice feedback appear immediately, or only after the learner chooses `Check answer`?
- Should we support collapsible earlier sections once the learner moves forward?

## Recommended Default Decisions
- Manual vertical reading flow with a subtle `Next step` cue, not hard pagination.
- Inline help opens inside the lesson page near the current section.
- Feedback appears after `Check answer`.
- Earlier sections stay visible but compact once the learner progresses.

## Build Order Recommendation
1. Rewrite the lesson layout.
2. Fix the content labels and reading hierarchy.
3. Move progress to the bottom strip.
4. Add inline lesson help.
5. Refine practice and feedback.
6. Add motion and polish.
