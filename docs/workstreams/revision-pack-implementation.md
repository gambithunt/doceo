# Revision Pack — Edge Function Implementation

## Root Cause

The SvelteKit route `POST /api/ai/revision-pack` calls `invokeAuthenticatedAiEdge` with mode `'revision-pack'`. The Supabase edge function `github-models-tutor/index.ts` does not handle this mode:

1. **`isAiMode` guard (line 313):** Does not include `'revision-pack'` — returns `false`, causing an immediate `{ error: 'Unsupported AI mode.' }` 400 response.
2. **`buildModeRequest` switch (line 1104):** No `'revision-pack'` case — would return `undefined` if the guard didn't catch it first.
3. **`buildModeResponse` switch (line 1141):** No `'revision-pack'` case — same gap.
4. **`EdgePayload.request` union (line 280):** Does not include a `RevisionPackRequest` variant.

The `AiMode` type in `src/lib/ai/model-tiers.ts` already includes `'revision-pack'` (line 10), so the shared type is correct. The edge function just never implemented the mode.

The SvelteKit client sees a non-200 response from the edge function and maps it to a 502 Bad Gateway.

---

## Required Code Paths

The following must be added to `supabase/functions/github-models-tutor/index.ts`, following the existing patterns for modes like `lesson-plan`:

1. **Request interface** — typed input for the revision-pack prompt builder
2. **System prompt builder** — instructs the model to generate structured revision questions
3. **User prompt builder** — serialises the student context, topics, and learner profile
4. **Response parser** — extracts and validates the JSON the model returns
5. **Wiring** — add `'revision-pack'` to `isAiMode`, `buildModeRequest`, `buildModeResponse`, and the `EdgePayload.request` union

---

## Tasks

- [x] **Task 1 — Add `RevisionPackEdgeRequest` interface**

- [x] **Task 2 — Add `EdgePayload.request` union member**

  **File:** `supabase/functions/github-models-tutor/index.ts` (line 280)

  Add `RevisionPackEdgeRequest` to the union:

  ```ts
  type EdgePayload = {
    request: AskQuestionRequest | SubjectHintsRequest | TopicShortlistRequest
      | LessonSelectorRequest | LessonPlanRequest | LessonChatRequest
      | SubjectVerifyRequest | RevisionPackEdgeRequest;
    mode?: AiMode;
    modelTier?: ModelTier;
  };
  ```

  **Acceptance:** No TypeScript error on the union.

---

- [x] **Task 3 — Add `'revision-pack'` to `isAiMode`**

  **File:** `supabase/functions/github-models-tutor/index.ts` (line 313)

  Add `value === 'revision-pack'` to the guard. This is the direct cause of the 400.

  **Acceptance:** Sending `mode: 'revision-pack'` no longer returns `Unsupported AI mode.`

---

- [x] **Task 4 — Build `buildRevisionPackSystemPrompt`**

  **File:** `supabase/functions/github-models-tutor/index.ts`

  Follow the pattern of `createLessonPlanSystemPrompt` (line 538). The prompt must instruct the model to return **valid JSON only** with exactly these top-level keys:

  ```
  sessionTitle: string
  sessionRecommendations: string[]   (1-3 items)
  questions: RevisionQuestion[]
  ```

  Each question must include:
  ```
  id: string                (unique, e.g. "rq-1")
  revisionTopicId: string   (must match a topic's lessonSessionId from input)
  questionType: 'recall' | 'explain' | 'apply' | 'spot_error' | 'transfer'
  prompt: string
  expectedSkills: string[]
  misconceptionTags: string[]
  difficulty: 'foundation' | 'core' | 'stretch'
  helpLadder: { nudge, hint, workedStep, miniReteach, lessonRefer }
  transferPrompt: string | null
  ```

  **Prompt design considerations:**
  - Use `getSubjectLens` (line 582) to adapt language per subject
  - Tell the model the student's confidence scores, misconception signals, and calibration data so it can calibrate difficulty
  - For `mode: 'quick_fire'`, instruct shorter prompts and mostly `recall`/`apply` types
  - For `mode: 'deep_revision'`, instruct longer explanatory prompts with `explain`/`spot_error`/`transfer` mix
  - For `mode: 'teacher_mode'`, instruct open-ended Socratic questions using `questionType: 'teacher_mode'`
  - For `mode: 'shuffle'`, instruct a random mix across all types
  - Default question count: 5 (or `targetQuestionCount` from request if provided)
  - Each `revisionTopicId` must be the `lessonSessionId` of one of the input topics — the model must distribute questions across topics

  **Acceptance:** Returns a string. Contains the JSON schema description. Includes tone rules consistent with Doceo's voice.

