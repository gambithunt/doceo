# AI Assisted Learning Platform
## Codex Development Prompt / Project Specification

## Project Overview

Build an **AI-assisted learning platform for school students (Grade 1–12 initially)** that provides structured, curriculum-aligned education using large language models.

The system should function both as:

1. **A full teaching platform** (students can learn subjects from scratch)
2. **A revision assistant** (students preparing for tests/exams)
3. **A guided problem-solving tutor**

The platform will provide **structured, step-by-step teaching**, adaptive testing, and mastery-based progression.

The AI must **never behave like a free-form chatbot**.  
Instead it must behave like a **structured teacher following a curriculum**.

---

# Core Design Philosophy

The system must follow these learning principles:

### Structured Learning
Learning must follow a defined curriculum hierarchy.


Country
Curriculum
Grade
Subject
Topic
Subtopic
Lesson
Exercise


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
- Provide alternate explanation

---

# Technology Stack

Frontend
- **SvelteKit**
- **Svelte 5 runes**
- TypeScript
- Tailwind CSS

Backend
- Node.js
- Supabase

Database
- Supabase Postgres

Authentication
- Supabase Auth

AI
- OpenAI API

Hosting
- Vercel or similar

---

# Core Product Features

## 1. User Accounts

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

### Tasks

- Implement Supabase authentication
- Create user profile table
- Store learning progress
- Track sessions

---

# 2. Curriculum System

Curriculum must be configurable.

Initial support:

- South Africa
- IEB
- CAPS

Structure:


Curriculum
Grades
Subjects
Topics
Subtopics


### Tasks

- Create curriculum database tables
- Build curriculum importer
- Support multiple countries
- Allow curriculum updates

---

# 3. Learning Modes

The platform must support **three learning modes**.

---

## Mode 1 — Learn From Scratch

Student selects:

- country
- grade
- subject

System generates structured lessons.

Flow:


Topic introduction
Concept explanation
Worked examples
Practice
Mastery check


### Tasks

- Build lesson generator
- Build explanation engine
- Implement mastery checks

---

## Mode 2 — Exam Revision

Student provides:

- exam subject
- exam date
- topics

System creates **accelerated revision path**.

Flow:


Quick summary
Key concepts
Practice problems
Exam style questions
Weakness detection


### Tasks

- Build revision mode
- Add quick summaries
- Generate exam questions
- Identify weak topics

---

## Mode 3 — Ask Question

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

- `problem_type`: concept | procedural | word_problem | proof | revision
- `student_goal`: what the student appears to need
- `diagnosis`: likely misunderstanding or blocked step
- `response_stage`: clarify | hint | guided_step | worked_example | final_explanation
- `teacher_response`: what the AI says to the student
- `check_for_understanding`: short follow-up question

### Tasks

- Build ask question workflow
- Add stuck detection
- Add hint ladder
- Prevent answer dumping
- Store student attempts and follow-up turns

---

# AI Teaching Engine

The AI must follow strict behavior rules.

The AI is **not a chatbot**.

The AI is a **structured teacher**.

Each lesson must follow:


Overview

Deeper explanation

Example

Practice

Mastery test


If student fails mastery:


Re-explain
New example
Retry exercise


---

# Prompt Structure

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


You are an expert school teacher inside a structured learning platform.

Teach step-by-step and stay within the student's grade level.

Never jump ahead or behave like a general chatbot.

When the student asks for help, guide them with the smallest useful next step first.

Always verify understanding before moving forward.

If the student is stuck after guided help, you may provide a concise worked solution and explain the reasoning.

Example ask-question instruction:


The student is in ask-question mode.

Your job is to help them make progress, not just output the answer.

First diagnose what they know, what they are missing, and what the next step should be.

Prefer one hint, one question, or one partial step at a time.

If the student has already tried something, respond to their attempt directly.

Only give a full answer after guidance has been attempted or when the user explicitly requests it.


### Tasks

- Create prompt templates
- Add structured outputs
- Implement retry loops
- Store lesson state

---

# Student Progress System

Track:

- completed lessons
- mastery levels
- weak areas
- time spent

### Tasks

- progress database
- mastery scoring
- analytics tracking

---

# Data Model

Core tables:


users
profiles
curriculums
grades
subjects
topics
subtopics
lessons
questions
student_progress
sessions


### Tasks

- define schema
- implement migrations
- seed example curriculum

---

# UI/UX Design

Key principles:

- Minimal interface
- Focus on learning
- No distractions

Main screens:


Dashboard
Subject selection
Lesson view
Practice exercises
Progress tracker


### Tasks

- build dashboard
- lesson interface
- exercise interface
- progress view

---

# Lesson Interface

Lesson screen should include:

1. concept explanation
2. examples
3. interactive questions
4. progress indicator

### Tasks

- markdown renderer
- interactive question component
- answer validation

---

# Question System

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

- build question engine
- validate answers
- generate feedback
- support guided follow-up turns

---

# AI Safety and Quality

Prevent:

- hallucinated facts
- incorrect teaching
- skipping steps
- overhelping
- answer dumping without guidance
- teaching above the student's level

### Tasks

- constrain prompts
- verify outputs
- implement retries
- add mode-specific guardrails

---

# Future Features

Phase 2:

- teacher dashboards
- classroom management
- parent monitoring
- AI study plans

Phase 3:

- university support
- voice tutoring
- adaptive difficulty AI

---

# MVP Development Plan

Phase 1


Auth
Curriculum structure
Lesson generator
Basic UI


Phase 2


Practice system
Progress tracking
Revision mode


Phase 3


Adaptive learning
Weakness detection
Analytics


---

# Codex Instructions

You are building a **production-grade educational platform**.

Focus on:

- clean architecture
- modular components
- scalable backend
- structured AI prompting

Do not build a chatbot.

Build a **structured AI teaching system**.

---

# Success Criteria

The platform succeeds if:

- students can learn full subjects
- lessons are structured
- mastery is enforced
- learning progress is measurable

---

End of specification
