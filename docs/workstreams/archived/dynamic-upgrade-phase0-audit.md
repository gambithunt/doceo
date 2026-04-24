# Dynamic Upgrade Phase 0 Audit

This document is the Phase 0 architecture inventory, dependency map, schema draft, compatibility matrix, and risk record for the dynamic upgrade described in [dynamic-upgrade.md](/Users/delon/Documents/code/projects/doceo/docs/workstreams/dynamic-upgrade.md).

It freezes the current legacy lesson-launch shape before Phases 1 to 3 replace seeded catalogs and string identity with persistent graph-backed ids.

## Current Lesson-Start Entry Points

1. `appState.launchLesson(lessonId)`
   - Launches from the current curriculum tree and lesson catalog already loaded into client state.
   - Depends on `/api/curriculum/program` having produced the current `curriculum`, `lessons`, and `questions`.

2. `appState.startLessonFromShortlist(topic)`
   - Freeform topic flow.
   - Uses `/api/ai/topic-shortlist` to shortlist labels, then `/api/ai/lesson-plan` to generate a lesson artifact for the chosen shortlist item.

3. `appState.startLessonFromSelection(subjectId, sectionName)`
   - Dashboard/direct-prompt flow.
   - Skips shortlist selection and sends the typed `sectionName` directly to `/api/ai/lesson-plan`.

4. `/api/ai/lesson-chat`
   - In-session compatibility fallback.
   - Rebuilds the lesson via `buildDynamicLessonFromTopic` if the client omits lesson payload.

## Legacy Runtime Inventory

### `src/lib/data/learning-content.ts`

| Runtime consumer | Current usage | Classification |
| --- | --- | --- |
| `src/lib/data/platform.ts` | `createInitialState()` and derived compatibility rebuilds use `buildLearningProgram()` as seeded curriculum, lesson, and question truth. | source of truth |
| `src/lib/server/learning-program-repository.ts` | `buildLocalProgram()` and custom-subject merge use `buildLearningProgram()` when Supabase is unavailable, incomplete, or bypassed. | fallback |

### `src/lib/data/onboarding.ts`

| Runtime consumer | Current usage | Classification |
| --- | --- | --- |
| `src/lib/data/platform.ts` | Supplies default country/curriculum/grade/subject options, step order, recommendation logic, and initial selected subjects. | source of truth |
| `src/lib/server/onboarding-repository.ts` | Supplies country/curriculum/grade/subject options and recommendation logic whenever Supabase is unavailable or empty. | fallback |
| `src/routes/api/onboarding/complete/+server.ts` | Dynamic import fallback for recommendation and selection mode when database writes fail. | fallback |
| `src/lib/stores/app-state.ts` | Uses `getSelectionMode()` while mutating onboarding selections client-side. | source of truth |
| `src/lib/components/OnboardingWizard.svelte` | Uses `getRecommendedSubject()` to render the live onboarding recommendation. | source of truth |

### `src/lib/server/learning-program-repository.ts`

| Runtime consumer | Current usage | Classification |
| --- | --- | --- |
| `src/routes/api/curriculum/program/+server.ts` | Server entry point that builds the current curriculum program payload consumed by the frontend. | source of truth |

### `buildDynamicLessonFromTopic`

| Runtime consumer | Current usage | Classification |
| --- | --- | --- |
| `src/lib/stores/app-state.ts` | `getLessonForSession()` rebuilds a lesson from session labels if the lesson record is missing from local state. | fallback |
| `src/lib/ai/lesson-plan.ts` | Builds the local fallback lesson plan and also supplies deterministic local ids and default sections when AI output is incomplete. | fallback |
| `src/routes/api/ai/lesson-chat/+server.ts` | Rebuilds lesson content from `lessonSession` labels when chat requests omit a lesson payload. | fallback |

### `buildLearningProgram`

| Runtime consumer | Current usage | Classification |
| --- | --- | --- |
| `src/lib/data/platform.ts` | Builds the seeded curriculum graph, seeded lessons, and seeded questions used by the client bootstrap state. | source of truth |
| `src/lib/server/learning-program-repository.ts` | Builds a compatibility program when backend curriculum tables are unavailable and merges custom-subject local programs into Supabase-backed responses. | fallback |

## Dependency Map

### Onboarding options

`/api/state/bootstrap`
-> `src/lib/server/onboarding-repository.ts`
-> Supabase tables when present
-> otherwise `src/lib/data/onboarding.ts`

### Seeded curriculum and lesson catalog

`src/lib/data/platform.ts:createInitialState()`
-> `src/lib/data/onboarding.ts`
-> `buildLearningProgram()` from `src/lib/data/learning-content.ts`

### Structured lesson launch

`src/lib/stores/app-state.ts:fetchLearningProgram()`
-> `POST /api/curriculum/program`
-> `src/lib/server/learning-program-repository.ts:loadLearningProgram()`
-> Supabase curriculum tables when complete
-> otherwise `buildLearningProgram()`
-> `appState.launchLesson(lessonId)`

### Freeform lesson launch