---

- [x] **Task 5 — Build `buildRevisionPackUserPrompt`**

  **File:** `supabase/functions/github-models-tutor/index.ts`

  Follow the pattern of `createLessonPlanUserPrompt` (line 566) — serialise the request as JSON. Include:

  ```ts
  function buildRevisionPackUserPrompt(request: RevisionPackEdgeRequest): string {
    return JSON.stringify({
      student: {
        name: request.student.fullName,
        grade: request.student.grade,
        curriculum: request.student.curriculum,
        country: request.student.country,
        term: request.student.term,
        year: request.student.schoolYear
      },
      learnerProfile: {
        quizPerformance: request.learnerProfile.quiz_performance,
        stepByStep: request.learnerProfile.step_by_step,
        needsRepetition: request.learnerProfile.needs_repetition,
        conceptsStruggledWith: request.learnerProfile.concepts_struggled_with,
        conceptsExcelledAt: request.learnerProfile.concepts_excelled_at,
        totalSessions: request.learnerProfile.total_sessions
      },
      topics: request.topics.map((t) => ({
        lessonSessionId: t.lessonSessionId,
        subject: t.subject,
        topicTitle: t.topicTitle,
        curriculumReference: t.curriculumReference,
        confidenceScore: t.confidenceScore,
        retentionStability: t.retentionStability,
        forgettingVelocity: t.forgettingVelocity,
        misconceptionSignals: t.misconceptionSignals,
        calibration: t.calibration
      })),
      mode: request.mode,
      recommendationReason: request.recommendationReason,
      targetQuestionCount: request.targetQuestionCount ?? 5
    });
  }
  ```

  **Acceptance:** Returns a JSON string. All fields the system prompt references are present.

---

- [x] **Task 6 — Build `parseRevisionPackResponse`**

  **File:** `supabase/functions/github-models-tutor/index.ts`

  Must validate the exact shape that `isStructuredRevisionPack` in `+server.ts:44` checks on the client side:

  ```ts
  function parseRevisionPackResponse(
    content: string,
    request: RevisionPackEdgeRequest
  ): RevisionPackGenerationPayload | null {
    const parsed = parseJson<{
      sessionTitle?: string;
      sessionRecommendations?: string[];
      questions?: Array<{
        id?: string;
        revisionTopicId?: string;
        questionType?: string;
        prompt?: string;
        expectedSkills?: string[];
        misconceptionTags?: string[];
        difficulty?: string;
        helpLadder?: {
          nudge?: string;
          hint?: string;
          workedStep?: string;
          miniReteach?: string;
          lessonRefer?: string;
        };
        transferPrompt?: string | null;
      }>;
    }>(content);

    if (
      !parsed?.sessionTitle ||
      !Array.isArray(parsed.sessionRecommendations) ||
      !Array.isArray(parsed.questions) ||
      parsed.questions.length === 0
    ) {
      return null;
    }

    // Validate every question has the required fields
    const validQuestions = parsed.questions.every(
      (q) =>
        typeof q.id === 'string' &&
        typeof q.revisionTopicId === 'string' &&
        typeof q.prompt === 'string' &&
        Array.isArray(q.expectedSkills) &&
        Array.isArray(q.misconceptionTags) &&
        q.helpLadder &&
        typeof q.helpLadder.nudge === 'string'
    );

    if (!validQuestions) return null;

    return parsed as RevisionPackGenerationPayload;
  }
  ```

  **Critical:** The validation here must mirror `isStructuredRevisionPack` in `+server.ts:44-61`. If the edge function returns a shape that passes _this_ parser but fails the client-side check, the result is still a 502. Keep them in sync.

  **Note:** `RevisionPackGenerationPayload` is defined in `src/lib/types.ts`. The edge function cannot import it directly (Deno runtime, different module system). Redefine the return type inline or use a local interface that matches the shape.

  **Acceptance:** Returns `null` for malformed responses. Returns the typed payload for valid responses. The shape passes `isStructuredRevisionPack` on the SvelteKit side.

---

