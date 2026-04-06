# Doceo System Overview

How lessons and revision work end-to-end, from topic discovery through lesson delivery to spaced-repetition revision.

---

## High-Level Architecture

```
                              +-----------------+
                              |   Dashboard     |
                              | (topic tiles,   |
                              |  discovery,     |
                              |  search)        |
                              +--------+--------+
                                       |
                         student picks a topic
                                       |
                              +--------v--------+
                              | Lesson Launch   |
                              | Service         |
                              | (server)        |
                              +--------+--------+
                                       |
                    +------------------+------------------+
                    |                                     |
           resolve graph node                    resolve lesson artifact
                    |                                     |
           +--------v--------+               +------------v-----------+
           | Curriculum Graph |               | Artifact Repository   |
           | (nodes, aliases, |               | (lesson + question    |
           |  trust scores,   |               |  artifacts, ratings,  |
           |  evidence)       |               |  admin preferences)   |
           +--------+--------+               +------------+-----------+
                    |                                     |
                    +------------------+------------------+
                                       |
                              preferred artifact exists?
                              /                        \
                           yes                          no
                            |                            |
                    reuse artifact               generate via AI
                            |                    (edge function)
                            |                            |
                            +------------+---------------+
                                         |
                              +----------v----------+
                              |   Lesson Session    |
                              |   (chat + stages)   |
                              +----------+----------+
                                         |
                               lesson completed
                                         |
                    +--------------------+--------------------+
                    |                    |                    |
           create revision       record artifact      update graph
           topic (3-day          feedback (rating      evidence +
           initial interval)     summary)              trust score
                    |
           +--------v--------+
           | Revision System |
           | (ranking,       |
           |  scheduling,    |
           |  spaced rep)    |
           +-----------------+
```

---

## 1. Topic Discovery

Before a lesson starts, students find topics via two paths:

### Path A: Curriculum Browse

The student selects a subject from their onboarded curriculum. The dashboard shows topics and subtopics from the **curriculum graph**. Each graph node has a type hierarchy:

```
country → curriculum → grade → subject → topic → subtopic
```

### Path B: AI-Assisted Discovery

The dashboard can also surface **model-generated topic suggestions** via the topic discovery pipeline.

**How it works:**

1. Dashboard requests `/api/curriculum/topic-discovery` with `subjectId + curriculumId + gradeId`
2. Server mixes **graph-backed topics** (existing nodes) with **model-generated candidates** (AI suggestions)
3. Results are ranked by `scoreTopicDiscoveryAggregate()` using:
   - Click count + unique clicks
   - Thumbs up / thumbs down
   - Lesson starts and completions
   - Recency decay (configurable half-life)
   - Exploration boost for low-sample topics
   - Reteach pressure as weak negative signal

**Topic signature format:** `subjectId::curriculumId::gradeId::normalizedTopicLabel`

**Event tracking:** Every interaction (click, thumbs up/down, lesson start/complete) is logged to `topic_discovery_events`. These events feed the ranking algorithm but stay separate from lesson quality feedback.

**Rollout guard:** Feature flag `DOCEO_ENABLE_DASHBOARD_TOPIC_DISCOVERY` can disable model-assisted discovery, falling back to graph-only results.

```
  Student sees dashboard
         |
         v
  +------+------+                +-----------------+
  | Graph-backed |  + merge +    | Model-generated |
  | topics       |  + rank  +    | candidates      |
  +------+------+                +-----------------+
         |
         v
  Ranked topic tiles
  (with thumbs up/down, freshness badges)
         |
    student taps tile
         |
         v
  Launch lesson
```

---

## 2. Lesson Generation

### 2.1 Lesson Launch Service

**File:** `src/lib/server/lesson-launch-service.ts`

When a student launches a lesson, the server-side `launchLesson()` function runs this pipeline:

```
 LessonPlanRequest
       |
       v
 1. Resolve graph node
    - Try request.nodeId → graphRepository.getNodeById()
    - Try request.topicId → graphRepository.getNodeById()
    - Try label match → graphRepository.findNodeByLabel(subtopic, then topic)
    - If nothing found → create provisional node (origin: 'learner_discovered', trust: 0.4)
       |
       v
 2. Record observation on node
    (source: 'lesson_launch', successfulResolution: true, reused: true)
       |
       v
 3. Look for preferred artifact
    - artifactRepository.getPreferredLessonArtifact(nodeId, scope)
    - Preference: admin-preferred > version-matched > highest quality score > most recent
       |
       +-- preferred artifact + questions found → REUSE (skip AI generation)
       |
       +-- no preferred artifact → GENERATE via AI
           |
           v
       4a. Call edge function (mode: 'lesson-plan', tier: 'thinking')
           Returns: Lesson (9 sections) + Questions
           |
           v
       4b. Store as new artifact
           - createLessonArtifact(status: 'ready')
           - createLessonQuestionArtifact(status: 'ready')
           |
           v
       Return lesson + questions + nodeId + artifactIds
```

