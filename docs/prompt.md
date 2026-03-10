# AI-Assisted Learning Platform
## Codex Development Prompt / Project Specification

## Project Overview

Build an **AI-assisted learning platform for school students (Grade 1-12 initially)** that provides structured, curriculum-aligned education using large language models.

The system should function as:

1. **A full teaching platform** for students learning subjects from scratch
2. **A revision assistant** for students preparing for tests and exams
3. **A guided problem-solving tutor** for students asking targeted questions

The platform must provide **structured, step-by-step teaching**, adaptive testing, and mastery-based progression.

The AI must **never behave like a free-form chatbot**. It must behave like a **structured teacher following a curriculum**.

---

## Core Design Philosophy

The system must follow these learning principles.

### Structured Learning

Learning must follow a defined curriculum hierarchy:

- Country
- Curriculum
- Grade
- Subject
- Topic
- Subtopic
- Lesson
- Exercise

### Mastery-Based Progression

Students only progress if they demonstrate understanding.

Learning flow:

1. Overview explanation
2. Deeper explanation
3. Guided example
4. Practice questions
5. Mastery check

If mastery fails:

- AI must reteach
- Provide hints
- Provide an alternate explanation

---

## Technology Stack

### Frontend

- **SvelteKit**
- **Svelte 5 runes**
- TypeScript
- Tailwind CSS

### Backend

- Node.js
- Supabase

### Database

- Supabase Postgres

### Authentication

- Supabase Auth

### AI

- OpenAI API

### Hosting

- Vercel or similar

---

## Core Product Features

### 1. User Accounts

Users must be able to:

- Sign up
- Log in
- Track learning progress
- Resume sessions

User roles:

- Student
- Parent (future)
- Teacher (future)
- Admin

#### Tasks

- [x] Implement Supabase authentication
- [x] Create user profile table
- [x] Store learning progress
- [x] Track sessions

### 2. Curriculum System

Curriculum must be configurable.

Initial support:

- South Africa
- IEB
- CAPS

Structure:

- Curriculum
- Grades
- Subjects
- Topics
- Subtopics

#### Tasks

- [x] Create curriculum database tables
- [x] Build curriculum importer
- [x] Support multiple countries
- [x] Allow curriculum updates

### 3. Learning Modes

The platform must support **three learning modes**.

#### Mode 1: Learn From Scratch

Student selects:

- country
- grade
- subject

System generates structured lessons.

Flow:

1. Topic introduction
2. Concept explanation
3. Worked examples
4. Practice
5. Mastery check

#### Tasks

- [x] Build lesson generator
- [x] Build explanation engine
- [x] Implement mastery checks

#### Mode 2: Exam Revision

Student provides:

- exam subject
- exam date
- topics

System creates an **accelerated revision path**.

Flow:

1. Quick summary
2. Key concepts
3. Practice problems
4. Exam-style questions
5. Weakness detection

#### Tasks

- [x] Build revision mode
- [x] Add quick summaries
- [x] Generate exam questions
- [x] Identify weak topics

#### Mode 3: Ask Question

Student submits:

- question
- topic
- subject
- grade
- current attempt or working

This mode is for:

- homework help
- clarification on a concept
- being stuck on a specific step
- checking whether a method is correct

AI must:

1. Identify what the student is asking
2. Detect whether this is a concept question or a solve-this-problem request
3. Start from the student's current level
4. Guide the student one step at a time
5. Avoid giving the final answer too early
6. Use Socratic teaching where appropriate
7. Confirm understanding before moving on

Response flow:

1. Restate the problem simply
2. Identify the missing concept or blocked step
3. Give one small hint or one targeted explanation
4. Ask the student to attempt the next step
5. Only reveal more once the student responds or is clearly stuck

Rules:

- Do not dump the full solution immediately unless the student explicitly asks for the full worked answer after guidance has been attempted
- Prefer hints, leading questions, and partial worked steps
- If the student shares working, respond directly to that working instead of restarting from scratch
- If the question is ambiguous, ask a clarifying question before solving
- If the student has a misconception, correct it clearly and explain why it is wrong
- Keep explanations age-appropriate for the selected grade

Suggested output structure:

- `problem_type`: `concept | procedural | word_problem | proof | revision`
- `student_goal`: what the student appears to need
- `diagnosis`: likely misunderstanding or blocked step
- `response_stage`: `clarify | hint | guided_step | worked_example | final_explanation`
- `teacher_response`: what the AI says to the student
- `check_for_understanding`: short follow-up question

#### Tasks

- [x] Build ask-question workflow
- [x] Add stuck detection
- [x] Add hint ladder
- [x] Prevent answer dumping
- [x] Store student attempts and follow-up turns

---

## AI Teaching Engine

The AI must follow strict behavior rules.

- The AI is **not a chatbot**
- The AI is a **structured teacher**

Each lesson must follow:

1. Overview
2. Deeper explanation
3. Example
4. Practice
5. Mastery test

If a student fails mastery:

1. Re-explain
2. Give a new example
3. Retry the exercise

---

## Prompt Structure

Each AI call must include:

- subject
- grade
- curriculum
- learning mode
- topic
- lesson stage
- student progress
- difficulty level
- recent student messages
- prior hints or explanations already given

The prompt should also define:

- whether the AI should teach, quiz, revise, or guide
- whether the AI may reveal the final answer
- the expected response format
- the success condition for the current turn

Example system instruction:

```text
You are an expert school teacher inside a structured learning platform.

Teach step-by-step and stay within the student's grade level.

Never jump ahead or behave like a general chatbot.

When the student asks for help, guide them with the smallest useful next step first.

Always verify understanding before moving forward.

If the student is stuck after guided help, you may provide a concise worked solution and explain the reasoning.
```

Example ask-question instruction:

```text
The student is in ask-question mode.

Your job is to help them make progress, not just output the answer.

First diagnose what they know, what they are missing, and what the next step should be.

Prefer one hint, one question, or one partial step at a time.

If the student has already tried something, respond to their attempt directly.

Only give a full answer after guidance has been attempted or when the user explicitly requests it.
```

### Tasks

- [x] Create prompt templates
- [x] Add structured outputs
- [x] Implement retry loops
- [x] Store lesson state

---

## Student Progress System

Track:

- completed lessons
- mastery levels
- weak areas
- time spent

### Tasks

- [x] Build progress database
- [x] Implement mastery scoring
- [x] Add analytics tracking

---

## Data Model

Core tables:

- users
- profiles
- curriculums
- grades
- subjects
- topics
- subtopics
- lessons
- questions
- student_progress
- sessions

### Tasks

- [x] Define schema
- [x] Implement migrations
- [x] Seed example curriculum

---

## UI/UX Design

Key principles:

- Minimal interface
- Focus on learning
- No distractions
- Clear, neat, and legible presentation

Design requirements:

- Use **IBM Plex Mono** as the primary UI typeface
- Follow Apple design guidelines and platform conventions across spacing, hierarchy, motion, controls, and visual polish
- Support both light mode and dark mode
- Prioritize readability, strong contrast, and clean information hierarchy
- Keep the interface calm, uncluttered, and easy for students to scan quickly
- The primaty color for selects and buttons through the design in #40D792 base any other needed colors around this color

Main screens:

- Dashboard
- Subject selection
- Lesson view
- Practice exercises
- Progress tracker

### Tasks

- [x] Build dashboard
- [x] Build lesson interface
- [x] Build exercise interface
- [x] Build progress view

---

## Lesson Interface

Lesson screen should include:

1. concept explanation
2. examples
3. interactive questions
4. progress indicator

### Tasks

- [x] Build markdown renderer
- [x] Build interactive question component
- [x] Implement answer validation

---

## Question System

Support question types:

- multiple choice
- short answer
- numeric
- step-by-step
- ask-question follow-up

Each question should support:

- prompt
- expected answer or rubric
- hint levels
- explanation
- misconception tags
- difficulty
- topic and subtopic mapping

### Tasks

- [x] Build question engine
- [x] Validate answers
- [x] Generate feedback
- [x] Support guided follow-up turns

---

## AI Safety and Quality

Prevent:

- hallucinated facts
- incorrect teaching
- skipping steps
- overhelping
- answer dumping without guidance
- teaching above the student's level

### Tasks

- [x] Constrain prompts
- [x] Verify outputs
- [x] Implement retries
- [x] Add mode-specific guardrails

---

## Future Features

### Phase 2

- teacher dashboards
- classroom management
- parent monitoring
- AI study plans

### Phase 3

- university support
- voice tutoring
- adaptive difficulty AI

---

## MVP Development Plan

### Phase 1

- [x] Auth
- [x] Curriculum structure
- [x] Lesson generator
- [x] Basic UI

### Phase 2

- [x] Practice system
- [x] Progress tracking
- [x] Revision mode

### Phase 3

- [x] Adaptive learning
- [x] Weakness detection
- [x] Analytics

---

## Implementation Checklist

Use this section as the master project TODO list. Mark items complete as they are shipped.

### Foundation

- [x] Implement Supabase authentication
- [x] Create user profile table
- [x] Define schema
- [x] Implement migrations
- [x] Seed example curriculum
- [x] Create curriculum database tables
- [x] Build curriculum importer
- [x] Support multiple countries
- [x] Allow curriculum updates

### AI Platform

- [x] Create prompt templates
- [x] Add structured outputs
- [x] Implement retry loops
- [x] Store lesson state
- [x] Constrain prompts
- [x] Verify outputs
- [x] Add mode-specific guardrails

### Learning Experience

- [x] Build lesson generator
- [x] Build explanation engine
- [x] Implement mastery checks
- [x] Build revision mode
- [x] Add quick summaries
- [x] Generate exam questions
- [x] Identify weak topics
- [x] Build ask-question workflow
- [x] Add stuck detection
- [x] Add hint ladder
- [x] Prevent answer dumping
- [x] Store student attempts and follow-up turns

### Questions And Practice

- [x] Build question engine
- [x] Validate answers
- [x] Generate feedback
- [x] Support guided follow-up turns
- [x] Build interactive question component
- [x] Implement answer validation

### Product UI

- [x] Build dashboard
- [x] Build lesson interface
- [x] Build exercise interface
- [x] Build progress view
- [x] Build markdown renderer

### Progress And Analytics

- [x] Store learning progress
- [x] Track sessions
- [x] Build progress database
- [x] Implement mastery scoring
- [x] Add analytics tracking

---

## Codex Instructions

You are building a **production-grade educational platform**.

Focus on:

- clean architecture
- modular components
- scalable backend
- structured AI prompting

Do not build a chatbot.

Build a **structured AI teaching system**.

---

## Success Criteria

The platform succeeds if:

- students can learn full subjects
- lessons are structured
- mastery is enforced
- learning progress is measurable

---

End of specification.
