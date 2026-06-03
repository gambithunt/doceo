# Lesson Flow Screenshot Audit

Created: 2026-06-02

## Purpose

This document captures an end-to-end visual audit of the lesson flow for the Life Sciences lesson, "Evolution and natural selection." It is intended to be a reusable reference for improving lesson structure, learner guidance, feedback timing, component hierarchy, and overall lesson pacing.

The screenshots were attached in a different display order than their numeric filenames. Because the provided filenames are numbered in the order the screenshots appeared during the lesson, this audit is ordered by filename: `1.png` through `18.png`.

## Source Images

| Lesson order | Source file | Attachment label seen in chat | Primary state |
| --- | --- | --- | --- |
| 1 | `/Users/delon/Desktop/1.png` | Image #4 | Lesson start / overview |
| 2 | `/Users/delon/Desktop/2.png` | Image #11 | Teaching: natural selection |
| 3 | `/Users/delon/Desktop/3.png` | Image #1 | Natural selection quick check visible |
| 4 | `/Users/delon/Desktop/4.png` | Image #5 | Example: natural selection |
| 5 | `/Users/delon/Desktop/5.png` | Image #6 | Your turn: survival advantage |
| 6 | `/Users/delon/Desktop/6.png` | Image #7 | Concept check: natural selection |
| 7 | `/Users/delon/Desktop/7.png` | Image #13 | Teaching: adaptation |
| 8 | `/Users/delon/Desktop/8.png` | Image #12 | Example: adaptation |
| 9 | `/Users/delon/Desktop/9.png` | Image #14 | Your turn: identify adaptation |
| 10 | `/Users/delon/Desktop/10.png` | Image #16 | Concept check: adaptation |
| 11 | `/Users/delon/Desktop/11.png` | Image #17 | Teaching: speciation |
| 12 | `/Users/delon/Desktop/12.png` | Image #2 | Example: speciation |
| 13 | `/Users/delon/Desktop/13.png` | Image #15 | Your turn: describe speciation |
| 14 | `/Users/delon/Desktop/14.png` | Image #9 | Concept check: speciation |
| 15 | `/Users/delon/Desktop/15.png` | Image #3 | Connecting concepts |
| 16 | `/Users/delon/Desktop/16.png` | Image #8 | Solo attempt / active practice |
| 17 | `/Users/delon/Desktop/17.png` | Image #10 | Final check |
| 18 | `/Users/delon/Desktop/18.png` | Image #18 | Lesson complete / review |

## Dominant UI Problem

The lesson has a strong high-level structure, but the active learning task is frequently diluted by repeated historical feedback, weak separation between current and previous learner actions, and large empty regions. The learner can usually infer the next button, but it is often unclear whether they are being asked to answer in a hidden composer, click a progression button, review tutor feedback, or simply move on.

The strongest structural issue is that the lesson says "Put it in your own words" or "Try the task here" while the visible primary action is often a navigation/progression button and the answer input is either hidden, below the fold, or represented only by a passive "Ask a question about this" area.

## Cross-Flow Observations

### What Works

- The five-step lesson rail gives the lesson a clear macro shape: Overview, Key idea, Your turn, Feedback, Summary.
- Color-coded lesson modes help distinguish teaching, example, active practice, and checking states.
- The right "Covered so far" panel gives useful concept map context and becomes more meaningful as concepts are marked covered.
- The main content card generally keeps one core idea per screen, which is appropriate for learner pacing.
- The final summary uses completed concept cards well and provides a natural transition into revision.
- Response chips at the bottom help learners ask for bounded help without needing to formulate every question from scratch.

### What Should Be Removed Or Reduced

- Repeated "Good. Let's move into..." feedback cards accumulate visually and often compete with the current task.
- "Review earlier steps (n)" appears on most screens but has unclear value while it is collapsed and visually prominent.
- The persistent bottom help bar consumes vertical space on every step, even when the main task already has contextual chips.
- Large empty lower panels make the layout feel unfinished and push useful controls toward the bottom.
- The right rail repeats concept definitions without adding state-specific guidance after the learner has already seen them.

### What Should Become More Prominent

