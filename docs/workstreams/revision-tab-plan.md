# Revision Tab Plan

## Purpose

This document is the working guide for rebuilding the revision tab into a real revision system rather than a lightweight recall screen.

The revision experience should help a student:

- know what to revise next
- prove what they actually remember without notes
- expose weak understanding quickly
- get targeted AI help instead of generic explanation
- leave every session with a sharper, more accurate next-step plan

This is not a separate product from the lesson system. It extends the lesson framework in [docs/lesson-plan.md](/Users/delon/Documents/code/projects/doceo/docs/lesson-plan.md), [docs/lesson-structure.md](/Users/delon/Documents/code/projects/doceo/docs/lesson-structure.md), [docs/what-makes-a-good-lesson.md](/Users/delon/Documents/code/projects/doceo/docs/what-makes-a-good-lesson.md), and the shared UI rules in [docs/desgin-langauge.md](/Users/delon/Documents/code/projects/doceo/docs/desgin-langauge.md).

---

## Primary User Goal

Help the student spend revision time on the highest-need topics, using retrieval-first assessment and targeted AI coaching, until weak areas become secure.

---

## Core Design Direction

The revision tab should feel different from lesson chat in one important way:

- lesson chat is for learning and guided explanation
- revision is for diagnosis, retrieval, calibration, and improvement

Lesson mode says: "Let me teach this to you."

Revision mode says: "Show me what still holds in memory, where the cracks are, and let’s fix those specific gaps."

That means the revision tab should be:

- more focused
- more exam-oriented
- more structured
- more measurable
- more loop-driven

It should not feel like a second generic chat window.

---

## What Revision Offers Over Lesson Chat

### Lesson chat

Lesson chat is best when the student is learning from scratch or needs guided progression through a topic. It is stage-based, explanation-heavy, and moves from orientation to understanding to practice.

### Revision

Revision should offer five things lesson chat does not:

1. Retrieval-first flow

The student must try to recall, explain, solve, or justify before AI help appears. Revision should default to testing memory and understanding, not re-teaching immediately.

2. Faster diagnosis

Revision should identify whether the student has:

- forgotten the idea completely
- remembered keywords but not meaning
- understood the concept but cannot apply it
- solved routine questions but fails on transfer
- become fluent enough to space the topic further out

3. Topic prioritization

Revision should decide what deserves attention now:

- overdue topics
- low-confidence topics
- topics with repeated failure patterns
- topics tied to a near exam
- recently learned topics that are about to decay

4. Meaningful progress tracking

Lesson completion is not enough for revision. Revision needs memory-quality tracking, not only session completion.

5. Dynamic revision programming

Revision should continuously reshape the student’s revision plan based on actual performance. The output is not just feedback on a single attempt. It is a better next sequence.

---

## Product Promise

If lesson mode is the structured tutor, revision mode is the adaptive revision coach.

By the end of a revision session, the student should know:

- what they got right
- what they only partly know
- what they got wrong
- why they got it wrong
- what they should revise next
- when they should see this topic again

---

## Revision Modes Inside The Tab

The tab should support four distinct but connected paths.

### 1. Do Today

The default queue. Show the best topics to revise now based on due date, weakness, exam relevance, and recent struggle.

Use when:

- the student wants direction immediately
- the student has overdue revision items
- the student does not know what to pick

Where it comes from:

- due revision topics
- topics at risk of being forgotten soon
- topics tied to the nearest exam
- topics the student struggled with recently

`Do Today` should not be a raw dump of every due item. It should be a ranked merge of those sources.

Recommended selection rule:

- due today or overdue
- weak and important
- near exam
- not already over-served recently

Recommended priority formula:

`priority = overdue + weakness + exam urgency + recent struggle - recently revised`

The system should only surface:

- 1 primary recommendation in the hero
- 3 to 6 additional queue items

This keeps the experience decisive rather than overwhelming.

### 2. Focus Weaknesses

A targeted queue for topics with poor recall, low application accuracy, repeated misconceptions, unstable confidence, or repeated breakdowns.

Use when:

- the student wants maximum impact
- the system detects repeated weak performance
- an exam is near and weak spots need compression

This should be generated from more than revision outcomes alone.