### 2.2 Lesson Content: Seeded vs Dynamic

**Seeded lessons** come from pre-authored content in Supabase (`curriculum_lessons`).

**Dynamic lessons** are built at runtime by `buildDynamicLessonFromTopic()` when no seed lesson exists. Dynamic lessons use **subject-specific lens templates**:

| Lens field | Purpose |
|---|---|
| `conceptWord` | The type of core idea (e.g. "rule or algebraic relationship") |
| `actionWord` | What the student should do (e.g. "set up the equation and solve step by step") |
| `evidenceWord` | What a correct answer looks like |
| `example` | A concrete worked example |
| `misconception` | The most common error pattern |

Lens templates exist for: Mathematics (3 grade bands), Languages, Life Sciences, Physical Sciences, History, Geography, Accounting/Business, Technology/IT, Creative Arts, Social Sciences, and a generic fallback.

### 2.3 Lesson Structure (9 Sections)

Every lesson (seeded or dynamic) has 9 content sections:

```
+------------------+----------------------------------------------+
| Section          | Purpose                                      |
+------------------+----------------------------------------------+
| orientation      | Hook — why this topic matters                |
| mentalModel      | Big picture scaffold before rules            |
| concepts         | Core rules (max 3-5 ideas)                   |
| guidedConstruction | Step-by-step reasoning walkthrough          |
| workedExample    | Concrete solved example with every step      |
| practicePrompt   | Student attempts a similar problem            |
| commonMistakes   | Most common errors and how to fix them       |
| transferChallenge | Apply the idea in a different context        |
| summary          | 3-5 key takeaways                            |
+------------------+----------------------------------------------+
```

Each section is a `LessonSection { title: string; body: string }`.

Lessons also carry `keyConcepts: ConceptItem[]` — expandable cards shown during the concepts stage. Each card has: `name`, `summary`, `detail`, `example`.

---

## 3. Lesson Session Flow

### 3.1 Stage Pipeline

A lesson session progresses through 7 stages:

```
orientation → concepts → construction → examples → practice → check → complete
```

**File:** `src/lib/lesson-system.ts` — `LESSON_STAGE_ORDER`

### 3.2 Starting a Session

`buildLessonSessionFromTopic()` creates a `LessonSession` with:
- `currentStage: 'orientation'`
- `stagesCompleted: []`
- `confidenceScore: 0.5`
- Initial messages from `buildInitialLessonMessages(lesson, 'orientation')`

### 3.3 Chat Interaction

The lesson screen is a **chat interface**. The student converses with the AI tutor. Every AI response includes embedded metadata:

```
<!-- DOCEO_META
{
  "action": "advance|reteach|side_thread|complete|stay",
  "next_stage": "concepts|construction|...|null",
  "reteach_style": "analogy|example|step_by_step|visual|null",
  "reteach_count": 0,
  "confidence_assessment": 0.74,
  "profile_update": {
    "step_by_step": 0.8,
    "struggled_with": ["topic name"]
  }
}
DOCEO_META -->
```

The frontend calls `parseDoceoMeta()` to extract this, and `stripDoceoMeta()` to get the display text.

### 3.4 Stage Transitions

`applyLessonAssistantResponse()` processes each AI response:

```
               AI response received
                      |
                      v
              parse DOCEO_META
                      |
          +-----------+-----------+
          |           |           |
      action:     action:     action:
      advance     reteach     complete
          |           |           |
     mark current  increment   mark all
     stage done    reteachCount stages done
     move to       stay on     status →
     next_stage    same stage  'complete'
          |           |           |
          +-----------+-----------+
                      |
                      v
              updated LessonSession
```

**Stage content injection:** When advancing, `buildInitialLessonMessages()` injects the new stage's content:
- **concepts stage:** Prepends mentalModel framing, then concepts body, then concept cards (expandable panel)
- **check stage:** Shows practicePrompt as challenge, then commonMistakes as feedback
- **Other stages:** Shows the stage's lesson section + a closing prompt

### 3.5 Local Fallback

When AI is unavailable, `buildLocalLessonChatResponse()` handles responses deterministically:
- **Questions:** Topic-anchored replies using concept card content or lesson section content
- **Responses:** Advance / reteach / stay based on confusion keywords ("don't get", "confused", "stuck")
- **Check stage + no confusion:** Triggers `complete` with summary + transfer challenge