- The actual learner action for each screen: read, answer, choose, explain, check, continue, or finish.
- The answer input or response affordance when the copy says the learner should put something in their own words.
- The reason the lesson is moving on after feedback, especially when the learner did not visibly submit a typed answer.
- The current concept number and concept name, separate from the broader phase rail.
- The final lesson score or readiness signal, if completion quality matters.

### What Is Still Unclear

- Whether "Ask a question about this" is an input field, placeholder, disabled composer, or expansion affordance.
- Whether the learner is expected to type an answer before clicking buttons like "See an example," "Next concept," or "Final check."
- Why prior feedback is still shown when the current card has already advanced.
- Whether the "Review earlier steps" count means messages, cards, tutor turns, or lesson states.
- Whether the right rail is navigable, informational only, or a progress model.

## Recommended Product Direction

1. Make each lesson screen answer one question: "What should the learner do now?"
2. Separate current task, answer input, and past transcript into distinct layers.
3. Convert repeated transition feedback into lightweight status messages or collapse it automatically.
4. Keep the right rail, but make it more compact and state-aware.
5. Treat the bottom help bar as contextual help, not a second competing composer.
6. Add an explicit current-concept sub-progress indicator, because the phase rail alone is too broad.

## Detailed Screenshot Audit

### 1. `/Users/delon/Desktop/1.png` - Lesson Start / Overview

Visible state:

- Subject: Life Sciences.
- Lesson title: "Evolution and natural selection."
- Phase rail: Overview active; Key idea, Your turn, Feedback, and Summary inactive.
- Main card label: "Start."
- Main title: "Natural Selection."
- Content structure: definition, example, why it matters, and "Your turn" prompt.
- Primary CTA: "Start lesson."
- Current task: "Name something you already know, or a question you want answered."
- Right rail: three upcoming concepts: Natural Selection, Adaptation, Speciation.
- Bottom composer area: centered "Ask a question about this"; persistent help buttons below.

Flow role:

- This is the orientation step. It frames the lesson and asks for prior knowledge before the formal lesson begins.

UX notes:

- The screen is readable and calm.
- The "Start lesson" button is visually clear, but it conflicts with the current task asking the learner to name prior knowledge or a question.
- There is no visible answer input inside the current task card, so the learner may click "Start lesson" without doing the reflective task.
- The bottom "Ask a question about this" area looks disabled or passive.
- The right rail sets expectations well, but it may be too large for a panel that is not yet interactive.

Improvement opportunities:

- Put a compact inline response composer directly in the current task block.
- Make "Start lesson" secondary until the learner answers, or rename it to "Skip and start" if answering is optional.
- Clarify whether prior knowledge is required, optional, or only a prompt for the AI tutor.
- Reduce empty vertical space by allowing the main card and feedback/composer regions to size to content.

### 2. `/Users/delon/Desktop/2.png` - Teaching: Natural Selection

Visible state:

- Phase rail: Overview completed; Key idea active.
- Main card label: "Teaching."
- Main title: "How Natural Selection Works."
- Main content explains survival and reproduction advantage using brown and green beetles.
- Primary CTA: "Check: Natural Selection."
- Current task: "Put it in your own words, or ask a question."
- Feedback area shows "Good. Let's move into Key Concepts."
- Bottom response chips: "I follow Natural Selection," "Not sure about Natural Selection," "Ask something specific."
- Right rail still shows all concepts as coming up.

Flow role:

- This is the first key idea teaching card for Natural Selection.

UX notes:

- The content is concise and appropriately scoped.
- The CTA is clear as a progression action.
- The current task asks for learner-generated output, but the dominant visible action is a check button.
- The prior tutor feedback takes space even though the learner is now on a new teaching card.
- Bottom chips are helpful, but they are separated from the current task and may feel like a different interaction system.

Improvement opportunities:

- Move the concept response chips into or directly under the current task card.
- Collapse transition feedback once it has served its purpose.
- Reword the CTA to "Answer quick check" only if it actually opens or advances to a check; otherwise use "Continue to quick check."
- Mark Natural Selection as "in progress" in the right rail instead of "coming up."

### 3. `/Users/delon/Desktop/3.png` - Natural Selection Quick Check Visible

Visible state:

- Phase rail: Overview completed; Key idea active.
- Main card title: "How Natural Selection Works."
- A quick check multiple-choice question appears inside the teaching card.
- Question: "Why do brown beetles become more common than green beetles over time?"
- Options:
  - A: Brown beetles are better camouflaged and survive more often.
  - B: Green beetles choose to change color to brown.
  - C: Predators only eat green beetles for fun.
  - D: Brown beetles are stronger and fight better.
- Primary CTA: "Submit quick check."
- Feedback area still shows successful transition feedback.
- Bottom chips still appear below the main workspace.
- Right rail still lists all concepts as coming up.

Flow role:

- This is an embedded comprehension check for the Natural Selection teaching card.

UX notes:

- The quick check is easy to understand and the correct option is defensible.
- The multiple-choice layout is clear and accessible enough visually.
- The current task text, "Put it in your own words, or ask a question," no longer matches the visible multiple-choice task.
- "Answer feedback" appears below before a new answer is submitted, which can confuse the timeline.
- The feedback from a previous transition is still visually competing with the active question.

Improvement opportunities:

- Change current task text dynamically to "Choose one answer, then submit the quick check."
- Hide or collapse previous feedback while a quiz is active.
- Move the submit button closer to the answer options or keep it inside the quiz box.
- Update right rail to show Natural Selection as active/in progress.

### 4. `/Users/delon/Desktop/4.png` - Example: Natural Selection

Visible state:

- Phase rail: Overview completed; Example active.
- Main card label: "Example."
- Main title: "Example of Natural Selection."
- Example: green and brown beetles live together; birds eat green beetles because they stand out; brown beetles increase over generations.
- Current task: "Tell me what you notice in the example."
- Answer criteria chips: "What happened," "Why it mattered," "Lesson link."
- Primary CTA: "Try it yourself."
- Feedback area contains an explanatory tutor feedback card plus a transition confirmation.
- Bottom chips: "I can follow this example," "Something is unclear," "Ask something specific."
- Right rail still shows all concepts as coming up.

Flow role:

- This bridges explanation to application for Natural Selection.

UX notes:

- The example is useful and concrete.
- "Your answer should include" chips are good scaffolding.
- The CTA "Try it yourself" is strong and learner-friendly.
- Again, the task asks the learner to tell what they notice, but no visible input is in the card.
- Feedback uses a lot of space and may be perceived as the tutor answering the task for the learner.

Improvement opportunities:

- Add a short answer field or response chip group directly below "Tell me what you notice."
- If the learner already answered, show their answer above tutor feedback so the feedback has context.
- Right rail should mark Natural Selection as covered or active after this example.
- Consider making the yellow example mode less visually heavy so it does not compete with the CTA.

### 5. `/Users/delon/Desktop/5.png` - Your Turn: Survival Advantage

Visible state:

- Phase rail: Overview and Key idea completed; Your turn active.
- Main card label: "Your turn."
- Main title: "Explain Survival Advantage."
- Prompt asks why brown beetles become more common than green beetles using natural selection.
- Current task: "Try the task here, or ask for bounded help."
- Answer criteria chips: "Claim," "Evidence," "First step."
- Primary CTA: "Submit my attempt."
- Feedback area shows the prior Natural Selection example and transition feedback.
- Right rail still shows all concepts as coming up.

Flow role:

- This is the learner's first active application attempt for Natural Selection.

UX notes:

- The screen correctly shifts from reading to doing.
- The criteria chips are helpful and match the expected answer structure.
- The missing visible answer composer is a major issue here because "Submit my attempt" implies typed or selected learner work.
- The previous example feedback remains prominent enough to feel like the answer source.
- The learner may click submit without an entered attempt if the hidden composer state allows it.

Improvement opportunities:

- Place the attempt composer inside the green current task box.
- Disable "Submit my attempt" until an attempt exists, unless the button opens the composer.
- Show a small "Need help?" path using the existing Claim/Evidence/First step chips.
- Minimize the prior feedback area while an attempt is expected.

### 6. `/Users/delon/Desktop/6.png` - Concept Check: Natural Selection

Visible state:

- Phase rail: Feedback active; previous phases completed.
- Main card label: "Concept check."
- Main title: "Check Your Understanding."
- Prompt: "Why do brown beetles become more common than green beetles over time?"
- Resource panel labeled "Recall Question" gives the answer: "Brown beetles survive better because they are less visible to predators on tree bark."
- Current task: "Explain or apply the idea here."
- Answer criteria: "What worked," "What to fix," "Retry plan."
- Primary CTA: "Next concept."
- Feedback area shows the previous "Explain Survival Advantage" prompt and transition feedback.

Flow role:

- This appears to be post-attempt feedback or a check state before moving to the next concept.

UX notes:

- The resource panel gives a clear recall statement.
- The purpose of the concept check is unclear: it asks a question but also gives the answer in the resource panel.
- The criteria "What worked / What to fix / Retry plan" sound like metacognitive reflection, not a science answer.
- "Next concept" is clear but may encourage skipping reflection.
- Previous tutor feedback includes the exact prior prompt, not the learner answer or the tutor's evaluation.

Improvement opportunities:

- Decide whether this screen is a quiz, a reflection, or a feedback summary.
- If it is feedback, show learner answer, tutor evaluation, corrected answer, and next step.
- If it is a check, hide the answer until after the learner responds.
- Rename "Recall Question" to "Key idea to remember" if it is meant as support rather than assessment.

### 7. `/Users/delon/Desktop/7.png` - Teaching: Adaptation

Visible state:

- Phase rail: Key idea active again.
- Main card label: "Teaching."
- Main title: "Understanding Adaptations."
- Main content defines adaptations using polar bear thick fur.
- Current task: "Put it in your own words, or ask a question."
- Primary CTA: "See an example."
- Feedback area shows two transition confirmations.
- Right rail: Natural Selection covered; Adaptation and Speciation coming up.
- Bottom chips: "I follow Adaptation," "Not sure about Adaptation," "Ask something specific."

Flow role:

- This starts the second concept, Adaptation.

UX notes:

- The concept progression is clear in the right rail.
- The content is simple and appropriate.
- Repeated transition feedback has now accumulated and makes the lesson feel chatty.
- The same hidden-input issue repeats.
- The right rail is more useful now because it shows one completed concept.

Improvement opportunities:

- Auto-collapse old transition confirmations into one compact "Lesson history" affordance.
- Put response chips nearer to the current task.
- Show "Concept 2 of 3: Adaptation" in the main card or phase header.
- Use the right rail to show "currently learning" for Adaptation.

### 8. `/Users/delon/Desktop/8.png` - Example: Adaptation

Visible state:

- Phase rail: Example active.
- Main card label: "Example."
- Main title: "Example of Adaptation."
- Example: thick polar bear fur works like a warm coat, protecting from freezing temperatures and enabling Arctic survival.
- Current task: "Tell me what you notice in the example."
- Answer criteria: "What happened," "Why it mattered," "Lesson link."
- Primary CTA: "Try it yourself."
- Feedback area shows tutor explanation of adaptations plus transition feedback.
- Right rail: Natural Selection covered; Adaptation and Speciation coming up.

Flow role:

- This gives a worked example for Adaptation.

UX notes:

- The example is understandable.
- The card's yellow treatment consistently signals worked example.
- The right rail still says Adaptation is coming up even though the learner is actively in it.
- The prior tutor feedback repeats the same teaching content already covered by the card.

Improvement opportunities:

- Change right rail status for Adaptation to "In progress."
- Avoid repeating the teaching explanation in the feedback area immediately after the teaching card.
- Show a "model noticing" only after the learner gives an answer, or clearly label it as tutor modeling.

### 9. `/Users/delon/Desktop/9.png` - Your Turn: Identify An Adaptation

Visible state:

- Phase rail: Your turn active.
- Main card label: "Your turn."
- Main title: "Identify an Adaptation."
- Prompt asks learner to explain how polar bear thick fur helps survival.
- Current task: "Try the task here, or ask for bounded help."
- Answer criteria: "Claim," "Evidence," "First step."
- Primary CTA: "Submit my attempt."
- Feedback area contains prior example text and transition feedback.
- Right rail: Natural Selection covered; Adaptation and Speciation coming up.

Flow role:

- This is the learner application step for Adaptation.

UX notes:

- The task is concise and well matched to the preceding example.
- The visible scaffolds are appropriate.
- The missing attempt field is again the main friction point.
- The prior answer in feedback essentially gives the full response, reducing the challenge.