Weakness inputs should include:

- revision attempts with poor results
- low-confidence lesson completions
- repeated reteach events from lesson chat
- misconception tags from lessons and revision
- weak performance even after hints
- mismatch between self-confidence and actual score
- topics the student keeps avoiding
- topics that fail once the question moves into transfer

This produces a better weakness model. A topic is weak not only because it was answered badly once, but because the evidence says it is unstable.

### 3. Prepare For Exam

A guided revision program built around an exam date, subject, and time horizon.

Use when:

- the student has a clear exam target
- the student needs a weekly or daily revision program
- the system should rebalance between coverage and weakness repair

The student should be able to define the exam simply:

- subject
- exam name
- exam date
- optional included topics
- optional importance or weighting later

Topic selection should support three simple modes:

- `Use my weak topics`
- `Use the full subject scope`
- `Choose topics myself`

This keeps the flow easy for students who know the exam scope and still works for students who do not.

### 4. Choose Topic

A student-controlled way to revise any topic from completed lessons, curriculum topics, or recent lessons.

Use when:

- the student has a teacher-set topic
- the student wants confidence on one area
- the student feels anxious about a specific chapter

These are not separate products. They are different entry points into the same revision engine.

---

## Revision Tab Structure

The screen should answer three questions immediately:

1. What should I revise now?
2. Why is this the right thing to revise?
3. What kind of revision session am I about to do?

Recommended structure:

### Top hero

- one primary recommendation card: "Revise this now"
- current exam-aware context
- short rationale: overdue, weak, exam-critical, recently learned, or struggling this week
- one clear CTA: `Start revision`
- one secondary CTA: `Build my plan`

The hero should be as current as possible. It should know:

- the nearest exam
- days until that exam
- whether today’s best move is recall, weakness repair, or mixed exam prep
- whether the student appears on track or at risk

Example hero lines:

- `Math exam in 8 days. Fractions is still unstable. Revise this now.`
- `Natural Sciences exam tomorrow. Do one mixed recall set and one error-fix round.`
- `No exam coming up. Keep your revision streak alive with 2 due topics.`

The hero should not be a static banner. It is the system’s best current recommendation.

### Queue strip

- due today
- weak topics
- exam priority topics
- recently studied topics needing reinforcement

### Revision program panel

- upcoming exam or target
- number of due topics
- weakness summary
- estimated session load this week

### Build my plan flow

`Build my plan` should be one of the simplest flows in the app. This is not a dense planner form. It is the main way the system captures revision intent and stays current.

Recommended flow:

1. `What are you preparing for?`
2. `When is it?`
3. `What should we include?`
4. `How much time do you usually have?`
5. `Here’s your plan`

The output should immediately show:

- what to do today
- this week’s priorities
- what can safely wait
- which topics need rescue first
- how the plan will adapt after each session

This is a key trust-building surface. If it is simple and useful, the revision tab stays current because the student keeps feeding it real intent.

### Session workspace

Once a topic is selected, show a structured revision flow rather than free-form chat:

- prompt
- answer input
- quick self-rating
- AI marking and diagnosis
- next question or targeted teaching card
- session summary and next schedule

The session workspace needs persistent system memory and context. It should not behave like a blank assistant reacting only to the latest message.

Revision context should include:

- prior attempts on this topic
- what kinds of questions the student fails
- which explanations helped before
- confidence versus actual accuracy
- misconceptions already detected
- exam relevance of the topic
- whether this is a first revision, a rescue revisit, or a scheduled reinforcement round

The AI should feel like a friend who remembers your weak spots, a tutor who knows your history, and a coach who changes the session based on what already happened.

The session workspace should also support distinct session modes so the student can match revision to their time and energy:

- `Quick-Fire` for a 5-minute recall burst
- `Deep Revision` for topic-focused diagnosis and improvement
- `Shuffle Session` for interleaved mixed-topic retrieval
- `Teacher Mode` for explain-it-back mastery checks

There should also be an `I'm Stuck` safety valve that pivots from revision into a mini-lesson when frustration or repeated failure is too high.

On mobile, the queue should become a horizontal card row and the session workspace should remain dominant.

---

## How Revision Topic Selection Should Work