### 3.6 Learner Profile Updates

Every AI response includes a `profile_update` block. After each exchange:
- Learning style signals (7 dimensions) adjusted via EMA (alpha = 0.3)
- Concepts struggled with / excelled at updated (capped at 25 each)
- Session counters incremented

```
Learning style signals:
  analogies_preference  ──┐
  step_by_step          ──┤
  visual_learner        ──┤  Each: 0.0 → 1.0
  real_world_examples   ──┤  Updated: new = (1-α)·old + α·update
  abstract_thinking     ──┤  α = 0.3 (EMA)
  needs_repetition      ──┤
  quiz_performance      ──┘
```

---

## 4. Curriculum Graph

### 4.1 What It Is

The curriculum graph is a hierarchical knowledge graph that maps curriculum structure. Every piece of curriculum content is a **graph node** with a type, scope, trust score, and status.

**File:** `src/lib/server/graph-repository.ts`

### 4.2 Node Types and Hierarchy

```
country
  └── curriculum
        └── grade
              └── subject
                    └── topic
                          └── subtopic
```

### 4.3 Node Lifecycle

```
                    +------------------+
                    |   provisional    |  ← created by learner/model
                    |   (trust: 0.28)  |
                    +--------+---------+
                             |
              evidence accumulates
              (launches, completions,
               ratings, repeat use)
                             |
                    +--------v---------+
                    |    canonical     |  ← promoted (trust > threshold)
                    |   (trust: 0.5+) |
                    +--------+---------+
                             |
              if contradictions / duplicates
                             |
                    +--------v---------+
                    |  review_needed   |  ← flagged
                    |   (trust: 0.35) |
                    +--+--------+------+
                       |        |
                  admin merge   admin reject
                       |        |
               +-------v--+  +-v--------+
               |  merged   |  | rejected |
               +----------+  +----------+
```

### 4.4 Trust Score Calculation

Trust is computed from a base score plus evidence contributions minus penalties:

```
trust = base
      + successfulResolutionContribution   (min(count × 0.08, 0.24))
      + repeatUseContribution              (min(count × 0.06, 0.24))
      + artifactRatingContribution         ((avgRating - 3) / 2 × 0.24)
      + completionContribution             ((completionRate - 0.5) × 0.2)
      - contradictionPenalty               (min(rate × 0.48, 0.48))
      - duplicatePenalty                   (min(pressure × 0.4, 0.4))
      - adminPenalty                       (min(count × 0.05, 0.2))

Base scores by origin:
  imported:                    0.92
  admin_created:               0.55
  promoted_from_provisional:   0.52
  canonical (default):         0.50
  review_needed:               0.35
  provisional (default):       0.28
```

### 4.5 Node Resolution

When launching a lesson, the system resolves a topic label to a graph node:

```
1. findNodeByLabel(scope, type, label)
   → try exact match on normalizedLabel
   → try alias match
   → return: exact | normalized | alias | ambiguous | not_found

2. If not_found → createProvisionalNode()
   (origin: 'learner_discovered', trust: 0.4)
```

---

## 5. Lesson Artifacts and Rating

### 5.1 What Artifacts Are

An **artifact** is a stored, versioned lesson or question set tied to a graph node. Artifacts allow lesson reuse without regenerating from AI each time.

**File:** `src/lib/server/lesson-artifact-repository.ts`

### 5.2 Artifact Selection

When launching a lesson, the system picks the **preferred** artifact:

```
1. Admin-preferred artifact (adminPreference = 'preferred')     ← highest priority
2. Version-matched (matching pedagogyVersion + promptVersion)
3. Highest quality score
4. Most recently updated
```

Only artifacts with status `ready` are considered.

### 5.3 Rating and Quality Score

After a lesson completes, students can rate the lesson (usefulness, clarity, confidenceGain — each 1-5). Ratings feed into the artifact's quality summary:

```
feedbackScore = (usefulness + clarity + confidenceGain) / 3

qualityScore = meanScore × 0.7
             + completionRate × 5 × 0.2
             + max(0, 1 - reteachRate) × 5 × 0.1

Quality thresholds:
  MINIMUM_MEAN_SCORE:      2.8
  MAXIMUM_RETEACH_RATE:    0.65
  MINIMUM_COMPLETION_RATE: 0.55
```

### 5.4 Admin Artifact Actions

Admins can:
- **Prefer** an artifact (it becomes the top pick for that node)
- **Mark stale** (triggers regeneration on next launch)
- **Reject** (artifact is excluded from selection)
- **Force regenerate** (immediately triggers a new AI generation)

