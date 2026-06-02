import {
  classifyLessonMessage,
  getLessonSectionForStage,
  getNextStage,
  SOFT_STUCK_STAY_THRESHOLD
} from '$lib/lesson-system';
import { getLatestTutorPrompt, getLatestTutorTeachingAnchor } from '$lib/lesson-tutor-prompt';
import type {
  Lesson,
  LessonChatRequest,
  LessonChatResponse,
  LessonSession,
  LessonStage
} from '$lib/types';

function normalizeLearnerReply(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^\w\s]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isAcknowledgementOnlyReply(message: string): boolean {
  const normalized = normalizeLearnerReply(message);

  if (!normalized) {
    return false;
  }

  return [
    'ok',
    'okay',
    'yes',
    'yep',
    'sure',
    'continue',
    'next',
    'go on',
    'carry on',
    'got it',
    'i understand',
    'i think i understand',
    'i think i understand this',
    'that makes sense',
    'makes sense'
  ].includes(normalized);
}

function isVagueConceptReply(message: string): boolean {
  const normalized = normalizeLearnerReply(message);

  if (!normalized) {
    return false;
  }

  return [
    'maybe',
    'maybe so',
    'i think so',
    'i guess',
    'not sure',
    'kind of',
    'sort of',
    'probably',
    'perhaps'
  ].includes(normalized);
}

function isMeaningfulConceptReply(message: string): boolean {
  const normalized = normalizeLearnerReply(message);

  if (!normalized) {
    return false;
  }

  if (isAcknowledgementOnlyReply(message) || isVagueConceptReply(message)) {
    return false;
  }

  if (classifyLessonMessage(message) === 'question') {
    return false;
  }

  const tokens = normalized.split(' ').filter(Boolean);
  const hasReasoningCue = tokens.some((token) =>
    [
      'because',
      'means',
      'shows',
      'uses',
      'equals',
      'changes',
      'change',
      'adds',
      'subtracts',
      'multiplies',
      'divides',
      'doubles',
      'halves',
      'grows',
      'increases',
      'decreases',
      'pattern',
      'rule',
      'relationship',
      'difference',
      'represents',
      'depends',
      'stays',
      'becomes'
    ].includes(token)
  );

  return /\d/.test(message) || hasReasoningCue || tokens.length >= 4;
}

function buildQuestionReply(session: LessonSession, lesson: Lesson, message: string): LessonChatResponse {
  // Handle concept card clarification requests ([CONCEPT: name] prefix)
  const conceptMatch = message.match(/^\[CONCEPT:\s*(.+?)\]/);
  if (conceptMatch) {
    const conceptName = conceptMatch[1].trim();

    // Try exact match in lesson.keyConcepts first (works when lesson is AI-generated and in state)
    const concept = lesson.keyConcepts?.find(
      (c) => c.name.toLowerCase() === conceptName.toLowerCase()
    );

    // Fallback: use [STUDENT_HAS_READ: ...] content embedded in the message itself.
    // askAboutConcept() always includes this so we can explain the concept even when
    // lesson.keyConcepts comes from the dynamic fallback and names don't match.
    const readMatch = message.match(/\[STUDENT_HAS_READ:\s*([\s\S]+?)\]/);
    const detailContent = concept?.detail ?? readMatch?.[1]?.trim() ?? null;

    if (detailContent) {
      const reply = [
        `Let me put **${conceptName}** another way.`,
        '',
        detailContent,
        '',
        '---',
        '',
        `Does that help? What part is still fuzzy?`
      ].join('\n');

      return {
        displayContent: reply,
        provider: 'local-fallback',
        metadata: {
          action: 'stay',
          next_stage: null,
          reteach_style: null,
          reteach_count: session.reteachCount,
          confidence_assessment: session.confidenceScore,
          profile_update: {}
        }
      };
    }
  }

  // General question fallback
  const stageContent = getLessonSectionForStage(lesson, session.currentStage);
  const topicName = lesson.title.replace(/^.*?:\s*/, '');

  const reply = [
    `Good question — let me clarify this within **${topicName}**.`,
    '',
    `The key anchor for ${topicName} is: ${lesson.concepts.body.split('.')[0]}.`,
    '',
    `If your question was about something more specific, try phrasing it in your own words and I will work through it with you.`,
    '',
    '---',
    '',
    `↩ **Back to the lesson** — we were working through: *${stageContent.split('\n')[0].replace(/\*\*/g, '')}*. Let's pick up from there.`
  ].join('\n');

  return {
    displayContent: reply,
    provider: 'local-fallback',
    metadata: {
      action: 'side_thread',
      next_stage: null,
      reteach_style: null,
      reteach_count: session.reteachCount,
      confidence_assessment: session.confidenceScore,
      profile_update: {
        step_by_step: 0.65
      }
    }
  };
}