Topic selection should not be random and should not be based only on "last completed lesson".

Every candidate topic should receive a revision priority score.

### Candidate sources

- completed lesson sessions
- topics previously revised
- topics flagged by low lesson confidence
- topics tied to an exam plan
- topics manually pinned by the student
- topics with repeated reteach patterns
- topics with unresolved misconception tags

### Priority inputs

- `days_overdue`
- `current_memory_score`
- `application_score`
- `transfer_score`
- `misconception_count`
- `exam_relevance`
- `topic_weight`
- `recent_failure_streak`
- `time_since_last_retrieval`
- `time_since_last_full_lesson`
- `confidence_accuracy_gap`
- `avoidance_risk`

### Selection logic

Use a weighted priority model such as:

- overdue topics rise quickly
- low memory score rises quickly
- topics near exam date get a boost
- repeated failures get a strong boost
- topics recently mastered get deprioritized

### Student-visible reasons

Every recommendation should explain why it is being suggested:

- "Due today"
- "You were shaky on this last time"
- "This keeps showing up as a weak area"
- "Exam topic for next week"
- "Recently learned and ready for reinforcement"

This rationale matters. It builds trust in the queue.

---

## How We Deliver A Real Revision Program

The revision program should be generated from evidence, not just curriculum coverage.

### Inputs

- completed lessons
- revision history
- confidence and scoring trends
- misconception tags
- exam date
- nearest exam
- days until exam
- subject weighting
- student-selected goals
- student time budget

### Outputs

The program should answer:

- what to revise today
- what to revise this week
- what to leave alone for now
- which topics need re-teaching
- which topics are ready for exam drills

### Program layers

#### Daily layer

- 10 to 25 minute focused sessions
- 1 to 3 high-priority topics
- recall first, feedback second
- allow `Quick-Fire` when the student has only a few minutes

#### Weekly layer

- balance weak topics with spaced reinforcement
- prevent the student from only doing favorite topics
- rotate between recall, application, and exam-style work
- include interleaved `Shuffle Sessions` once a topic is no longer in rescue mode

#### Pre-exam compression layer

- tighten spacing
- increase mixed-topic retrieval
- increase transfer and exam-style prompts
- move quickly from diagnosis to rescue teaching to reassessment

### Program rules

- do not overload the student with too many topics in one day
- do not repeatedly show the same topic unless the evidence says it is unstable
- do not confuse "recently seen" with "well learned"
- do not let the student avoid hard topics forever
- do not let plan freshness depend on old exam data

### How the system gets exam information

For MVP, exam data should be entered manually by the student in a lightweight flow.

Best sources:

- `Build my plan`
- a simple `Upcoming exams` settings section
- an optional onboarding follow-up once subjects are selected

Possible later sources:

- teacher-entered exam schedules
- parent-entered exam schedules
- timetable import or sync

MVP exam fields:

- subject
- exam name
- exam date
- optional topic scope

This is enough to make the hero, `Do Today`, and the revision plan feel current without needing external integrations.

---

## Meaningful Revision Tracking

The current model tracks that a topic exists in the revision queue. That is not enough.

We need to track the quality of retention and the shape of the student’s understanding.

### Core topic-level metrics

For each revision topic, track:

- `memory_score`
- `explanation_score`
- `application_score`
- `transfer_score`
- `confidence_self_rating`
- `accuracy_trend`
- `retrieval_count`
- `successful_retrieval_count`
- `last_retrieved_at`
- `last_fully_correct_at`
- `next_due_at`
- `interval_days`
- `exam_relevance`
- `misconception_tags`
- `failure_patterns`
- `needs_reteach`
- `confidence_accuracy_gap`
- `retention_stability`
- `forgetting_velocity`

### Why these matter

- `memory_score` tells us whether the idea is still in memory without help
- `explanation_score` tells us whether the student understands it in words
- `application_score` tells us whether they can use it on a standard problem
- `transfer_score` tells us whether understanding survives variation
- `confidence_self_rating` helps detect false confidence and fragile knowledge
- `confidence_accuracy_gap` lets the system coach metacognition, not just correctness
- `retention_stability` tells us whether a good score is durable or fragile
- `forgetting_velocity` helps prioritize topics that slip quickly even after improvement