`appState.shortlistTopics()`
-> `POST /api/ai/topic-shortlist`
-> shortlist item ids and labels are derived from topic labels
-> `appState.startLessonFromShortlist(topic)` or `appState.startLessonFromSelection(subjectId, sectionName)`
-> `POST /api/ai/lesson-plan`
-> `buildFallbackLessonPlan()`
-> `buildDynamicLessonFromTopic()`

### In-session fallback

`POST /api/ai/lesson-chat`
-> rebuild lesson via `buildDynamicLessonFromTopic()` if lesson payload is absent

## String Identity Audit

### Lesson-launch critical

| Path | Current string anchor | Why it matters |
| --- | --- | --- |
| `src/lib/server/learning-program-repository.ts` | `selectedSubjectNames` and `customSubjects` are still accepted as launch inputs. | Lesson program generation still depends on labels, especially for custom subjects. |
| `src/lib/stores/app-state.ts:buildDirectTopicOption()` | Freeform topic ids are synthetic slugs from `subjectName` and typed text. | Generated ids are not persistent graph ids and can collide after renames or scope changes. |
| `src/lib/ai/topic-shortlist.ts:buildFallbackTopicShortlist()` | Fallback topic, subtopic, and lesson ids are derived from learner text or matched labels. | Shortlist results are not stable backend identities. |
| `src/lib/ai/lesson-plan.ts` and `src/lib/lesson-system.ts` | Lesson ids come from `subjectId + slug(topicTitle)`. | Artifact identity changes if the title changes, even when the concept is the same. |
| `src/lib/stores/app-state.ts:startLessonFromSelection()` | `sectionName` is treated as the lesson/topic anchor for direct launch. | Direct dashboard launches bypass a persistent node lookup. |

### Planner critical

| Path | Current string anchor | Why it matters |
| --- | --- | --- |
| `src/lib/revision/planner.ts` | Manual plan validation compares normalized topic/subtopic/lesson titles. | Revision plans still store labels instead of graph ids. |
| `src/lib/revision/plans.ts` | `plan.topics` is matched against `revisionTopic.topicTitle` with case-insensitive string comparison. | Plan execution can drift if labels change or duplicate topics exist in one subject. |
| `src/lib/revision/plans.ts:buildSyntheticTopic()` | Synthetic revision topics use `slugify(topicTitle)` for ids. | Synthetic ids are compatibility ids, not canonical graph ids. |

### Migration-only or normalization-only

| Path | Current string anchor | Why it matters |
| --- | --- | --- |
| `src/lib/data/platform.ts:repairRevisionPlanSubject()` | Infers `subjectId` from `subjectName` and plan topic labels. | This is a migration repair path that should disappear after ids are canonical. |
| `src/lib/data/platform.ts:normalizeRevisionTopic()` | Infers subject identity from `topicTitle` and `subject` labels. | Legacy state hydration still repairs by label. |
| `src/lib/components/SubjectView.svelte` | Opens subjects by matching `selectedSubjectNames` to `subject.name`. | UI selection still has a label-based compatibility path. |

## Schema Drafts

### Graph node schema

```ts
type GraphNodeType = 'country' | 'curriculum' | 'grade' | 'subject' | 'topic' | 'subtopic';
type GraphNodeStatus = 'canonical' | 'provisional' | 'review_needed' | 'merged' | 'archived' | 'rejected';
type GraphNodeOrigin =
  | 'imported'
  | 'model_proposed'
  | 'admin_created'
  | 'learner_discovered'
  | 'promoted_from_provisional';

interface GraphScope {
  countryId: string | null;
  curriculumId: string | null;
  gradeId: string | null;
}

interface GraphNode {
  id: string;
  type: GraphNodeType;
  label: string;
  normalizedLabel: string;
  parentId: string | null;
  scope: GraphScope;
  description: string | null;
  status: GraphNodeStatus;
  trustScore: number;
  origin: GraphNodeOrigin;
  provenance: {
    source: 'catalog_import' | 'model' | 'admin' | 'learner';
    detail: string | null;
    requestId: string | null;
  };
  createdAt: string;
  updatedAt: string;
  supersededBy: string | null;
  mergedInto: string | null;
}
```

### Graph alias schema

```ts
interface GraphAlias {
  id: string;
  nodeId: string;
  aliasLabel: string;
  normalizedAlias: string;
  scope: GraphScope;
  confidence: number;
  source: 'imported' | 'model_proposed' | 'admin_created' | 'learner_discovered';
  createdAt: string;
  updatedAt: string;
  supersededBy: string | null;
}
```

### Graph event schema

```ts
type GraphEventType =
  | 'node_created'
  | 'alias_added'
  | 'node_reused'
  | 'node_promoted'
  | 'node_demoted'
  | 'node_merged'
  | 'node_archived'
  | 'node_rejected'
  | 'admin_edit_applied';

interface GraphEvent {
  id: string;
  nodeId: string;
  eventType: GraphEventType;
  actorType: 'system' | 'admin' | 'migration';
  actorId: string | null;
  payload: Record<string, unknown>;
  correlationId: string | null;
  occurredAt: string;
}
```

### Lesson artifact schema