function extractPromptAnchors(prompt: string): string[] {
  const inTermsOfMatch = prompt.match(/in terms of ([^?.!]+)/i);
  if (inTermsOfMatch?.[1]) {
    return inTermsOfMatch[1]
      .split(/,| and /i)
      .map((item) => item.replace(/^[\s:;.-]+|[\s:;.-]+$/g, '').trim())
      .filter(Boolean);
  }

  return [];
}

function buildPromptAwareSupportFrame(
  activePrompt: string,
  stage: LessonStage,
  teachingAnchor: string | null
): string {
  const lower = activePrompt.toLowerCase();
  const anchors = extractPromptAnchors(activePrompt);
  const firstQuestion = activePrompt.split('?').map((part) => part.trim()).filter(Boolean)[0] ?? activePrompt;

  if (/summari[sz]e|big picture|wrap this up/.test(lower)) {
    const anchorList =
      anchors.length > 0
        ? `Use the parts already named in the question: ${anchors.join(', ')}.`
        : 'Use the parts already named in the explanation above.';

    return [
      'Start with one sentence that states the main idea you are summarizing.',
      anchorList,
      'Then turn each part into a short supporting phrase instead of trying to write the whole answer at once.'
    ].join(' ');
  }

  if (/how .*impact|how did .*affect|what effect/i.test(lower)) {
    return [
      'Answer the first part only.',
      'Choose one element already mentioned above and link it to one concrete effect on people or society.',
      'Once you have that one link, you can add another.'
    ].join(' ');
  }

  if (/what do you think .*valued most|what did .*value most/i.test(lower)) {
    return [
      'Ignore that second, bigger inference for the moment.',
      'Start by answering the earlier, more concrete part of the question using one detail from the explanation above.',
      'You can return to the values part after that.'
    ].join(' ');
  }

  if (/which|what|identify|name/.test(lower)) {
    return [
      `Start with the exact part being asked: "${firstQuestion.replace(/\?$/, '')}."`,
      'Point to one clue, example, or detail already given above that directly supports your answer.'
    ].join(' ');
  }

  if (/how|why/.test(lower)) {
    return [
      `Start with the first question only: "${firstQuestion.replace(/\?$/, '')}."`,
      'Use one cause-and-effect link from the explanation above before you add anything broader.'
    ].join(' ');
  }

  if (teachingAnchor) {
    return [
      'Start from the explanation directly above.',
      'Pull out one detail from it and use that as your first move before you try to answer the whole prompt.'
    ].join(' ');
  }

  if (stage === 'practice' || stage === 'check') {
    return 'Start with one detail already given in the task above. Use that detail to make your first move before you try to answer everything.';
  }

  return 'Start with one detail that was already explained above. Use that detail for the first move before you try to answer the whole prompt.';
}

function buildHelpMeStartReply(session: LessonSession): LessonChatResponse {
  const activePrompt = getLatestTutorPrompt(session);
  const teachingAnchor = getLatestTutorTeachingAnchor(session);
  const stageSpecificScaffold: Record<LessonStage, string> = {
    orientation: `Start with the topic itself. Name the main idea above and one thing it helps you decide before you try to explain anything else.`,
    concepts: `Pick one key idea from the explanation above. State the rule or relationship it gives you before you try to connect all the ideas together.`,
    construction: `Use the build above as your anchor. Identify the first thing you need to notice or label before you try the full method.`,
    examples: `Copy the opening move from the worked example above. Match that same move to the example in front of you before worrying about the later steps.`,
    practice: `Do only the first move on the task above. Identify the rule, clue, category, or quantity you should use before you try to finish the whole answer.`,
    check: `Start with one sentence that states the main rule from above. Then use one detail from the task to support that sentence.`,
    complete: `Start with the strongest idea you remember from the lesson above and say why it mattered.`
  };

  return {
    displayContent: `${activePrompt
      ? buildPromptAwareSupportFrame(activePrompt, session.currentStage, teachingAnchor)
      : stageSpecificScaffold[session.currentStage]}\n\nTry just that first move now.`,
    provider: 'local-fallback',
    metadata: {
      action: 'stay',
      next_stage: null,
      reteach_style: 'step_by_step',
      reteach_count: session.reteachCount + 1,
      confidence_assessment: Math.max(0.36, Math.min(0.52, session.confidenceScore || 0.44)),
      response_mode: 'support',
      support_intent: 'help_me_start',
      profile_update: {
        step_by_step: 0.82,
        needs_repetition: 0.68
      }
    }
  };
}