### Calibration gap and metacognitive coaching

The difference between perceived knowledge and actual knowledge is one of the most important signals in the system.

The revision engine should explicitly detect and coach this gap:

- high confidence plus weak explanation should trigger overconfidence coaching
- low confidence plus strong performance should trigger encouragement and reassurance
- repeated mismatch should influence topic priority and feedback tone

Example system messages:

- `You know more than you think here. Let's keep this topic in rotation, but it is stronger than it feels.`
- `You answered confidently, but the explanation is still shaky. Let's slow down and make the logic solid.`

This turns revision into a metacognitive coach rather than a generic quiz engine.

### Session-level tracking

Each revision session should record:

- topic
- question set used
- answer outcomes by question type
- time spent
- hints requested
- AI diagnosis
- misconceptions identified
- score before help
- score after help
- next due date
- whether the topic escalated into re-teach mode
- whether the student recovered after feedback
- whether the next recommendation changed because of this session
- pause or hesitation signals where available
- whether a nudge, hint, or mini-reteach was needed

### Dashboard-grade outputs

This tracking should power:

- due count
- strong topics
- unstable topics
- topics at risk before exam
- revision streak
- subject readiness
- estimated exam readiness per subject
- calibration patterns across subjects

### Friendly progress model

Revision should reward consistency over correctness.

High scores matter for diagnosis, but they should not be the main emotional surface of the product. Showing up consistently is what makes the revision system useful in real life.

Recommended progress surfaces:

- revision streak
- sessions completed this week
- `memory strength` growth over time
- recovery wins where a weak topic becomes stable

This reduces the anxiety of being wrong and makes it easier for students to come back even after a bad session.

---

## Revision Question Design

Revision questions should not all look the same.

A good revision engine should assess four layers:

1. Can the student recall it?
2. Can the student explain it?
3. Can the student apply it?
4. Can the student transfer it?

### Question ladder

Every revision session should draw from a ladder like this:

#### Level 1. Recall

- "What is..."
- "State the rule for..."
- "List the steps for..."
- "Define..."

Purpose:

- test memory access
- expose blank spots fast

#### Level 2. Explanation

- "Explain why..."
- "How would you describe this to a friend?"
- "Why does this method work?"

Purpose:

- distinguish memorized words from real understanding

#### Level 3. Standard application

- routine curriculum-aligned problem
- familiar pattern, not a trick

Purpose:

- test whether the student can use the concept, not just describe it

#### Level 4. Error spotting

- "What is wrong with this worked answer?"
- "Which step breaks the rule?"

Purpose:

- surface misconceptions efficiently
- check conceptual control

#### Level 5. Transfer

- slightly twisted context
- mixed-skill problem
- exam-style short structured response

Purpose:

- test whether the knowledge survives novelty

#### Level 6. Teacher mode

- "Explain this to a student who is completely lost."
- "What is the one trick or mistake they must watch for?"
- "Teach the method back in plain language."

Purpose:

- apply the Feynman technique
- test whether the student can organize the knowledge clearly enough to teach it
- expose fake fluency that collapses when explanation must be structured for someone else

### Question mix by topic state

Weak topic:

- more recall
- more explanation
- one simple application

Medium topic:

- mixed recall and standard application
- early transfer

Strong topic:

- minimal recall
- more transfer
- more exam-style mixed items
- more teacher-mode prompts

### Interleaving and shuffle sessions

Topic-focused revision is useful, but `Do Today` should not always serve one topic at a time.

Once a topic is no longer in rescue mode, the system should be able to generate `Shuffle Sessions` that mix subjects or subtopics in a single run.

Why this matters:

- interleaving prevents false fluency from repeated same-topic exposure
- the brain has to reload the right mental model each time
- this produces stronger long-term retention than blocked practice alone

Use interleaving when:

- the student has multiple medium or strong topics due
- an exam is approaching
- the goal is retrieval robustness rather than first-pass repair

Avoid interleaving when:

- the topic is still in rescue mode
- the student lacks the basic concept entirely
- the session goal is narrow misconception repair

### Scoring dimensions per response

Do not score only correct or incorrect.