```ts
type ArtifactType =
  | 'lesson'
  | 'lesson_questions'
  | 'revision_pack'
  | 'revision_questions'
  | 'plan_summary'
  | 'hints'
  | 'explanation';

type ArtifactStatus = 'active' | 'preferred' | 'stale' | 'deprecated' | 'rejected';

interface ArtifactScope extends GraphScope {
  subjectId: string | null;
  topicId: string | null;
  subtopicId: string | null;
}

interface LessonArtifactRecord {
  id: string;
  artifactType: 'lesson';
  nodeId: string;
  scope: ArtifactScope;
  pedagogyVersion: string;
  promptVersion: string;
  model: string;
  provider: string;
  createdAt: string;
  status: ArtifactStatus;
  ratingSummary: ArtifactRatingSummary;
  regenerationReason: string | null;
  payload: {
    lesson: unknown;
    questions: unknown[];
  };
  supersedesArtifactId: string | null;
}
```

### Lesson artifact rating schema

```ts
type ArtifactRatingSource = 'learner' | 'system' | 'admin';
type ArtifactRatingSignal =
  | 'explicit_rating'
  | 'completion_outcome'
  | 'reteach_frequency'
  | 'revision_outcome'
  | 'admin_review';

interface ArtifactRating {
  id: string;
  artifactId: string;
  source: ArtifactRatingSource;
  signal: ArtifactRatingSignal;
  score: number;
  feedback: string | null;
  lessonSessionId: string | null;
  revisionSessionId: string | null;
  createdAt: string;
}

interface ArtifactRatingSummary {
  meanScore: number;
  count: number;
  lowScoreCount: number;
  completionRate: number;
  lastRatedAt: string | null;
}
```

### Minimal Node Resolution Contract

```ts
interface ResolveNodeRequest {
  type: 'subject' | 'topic' | 'subtopic';
  label: string;
  parentId: string | null;
  scope: GraphScope;
  allowProvisionalCreate: boolean;
}

interface ResolveNodeResponse {
  outcome: 'exact' | 'alias' | 'created_provisional' | 'ambiguous' | 'not_found';
  node:
    | {
        id: string;
        type: 'subject' | 'topic' | 'subtopic';
        label: string;
        status: 'canonical' | 'provisional' | 'review_needed';
      }
    | null;
  matchedAlias:
    | {
        id: string;
        aliasLabel: string;
        confidence: number;
      }
    | null;
  ambiguousNodeIds: string[];
  eventId: string | null;
}
```

## Compatibility Matrix

| Legacy path | Keep through | Cutover condition | Rollback boundary |
| --- | --- | --- | --- |
| `src/lib/server/learning-program-repository.ts` local fallback via `buildLearningProgram()` | Phase 3 | Graph-backed metadata exists, lesson launch resolves node ids, and preferred lesson artifacts can be fetched/generated without local catalogs. | Route-level fallback stays behind `/api/curriculum/program` until graph lesson launch is stable. |
| `src/lib/data/onboarding.ts` seeded option catalogs | Phase 2 for production, optional Phase 3 for dev/bootstrap only | Graph-backed onboarding endpoints fully replace production option loading and recommendation logic. | Server-side onboarding repository may temporarily fall back if graph reads fail. |
| `buildDynamicLessonFromTopic()` local lesson builder | Phase 3 | Lesson artifact service returns persistent artifact ids and payloads for every lesson launch path. | Keep local builder as non-canonical emergency fallback until artifact service error rate is acceptable. |
| Label-backed freeform shortlist ids in `topic-shortlist.ts` and `app-state.ts` | Phase 3 | Resolution service returns graph node ids for shortlist candidates and freeform requests. | Shortlist labels can still render for copy, but ids must come from the graph. |
| Revision planner string topic lists | No cutover in Phases 1 to 3 | Planner rebuild begins in later phases. | Leave planner compatibility untouched during Phases 1 to 3. |

## Migration Risks

1. Custom subjects are names-only in current runtime state, so future backfill must distinguish between legitimate new graph nodes and display-only labels.
2. Freeform lesson flows generate synthetic ids from learner text, which can collide across scopes and cannot survive relabeling.
3. Revision plans still store `topics: string[]`, so backfilling plan ids later will require ambiguity handling instead of silent direct mapping.
4. `buildDynamicLessonFromTopic()` currently makes artifact-like ids from topic labels, so any rename changes the effective identity of the lesson.
5. Onboarding fallback logic can diverge from backend data because `src/lib/data/onboarding.ts` remains a parallel catalog.

## Findings

1. The current lesson launch surface is split across two different compatibility systems: seeded catalog launch through `/api/curriculum/program` and freeform lesson generation through `/api/ai/lesson-plan`.
2. The app already has several id fields, but many of them are generated from labels rather than persisted backend identity. The migration risk is not lack of ids, but false confidence in unstable ids.
3. Revision planning is the largest remaining label-based surface outside Phase 0 lesson launch, so it should stay explicitly out of scope until Phases 4+ rather than being partially migrated during Phases 1 to 3.
4. `src/routes/api/subjects/verify/+server.ts` already introduces provisional subject verification and DB writes. Phase 1 graph work should align with that behavior rather than creating a second provisional-subject path.
