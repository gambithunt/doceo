# Lesson Experience

## What it is

The lesson screen is a one-on-one chat between the student and Doceo, an adaptive AI tutor. The student works through a topic in a structured sequence of stages. At any point they can ask a question, slow down, or ask for an example — the tutor responds in context and then returns to the lesson.

---

## Layout

Four stacked regions, fixed height, no scroll on the outer shell:

1. **Top bar** — subject label, topic title, close button
2. **Progress rail** — horizontal strip of stage chips (Orientation · Key Concepts · Guided Construction · Examples · Active Practice · Check Understanding), each showing completed / active / upcoming state
3. **Chat area** — scrollable message feed
4. **Input area** — quick-reply buttons + textarea composer + send button

---

## Lesson stages

Each stage is opened by the system with a stage-start badge and a teaching message. The AI advances stages when the student demonstrates understanding.

| Stage | Label | Purpose |
|---|---|---|
| `orientation` | Orientation | Hook and relevance — why this topic matters |
| `concepts` | Key Concepts | Core rules, language, and structure |
| `construction` | Guided Construction | Step-by-step reasoning walkthrough |
| `examples` | Examples | Concrete worked example with full explanation |
| `practice` | Active Practice | Student attempts a similar problem |
| `check` | Check Understanding | Student explains or applies the idea |
| `complete` | — | Session closes, topic moves to revision |

---

## Message types

| Type | Role | Visual |
|---|---|---|
| `stage_start` | system | Centred pill badge |
| `teaching` | assistant | Left-aligned bubble (default) |
| `feedback` | assistant | Accent-tinted bubble (used on advance) |
| `side_thread` | assistant | Blue-tinted bubble (off-topic question) |
| `concept_cards` | system | Expandable disclosure panel injected at concepts stage start |
| `question` | user | Dark right-aligned bubble |
| `response` | user | Dark right-aligned bubble |

---

## Tutor behaviour

The AI receives a structured system prompt containing:
- Student profile (name, grade, curriculum, country, term, year)
- Full lesson plan (orientation, key concepts, guided construction, worked example)
- Pre-loaded concept card names (so the AI knows what cards the student can see)
- Current stage and session history (capped at last 20 messages)
- Learner profile signals (learning style, struggle/excelled topics)

**Advance**: when the student clearly understands the current stage, the AI returns a brief 1–2 sentence acknowledgment with `action: advance`. The system inserts the next stage opening automatically — the AI never repeats stage content. Short acknowledgements ("ok", "sure", "continue", "yes") do **not** trigger an advance — the AI asks a specific check question and waits for a substantive response.

**Reteach**: when the student is confused, the AI returns `action: reteach` with a different angle (step-by-step / analogy / example).

**Side thread**: off-topic questions get `action: side_thread`. The AI answers within the topic context and returns to the lesson.

**Concept clarification**: when the student presses "Ask Doceo to explain this" on a concept card, the message is prefixed with `[CONCEPT: name]`. The AI treats this as an in-lesson clarification — not a side thread — and responds with a plain-language explanation, a concrete example, and a check question. `action` is always `stay`.

**Voice**: always addressed directly to the student by name using "you/your". Never "students will" or "learners should". Doceo is the smartest, warmest friend the student has — plain words, concrete analogies, genuine warmth when understanding clicks.

---

## Fallback

When no AI is configured, a local deterministic fallback (`buildLocalLessonChatResponse`) handles all responses:
- Question replies: topic-anchored, never echoes the student's message text
- Response replies: advance / reteach / stay based on confusion keywords
- Stage advancement uses the same `action` metadata contract as the AI

---

## Lesson content

Lessons are either:
- **Seeded** — from `curriculum_lessons` in Supabase (static, pre-written content)
- **Dynamic** — built at runtime by `buildDynamicLessonFromTopic` when no seed lesson exists for the chosen topic

Dynamic lessons use subject-specific lens templates (concept word, action word, misconception, worked example) to generate second-person lesson content for any topic.

### Key Concepts (`keyConcepts`)

Every lesson carries a `keyConcepts: ConceptItem[]` array. Each `ConceptItem` has:

```ts
{
  name: string;      // concept label shown on the card
  summary: string;   // one sentence shown collapsed
  detail: string;    // plain-English explanation shown expanded
  example: string;   // concrete example shown expanded
}
```

For seeded lessons these are authored content. For dynamic lessons the AI lesson-plan step generates them at lesson creation time (via `parseLessonPlanResponse` in the edge function). If the AI omits them, `buildDynamicConceptItems` generates template-based fallbacks.

When the lesson enters the concepts stage, `buildInitialLessonMessages` injects a `concept_cards` message carrying the full `ConceptItem[]`. The `LessonWorkspace` component renders this as an expandable panel — collapsed by default, each card expanding on tap.

---

## Learner profile

Every AI response includes a `profile_update` block. After each exchange:
- Learning style signals are adjusted using EMA (not overwritten)
- Concepts struggled with / excelled at are updated (capped at 25 each)
- Session counters (questions asked, reteach events) are incremented

On app bootstrap, profile signals are reconstructed from the `lesson_signals` table using exponential decay weighting (14-day half-life) so recent sessions carry more weight.