Score each response on:

- factual correctness
- reasoning quality
- completeness
- method quality
- confidence alignment

This gives the AI something useful to reason over when deciding what help to give next.

---

## Revision Assessment Loop

Revision should be a loop, not a one-shot event.

The core loop:

1. Retrieve
2. Assess
3. Diagnose
4. Intervene
5. Recheck
6. Reschedule

### 1. Retrieve

Ask the student to answer without notes.

### 2. Assess

Mark the response against the topic expectations.

### 3. Diagnose

Classify what kind of gap exists:

- forgotten fact
- incomplete mental model
- procedure breakdown
- misconception
- low transfer ability
- careless execution
- false confidence

### 4. Intervene

Choose the smallest useful help:

- nudge only
- hint only
- worked step
- short explanation
- misconception correction
- mini reteach
- analogous example

### 5. Recheck

Ask another question that verifies whether the help actually worked.

### 6. Reschedule

Update the topic state and place it back into the revision program with a new due date and session type.

This is the heart of the product. Revision becomes intelligent only when the system closes the loop.

### Intervention order

The system should intervene with the smallest useful help first:

1. `Nudge`
2. `Hint`
3. `Worked step`
4. `Mini-reteach`
5. `Return to lesson`

`Nudge` should often be the first intervention. It keeps the system feeling supportive without taking away the retrieval effort.

Example:

- Hint: `The formula is F = ma.`
- Nudge: `Think about Newton's Second Law. What links force and acceleration?`

---

## AI Guidance Model

AI should not jump straight to long explanations during revision.

The intervention order should be:

1. ask for recall
2. mark the attempt
3. give the smallest useful feedback
4. ask for a new attempt
5. only then broaden into explanation if needed

To keep the experience fast and warm, the system should prepare likely interventions at session start for the current topic:

- likely misconception patterns
- likely nudges
- likely hints
- likely mini-reteach routes
- likely next-step questions

This is best treated as session preparation rather than visible "thinking time". The goal is a fluid experience under pressure.

### AI outputs should include

- score by dimension
- diagnosis type
- concise feedback
- misconception if detected
- next best intervention
- recommended next question type
- updated revision state

### Example diagnosis outputs

- "You remembered the formula name but not when to use it."
- "You can explain the rule, but your worked steps break at substitution."
- "You are accurate on routine examples but not on slightly changed contexts."
- "Your confidence is high, but the answer quality is still fragile."

### Feedback style

Feedback should be:

- short
- specific
- corrective
- actionable
- student-facing

It should also remain context-aware. If the student has already failed in the same way twice, feedback should not pretend this is the first attempt. The system should acknowledge the pattern and change strategy.

It should avoid:

- essay-length explanations by default
- generic praise
- repeating the question back
- explaining everything when one small intervention would do

---

## Dynamic Revision Program Logic

The revision program should evolve continuously.

### When a topic performs well

- increase interval
- reduce recall volume next time
- increase transfer difficulty later
- mark the topic as stable if performance is sustained

### When a topic performs poorly

- shorten interval
- bring it back soon
- shift toward recall and explanation
- attach misconception notes
- optionally recommend a return to lesson mode if the concept is not revision-ready

### When performance improves after feedback

- mark the topic as recoverable
- schedule a near-term follow-up to confirm retention without help

### When performance stays weak after help

- escalate:
- mini reteach inside revision
- recommend full lesson revisit
- widen the related-topic support set

This is the loop-driven behavior we want. Revision should always be steering toward where help is most needed, not just moving linearly through a checklist.

### Currentness rule

At any moment the system should be able to answer:

- what matters most today
- why it matters today
- what changed since the last session

If the system cannot answer those three questions, the revision experience will feel stale.

---

## Relationship Between Revision And Lesson Mode

Revision mode should sometimes hand off to lesson mode.

### Stay in revision when

- the student mainly needs retrieval practice
- the gap is narrow
- one misconception can be corrected quickly
- the student can recover with hints or a short explanation

### Escalate to lesson mode when

- the student lacks the underlying concept entirely
- the student repeatedly fails after targeted help
- the topic has never actually been learned well
- the student needs a full structured walkthrough

### Product rule