- [x] **Task 7 — Wire into `buildModeRequest` and `buildModeResponse`**

  **File:** `supabase/functions/github-models-tutor/index.ts`

  Add cases to both switch statements:

  ```ts
  // In buildModeRequest (line 1104):
  case 'revision-pack':
    return buildGithubRequest(model, 0.3, [
      { role: 'system', content: buildRevisionPackSystemPrompt() },
      { role: 'user', content: buildRevisionPackUserPrompt(request as RevisionPackEdgeRequest) }
    ]);

  // In buildModeResponse (line 1141):
  case 'revision-pack': {
    const response = parseRevisionPackResponse(content, request as RevisionPackEdgeRequest);
    return response
      ? { ...response, provider: PROVIDER, modelTier, model }
      : null;
  }
  ```

  **Temperature:** 0.3 is a reasonable starting point (same as `tutor`). The response is structured JSON — low temperature reduces hallucinated keys. May need tuning.

  **Response spread:** Uses `{ ...response, provider, modelTier, model }` (same pattern as `lesson-plan`) because the client expects `sessionTitle`, `sessionRecommendations`, and `questions` as top-level keys alongside `provider`/`model`.

  **Acceptance:** Sending a valid revision-pack request returns a JSON response with `sessionTitle`, `sessionRecommendations`, `questions`, `provider`, `modelTier`, `model`.

---

- [x] **Task 8 — Redeploy / restart edge function**

  After code changes, restart the local Supabase function serve:

  ```bash
  supabase functions serve
  ```

  Or if using a deployed instance, redeploy:

  ```bash
  supabase functions deploy github-models-tutor
  ```

  **Acceptance:** Function starts without errors. Logs show `serving the request with supabase/functions/github-models-tutor` on request.

---

- [x] **Task 9 — Unit tests for prompt builders and response parser**

  **File:** New file `supabase/functions/github-models-tutor/index.test.ts` or add to existing test file if one exists.

  Since the edge function is a single Deno file with no exports, testing the internal functions directly may require extracting them or using integration-style tests. Pragmatic options:

  **Option A — Extract and test:**
  Move `buildRevisionPackSystemPrompt`, `buildRevisionPackUserPrompt`, and `parseRevisionPackResponse` to a shared module that both the edge function and tests import.

  **Option B — Integration test via HTTP:**
  Use the existing Vitest setup to call the edge function endpoint with a mock request and assert the response shape. This tests the full path but requires the function to be running.

  **Minimum test cases:**
  1. `parseRevisionPackResponse` returns `null` for empty string
  2. `parseRevisionPackResponse` returns `null` for JSON missing `questions`
  3. `parseRevisionPackResponse` returns `null` for questions missing `helpLadder.nudge`
  4. `parseRevisionPackResponse` returns valid payload for well-formed JSON
  5. `buildRevisionPackUserPrompt` includes all topic `lessonSessionId` values
  6. System prompt contains the JSON schema description

  **Acceptance:** All tests pass. Parser rejects every shape that `isStructuredRevisionPack` would reject.

---

- [x] **Task 10 — End-to-end manual verification**

  1. Start local Supabase: `supabase start` or `supabase functions serve`
  2. Start dev server: `npm run dev`
  3. Navigate to the Revision tab
  4. Click "Revise" on a topic
  5. Confirm: no 400/500/502 error
  6. Confirm: revision session loads with questions
  7. Confirm: questions have `helpLadder` with all 5 fields populated
  8. Confirm: `revisionTopicId` on each question matches a topic's `lessonSessionId`
  9. Check browser Network tab: response from `/api/ai/revision-pack` is 200 with valid JSON

---

## Files Touched

| File | Change |
|------|--------|
| `supabase/functions/github-models-tutor/index.ts` | Add interface, prompts, parser, wire into switches and guard |
| `src/lib/ai/model-tiers.ts` | **No change needed** — `'revision-pack'` already in `AiMode` |
| `src/routes/api/ai/revision-pack/+server.ts` | **No change needed** — client-side caller and validator already exist |
| `src/lib/server/revision-generation-service.ts` | **No change needed** — already calls the edge correctly |

---

## Schema / Typing Concerns

