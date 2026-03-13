# Doceo — Implementation Plan: Adaptive Learning Flow Restructure

## Document Purpose

This is a complete implementation spec for restructuring the Doceo student learning app. It covers sidebar navigation changes, dashboard redesign, a new topic shortlisting flow, a redesigned lesson screen with progress tracking and side-thread questions, the system prompt architecture for the teaching AI, and the learner profile adaptation model.

Hand this to Claude Code for implementation. Every section includes the what, why, and exact technical specification.

---

## Table of Contents

1. [Current State Summary](#1-current-state-summary)
2. [Sidebar Navigation Restructure](#2-sidebar-navigation-restructure)
3. [Dashboard Redesign](#3-dashboard-redesign)
4. [Topic Discovery Flow (New)](#4-topic-discovery-flow)
5. [Lesson Screen Redesign](#5-lesson-screen-redesign)
6. [System Prompt Architecture](#6-system-prompt-architecture)
7. [Learner Profile Model](#7-learner-profile-model)
8. [Data Models & State Management](#8-data-models--state-management)
9. [Revision Mode Integration](#9-revision-mode-integration)
10. [Implementation Order](#10-implementation-order)

---

## 1. Current State Summary

### What exists now

- **Onboarding flow**: Student selects country, curriculum (IEB/CAPS/Cambridge), and grade. This is stored in a learning profile.
- **Sidebar navigation** (7 items): Dashboard, Subjects, Current lesson, Revision, Ask Question, Progress, Settings.
- **Dashboard**: Shows a "Current lesson" banner at top with resume/revision buttons, a stats row (lessons completed, average mastery, active lessons), a "Start New" section (subject dropdown + free text input + "Find my section" button), and a "Recent Lessons" column.
- **Learning profile** (sidebar footer): Shows school context (year, term), recommended start subject.
- **Design language**: Light theme with mint/green (#4ADE80 or similar) as the primary accent. Card-based layout with rounded corners (approx 12-16px radius). Soft shadows. Clean sans-serif typography. Light/Dark mode toggle.

### What needs to change

The core learning flow needs a new intermediate step (topic shortlisting) between the student's free-text input and the lesson starting. The lesson view needs a progress rail and side-thread question system. The sidebar needs consolidation. The dashboard hierarchy needs to prioritise action over reflection. The system prompt and learner profile model need to be built to power adaptive teaching.

---

## 2. Sidebar Navigation Restructure

### Current (7 items)

```
Dashboard       — Choose what to do next
Subjects        — Roadmap and active topics
Current lesson  — Return to focused study
Revision        — Exam-focused practice
Ask Question    — Targeted help only
Progress        — Mastery and sessions
Settings        — Academic profile
```

### New (5 items)

```
Dashboard       — Home, start new, resume active lesson
Subjects        — Curriculum roadmap and topic browser
Revision        — Exam practice and spaced repetition
Progress        — Mastery tracking, session history, learning style summary
Settings        — Academic profile, preferences, learning profile view
```

### What was removed and why

- **"Current lesson"** — Absorbed into Dashboard. The dashboard's top banner already surfaces the active lesson with a resume button. Having a separate nav item for this is redundant. If a student has an active lesson, the Dashboard shows it prominently. If they don't, there's nothing to show.
- **"Ask Question"** — Absorbed into the Lesson screen. Questions should happen in-context during a lesson so the student doesn't lose their place. The side-thread system (detailed in section 5) replaces standalone question asking. If a student needs to ask a question outside of a lesson, they can start a new lesson or use the "Start New" flow on the dashboard — the AI can handle ad-hoc questions within the lesson framework.

### Implementation details

- Update the sidebar component to render 5 items instead of 7.
- The active state styling (mint green background) stays the same.
- The learning profile footer at the bottom of the sidebar stays as-is (school context, year, term).
- On mobile, if using a bottom tab bar or hamburger menu, the same 5 items apply.

---

## 3. Dashboard Redesign

### Layout hierarchy change

The current layout is:
```
[Current lesson banner]
[Stats row: lessons completed | avg mastery | active lessons]
[Start New section] [Recent Lessons column]
```

The new layout should be:
```
[Primary Action Area — context-dependent]
[Start New flow OR Recent Lessons — context-dependent]
[Stats strip — compact]
```

### Primary Action Area (top of dashboard)

This area is context-dependent based on session state:

**State A — Student has an active lesson (most common return visit):**
```
┌─────────────────────────────────────────────────────────┐
│  CONTINUE WHERE YOU LEFT OFF                            │
│                                                         │
│  English Home Language                                  │
│  Understanding and expressing ideas                     │
│  Main idea and clear sentences                          │
│                                                         │
│  Progress: ████████░░░░ Stage 3 of 5 — Deep Dive       │
│  Last opened: 2 hours ago                               │
│                                                         │
│  [ ████████ Resume Lesson ████████ ]  (full-width,      │
│                                        mint green,      │
│                                        primary CTA)     │
│                                                         │
│  Start something new instead →          (text link,     │
│                                          secondary)     │
└─────────────────────────────────────────────────────────┘
```

Key changes:
- The resume button is full-width and visually dominant (mint green filled button).
- Show the lesson progress (which stage they were on) so they have context.
- "Start something new" is a subtle text link, not a competing button.
- Remove the "Revision" button from this banner — revision is its own nav section.

**State B — No active lesson (fresh session or completed last lesson):**
```
┌─────────────────────────────────────────────────────────┐
│  START NEW                                              │
│                                                         │
│  Choose what to learn                                   │
│  Tell the assistant what you want to work on and it     │
│  will match that to your curriculum.                    │
│                                                         │
│  SUBJECT                                                │
│  [ English Home Language          ▾ ]                   │
│                                                         │
│  WHAT DO YOU WANT TO WORK ON?                           │
│  [ e.g. essay introductions, poetry analysis...     ]   │
│                                                         │
│  [ ████████ Find my section ████████ ]                  │
└─────────────────────────────────────────────────────────┘
```

This is essentially the current "Start New" section but promoted to the primary position. The "Find my section" button triggers the new Topic Shortlisting flow (see section 4).

### Recent Lessons section

Positioned below the primary action area, full-width. Shows a scrollable list/grid of recent lesson cards.

Each card:
```
┌───────────────────────────────────────┐
│  3/12/2026                            │
│  English Home Language                │
│  Understanding and expressing ideas   │
│  Stage completed: 4 of 5             │
│                                       │
│  [ ██ Resume ██ ]        [ ⋮ ]       │
│   (mint green,         (overflow menu: │
│    primary)             Archive,       │
│                         View notes,    │
│                         Restart)       │
└───────────────────────────────────────┘
```

Key changes from current:
- "Resume" is the dominant button; "Archive" moves to an overflow/three-dot menu.
- Show stage progress (e.g., "Stage 4 of 5") not just the topic name.
- Cards are arranged in a horizontal scroll on mobile or 2-column grid on desktop.

### Stats strip

Move the three stats (lessons completed, average mastery, active lessons) to a compact horizontal strip below recent lessons. Not removed — just deprioritised. These are reflective/motivational, not actionable.

```
┌──────────────┬──────────────┬──────────────┐
│  0/1         │  0%          │  2           │
│  Completed   │  Mastery     │  Active      │
└──────────────┴──────────────┴──────────────┘
```

Smaller type, muted colours, compact height. Consider also adding these to the Progress page where they have more context alongside trends and history.

### "Assistant Stage" indicator

The current "Ready to map your idea" indicator with the robot illustration on the right side of Start New is a nice touch. Keep it but make it dynamic:
- Default: "Ready to map your idea"
- After "Find my section" clicked: "Finding curriculum matches..." (with loading animation)
- When shortlist is shown: "Pick your topic to begin"
- When lesson starts: "Teaching in progress"

---

## 4. Topic Discovery Flow

This is the **new intermediate step** between the student typing their topic and the lesson starting. It's the most important change in this spec.

### Flow sequence

```
Step 1: Student selects subject from dropdown (existing)
Step 2: Student types what they want to work on (existing)
Step 3: Student clicks "Find my section" (existing)
Step 4: ✨ NEW — AI returns 4-6 curriculum-aligned subtopics
Step 5: ✨ NEW — Student selects one
Step 6: Lesson begins with the selected topic anchored
```

### Step 4 — Topic shortlisting (new)

When the student clicks "Find my section", make an API call to the LLM with the following:

**System prompt for topic mapping call:**
```
You are a curriculum mapping assistant for South African school students.

Student context:
- Country: {country}
- Curriculum: {curriculum} (IEB, CAPS, or Cambridge)
- Grade: {grade}
- Subject: {subject}
- Current term: {term}
- Year: {year}

The student wants to study: "{student_input}"

Your task:
1. Map the student's input to the official {curriculum} {grade} {subject} syllabus.
2. Return 4-6 specific subtopics that match their input.
3. Each subtopic must correspond to an actual section/topic in the prescribed curriculum.
4. Order them by relevance to the student's input (best match first).

Respond ONLY in this JSON format, no other text:
{
  "matched_section": "The broad curriculum section this falls under",
  "subtopics": [
    {
      "id": "unique_id",
      "title": "Exact curriculum topic name",
      "description": "One sentence explaining what this covers",
      "curriculum_reference": "e.g. CAPS Term 1, Topic 3.2",
      "relevance": "Why this matches what the student typed"
    }
  ]
}
```

### Step 4 — UI for the shortlist

After the API returns, replace the "Start New" card content (or show a modal/slide-up panel) with the shortlist:

```
┌─────────────────────────────────────────────────────────┐
│  CURRICULUM MATCHES                                     │
│  Found in: Understanding and expressing ideas           │
│  CAPS · Grade 5 · English Home Language · Term 3        │
│                                                         │
│  Select the topic you want to learn:                    │
│                                                         │
│  ┌─ 01 ──────────────────────────────────────────────┐  │
│  │  Main idea and clear sentences                    │  │
│  │  Identifying and constructing main ideas in       │  │
│  │  paragraphs with supporting detail                │  │
│  │  CAPS Term 3, Section 2.1                         │  │
│  └───────────────────────────────────────────────────┘  │
│                                                         │
│  ┌─ 02 ──────────────────────────────────────────────┐  │
│  │  Paragraph structure and linking                  │  │
│  │  Topic sentences, supporting sentences, and       │  │
│  │  concluding sentences                             │  │
│  │  CAPS Term 3, Section 2.2                         │  │
│  └───────────────────────────────────────────────────┘  │
│                                                         │
│  ┌─ 03 ──────────────────────────────────────────────┐  │
│  │  ...                                              │  │
│  └───────────────────────────────────────────────────┘  │
│                                                         │
│  ← Search for something else                            │
└─────────────────────────────────────────────────────────┘
```

Design details:
- Each topic card is tappable/clickable. On hover/tap, show a mint green left border or highlight.
- Include the curriculum reference (e.g., "CAPS Term 3, Section 2.1") in muted text — this builds trust that the AI is following the actual syllabus.
- Number them (01, 02, 03...) for scannability.
- Include a "Search for something else" link at the bottom that returns to the text input.
- The "Assistant Stage" indicator updates to "Pick your topic to begin."

### Step 5 — Topic selection

When the student taps a topic, two things happen:

1. A new `lesson` record is created in the database/state with the selected topic metadata (title, curriculum reference, subject, etc.)
2. The app navigates to the Lesson screen (section 5) and immediately begins the lesson.

The transition should feel seamless — consider a brief loading state ("Setting up your lesson...") while the first teaching message is being generated.

---

## 5. Lesson Screen Redesign

This is the core learning experience. The current "Current lesson" page needs to be rebuilt with these components:

### Layout structure

```
┌─────────────────────────────────────────────────────────┐
│  TOP BAR                                                │
│  [✕ Close]  Subject · Topic Title          [⚙] [📊]    │
├─────────────────────────────────────────────────────────┤
│  PROGRESS RAIL                                          │
│  ◎ Overview → ◈ Key Concepts → ◉ Deep Dive →           │
│  ◇ Examples → △ Check Understanding                     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  CHAT / TEACHING AREA (scrollable)                      │
│                                                         │
│  ┌─ Stage badge ─────────────────────┐                  │
│  │  ◎ Starting: Overview             │                  │
│  └───────────────────────────────────┘                  │
│                                                         │
│  ┌─ AI teaching bubble ─────────────────────────────┐   │
│  │  Let's start with the big picture...             │   │
│  │  [teaching content in markdown]                  │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─ AI check bubble (different style) ──────────────┐   │
│  │  Does this make sense? Would you like me to      │   │
│  │  explain anything differently?                   │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│               ┌─ Student response bubble ──────────┐    │
│               │  Yes that makes sense              │    │
│               └────────────────────────────────────┘    │
│                                                         │
│  ┌─ AI feedback bubble ─────────────────────────────┐   │
│  │  Good. Let's build on that.                      │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─ Stage badge ─────────────────────┐                  │
│  │  ◈ Moving to: Key Concepts        │                  │
│  └───────────────────────────────────┘                  │
│                                                         │
│  ... continues ...                                      │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  INPUT AREA                                             │
│  [Reply to continue · Ask a question anytime]           │
│  [ Type your response...                    ] [ ↑ ]     │
└─────────────────────────────────────────────────────────┘
```

### Component: Top Bar

- **Close button (✕)**: Returns to dashboard. If lesson is in progress, show a confirmation: "Your progress is saved. You can resume anytime."
- **Subject and topic title**: Truncate with ellipsis if too long. Show subject in muted small text above the topic title.
- **Action buttons (⚙ 📊)**: Optional/dev-only. These open the system prompt viewer and learner profile viewer respectively. Could be hidden in production or placed in a "debug" mode for development. In production, these are not needed — but during development they are extremely useful for tuning the AI behaviour.

### Component: Progress Rail

A horizontal bar showing the 5 lesson stages. Fixed/sticky below the top bar — always visible as the student scrolls through the chat.

**5 stages:**

| Stage | Key | Label | Icon | Purpose |
|-------|-----|-------|------|---------|
| 1 | `overview` | Overview | ◎ | High-level, 2-3 sentence summary of the topic. "Here's the big picture." |
| 2 | `concepts` | Key Concepts | ◈ | Break down the 2-4 core concepts the student needs to understand. |
| 3 | `detail` | Deep Dive | ◉ | Detailed explanation with worked-through reasoning. Where the real learning happens. |
| 4 | `examples` | Examples | ◇ | Curriculum-relevant examples, exam-style scenarios, South African context. |
| 5 | `check` | Check Understanding | △ | 2-3 targeted questions to verify comprehension. Mini-quiz. |

**Visual states for each stage dot:**
- **Upcoming**: Grey border, grey icon, muted label
- **Active**: Mint green border, dark icon, bold label, subtle pulse/glow animation
- **Completed**: Mint green filled background, white checkmark, label stays visible

**Connecting lines** between dots:
- Upcoming: Light grey
- Completed: Mint green

**Technical note**: The progress rail state is derived from the `lesson.currentStage` value in state. When the AI advances the lesson (see section 6), update this value and the rail re-renders.

### Component: Chat/Teaching Area

A scrollable area containing message bubbles. There are several distinct bubble types:

**1. Stage start badge** (centred, not a bubble)
```css
/* Centred pill showing stage transition */
background: #f0ede6 (or equivalent in your light theme);
border-radius: 100px;
padding: 6px 16px;
font-size: 13px;
font-weight: 600;
color: #666;
display: inline-flex;
align-items: center;
gap: 8px;
/* Centre it in the chat flow */
align-self: center;
```

**2. AI teaching bubble** (left-aligned)
```css
/* Main teaching content */
max-width: 88%;
padding: 14px 18px;
border-radius: 18px 18px 18px 4px;
background: white;
border: 1px solid #e8e6e1;
line-height: 1.6;
font-size: 14px;
/* Render markdown: bold, italic, line breaks, bullet points */
```

**3. AI comprehension check bubble** (left-aligned, different style)
```css
/* Soft pause — distinct from teaching */
max-width: 88%;
padding: 14px 18px;
border-radius: 18px 18px 18px 4px;
background: #f8f5ee; /* warm tinted background */
border: 1.5px solid #e8dcc8;
line-height: 1.6;
font-size: 14px;
```

**4. Student response bubble** (right-aligned)
```css
/* Normal student messages */
max-width: 80%;
padding: 12px 18px;
border-radius: 18px 18px 4px 18px;
background: #1a1a1a; /* or your dark colour */
color: white;
line-height: 1.5;
font-size: 14px;
```

**5. Student question bubble** (right-aligned, distinct)
```css
/* When the student asks a question */
max-width: 80%;
padding: 12px 18px;
border-radius: 18px 18px 4px 18px;
background: #2d2520; /* slightly different dark shade */
color: white;
line-height: 1.5;
/* Add a tag at the top */
```
Include a small tag inside: "❓ Question" in muted white, above the message text.

**6. AI side-thread response bubble** (left-aligned, distinct)
```css
/* Answer to a student question — visually distinct from lesson flow */
max-width: 88%;
padding: 14px 18px;
border-radius: 18px 18px 18px 4px;
background: #f0f7ff; /* light blue tint */
border: 1.5px solid #cce0ff;
line-height: 1.6;
font-size: 14px;
```
Include a tag at the top: "↳ Side Thread" in blue, bold, small text.

**CRITICAL**: The side-thread response must ALWAYS end with a "back to lesson" recap. The AI is instructed to do this in the system prompt (section 6), and the UI should render the "───" separator and "↩ Back to where we were" line as visually distinct (slightly bolder, or with the ↩ icon highlighted).

**7. AI feedback bubble** (left-aligned, brief)
Same styling as teaching bubble but content is always short (1-2 sentences of acknowledgement before moving to the next stage).

### Component: Input Area

Fixed at the bottom of the screen.

- **Hint text** above the input: "Reply to continue · Ask a question anytime" — helps the student understand both interaction modes.
- **Text input**: Full width minus the send button. Placeholder: "Type your response or ask a question..."
- **Send button**: Square, mint green or dark, with an up-arrow icon (↑).
- On submit, the input clears and the student's message appears as a bubble in the chat area.

### Message classification logic

When the student sends a message, classify it before sending to the AI:

```javascript
function classifyMessage(text) {
  const lower = text.toLowerCase().trim();
  const isQuestion =
    text.includes("?") ||
    lower.startsWith("what") ||
    lower.startsWith("why") ||
    lower.startsWith("how") ||
    lower.startsWith("can you") ||
    lower.startsWith("could you") ||
    lower.startsWith("explain") ||
    lower.startsWith("i don't understand") ||
    lower.startsWith("i dont understand") ||
    lower.startsWith("what do you mean") ||
    lower.startsWith("tell me more about");

  return isQuestion ? "question" : "response";
}
```

This classification is sent to the AI in the user message wrapper so the system prompt can handle it differently (see section 6).

### Stage advancement logic

The AI does NOT auto-advance stages. Instead:

1. AI teaches the current stage content.
2. AI asks a comprehension check.
3. Student responds.
4. The student's response is sent to the AI with context `[STAGE: {current_stage}, TYPE: response]`.
5. The AI evaluates whether the student understood. It responds with either:
   - A **feedback + advance** signal (student got it → move to next stage), or
   - A **reteach** signal (student didn't get it → try different explanation approach).
6. The app parses the AI's structured output to determine whether to advance `currentStage` or stay.

**How to detect stage advancement from AI output:**

Include in the system prompt instructions for the AI to emit a JSON metadata block at the end of each response (hidden from the student, parsed by the app):

```json
<!-- DOCEO_META
{
  "action": "advance" | "reteach" | "side_thread" | "complete",
  "next_stage": "concepts" | "detail" | "examples" | "check" | null,
  "reteach_style": "analogy" | "example" | "step_by_step" | "visual" | null,
  "reteach_count": 0,
  "confidence_assessment": 0.0-1.0,
  "profile_update": {
    "signal_name": "adjusted_value",
    ...
  }
}
DOCEO_META -->
```

The app strips this from the displayed message and uses it to update state. More detail on this in section 6.

### Side-thread question handling

When a student asks a question mid-lesson:

1. Their message is rendered with the "❓ Question" tag.
2. The message is sent to the AI with context `[STAGE: {current_stage}, TYPE: question]`.
3. The system prompt instructs the AI to:
   - Answer the question within the scope of the current topic.
   - NOT advance the stage.
   - End with a lesson-resume statement: "Back to where we were — [recap] — let's continue..."
   - Emit `"action": "side_thread"` in the metadata.
4. The response is rendered with the blue side-thread styling.
5. `currentStage` does NOT change.
6. The next student message resumes normal lesson flow.

### Lesson persistence

Every lesson should be saved to the database/state store with the following fields so it can be resumed:

```typescript
interface Lesson {
  id: string;
  studentId: string;
  subject: string;
  topicTitle: string;
  topicDescription: string;
  curriculumReference: string;
  currentStage: "overview" | "concepts" | "detail" | "examples" | "check" | "complete";
  stagesCompleted: string[];
  messages: Message[];        // Full chat history
  questionCount: number;
  reteachCount: number;
  startedAt: string;          // ISO timestamp
  lastActiveAt: string;       // ISO timestamp
  status: "active" | "complete" | "archived";
  profileUpdates: object[];   // Array of profile_update objects from AI responses
}

interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  type: "teaching" | "check" | "response" | "question" | "side_thread" | "feedback" | "stage_start";
  content: string;
  stage: string;              // Which stage this message belongs to
  timestamp: string;
  metadata?: object;          // Parsed DOCEO_META if present
}
```

When the student resumes a lesson, reload the full message history and restore `currentStage` from the saved state. The progress rail renders from `stagesCompleted`. The AI receives the full conversation history so it has context.

---

## 6. System Prompt Architecture

This is the system prompt sent with EVERY API call during a lesson. It is assembled dynamically from the student's profile, session state, and learner profile.

### Full system prompt template

```
You are Doceo, an adaptive tutor for South African school students. You teach one specific topic at a time, following the student's curriculum exactly.

═══════════════════════════════════════════════════
STUDENT CONTEXT
═══════════════════════════════════════════════════
Name: {student_name}
Country: {country}
Curriculum: {curriculum}
Grade: {grade}
Subject: {subject}
Term: {term}
Year: {year}

═══════════════════════════════════════════════════
CURRENT LESSON
═══════════════════════════════════════════════════
Topic: {topic_title}
Description: {topic_description}
Curriculum Reference: {curriculum_reference}

═══════════════════════════════════════════════════
LEARNER PROFILE
═══════════════════════════════════════════════════
{learner_profile_json}

(See section 7 for the full learner profile schema and how each signal is used.)

═══════════════════════════════════════════════════
SESSION STATE
═══════════════════════════════════════════════════
Current Stage: {current_stage} ({current_stage_number} of 5)
Stages Completed: {completed_stages_list}
Questions Asked This Session: {question_count}
Reteach Attempts on Current Concept: {reteach_count}
Last Message Type: {last_message_type}

═══════════════════════════════════════════════════
LESSON STAGES
═══════════════════════════════════════════════════
You must teach through these 5 stages IN ORDER. Never skip a stage. Never go backwards unless the student explicitly asks to revisit.

Stage 1 — OVERVIEW
  Purpose: Give the student a high-level understanding in 2-3 sentences.
  Approach: Plain language, no jargon yet. "Here's the big picture."
  Length: Short. 3-5 sentences maximum.
  End with: A soft check — "Does this make sense so far?"

Stage 2 — KEY CONCEPTS
  Purpose: Identify and explain the 2-4 core concepts within this topic.
  Approach: Name each concept, give a 1-2 sentence explanation.
  Use the learner's preferred explanation style (see ADAPTIVE DELIVERY below).
  Length: Medium. One short paragraph per concept.
  End with: A check — "Can you see how these connect?" or "Which of these would you like me to explain more?"

Stage 3 — DEEP DIVE
  Purpose: Detailed explanation with worked-through reasoning.
  Approach: Walk through the most important concept step-by-step.
  Include real-world examples relevant to the student's context.
  Use the student's curriculum terminology.
  Length: Longer. This is the main teaching moment.
  End with: A thought exercise or "what would happen if..." question.

Stage 4 — EXAMPLES
  Purpose: Apply the concept to curriculum-relevant scenarios.
  Approach: Use exam-style examples from {curriculum} {grade} {subject}.
  Walk through at least one worked example step-by-step.
  Include an "exam tip" where relevant.
  Length: Medium-long.
  End with: Ask the student to explain the example back in their own words.

Stage 5 — CHECK UNDERSTANDING
  Purpose: Verify the student actually understood, not just followed along.
  Approach: Ask 2-3 targeted questions of increasing difficulty:
    - Q1: Recall/definition (easy)
    - Q2: Application (medium)
    - Q3: Analysis/evaluation (hard)
  Wait for the student's answers. Give specific feedback on each.
  End with: A summary of what they've learned and a recommendation for what to study next.

═══════════════════════════════════════════════════
ADAPTIVE DELIVERY RULES
═══════════════════════════════════════════════════
Adjust your teaching style based on the learner profile values:

- analogies_preference > 0.6 → Lead explanations with analogies and metaphors. Compare abstract concepts to everyday things.
- analogies_preference < 0.4 → Use direct, technical explanations. Skip analogies unless the student is struggling.

- step_by_step > 0.7 → Always break explanations into numbered steps. Use "First... Second... Third..." structure.
- step_by_step < 0.4 → Use flowing paragraph explanations. The student handles dense text well.

- visual_learner > 0.5 → Use spatial language: "picture this", "imagine a graph where...", "on the left side... on the right side...". Describe diagrams verbally. Suggest the student draw things out.
- visual_learner < 0.3 → Verbal/textual explanations are fine.

- real_world_examples > 0.7 → Always use South African context: local brands (Shoprite, Vodacom, Mr Price), SA current events, rand-denominated prices, local geography, SA sports, etc.
- real_world_examples < 0.4 → Generic or textbook examples are fine.

- abstract_thinking < 0.5 → NEVER start with theory or definitions. Start with a concrete example, then extract the rule from it. "Look at this situation... see what's happening? That's called [concept]."
- abstract_thinking > 0.7 → Theory-first is fine. "The principle states that... Let me show you why."

- needs_repetition > 0.6 → At the start of each new stage, briefly recap the previous stage's key point (1 sentence). After teaching a concept, restate it in different words.
- needs_repetition < 0.3 → No repetition needed. Move briskly.

═══════════════════════════════════════════════════
QUESTION HANDLING (CRITICAL — SIDE THREADS)
═══════════════════════════════════════════════════
When the student's message is tagged as [TYPE: question]:

1. Answer the question thoroughly but concisely.
2. Keep your answer within the scope of the current topic ({topic_title}). If the question is about something unrelated, briefly acknowledge it and redirect: "That's a great question but it's part of [other topic]. Let's focus on [current topic] for now and you can explore that one next."
3. After answering, ALWAYS resume the lesson explicitly:
   "───\n\n↩ **Back to where we were** — we were looking at [brief recap of last teaching point]. Let's continue..."
4. NEVER advance to the next stage during a question response. Stay on {current_stage}.
5. In your DOCEO_META output, set "action": "side_thread".

═══════════════════════════════════════════════════
RETEACH PROTOCOL
═══════════════════════════════════════════════════
If the student indicates they don't understand (says "I don't get it", "confused", "can you explain again", answers incorrectly, etc.):

1. Try a DIFFERENT explanation approach. Rotate through these styles in order:
   Attempt 1: Analogy (relate to something familiar)
   Attempt 2: Concrete example (specific numbers, specific scenario)
   Attempt 3: Step-by-step breakdown (number every tiny step)
   Attempt 4: Visual/spatial description ("imagine you're looking at...")

2. After each reteach attempt, check understanding again.

3. If the student still doesn't understand after 3 reteach attempts:
   - Acknowledge that this is a tricky concept.
   - Provide a simplified "good enough for now" summary.
   - Suggest they ask their teacher for additional help on this specific point.
   - Move on to the next stage — don't get stuck in a loop.
   - In DOCEO_META, flag: "needs_teacher_review": true, "stuck_concept": "..."

═══════════════════════════════════════════════════
RESPONSE FORMAT
═══════════════════════════════════════════════════
Every response must follow this structure:

1. Your teaching/response content (this is displayed to the student).
   - Use markdown formatting: **bold** for key terms, line breaks for readability.
   - Keep paragraphs short (3-4 sentences max).
   - Use South African English spelling (colour, favourite, analyse, etc.) if curriculum is CAPS or IEB.

2. A hidden metadata block (stripped by the app, never shown to the student):

<!-- DOCEO_META
{
  "action": "advance" | "reteach" | "side_thread" | "complete",
  "next_stage": "overview" | "concepts" | "detail" | "examples" | "check" | null,
  "reteach_style": "analogy" | "example" | "step_by_step" | "visual" | null,
  "reteach_count": {number},
  "confidence_assessment": {0.0 to 1.0 — your estimate of how well the student understood},
  "needs_teacher_review": false,
  "stuck_concept": null,
  "profile_update": {
    "analogies_preference": {null or adjusted value if you observed a signal},
    "step_by_step": {null or adjusted value},
    "visual_learner": {null or adjusted value},
    "real_world_examples": {null or adjusted value},
    "abstract_thinking": {null or adjusted value},
    "needs_repetition": {null or adjusted value},
    "quiz_performance": {null or adjusted value},
    "engagement_level": "high" | "medium" | "low" | null,
    "struggled_with": [],
    "excelled_at": []
  }
}
DOCEO_META -->

IMPORTANT: Only include values in profile_update for signals you actually observed in this interaction. Set unobserved signals to null. The app merges non-null values using exponential moving average.

═══════════════════════════════════════════════════
CURRICULUM INTEGRITY
═══════════════════════════════════════════════════
- ONLY teach content that is within {curriculum} {grade} {subject} scope.
- Use terminology from prescribed textbooks for this curriculum.
- If the student asks about content outside this scope, acknowledge it but redirect to the current topic.
- For CAPS: Follow CAPS document structure and learning outcomes.
- For IEB: Align with IEB assessment standards and past paper patterns.
- For Cambridge: Follow Cambridge IGCSE/AS/A-Level syllabus points.

═══════════════════════════════════════════════════
TONE AND PERSONALITY
═══════════════════════════════════════════════════
- Warm, encouraging, patient.
- Use the student's name occasionally.
- Celebrate when they get things right: "Nice!", "Well reasoned.", "Exactly."
- When they struggle: "No worries, let me try explaining it differently."
- Never condescending. Never say "It's simple" or "Obviously."
- Match the energy of a really good private tutor — knowledgeable but approachable.
- Keep it concise. Students lose focus with walls of text. Use line breaks generously.
```

### How to assemble the prompt per request

```javascript
function buildSystemPrompt(student, lesson, learnerProfile) {
  let prompt = SYSTEM_PROMPT_TEMPLATE;

  // Replace student context
  prompt = prompt.replace("{student_name}", student.name);
  prompt = prompt.replace("{country}", student.country);
  prompt = prompt.replace("{curriculum}", student.curriculum);
  prompt = prompt.replace("{grade}", student.grade);
  prompt = prompt.replace("{subject}", lesson.subject);
  prompt = prompt.replace("{term}", student.currentTerm);
  prompt = prompt.replace("{year}", student.currentYear);

  // Replace lesson context
  prompt = prompt.replaceAll("{topic_title}", lesson.topicTitle);
  prompt = prompt.replace("{topic_description}", lesson.topicDescription);
  prompt = prompt.replace("{curriculum_reference}", lesson.curriculumReference);

  // Replace session state
  prompt = prompt.replace("{current_stage}", lesson.currentStage);
  prompt = prompt.replace("{current_stage_number}", getStageNumber(lesson.currentStage));
  prompt = prompt.replace("{completed_stages_list}", lesson.stagesCompleted.join(", ") || "none");
  prompt = prompt.replace("{question_count}", lesson.questionCount);
  prompt = prompt.replace("{reteach_count}", lesson.reteachCount);
  prompt = prompt.replace("{last_message_type}", getLastMessageType(lesson.messages));

  // Replace learner profile
  prompt = prompt.replace("{learner_profile_json}", JSON.stringify(learnerProfile, null, 2));

  return prompt;
}
```

### API call structure

```javascript
async function sendLessonMessage(userMessage, messageType, lesson, student, learnerProfile) {
  const systemPrompt = buildSystemPrompt(student, lesson, learnerProfile);

  // Build conversation history from lesson messages
  const conversationHistory = lesson.messages.map(msg => ({
    role: msg.role === "assistant" ? "assistant" : "user",
    content: msg.role === "system"
      ? `[SYSTEM: ${msg.content}]`
      : msg.content
  })).filter(msg => msg.role === "user" || msg.role === "assistant");

  // Add current message with type tag
  conversationHistory.push({
    role: "user",
    content: `[STAGE: ${lesson.currentStage}, TYPE: ${messageType}]\n\n${userMessage}`
  });

  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "your-model-id",
      system: systemPrompt,
      messages: conversationHistory,
      max_tokens: 2000,
    })
  });

  const data = await response.json();
  const rawContent = data.content[0].text;

  // Parse out metadata
  const metaMatch = rawContent.match(/<!-- DOCEO_META\n([\s\S]*?)\nDOCEO_META -->/);
  const metadata = metaMatch ? JSON.parse(metaMatch[1]) : null;
  const displayContent = rawContent.replace(/<!-- DOCEO_META\n[\s\S]*?\nDOCEO_META -->/, "").trim();

  return { displayContent, metadata };
}
```

### Processing the AI response

```javascript
function processAIResponse(displayContent, metadata, lesson, learnerProfile) {
  // 1. Add AI message to lesson
  const messageType = metadata?.action === "side_thread"
    ? "side_thread"
    : metadata?.action === "reteach"
      ? "teaching"
      : "teaching";

  lesson.messages.push({
    id: generateId(),
    role: "assistant",
    type: messageType,
    content: displayContent,
    stage: lesson.currentStage,
    timestamp: new Date().toISOString(),
    metadata: metadata,
  });

  // 2. Handle stage advancement
  if (metadata?.action === "advance" && metadata?.next_stage) {
    lesson.stagesCompleted.push(lesson.currentStage);
    lesson.currentStage = metadata.next_stage;
    lesson.reteachCount = 0;

    // Add a stage-start system message
    lesson.messages.push({
      id: generateId(),
      role: "system",
      type: "stage_start",
      content: `Moving to: ${getStageName(metadata.next_stage)}`,
      stage: metadata.next_stage,
      timestamp: new Date().toISOString(),
    });
  }

  // 3. Handle reteach
  if (metadata?.action === "reteach") {
    lesson.reteachCount += 1;
  }

  // 4. Handle lesson complete
  if (metadata?.action === "complete") {
    lesson.stagesCompleted.push(lesson.currentStage);
    lesson.currentStage = "complete";
    lesson.status = "complete";
  }

  // 5. Update learner profile (exponential moving average)
  if (metadata?.profile_update) {
    updateLearnerProfile(learnerProfile, metadata.profile_update);
  }

  // 6. Save lesson state
  saveLessonToDatabase(lesson);
  saveLearnerProfile(learnerProfile);

  return lesson;
}
```

---

## 7. Learner Profile Model

### Schema

```typescript
interface LearnerProfile {
  studentId: string;

  // Learning style signals (all 0.0 to 1.0)
  analogies_preference: number;     // Default: 0.5
  step_by_step: number;             // Default: 0.5
  visual_learner: number;           // Default: 0.5
  real_world_examples: number;      // Default: 0.5
  abstract_thinking: number;        // Default: 0.5
  needs_repetition: number;         // Default: 0.5
  quiz_performance: number;         // Default: 0.5

  // Aggregate tracking
  total_sessions: number;
  total_questions_asked: number;
  total_reteach_events: number;
  concepts_struggled_with: string[];    // Accumulated across sessions
  concepts_excelled_at: string[];       // Accumulated across sessions
  subjects_studied: string[];

  // Timestamps
  created_at: string;
  last_updated_at: string;
}
```

### Default profile (new student)

All signals start at 0.5 (neutral). The AI begins with a balanced teaching style and adjusts based on observed interactions. After about 5 sessions, the profile starts to meaningfully differentiate. After about 15 sessions, it's well-calibrated.

```javascript
function createDefaultLearnerProfile(studentId) {
  return {
    studentId,
    analogies_preference: 0.5,
    step_by_step: 0.5,
    visual_learner: 0.5,
    real_world_examples: 0.5,
    abstract_thinking: 0.5,
    needs_repetition: 0.5,
    quiz_performance: 0.5,
    total_sessions: 0,
    total_questions_asked: 0,
    total_reteach_events: 0,
    concepts_struggled_with: [],
    concepts_excelled_at: [],
    subjects_studied: [],
    created_at: new Date().toISOString(),
    last_updated_at: new Date().toISOString(),
  };
}
```

### Update mechanism — Exponential Moving Average

When the AI returns a `profile_update` in its metadata, merge each non-null signal using EMA:

```javascript
function updateLearnerProfile(profile, update) {
  const ALPHA = 0.3; // Weight for new observation (0.3 new, 0.7 old)

  const signals = [
    "analogies_preference", "step_by_step", "visual_learner",
    "real_world_examples", "abstract_thinking", "needs_repetition",
    "quiz_performance"
  ];

  for (const signal of signals) {
    if (update[signal] !== null && update[signal] !== undefined) {
      const oldValue = profile[signal];
      const newObservation = update[signal];
      profile[signal] = (1 - ALPHA) * oldValue + ALPHA * newObservation;
      // Clamp to 0-1
      profile[signal] = Math.max(0, Math.min(1, profile[signal]));
    }
  }

  // Accumulate lists
  if (update.struggled_with?.length) {
    profile.concepts_struggled_with = [
      ...new Set([...profile.concepts_struggled_with, ...update.struggled_with])
    ];
  }
  if (update.excelled_at?.length) {
    profile.concepts_excelled_at = [
      ...new Set([...profile.concepts_excelled_at, ...update.excelled_at])
    ];
  }

  profile.last_updated_at = new Date().toISOString();
}
```

### Why EMA and why 0.3/0.7?

The 0.7 weight on the old value prevents a single bad session (student was tired, distracted, testing the system) from overwriting a well-established profile. The 0.3 weight on new observations means it takes roughly 5-7 consistent signals in the same direction to meaningfully move a value. This feels right for learning style detection — you need a few data points before you're confident someone is a "visual learner" vs having one off day.

If you want faster adaptation (e.g., for a demo), change ALPHA to 0.5. For production with younger students (who might be inconsistent), 0.2-0.3 is safer.

### How each signal is detected by the AI

This doesn't need to be coded — it's handled by the AI's judgement based on the system prompt. But here's what the AI looks for so you can evaluate whether it's working:

| Signal | Increases when... | Decreases when... |
|--------|-------------------|-------------------|
| analogies_preference | Student responds positively to analogies ("oh that makes sense!", "good example") | Student asks for more technical/direct explanation after an analogy |
| step_by_step | Student engages better with numbered breakdowns; asks "can you break that down?" | Student skims through steps; responds well to paragraph explanations |
| visual_learner | Student asks for diagrams/graphs; responds to spatial language; says "can you show me?" | Student doesn't reference visual descriptions; prefers text |
| real_world_examples | Student engages more with SA-specific or concrete examples | Student is fine with abstract/textbook examples |
| abstract_thinking | Student correctly applies theory to new situations; handles "why" questions well | Student needs concrete examples before understanding rules |
| needs_repetition | Student frequently needs concepts restated; misses things from earlier in the lesson | Student retains and references earlier content accurately |
| quiz_performance | Student answers check-understanding questions correctly | Student struggles with comprehension check questions |

### Surfacing the profile to the student

In the **Settings** page or **Progress** page, show a human-readable summary:

```
YOUR LEARNING STYLE

Based on 12 sessions, here's how you learn best:

✦ You respond really well to real-world South African examples (92%)
✦ Step-by-step breakdowns work best for you (85%)
✦ You prefer analogies when learning new concepts (70%)
✦ You benefit from brief recaps when starting new sections (55%)

Areas you've mastered:
  ✓ Market equilibrium, Supply curves, Essay structure

Areas to revisit:
  ⚠ Elasticity of demand, Graph interpretation
```

This is derived directly from the learner profile signal values. Do NOT show the raw 0-1 numbers to the student — convert to natural language.

---

## 8. Data Models & State Management

### Core entities

```typescript
// Student (set during onboarding, stored persistently)
interface Student {
  id: string;
  name: string;
  country: string;
  curriculum: "IEB" | "CAPS" | "Cambridge";
  grade: string;                 // "Grade 5", "Grade 11", etc.
  currentTerm: string;           // "Term 1", "Term 2", etc.
  currentYear: number;
  subjects: string[];            // Subjects they study
  createdAt: string;
  theme: "light" | "dark";
}

// Lesson (created per topic, persisted)
interface Lesson {
  id: string;
  studentId: string;
  subject: string;
  topicTitle: string;
  topicDescription: string;
  curriculumReference: string;
  matchedSection: string;        // Broad section from topic mapping
  currentStage: string;
  stagesCompleted: string[];
  messages: Message[];
  questionCount: number;
  reteachCount: number;
  startedAt: string;
  lastActiveAt: string;
  status: "active" | "complete" | "archived";
}

// Message (stored within a Lesson)
interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  type: "teaching" | "check" | "response" | "question" | "side_thread" | "feedback" | "stage_start";
  content: string;
  stage: string;
  timestamp: string;
  metadata?: DoceoMeta;
}

// Learner Profile (one per student, evolves over time)
interface LearnerProfile {
  studentId: string;
  analogies_preference: number;
  step_by_step: number;
  visual_learner: number;
  real_world_examples: number;
  abstract_thinking: number;
  needs_repetition: number;
  quiz_performance: number;
  total_sessions: number;
  total_questions_asked: number;
  total_reteach_events: number;
  concepts_struggled_with: string[];
  concepts_excelled_at: string[];
  subjects_studied: string[];
  created_at: string;
  last_updated_at: string;
}

// DOCEO_META (parsed from AI response, not stored directly)
interface DoceoMeta {
  action: "advance" | "reteach" | "side_thread" | "complete";
  next_stage: string | null;
  reteach_style: string | null;
  reteach_count: number;
  confidence_assessment: number;
  needs_teacher_review?: boolean;
  stuck_concept?: string;
  profile_update: Partial<LearnerProfileSignals>;
}
```

---

## 9. Revision Mode Integration

Revision remains a separate nav section but connects to the lesson system.

### When a topic becomes available for revision

Once a lesson reaches `status: "complete"` (all 5 stages done), that topic is automatically added to the student's revision pool.

### Revision system prompt differences

The revision mode uses a DIFFERENT system prompt focused on retrieval practice:

```
You are Doceo in REVISION MODE. The student has already learned this topic.
Your goal is NOT to teach — it's to test recall and deepen understanding.

Topic: {topic_title}
Previous lesson confidence: {confidence_from_lesson}
Days since last studied: {days_since}

REVISION PROTOCOL:
1. Start with a recall prompt: "Without looking at notes, tell me what you remember about {topic_title}."
2. Based on their response, identify gaps.
3. Ask 3-5 exam-style questions, increasing in difficulty.
4. For each question, provide marking-memo-style feedback: what they got right, what was missing, and the model answer.
5. End with a revised confidence score and spacing recommendation (when to revise again).

Use {curriculum} exam terminology and question styles. Reference past paper formats where possible.
```

### Spaced repetition scheduling

After each revision session, calculate the next revision date based on performance:

```javascript
function calculateNextRevision(confidenceScore, previousInterval) {
  // Simple spaced repetition: higher confidence = longer interval
  if (confidenceScore >= 0.9) return previousInterval * 2.5;   // Excellent — push out far
  if (confidenceScore >= 0.7) return previousInterval * 2.0;   // Good — double the interval
  if (confidenceScore >= 0.5) return previousInterval * 1.3;   // Okay — slight increase
  if (confidenceScore >= 0.3) return Math.max(1, previousInterval * 0.7); // Struggling — review sooner
  return 1; // Very low — review tomorrow
}
```

Default first interval: 3 days after lesson completion.

---

## 10. Implementation Order

Recommended sequence for building this. Each phase is independently deployable.

### Phase 1: Sidebar + Dashboard restructure (smallest scope, immediate UX improvement)

1. Reduce sidebar from 7 to 5 items (remove "Current lesson" and "Ask Question").
2. Restructure dashboard layout: primary action area (context-dependent), recent lessons below, stats strip at bottom.
3. Update recent lesson cards: make "Resume" primary, move "Archive" to overflow menu.
4. Add stage progress info to the dashboard's active lesson banner (e.g., "Stage 3 of 5 — Deep Dive").

### Phase 2: Topic shortlisting flow (new feature, high impact)

1. Build the topic mapping API call (system prompt for curriculum matching).
2. Build the shortlist UI panel/modal (shows 4-6 curriculum-aligned topics after "Find my section").
3. Wire it up: "Find my section" → loading state → shortlist → topic selection → lesson creation.
4. Update the "Assistant Stage" indicator to reflect the flow states.

### Phase 3: Lesson screen redesign (core experience)

1. Build the progress rail component (5 stages, 3 visual states).
2. Build the chat area with all 7 bubble types (teaching, check, response, question, side-thread, feedback, stage-start).
3. Implement message classification (question vs response).
4. Build the input area with hint text.
5. Implement the DOCEO_META parsing from AI responses.
6. Implement stage advancement logic (parse metadata → update currentStage → re-render progress rail).
7. Implement side-thread handling (question detected → blue bubble → no stage advance → resume).
8. Implement reteach logic (confusion detected → different explanation style → max 3 attempts → flag for teacher).
9. Implement lesson persistence (save/resume with full message history).

### Phase 4: System prompt + Learner profile (adaptive intelligence)

1. Implement the full system prompt template with dynamic field injection.
2. Implement the `buildSystemPrompt()` function.
3. Create the LearnerProfile data model and default profile.
4. Implement the EMA update function for profile signals.
5. Wire up profile updates: AI response → parse metadata → update profile → save.
6. Add learner profile summary view to Settings or Progress page.
7. Test adaptive behaviour: create a test student, run 5-10 sessions, verify the AI's teaching style noticeably changes as the profile develops.

### Phase 5: Revision mode integration

1. Auto-add completed topics to revision pool.
2. Build the revision-specific system prompt.
3. Implement spaced repetition scheduling.
4. Build the revision session UI (can reuse lesson chat UI with different header/styling to distinguish "revision" from "learning").

---

## Appendix: Design Token Reference

Based on the existing Doceo design language observed in the screenshot:

```
Primary accent:        Mint green (#4ADE80 or similar — verify from codebase)
Background:            Light warm (#FAFAF8 or similar)
Card background:       White (#FFFFFF)
Card border:           Soft grey (#E5E5E0 or similar)
Card border-radius:    12-16px
Text primary:          Near-black (#1A1A1A)
Text secondary:        Mid-grey (#777777)
Text muted:            Light grey (#AAAAAA)
Active nav item:       Mint green background with dark text
Inactive nav item:     White background with grey text
Button primary:        Mint green fill, white or dark text
Button secondary:      Outlined, grey border
Font:                  System sans-serif (verify from codebase)
Shadows:               Subtle, cards only (0 1px 3px rgba(0,0,0,0.08) or similar)
```

Verify all tokens against the actual codebase before implementing — the above are approximations from the screenshot.