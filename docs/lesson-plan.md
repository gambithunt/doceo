# Lesson Experience

## What it is

The lesson screen is a one-on-one chat between the student and Doceo, an adaptive AI tutor. The student works through a topic in a structured sequence of stages. At any point they can ask a question, slow down, or ask for an example — the tutor responds in context and then returns to the lesson.

---

## Layout

Four stacked regions, fixed height, no scroll on the outer shell:

1. **Top bar** — subject label, topic title, close button
2. **Progress rail** — horizontal strip of stage chips (Overview · Key Concepts · Deep Dive · Examples · Check Understanding), each showing completed / active / upcoming state
3. **Chat area** — scrollable message feed
4. **Input area** — quick-reply buttons + textarea composer + send button

---

## Lesson stages

Each stage is opened by the system with a stage-start badge and a teaching message. The AI advances stages when the student demonstrates understanding.

| Stage | Label | Purpose |
|---|---|---|
| `overview` | Overview | Big-picture framing of the topic |
| `concepts` | Key Concepts | Core rules, language, and structure |
| `detail` | Deep Dive | Step-by-step worked reasoning |
| `examples` | Examples | Concrete worked example with explanation |
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
| `question` | user | Dark right-aligned bubble |
| `response` | user | Dark right-aligned bubble |

---

## Tutor behaviour

The AI receives a structured system prompt containing:
- Student profile (name, grade, curriculum, country, term, year)
- Full lesson plan (overview, key concepts, detailed steps, example)
- Current stage and session history (capped at last 20 messages)
- Learner profile signals (learning style, struggle/excelled topics)

**Advance**: when the student clearly understands the current stage, the AI returns a brief 1–2 sentence acknowledgment with `action: advance`. The system inserts the next stage opening automatically — the AI never repeats stage content.

**Reteach**: when the student is confused, the AI returns `action: reteach` with a different angle (step-by-step / analogy / example).

**Side thread**: off-topic questions get `action: side_thread`. The AI answers within the topic context and returns to the lesson.

**Voice**: always addressed directly to the student by name using "you/your". Never "students will" or "learners should".

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

---

## Learner profile

Every AI response includes a `profile_update` block. After each exchange:
- Learning style signals are adjusted using EMA (not overwritten)
- Concepts struggled with / excelled at are updated (capped at 25 each)
- Session counters (questions asked, reteach events) are incremented

On app bootstrap, profile signals are reconstructed from the `lesson_signals` table using exponential decay weighting (14-day half-life) so recent sessions carry more weight.