function buildResponseReply(session: LessonSession, lesson: Lesson, message: string): LessonChatResponse {
  const lower = message.toLowerCase();
  const indicatesConfusion =
    lower.includes("don't get") ||
    lower.includes('confused') ||
    lower.includes('not sure') ||
    lower.includes('stuck');

  if (session.currentStage === 'check' && !indicatesConfusion) {
    return {
      displayContent: [
        `Nice. You've shown enough understanding to finish this lesson.`,
        ``,
        `**Summary:**`,
        lesson.summary.body,
        ``,
        `---`,
        ``,
        `**One more challenge before you go:**`,
        lesson.transferChallenge.body
      ].join('\n'),
      provider: 'local-fallback',
      metadata: {
        action: 'complete',
        next_stage: null,
        reteach_style: null,
        reteach_count: 0,
        confidence_assessment: 0.86,
        profile_update: {
          quiz_performance: 0.86,
          excelled_at: [lesson.title]
        }
      }
    };
  }

  if (indicatesConfusion) {
    return {
      displayContent: `No worries, let me try that a different way.\n\n**Step 1:** Keep the main rule in view.\n**Step 2:** Match it to this topic.\n**Step 3:** Test it on one small example before doing the whole task.\n\nTell me if that version feels clearer.`,
      provider: 'local-fallback',
      metadata: {
        action: 'reteach',
        next_stage: null,
        reteach_style: 'step_by_step',
        reteach_count: session.reteachCount + 1,
        confidence_assessment: 0.38,
        profile_update: {
          step_by_step: 0.8,
          needs_repetition: 0.72,
          struggled_with: [lesson.title]
        }
      }
    };
  }

  const nextStage = getNextStage(session.currentStage);
  const transitionLine =
    nextStage === 'check'
      ? `Good. Let's see how much has landed.`
      : `Good. Let's build on that.`;

  if (session.currentStage === 'concepts' && !isMeaningfulConceptReply(message)) {
    if ((session.softStuckCount ?? 0) >= SOFT_STUCK_STAY_THRESHOLD && nextStage) {
      return {
        displayContent: transitionLine,
        provider: 'local-fallback',
        metadata: {
          action: 'advance',
          next_stage: nextStage,
          reteach_style: null,
          reteach_count: 0,
          confidence_assessment: 0.68,
          profile_update: {
            abstract_thinking: 0.64
          }
        }
      };
    }

    return {
      displayContent:
        `Good start. Put the core idea in your own words: what is the key rule or relationship here?`,
      provider: 'local-fallback',
      metadata: {
        action: 'stay',
        next_stage: null,
        reteach_style: null,
        reteach_count: session.reteachCount,
        confidence_assessment: 0.46,
        profile_update: {
          abstract_thinking: 0.58
        }
      }
    };
  }

  if (!nextStage) {
    return {
      displayContent: `Good. Let's stay with this point for one more pass before moving on.`,
      provider: 'local-fallback',
      metadata: {
        action: 'stay',
        next_stage: null,
        reteach_style: null,
        reteach_count: session.reteachCount,
        confidence_assessment: 0.61,
        profile_update: {
          abstract_thinking: 0.62
        }
      }
    };
  }

  return {
    displayContent: transitionLine,
    provider: 'local-fallback',
    metadata: {
      action: 'advance',
      next_stage: nextStage,
      reteach_style: null,
      reteach_count: 0,
      confidence_assessment: 0.74,
      profile_update: {
        abstract_thinking: 0.66,
        quiz_performance: nextStage === 'check' ? 0.72 : undefined
      }
    }
  };
}

export function buildLocalLessonChatResponse(
  request: LessonChatRequest,
  lesson: Lesson
): LessonChatResponse {
  if (request.supportIntent === 'help_me_start') {
    return buildHelpMeStartReply(request.lessonSession);
  }

  if (request.messageType === 'question') {
    return buildQuestionReply(request.lessonSession, lesson, request.message);
  }

  return buildResponseReply(request.lessonSession, lesson, request.message);
}