Improvement opportunities:

- Put the answer field directly in the current task area.
- Use "Claim/Evidence/First step" as clickable help chips that insert scaffold prompts, not static labels.
- Collapse previous feedback or show it behind "Need the example again?"
- Consider preventing the feedback answer from being visible until after the learner attempts.

### 10. `/Users/delon/Desktop/10.png` - Concept Check: Adaptation

Visible state:

- Phase rail: Feedback active.
- Main card label: "Concept check."
- Main title: "Check Your Understanding."
- Prompt: "How does thick fur help polar bears survive?"
- Resource panel gives recall answer: "Thick fur keeps polar bears warm in cold environments, helping them survive."
- Current task: "Explain or apply the idea here."
- Answer criteria: "What worked," "What to fix," "Retry plan."
- Primary CTA: "Next concept."
- Feedback area shows prior task prompt and transition feedback.
- Right rail: Natural Selection covered; Adaptation still coming up.

Flow role:

- This is the concept check / feedback bridge from Adaptation to Speciation.

UX notes:

- Same assessment ambiguity as the Natural Selection check.
- The resource panel again appears to answer the question before learner action.
- The CTA advances rather than requiring a response.
- Right rail status should mark Adaptation covered or active by this point.

Improvement opportunities:

- Use this state as a concise feedback summary: "You understood X; revise Y; next concept is Z."
- If learner action is required, provide an input and make "Next concept" secondary.
- Update right rail status when entering or finishing this check.

### 11. `/Users/delon/Desktop/11.png` - Teaching: Speciation

Visible state:

- Phase rail: Key idea active.
- Main card label: "Teaching."
- Main title: "How New Species Form."
- Content defines speciation using isolated Darwin's finches and beak shape differences.
- Current task: "Put it in your own words, or ask a question."
- Primary CTA: "See an example."
- Feedback area shows two transition confirmations.
- Right rail: Natural Selection and Adaptation covered; Speciation coming up.
- Bottom chips: "I follow Speciation," "Not sure about Speciation," "Ask something specific."

Flow role:

- This starts the third concept, Speciation.

UX notes:

- The text is concise and well scoped.
- Right rail progress is useful and encouraging.
- The same transition-feedback accumulation persists.
- The content, example, and application pattern is now predictable, which is good, but also reveals repeated UI friction.

Improvement opportunities:

- Show "Concept 3 of 3" near the main title.
- Mark Speciation as "In progress" in the right rail.
- Collapse old feedback into a timeline below the lesson, not between active card and composer.

### 12. `/Users/delon/Desktop/12.png` - Example: Speciation

Visible state:

- Phase rail: Example active.
- Main card label: "Example."
- Main title: "Example of Speciation."
- Example: Galapagos finches on different islands developed beak shapes suited to different foods.
- Current task: "Tell me what you notice in the example."
- Answer criteria: "What happened," "Why it mattered," "Lesson link."
- Primary CTA: "Try it yourself."
- Feedback area contains tutor explanation and transition feedback.
- Right rail: Natural Selection and Adaptation covered; Speciation coming up.

Flow role:

- This provides a worked example for Speciation.

UX notes:

- The example is effective and age-appropriate.
- The example introduces isolation implicitly but could make the separation/isolation mechanism more explicit.
- Right rail status still lags.
- Feedback again duplicates teaching/example content instead of responding to a visible learner action.

Improvement opportunities:

- Add one line in the example connecting island separation to reduced interbreeding.
- Change "Coming up" to "In progress" for Speciation.
- Label tutor explanation as "Model answer" if it is intended to demonstrate what a learner response should include.

### 13. `/Users/delon/Desktop/13.png` - Your Turn: Describe Speciation

Visible state:

- Phase rail: Your turn active.
- Main card label: "Your turn."
- Main title: "Describe Speciation."
- Prompt asks how isolation and different environments lead to new species using Darwin's finches.
- Current task: "Try the task here, or ask for bounded help."
- Answer criteria: "Claim," "Evidence," "First step."
- Primary CTA: "Submit my attempt."
- Feedback area contains prior finch example and transition feedback.
- Right rail: Natural Selection and Adaptation covered; Speciation coming up.