- The edge function runs in **Deno**, not Node. It cannot import from `$lib/types.ts` via SvelteKit aliases. Any shared types (`RevisionPackGenerationPayload`, `RevisionQuestion`, `RevisionHelpLadder`) must be redefined locally in the edge function or matched by shape.
- The edge function currently imports `AiMode` and `ModelTier` from `src/lib/ai/model-tiers.ts` using a relative path (line 5-7). This works because the types are simple string unions. The revision-pack types are more complex — don't try to import them. Define local interfaces.
- **Dual validation risk:** `isStructuredRevisionPack` (SvelteKit side) and `parseRevisionPackResponse` (edge side) both validate the response shape. If one is stricter than the other, valid responses may be rejected. Keep them aligned. A shared validation function would be ideal but is blocked by the Deno/SvelteKit boundary.

---

## Prompt Generation Requirements

The system prompt must produce JSON that passes `isStructuredRevisionPack`. Non-negotiable fields:

| Field | Type | Source |
|-------|------|--------|
| `sessionTitle` | `string` | Model generates based on topics |
| `sessionRecommendations` | `string[]` | Model generates (1-3 items) |
| `questions[].id` | `string` | Model generates (unique per question) |
| `questions[].revisionTopicId` | `string` | Must be a `lessonSessionId` from input |
| `questions[].prompt` | `string` | Model generates |
| `questions[].expectedSkills` | `string[]` | Model generates |
| `questions[].misconceptionTags` | `string[]` | Model generates |
| `questions[].helpLadder.nudge` | `string` | Model generates |
| `questions[].helpLadder.hint` | `string` | Model generates |
| `questions[].helpLadder.workedStep` | `string` | Model generates |
| `questions[].helpLadder.miniReteach` | `string` | Model generates |
| `questions[].helpLadder.lessonRefer` | `string` | Model generates |

Optional but expected: `questionType`, `difficulty`, `transferPrompt`.

The prompt must explicitly list these field names and types. Models follow JSON schemas more reliably when the schema is spelled out verbatim.

---

## Response Parsing Requirements

- Use `parseJson<T>()` (existing utility, line 329) for initial JSON extraction
- Validate every required field before returning — don't trust the model
- If any question is malformed, reject the entire response (return `null`) — partial packs cause downstream errors
- The `revisionTopicId` on each question must be one of the input topics' `lessonSessionId` values — the parser should verify this

---

## Client/Server Integration

The integration path is already built — no new wiring needed on the SvelteKit side:

```
UI (Revise button)
  → app-state.ts: startRevisionPack()
    → fetch('/api/ai/revision-pack')
      → +server.ts: invokeAuthenticatedAiEdge('revision-pack', ...)
        → Supabase edge function: github-models-tutor
          → GitHub Models API
        ← JSON response
      ← isStructuredRevisionPack validation
    ← RevisionPackResponse
  → ActiveRevisionSession created
```

The only missing piece is the edge function handler. Everything upstream and downstream is wired.

---

## Risks and Open Questions

1. **Prompt quality:** The model may not reliably produce valid `helpLadder` objects with all 5 fields on every question. If this happens frequently, consider making `helpLadder` fields optional in the parser and backfilling defaults — but this conflicts with `isStructuredRevisionPack` which requires `nudge`. May need to relax the client-side validator or add retry logic.

2. **Token budget:** A revision pack with 5 questions, each containing a help ladder with 5 fields, plus `sessionRecommendations`, is a large structured output. With `gpt-4.1-mini`, this should fit comfortably, but monitor for truncated responses that fail JSON parsing.

3. **`revisionTopicId` alignment:** The model must echo back exact `lessonSessionId` strings from the input. If it hallucinates or truncates these IDs, questions won't align to topics. The user prompt should emphasise this constraint. Consider adding a fallback in the parser that maps unrecognised IDs to the first topic.

4. **Mode-specific behaviour:** The four modes (`quick_fire`, `deep_revision`, `shuffle`, `teacher_mode`) need distinct prompt instructions. A single generic prompt may produce acceptable results initially, but mode differentiation will likely need iteration.

5. **`teacher_mode` question type:** The `RevisionQuestionType` includes `'teacher_mode'` but this isn't a standard pedagogical question type. The prompt must explain what this means to the model (open-ended Socratic question, no single right answer).

6. **No streaming:** The current edge function uses a synchronous `callGithubModels` → `JSON.parse` flow. If revision-pack responses are slow, the Supabase isolate wall clock limit may terminate the function. The config currently has no explicit timeout set. Monitor this — if it recurs, a wall clock timeout increase in `supabase/config.toml` or a streaming approach may be needed.
