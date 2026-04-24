# AI Tutor Lesson Design Notes

## Main diagnosis

The current lesson feels more like a guided chat than a lesson built for mastery.

### What is working
- Calm, friendly tone
- Clear sense of progression
- Learner can type and interact freely
- Tutor feels approachable

### What is not working
- Too much explanation before the learner does anything
- Practice happens too late
- Questions are too broad and not diagnostic enough
- Feedback is vague and overly generic
- Progress seems based on participation, not understanding
- The tutor does not always hold the thread tightly across turns

---

## Main design change

Do not structure lessons like this:

- Orientation
- Key concepts
- Active practice
- Finish

Use a repeated learning loop instead:

- Goal + quick check
- Teach one small idea
- Learner tries it
- Tutor gives specific feedback
- Quick retrieval check
- Next small idea
- Synthesis
- Independent attempt
- Exit check

---

## Better lesson structure

### 1. Goal + diagnostic
Start each lesson with:
- a clear lesson goal
- a quick prior knowledge check
- a fast calibration of learner level/confidence

Example:
- "By the end of this lesson, you should be able to explain how geography shaped an ancient civilization."
- "What do you already connect with Ancient Egypt: river, pyramids, pharaohs, or farming?"

### 2. Micro-lesson loops
Do not make "key concepts" one long block.

For each concept:
1. Explain one small idea
2. Show one concrete example
3. Ask the learner to use it
4. Give specific feedback
5. Do a quick retrieval check before moving on

### 3. Practice throughout
Practice should not be saved for later.

Use this rhythm repeatedly:
- I do
- We do
- You do

Example:
- Tutor models one example
- Learner answers with guidance
- Learner answers more independently

### 4. Specific feedback
Avoid:
- "Great choice!"
- "Exactly!"
- "You nailed it!"

Use:
- what was correct
- what was missing
- what the learner should fix next

Example:
- "Yes, the ocean is the resource. What is still missing is its effect: it helped the Greeks with trade, fishing, and travel."

### 5. Strong ending
Do not end with simple completion.

End with:
- synthesis
- transfer
- retrieval
- reflection

Example:
- "Summarize the lesson in 2 sentences."
- "Apply this to a different civilization."
- "What is one thing you would now expect in a civilization near a major river?"
- "What rule helped you most today?"

---

## Recommended lesson flow

### Stage 1. Start
Purpose:
- set the goal
- activate prior knowledge
- check readiness

Tutor actions:
- explain the lesson goal in 1 sentence
- ask 1 simple diagnostic question
- adapt to learner response

### Stage 2. Learn Loop 1
Purpose:
- teach the first important idea

Tutor actions:
- give a short explanation
- use one example
- ask learner to restate or apply
- give specific feedback

### Stage 3. Learn Loop 2
Purpose:
- build the next idea while connecting it to the first

Tutor actions:
- teach one new point only
- ask a short application question
- ask a retrieval question from the previous step

### Stage 4. Learn Loop 3
Purpose:
- deepen understanding through comparison, cause/effect, or classification

Tutor actions:
- connect ideas together
- ask learner to explain or compare
- repair misconceptions before moving on

### Stage 5. Guided synthesis
Purpose:
- help learner assemble the full picture

Tutor actions:
- ask learner to connect the ideas
- scaffold lightly
- refine learner answer

### Stage 6. Independent attempt
Purpose:
- reduce support and test understanding

Tutor actions:
- ask learner to answer with less help
- do not over-prompt
- only step in when needed

### Stage 7. Exit check
Purpose:
- confirm learning
- prepare memory for later

Tutor actions:
- ask 2 to 4 quick retrieval questions
- ask 1 transfer question
- ask 1 reflection question

---

## Design rules for the tutor

1. Never teach more than one new idea at a time.
2. Never ask more than one real thinking task in a single prompt.
3. Every explanation must be followed by learner action.
4. Do not advance just because the learner responded.
5. Advance only when the learner shows enough understanding.
6. Praise specifically, not generically.
7. If the learner is partly right, ask for revision before moving on.
8. Revisit earlier ideas after a few turns.
9. Track misconceptions explicitly.
10. Adapt vocabulary, chunk size, and support level to grade and context.

---

## Hint ladder

When the learner struggles, do not jump straight to the answer.

Use this ladder:
1. Nudge
2. Clue
3. Partial scaffold
4. Worked example

Example:
- Nudge: "Think about the main natural resource the Greeks depended on."
- Clue: "It helped with trade, food, and travel."
- Partial scaffold: "The Greeks depended heavily on the ______."
- Worked example: "The Greeks depended on the sea, which helped them trade and travel."

---

## What to change in your current stages

### Orientation
Keep it, but make it very short.

Use it for:
- relevance
- lesson goal
- quick diagnostic

Do not use it for:
- long explanations
- multiple broad prompts

### Key concepts
Replace with repeated concept loops.

### Active practice
Bring it much earlier and spread it through the lesson.

Rename it to something better:
- Try it
- Guided practice
- Use the idea
- Build your answer

### Finish
Replace with:
- Review
- Show what you know
- Exit check
- Wrap-up

---

## Better tutor behavior

The tutor should feel like:
- warm
- clear
- patient
- structured
- slightly leading

Not:
- chatty
- overly congratulatory
- loose with progression
- too eager to move on

The tutor should:
- guide firmly
- keep the thread connected
- know what has been learned
- know what is still missing
- decide the next best move based on evidence

---

## Biggest single improvement

Do not separate explanation and practice.

Interleave them constantly.

Bad pattern:
- long explanation
- long explanation
- long explanation
- practice at the end

Better pattern:
- explain briefly
- learner responds
- feedback
- retrieval
- next idea

---

## Suggested visible learner stages

Option A:
- Start
- Learn
- Try
- Prove it
- Review

Option B:
- Warm up
- Build understanding
- Practice
- Check understanding
- Wrap up

You could also hide most stage complexity from the learner and let the real lesson logic run underneath.

---

## Short summary

A good AI tutor lesson should:
- start with a clear goal
- check what the learner already knows
- teach in small chunks
- require response after every explanation
- give specific feedback
- revisit earlier ideas
- test understanding before advancing
- end with synthesis, transfer, and retrieval

The biggest issue right now is that the lesson behaves too much like a friendly conversation and not enough like a mastery-driven tutor.