Flow role:

- This is the learner application step for Speciation.

UX notes:

- The task is the most complex concept application so far.
- The learner needs to connect isolation, environmental pressure, adaptation, and accumulated genetic difference.
- The visible scaffold chips are too generic for this level of complexity.
- There is still no visible attempt field in the task card.

Improvement opportunities:

- Use concept-specific scaffold chips, such as "Isolation," "Different food," "Beak adaptation," and "New species."
- Provide a sentence starter in the input: "When finches are separated on different islands..."
- Consider breaking this task into two short steps before submission.
- Make prior example collapsible so it can support without giving away the full answer.

### 14. `/Users/delon/Desktop/14.png` - Concept Check: Speciation

Visible state:

- Phase rail: Feedback active.
- Main card label: "Concept check."
- Main title: "Check Your Understanding."
- Prompt: "What causes Darwin's finches to develop different beak shapes?"
- Resource panel gives recall answer: "Different food sources on separate islands lead to different beak shapes adapted to those foods."
- Current task: "Explain or apply the idea here."
- Answer criteria: "What worked," "What to fix," "Retry plan."
- Primary CTA: "Bring it together."
- Feedback area shows prior Describe Speciation prompt and transition feedback.
- Right rail: Natural Selection and Adaptation covered; Speciation coming up.

Flow role:

- This bridges the third concept into synthesis.

UX notes:

- "Bring it together" is a good label for moving from concept checks into synthesis.
- The recall answer is clear.
- The same ambiguity remains: the card asks a question, gives the answer, and invites explanation, but the CTA advances.
- The right rail still has not marked Speciation as covered, despite the concept check stage.

Improvement opportunities:

- Rename the card if this is no longer a check. For example: "Review Speciation" or "Speciation Recap."
- If it is a real check, hide the resource answer until learner action.
- Update Speciation to "covered" when this step is complete.

### 15. `/Users/delon/Desktop/15.png` - Connecting Concepts

Visible state:

- Phase rail appears to have returned to Key idea active, though all three concepts are covered in the right rail.
- Main card label: "Bringing it together."
- Main title: "Connecting Variation, Natural Selection, Adaptation, and Speciation."
- Content explains how variation leads to selection, favored traits become adaptations, and long-term genetic changes plus isolation can cause speciation.
- Current task: "Put it in your own words, or ask a question."
- Primary CTA: "Independent attempt."
- Feedback area shows transition confirmations.
- Right rail: all three concepts covered.
- Bottom area shows a passive "Ask a question about this."

Flow role:

- This is the synthesis teaching step before independent practice.

UX notes:

- The synthesis content is valuable and appropriately connects the lesson.
- The phase rail state is potentially confusing: the learner is synthesizing, but Key idea appears active rather than Your turn or Summary.
- The CTA "Independent attempt" is clear.
- The main title is long and wraps heavily; still readable but visually dense.

Improvement opportunities:

- Add a dedicated "Synthesis" substep or make the phase rail show Your turn as upcoming next, not Key idea.
- Use a shorter title: "How the ideas connect."
- Add a small concept chain visual or text row: Variation -> Natural selection -> Adaptation -> Speciation.
- Replace transition feedback cards with a compact "3 concepts covered" status.

### 16. `/Users/delon/Desktop/16.png` - Solo Attempt / Active Practice

Visible state:

- Phase rail: Your turn active.
- Main card label: "Solo attempt."
- Main title: "Apply Your Understanding of Evolution."
- Prompt asks learner to consider insects with long and short wings, then explain how natural selection could change the population, identify adaptation, and describe possible speciation if isolated.
- Current task: "Try the task here, or ask for bounded help."
- Answer criteria: "Claim," "Evidence," "First step."
- Primary CTA: "Final check."
- Feedback area contains "Good. Let's move into Active Practice."
- Right rail: all three concepts covered.

Flow role:

- This is the independent integrated application task.

UX notes:

- This is the strongest assessment task in the flow.
- The task asks for a multi-part explanation, but the visible scaffolds are generic and insufficient.
- The CTA says "Final check," not "Submit attempt," which may imply the learner can advance without answering.
- No visible answer field makes this high-stakes application step particularly unclear.