Revision should not pretend to fix everything. It should know when a topic needs re-learning rather than more testing.

---

## Proposed Data Model Expansion

Current `RevisionTopic` is too thin for the system we want.

Recommended additions:

```ts
interface RevisionTopicState {
  topicId: string;
  lessonSessionId: string | null;
  subjectId: string;
  topicTitle: string;
  curriculumReference: string;
  source: 'lesson_complete' | 'manual' | 'exam_plan' | 'weakness_detected';
  status: 'new' | 'active' | 'stable' | 'at_risk' | 'needs_reteach';
  memoryScore: number;
  explanationScore: number;
  applicationScore: number;
  transferScore: number;
  selfConfidenceScore: number;
  confidenceAccuracyGap: number;
  intervalDays: number;
  nextDueAt: string;
  lastRetrievedAt: string | null;
  lastReviewedAt: string | null;
  retrievalCount: number;
  successfulRetrievalCount: number;
  recentFailureStreak: number;
  examRelevance: number;
  retentionStability: number;
  forgettingVelocity: number;
  misconceptionTags: string[];
  failurePatterns: string[];
}

interface RevisionAttempt {
  id: string;
  revisionTopicId: string;
  questionType: 'recall' | 'explain' | 'apply' | 'spot_error' | 'transfer';
  prompt: string;
  studentAnswer: string;
  correctnessScore: number;
  reasoningScore: number;
  completenessScore: number;
  confidenceScore: number;
  diagnosis: string;
  interventionType: 'none' | 'hint' | 'worked_step' | 'mini_reteach' | 'lesson_refer';
  createdAt: string;
}
```

This is enough to support a real adaptive revision system.

---

## Recommended First Version

Do not try to build the final system in one pass.

### Phase 1. Strong MVP

Build:

- revision queue with recommendation reasons
- structured session flow: recall, mark, feedback, recheck
- topic state with interval, due date, memory score, application score
- AI diagnosis and targeted feedback
- simple plan view for daily and weekly revision
- confidence-versus-performance calibration tracking
- `Nudge` before `Hint`
- `Quick-Fire` mode
- `I'm Stuck` safety valve
- basic `Shuffle Session` support for medium and strong topics

Do not build yet:

- full exam forecasting
- complex predictive readiness scoring
- mixed-topic papers
- advanced analytics UI
- voice-to-text answers unless platform support is already cheap and reliable

### Phase 2. Adaptive Revision Program

Build:

- exam-based planning
- weakness clustering
- mixed-topic revision sets
- better transfer questions
- lesson escalation rules
- teacher-mode prompts
- richer calibration coaching
- optional voice-to-text answers for explanation questions

### Phase 3. Strong Intelligence Layer

Build:

- subject readiness estimates
- dynamic time budgeting
- false-confidence detection
- pattern-based misconception coaching
- richer parent or teacher reporting later if needed

---

## Implementation Blueprint

This section turns the product plan into a buildable MVP specification.

The first delivery should focus on one outcome:

- the student opens Revision, sees what matters now, starts a session, gets targeted help, and leaves with an updated plan

### MVP product slices

Build the revision tab in four slices:

1. revision home and current recommendation
2. revision topic state and prioritization
3. revision session engine
4. adaptive plan updates and tracking

Each slice should be shipped with RED/GREEN tests before moving to the next slice.

### Revision tab UI states

The revision tab should have explicit UI states rather than one generic workspace.

#### 1. Home state

Show:

- top hero with current recommendation
- `Do Today` queue
- `Focus Weaknesses` queue
- `Prepare For Exam` entry
- `Build my plan` CTA

Primary actions:

- `Start revision`
- `Build my plan`
- `Choose topic`

#### 2. Planner state

This is the lightweight `Build my plan` flow.

Steps:

1. what are you preparing for
2. when is it
3. what should we include
4. how much time do you usually have
5. generated plan

Output:

- nearest exam card
- today’s tasks
- this week’s tasks
- rescue topics
- optional topics to ignore for now

#### 3. Session state

This is the active revision workspace.

Show:

- topic title and recommendation reason
- session mode label
- progress through current question set
- answer area
- self-confidence input
- AI feedback
- next action

Primary actions:

- submit answer
- ask for nudge
- ask for hint
- `I'm Stuck`

#### 4. Session summary state

Show:

- what improved
- what is still weak
- updated due timing
- next recommended topic
- whether the topic stays in revision or moves to lesson revisit

#### 5. Empty state

When there is not enough revision data yet:

- explain that completed lessons create revision topics
- offer `Choose topic`
- offer `Build my plan`

### MVP component plan

The first pass can likely be built from these components:

- `RevisionHomeHero`
- `RevisionQueueStrip`
- `RevisionPlanCard`
- `RevisionPlannerFlow`
- `RevisionSessionCard`
- `RevisionFeedbackCard`
- `RevisionSummaryCard`

These should extend the existing shared card and button language rather than inventing a new visual system.

### Store and data model changes

The current `revisionTopics` model is too shallow for this workflow.

Recommended state additions:

- `revisionTopics: RevisionTopicState[]`
- `revisionAttempts: RevisionAttempt[]`
- `revisionPlans: RevisionPlan[]` or a richer single active plan state
- `upcomingExams: UpcomingExam[]`
- `revisionSession: ActiveRevisionSession | null`

Suggested new interfaces:

```ts
interface UpcomingExam {
  id: string;
  subjectId: string;
  subjectName: string;
  examName: string;
  examDate: string;
  topicIds?: string[];
  createdAt: string;
}

interface ActiveRevisionSession {
  id: string;
  revisionTopicId: string | null;
  mode: 'quick_fire' | 'deep_revision' | 'shuffle' | 'teacher_mode';
  source: 'do_today' | 'weakness' | 'exam_plan' | 'manual';
  questionIndex: number;
  questions: RevisionQuestion[];
  startedAt: string;
  lastActiveAt: string;
  recommendationReason: string;
  currentInterventionLevel: 'none' | 'nudge' | 'hint' | 'worked_step' | 'mini_reteach';
  selfConfidenceHistory: number[];
  status: 'active' | 'completed' | 'abandoned' | 'escalated_to_lesson';
}

interface RevisionQuestion {
  id: string;
  revisionTopicId: string;
  questionType: 'recall' | 'explain' | 'apply' | 'spot_error' | 'transfer' | 'teacher_mode';
  prompt: string;
  expectedSkills: string[];
  misconceptionTags: string[];
  difficulty: 'foundation' | 'core' | 'stretch';
}
```

### Store actions

The store will need dedicated revision actions rather than reusing lesson actions loosely.

Recommended actions:

- `createRevisionPlan(input)`
- `upsertUpcomingExam(input)`
- `rankRevisionTopics()`
- `startRevisionSession(input)`
- `submitRevisionAnswer(input)`
- `requestRevisionNudge()`
- `requestRevisionHint()`
- `markRevisionStuck()`
- `completeRevisionSession()`
- `rescheduleRevisionTopic()`
- `escalateRevisionToLesson()`

### Session engine contract

The revision session engine should be explicit and structured.

Input:

- topic state
- recent attempts
- session mode
- exam context
- current plan context
- learner profile

Output per turn:

```ts
interface RevisionTurnResult {
  scores: {
    correctness: number;
    reasoning: number;
    completeness: number;
    confidenceAlignment: number;
  };
  diagnosis: {
    type:
      | 'forgotten_fact'
      | 'weak_explanation'
      | 'procedure_break'
      | 'misconception'
      | 'transfer_failure'
      | 'false_confidence'
      | 'underconfidence';
    summary: string;
    misconceptionTags: string[];
  };
  intervention: {
    type: 'none' | 'nudge' | 'hint' | 'worked_step' | 'mini_reteach' | 'lesson_refer';
    content: string;
  };
  nextQuestion: RevisionQuestion | null;
  topicUpdate: {
    memoryScore: number;
    explanationScore: number;
    applicationScore: number;
    transferScore: number;
    confidenceAccuracyGap: number;
    retentionStability: number;
    forgettingVelocity: number;
    needsReteach: boolean;
  };
  sessionDecision: 'continue' | 'complete' | 'reschedule' | 'lesson_revisit';
}
```

Rules:

- retrieval first
- nudge before hint
- smallest useful intervention
- recheck after intervention
- update topic state after every turn
- escalate to lesson mode only when revision is no longer the right tool

### Ranking and recommendation contract

The ranking engine should be deterministic enough to test.

Inputs:

- overdue status
- weakness metrics
- exam urgency
- recent struggle
- recent revision load
- confidence gap
- forgetting velocity

Outputs:

- ordered `Do Today` list
- ordered `Focus Weaknesses` list
- primary hero recommendation
- plain-language reason for each recommendation

### RED/GREEN delivery plan

Follow RED/GREEN TDD for each slice.

#### Slice 1. Topic ranking and hero recommendation

RED:

- test that overdue weak exam-near topics outrank stable recent topics
- test that the hero picks only one primary recommendation
- test that each recommendation includes a human-readable reason

GREEN:

- implement ranking logic
- implement hero recommendation selector

#### Slice 2. Planner flow and exam capture

RED:

- test creating an exam updates active plan context
- test `Build my plan` produces today and weekly tasks
- test optional topic scope changes plan output

GREEN:

- implement planner state
- implement exam persistence
- implement plan generation

#### Slice 3. Revision session engine

RED:

- test answer submission records attempt and score dimensions
- test high confidence plus weak answer increases calibration gap
- test `requestRevisionNudge()` returns a nudge before a hint
- test repeated weak answers can escalate to mini-reteach or lesson revisit

GREEN:

- implement active revision session state
- implement scoring and diagnosis contract
- implement intervention ladder

#### Slice 4. Adaptive rescheduling

RED:

- test strong performance increases interval
- test fragile improvement keeps a topic near-term
- test fast-forgetting topics are prioritized more aggressively
- test weak topics return to `Do Today` sooner than stable topics

GREEN:

- implement reschedule logic
- implement retention stability and forgetting velocity updates

#### Slice 5. Home view integration

RED:

- test home state renders the right queues from store state
- test `Quick-Fire`, `Shuffle Session`, and `I'm Stuck` entry points route correctly

GREEN:

- implement home view and session entry wiring

### Suggested implementation order in code

1. extend types in `src/lib/types.ts`
2. add pure ranking and rescheduling helpers in `src/lib/data/platform.ts` or a dedicated revision domain module
3. add store actions in `src/lib/stores/app-state.ts`
4. add tests for ranking, planning, session decisions, and rescheduling
5. build revision UI components
6. wire revision route to the new home/session states

### Suggested file shape

Likely additions:

- `src/lib/revision/engine.ts`
- `src/lib/revision/ranking.ts`
- `src/lib/revision/planner.ts`
- `src/lib/revision/types.ts` if revision types become too large
- `src/lib/components/revision/*`

This keeps revision logic separate from lesson logic while still allowing shared learner and curriculum state.

---

## UX Principles For The Revision Session

- one obvious primary action at a time
- retrieve before reveal
- feedback before next question
- always explain why this topic is here
- always show whether the student is improving
- never trap the student in endless chat
- end each session with a clear outcome and next review point

The student should feel guided, not buried.

---

## Success Criteria

We should consider the revision tab successful when:

- the student can open the tab and immediately know what to revise
- the system can explain why that topic matters now
- revision sessions produce measurable topic-state updates
- weak topics come back faster and stable topics fade out appropriately
- AI feedback is targeted and short, not generic and overlong
- the revision plan changes based on evidence
- the tab feels clearly different from lesson chat

---

## Open Product Questions

- should revision topics map only to completed lessons, or also to curriculum topics not yet fully completed?
- should exam plans be subject-specific only, or multi-subject from the start?
- when should revision generate a full mini-lesson inside the tab versus forcing a lesson-mode handoff?
- how much self-rating should we trust relative to answer quality?
- do we want students to manually pin topics into the program even if the system would deprioritize them?

---

## Recommendation

The best path is to make revision a retrieval-and-diagnosis system, not a second teaching chat.

The key product loop should be:

- choose the most important topic
- test unaided recall and application
- diagnose the exact weakness
- give the smallest useful help
- retest quickly
- update the revision program
- bring the topic back at the right time

If we hold to that loop, the revision tab becomes one of the strongest parts of Doceo rather than a side screen.