Each action logs an event in `lesson_artifact_events`.

### 5.5 Feedback → Graph Loop

Artifact ratings also feed back into the graph:

```
Lesson rated → recordNodeObservation(artifactRating: score)
            → trust recalculated
            → graph evidence updated
```

---

## 6. Revision System

### 6.1 How Revision Topics Are Created

When a lesson session completes, `buildRevisionTopicFromLesson()` creates a `RevisionTopic`:

```typescript
{
  lessonSessionId: session.id,
  nodeId: session.nodeId,
  confidenceScore: session.confidenceScore,
  previousIntervalDays: 3,           // initial interval
  nextRevisionAt: completedAt + 3 days,
  retentionStability: max(0.35, confidenceScore),
  forgettingVelocity: 0.55,
  misconceptionSignals: [],
  calibration: { attempts: 0, averageSelfConfidence: 3, ... }
}
```

### 6.2 Spaced Repetition Algorithm

**File:** `src/lib/revision/engine.ts`

When a student answers a revision question, `evaluateRevisionAnswer()` runs:

```
Student answer + self-confidence rating (1-5)
         |
         v
  1. Score the answer
     - correctness:  keyword coverage × 0.55 + completeness × 0.35 + example bonus
     - reasoning:    checks for causal words (because, therefore, step)
     - completeness: answer length / 120 (clamped 0-1)
     - calibrationGap: selfConfidence/5 - correctness
         |
         v
  2. Diagnose the gap
     - false_confidence:  correctness < 0.4 AND selfConfidence >= 4
     - underconfidence:   correctness >= 0.55 AND selfConfidence <= 2
     - forgotten_fact:    "don't know" / "idk" / answer < 10 chars
     - weak_explanation:  reasoning < 0.4
     - misconception:     default
         |
         v
  3. Choose intervention level
     none → nudge → hint → worked_step → mini_reteach → lesson_refer
     (escalates on each wrong attempt, resets on correctness >= 0.7)
         |
         v
  4. Update retention profile
     retentionStability = old × 0.68 + correctness × 0.24 + reasoning × 0.12
                        - overconfidence penalty (0.08 if gap > 0.2)
     
     forgettingVelocity = old × 0.72 + (1 - correctness) × 0.2
                        + long-interval decay penalty
                        + fragility boost if stability < 0.4
         |
         v
  5. Calculate next review date
     if correctness >= 0.75: interval = max(4, previous × 1.6)
     if correctness >= 0.50: interval = max(2, previous × 1.1)
     if correctness <  0.50: interval = 1 day
     
     Modified by fragility: interval × (0.72 + stability × 0.45 - velocity × 0.52)
         |
         v
  6. Session decision
     - lesson_revisit: intervention escalated to lesson_refer
     - continue:       correctness >= 0.6 (or reasoning + completeness strong)
     - reschedule:     too weak to advance
```

### 6.3 Revision Ranking

**File:** `src/lib/revision/ranking.ts`

`deriveRevisionHomeModel()` builds the revision dashboard by scoring every revision topic:

```
Priority score = sum of weighted cues:

  Overdue:           70 + clamp(daysOverdue, 1, 7) × 8
  Due today:         62
  Coming up (≤2d):   32 - daysUntilDue × 6
  Low confidence:    54 + (0.45 - score) × 50    (if < 0.45)
  Medium confidence: 28 + (0.65 - score) × 30    (if < 0.65)
  Exam proximity:    35 - daysToExam × 3  (+ 12 if topic is on exam plan)
  Calibration gap:   46 + gap × 18  (overconfidence)
                     20 + gap × 16  (underconfidence)
  Fragility:         40 + weighted retention/velocity signals
  Misconception:     26 + signalCount × 6
  Recent struggle:   18  (if reviewed ≤2d ago and confidence < 0.5)
  Never reviewed:    14

Penalty: -24 if reviewed yesterday and confidence >= 0.75
```

Output:
- **Hero recommendation:** The single highest-priority topic with heading/summary/CTA
- **Do Today:** Top 6 by priority
- **Focus Weaknesses:** Topics with confidence < 0.55 or calibration/fragility/misconception signals

### 6.4 Suggested Revision Mode

Based on topic signals, the system recommends a mode:

| Condition | Mode | Reason |
|---|---|---|
| Repeated misconception OR overconfidence | `teacher_mode` | "Explain it back to expose the gap" |
| Fragile (low stability/confidence, high velocity) | `deep_revision` | "Structured recall-and-recheck loop" |
| Stable (high confidence + stability, low velocity) | `quick_fire` | "Short recall check to keep it warm" |
| Default | `deep_revision` | "Full revision pass" |