Improvement opportunities:

- Use a structured response composer with three labeled fields:
  - Trait and selection pressure
  - Adaptation explanation
  - Isolation/speciation explanation
- Rename CTA to "Submit final attempt" or "Check my answer."
- Make help chips concept-specific: "Long wings," "Food pressure," "Adaptation," "Isolation."
- Add a short rubric preview so the learner knows what a good answer needs.

### 17. `/Users/delon/Desktop/17.png` - Final Check

Visible state:

- Phase rail: Feedback active.
- Main card label: "Final check."
- Main title: "Final Check on Evolution and Natural Selection."
- Prompt asks why variation matters, how natural selection leads to adaptation, and how these processes can result in new species.
- Current task: "Explain or apply the idea here."
- Answer criteria: "What worked," "What to fix," "Retry plan."
- Primary CTA: "Finish lesson."
- Feedback area contains transition feedback.
- Right rail: all three concepts covered.

Flow role:

- This is the final synthesis / completion gate.

UX notes:

- The prompt is appropriately cumulative.
- The CTA "Finish lesson" is clear but creates the same ambiguity: is the learner submitting an answer or simply ending?
- The answer criteria are reflective rather than content-based.
- No visible learner answer, score, or feedback result is shown before finishing.

Improvement opportunities:

- Make this a clear final response screen with a visible answer input and rubric.
- Change criteria to content expectations: "Variation," "Selection pressure," "Adaptation," "Speciation."
- After submission, show final feedback before enabling "Finish lesson."
- If the lesson can be finished without answer, label the button "Skip final answer and finish" to make the tradeoff explicit.

### 18. `/Users/delon/Desktop/18.png` - Lesson Complete / Review

Visible state:

- Phase rail: all phases completed.
- Main card label: "Lesson complete" and "Learning review."
- Main title: "What you learned."
- Three completed concept cards:
  - Natural Selection: definition plus beetle example.
  - Adaptation: definition plus polar bear fur example.
  - Speciation: definition plus finch example.
- Revision handoff: "Use the existing revision flow to strengthen this topic next."
- CTA: "Revise this next."
- Lesson feedback form asks usefulness, clarity, confidence gain, and optional note.
- CTA: "Submit lesson feedback."
- Lesson history is visible below, showing earlier tutor messages.

Flow role:

- This is the completion, consolidation, and feedback collection screen.

UX notes:

- This is one of the strongest screens in the flow.
- The completed concept cards are useful and scannable.
- Revision handoff is well placed and relevant.
- The feedback form is clear, but ratings have no selected/default state visible.
- Lesson history below the feedback form is useful but could be very long.

Improvement opportunities:

- Add a compact completion outcome: "You completed 3 concepts" and possibly a readiness/confidence signal.
- Consider making lesson feedback optional and less visually heavy if the learner wants to return to dashboard.
- Add "Back to dashboard" or "Choose another lesson" near completion actions.
- Collapse long lesson history by default, with a "Show full lesson history" affordance.

## System-Level Recommendations

### 1. Introduce A Clear Active Task Contract

Every lesson state should declare:

- what the learner should do
- where they should do it
- whether a response is required
- what happens after the primary CTA

Current issue:

- Many states say "Put it in your own words" or "Try the task here," but the visible interaction is a CTA, not an input.

Recommended pattern:

- Reading state: `Continue to check`
- Example state: `Write what you notice` plus optional `Show model answer`
- Practice state: visible input plus `Submit my attempt`
- Feedback state: corrected feedback plus `Continue`
- Summary state: `Revise`, `Return to dashboard`, `Submit feedback`

### 2. Split Current Feedback From Lesson History

Current issue:

- Transition confirmations and previous tutor explanations remain in the active workspace, making it hard to tell what matters now.

Recommended pattern:

- Current feedback: one visible card directly tied to the latest learner action.
- Lesson history: collapsed timeline below the main flow, visible on demand.
- Transition messages: inline status toast or small pill, not full cards.

### 3. Make The Composer Visible When A Learner Response Is Requested

Current issue:

- The lesson repeatedly asks for learner-written responses without showing a clear response field in the task card.

Recommended pattern:

- Add a compact, embedded composer inside the current task region for any state requiring a learner answer.
- Keep bottom help chips for optional tutor help, but do not use them as a substitute for the answer input.
- Disable submit CTAs until the learner has either entered text or explicitly chooses a help/skip path.

### 4. Improve Concept Status Accuracy

Current issue:

- Right rail often says a concept is "Coming up" while the learner is already inside that concept.

Recommended statuses:

- Coming up
- In progress
- Covered
- Needs review

This would make the right rail more trustworthy and more useful as a lesson map.

### 5. Replace Generic Scaffolds With Concept-Specific Scaffolds

Current issue:

- The "Claim / Evidence / First step" chips repeat across tasks, even when the science answer requires specific content.

Recommended pattern:

- Natural Selection: "Trait variation," "Survival advantage," "More offspring."
- Adaptation: "Trait," "Environment," "Survival benefit."
- Speciation: "Isolation," "Different pressure," "Genetic change."
- Final synthesis: "Variation," "Selection," "Adaptation," "Speciation."

### 6. Tighten Layout Density

Current issue:

- Screens contain large empty vertical regions while important controls sit in separate bottom bars.

Recommended pattern:

- Let content panels shrink to actual content height.
- Keep the active task, input, and primary CTA in the same visual block.
- Collapse older feedback by default.
- Use the right rail for compact progress, not large repeated definitions on every screen.

## Proposed Follow-Up Workstreams

### Workstream A: Active Task And Composer Clarity

Goal:

- Ensure every state that asks for learner output includes a visible, state-appropriate input or an explicit skip/help path.

Likely affected areas:

- `src/lib/components/LessonWorkspace.svelte`
- lesson workspace UI helpers
- lesson state/action derivation tests
- component tests covering hidden composer and submit-button behavior

Acceptance criteria:

- No screen says "Try the task here" without a visible place to try it.
- Submit CTAs are disabled or relabeled when no learner response exists.
- Help chips remain available but do not replace the primary answer path.

### Workstream B: Feedback Timeline Cleanup

Goal:

- Separate current feedback from previous lesson history and reduce repeated transition cards.

Likely affected areas:

- lesson feedback rendering
- transcript/history display
- "Review earlier steps" behavior
- component tests for collapsed history and current-feedback visibility

Acceptance criteria:

- Only the latest relevant feedback is expanded by default.
- Transition messages do not accumulate as full feedback cards.
- Prior lesson history is available but visually secondary.

### Workstream C: Concept Progress Accuracy

Goal:

- Make the right rail accurately reflect coming up, in progress, covered, and possibly needs-review states.

Likely affected areas:

- lesson progress derivation helpers
- covered concept rendering
- tests around concept status transitions

Acceptance criteria:

- The current concept is never labeled "Coming up."
- Covered concepts remain visible but compact.
- The right rail remains useful through the whole lesson, including synthesis and final check.

### Workstream D: Assessment And Rubric States

Goal:

- Make concept checks, solo attempts, and final checks behave like clear assessment moments rather than ambiguous transition screens.

Likely affected areas:

- lesson card model
- generated lesson phase/action schema
- feedback rendering
- final summary and lesson completion flow

Acceptance criteria:

- Checks do not reveal the answer before learner response unless explicitly in review mode.
- Rubric criteria match science content, not generic reflection labels.
- Final check has a clear submit-feedback-finish sequence.

## Priority Fix List

1. Add visible embedded answer composer for learner-output states.
2. Collapse old transition feedback and keep only current feedback expanded.
3. Fix right rail statuses so active concepts are shown as in progress.
4. Replace generic scaffold chips with concept-specific scaffolds.
5. Clarify CTA labels: continue, submit, check, finish, skip.
6. Reduce large empty vertical regions by tightening panel layout.
7. Add a compact final completion outcome and dashboard return path.

## Open Questions For Implementation

- Should learner responses be required for every "Your turn" and final check step, or can learners skip through lessons?
- Should the AI tutor generate model answers before or after learner attempts?
- Is "Review earlier steps" intended as transcript history, retry history, or feedback history?
- Should the right rail be interactive navigation or only progress context?
- Should concept checks be multiple choice, short answer, or adaptive based on learner confidence?
- Should final lesson completion create or update revision topics only after a valid final attempt, or after any completed flow?