### 6.5 Revision Session Generation

**File:** `src/lib/server/revision-generation-service.ts`

Similar to lesson launch, revision sessions go through the artifact system:

```
RevisionPackRequest (topics, mode, source)
         |
         v
  1. Resolve graph nodes for each topic
     (same resolution as lessons — find or create provisional)
         |
         v
  2. Record observations on each node
     (source: 'revision_launch')
         |
         v
  3. Look for preferred revision pack artifact
     (matched by node, scope, mode, topic signature)
         |
    +----+----+
    |         |
  found    not found
    |         |
  reuse    generate via AI
    |      + store as artifacts
    |         |
    +----+----+
         |
         v
  buildRevisionSession()
  → ActiveRevisionSession with questions, mode, and tracking state
```

### 6.6 Revision Session State Machine

```
  ActiveRevisionSession
    status: 'active'
    questionIndex: 0
         |
         v
  Student answers question
  + rates self-confidence (1-5)
         |
         v
  evaluateRevisionAnswer()
         |
    +-----+-----+-----+
    |           |           |
  continue   reschedule   lesson_revisit
    |           |           |
  advance to  repeat same  status →
  next Q      question     'escalated_to_lesson'
    |           |
    +-----+-----+
          |
    last question?
    /            \
  no              yes
   |               |
  active        completed
```

### 6.7 Help Ladder

Each revision question carries a `helpLadder` with escalating support:

```
nudge → hint → worked_step → mini_reteach → lesson_refer

Each level provides progressively more scaffolding:
  nudge:        Gentle pointer in the right direction
  hint:         Specific clue about the approach
  worked_step:  One step of the solution shown
  mini_reteach: Brief re-explanation of the concept
  lesson_refer: "Go back to the lesson for this topic"
```

---

## 7. AI Model Tiers

All AI calls go through a Supabase edge function that maps **modes** to **model tiers**:

```
Mode              Tier        Example Model
─────────────────────────────────────────────
subject-hints     fast        gpt-4.1-nano
topic-shortlist   fast        gpt-4.1-nano
lesson-selector   fast        gpt-4.1-nano
tutor             default     gpt-4o-mini
lesson-chat       default     gpt-4o-mini
lesson-plan       thinking    gpt-4.1-mini
```

The app never selects raw model IDs. It sends a `mode`, and the edge function resolves it.

---

## 8. State Persistence

```
  Client state (AppState)
         |
    +----+----+
    |         |
  localStorage   Supabase (normalized tables)
  (immediate)    (2500ms debounced)
         |
  On bootstrap:
    1. Resolve auth user ID from Authorization header
    2. Read from normalized tables (lesson_sessions, learner_profiles, revision_topics)
    3. Fall back to app_state_snapshots blob if tables empty
    4. Rebuild learner profile from lesson_signals (14-day exponential decay)
```

---

## 9. End-to-End Flow Example

```
Student opens Doceo
  → Dashboard loads with onboarded subjects
  → Topic discovery fetches suggestions (graph + AI mixed, ranked)

Student taps "Equivalent Fractions" tile
  → Lesson Launch Service:
      1. Resolve graph node (find or create provisional)
      2. Check for preferred artifact (admin-preferred > quality-scored)
      3. If none: generate lesson via AI (thinking tier) → store artifact
      4. Return Lesson + Questions

Lesson session starts
  → Stage: orientation (hook message)
  → Student chats with AI tutor
  → AI returns responses with DOCEO_META (action, profile_update)
  → advance → concepts (mentalModel + concepts + concept cards)
  → advance → construction → examples → practice → check
  → AI returns action: complete

Session completes
  → RevisionTopic created (initial interval: 3 days)
  → Student can rate lesson (usefulness, clarity, confidenceGain)
  → Rating feeds back: artifact quality score updated, graph trust recalculated

3 days later: revision is due
  → Ranking engine scores all revision topics
  → "Equivalent Fractions" appears in Do Today list
  → Suggested mode: deep_revision (fragile topic)

Student starts revision
  → Revision Generation Service resolves graph node + artifacts
  → Questions generated or reused from cached pack
  → Student answers, rates self-confidence
  → evaluateRevisionAnswer: scores, diagnoses, schedules next review
  → If strong: interval extends (previous × 1.6)
  → If weak: interval shrinks to 1 day + help ladder escalates

Over time:
  → Graph node accumulates evidence → trust rises → becomes canonical
  → Artifact quality improves via feedback → bad artifacts superseded
  → Learner profile adapts → AI tutor adjusts teaching style
  → Revision intervals widen as retention stabilizes
```
