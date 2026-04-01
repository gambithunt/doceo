# Dynamic Upgrade

## Goal

Rebuild Doceo so that:

- no subjects, topics, subtopics, lessons, lesson questions, revision packs, or revision prompts are hardcoded in the frontend
- pedagogy stays structured and stable
- content becomes dynamic, adaptable, and global
- the curriculum graph can grow naturally as new learners, countries, curriculums, and subjects appear
- graph growth is automatic by default, fully logged, and visible/editable in the admin section

The target system is:

- **dynamic content generation**
  - lessons
  - lesson questions
  - revision packs
  - revision questions
  - revision plan summaries
  - topic explanations
  - hint chips and recommendation text
- **adaptable backend graph**
  - country
  - curriculum
  - grade
  - subject
  - topic
  - subtopic
  - aliases
  - relationships
  - provenance
  - trust/confidence
  - lifecycle status
- **stable pedagogy**
  - lesson stages
  - lesson quality bar
  - revision structure
  - plan structure
  - feedback and scheduling framework

This keeps Doceo dynamic without becoming shapeless.

---

## Product Decisions

These decisions are now fixed for this workstream.

1. **No local seeded content**
   - Remove `learning-content.ts` as a runtime source of authored lessons/questions/topics.
   - Remove hardcoded frontend subject/topic catalogs as a runtime source of truth.

2. **Keep structured teaching**
   - Preserve the lesson and revision frameworks already proven in the app.
   - Lesson structure remains guided by:
     - `docs/lesson-plan.md`
     - `docs/lesson-structure.md`
     - `docs/what-makes-a-good-lesson.md`

3. **Adaptable graph, not freeform chaos**
   - The graph can grow automatically.
   - New model-proposed nodes are persisted with stable ids and lifecycle state.
   - Runtime systems must use ids, not raw labels.

4. **Automatic progression of provisional graph nodes**
   - Graph growth is natural and automatic.
   - Progression events are logged.
   - Admin can inspect, merge, edit, promote, demote, archive, or reject nodes.

5. **Artifact caching is rating-aware**
   - Generated lesson/revision artifacts can be reused.
   - High-rated artifacts should be preferred.
   - Low-rated artifacts should trigger regeneration rather than silently remain the default.

6. **Freeform topic requests are allowed**
   - If a request does not map to an existing node, the system can create a provisional node.
   - That node becomes the anchor for lesson and revision generation.

---

## Core Principle

Doceo should hardcode **how to teach well**, not **what specific topics exist**.

That means:

- keep fixed pedagogical schemas
- keep fixed content quality standards
- generate content dynamically against graph nodes
- let the graph evolve with real usage

---

## Design Guidance

All build work in this upgrade must follow:

- `docs/design-langauge.md`
- `docs/workstreams/design-color-01.md`

Implementation implications:

- dark mode remains the primary experience
- light mode must remain fully supported
- admin and operational tooling must feel like part of the same Doceo system, not a detached back office
- use token-driven surfaces, restrained hierarchy, soft elevation, and a single strong primary action per screen
- use color meaningfully for status:
  - teal / success for trusted and promoted
  - yellow / attention for provisional or review-needed
  - red / error for rejected or broken mappings
  - blue / informational for generated candidates and lineage
  - purple only where content lineage or generation provenance needs a distinct tone

Admin UI for graph operations should use:

- soft cards
- clear metadata pills
- strong section grouping
- visible event timelines
- no noisy tables by default if cards or split views communicate better

---

## Canonical Architecture

### 1. Pedagogy Layer

Stable and versioned.

Owns:

- lesson stages
- stage purposes
- lesson section schema
- lesson quality standards
- revision pack schema
- revision diagnosis schema
- intervention schema
- revision scheduling schema
- plan summary schema
- prompt versioning

This layer is global and reusable across all countries and subjects.

### 2. Curriculum Graph Layer

Adaptable, backend-owned, persistent.

Owns:

- countries
- curriculums
- grades
- subjects
- topics
- subtopics
- aliases
- parent-child relationships
- curriculum references
- provenance
- trust score
- lifecycle status
- merge history

This layer is the canonical anchor for generation and analytics.

### 3. Generated Artifact Layer

Generated from graph node + learner context + pedagogy schema.

Owns:

- generated lessons
- generated lesson question sets
- generated revision packs
- generated revision question sets
- generated summaries
- generated hints
- generated explanations

Artifacts are immutable records with ratings and lineage.

### 4. Runtime Layer

Owns:

- lesson sessions
- revision sessions
- attempts
- ratings
- learner profile
- scheduling
- progress
- plan selection

Runtime records reference graph ids and artifact ids.

---

## Graph Model

The graph must no longer be inferred from frontend strings.

### Node Types

- `country`
- `curriculum`
- `grade`
- `subject`
- `topic`
- `subtopic`

### Required Fields

- `id`
- `type`
- `label`
- `normalizedLabel`
- `parentId`
- `scope`
  - country
  - curriculum
  - grade band or grade id
- `aliases`
- `description`
- `status`
- `trustScore`
- `origin`
- `createdAt`
- `updatedAt`
- `supersededBy`
- `mergedInto`

### Status Values

- `canonical`
- `provisional`
- `review_needed`
- `merged`
- `archived`
- `rejected`

### Origin Values

- `imported`
- `model_proposed`
- `admin_created`
- `learner_discovered`
- `promoted_from_provisional`

---

## Provisional Graph Progression

Provisional progression should be automatic and natural, but fully observable.

### Proposed Lifecycle

1. **Create provisional**
   - A user asks for a topic that cannot be confidently mapped.
   - The model proposes a node.
   - The node is stored with `status = provisional`.

2. **Reuse**
   - The same or near-equivalent request appears again.
   - The system resolves to the same provisional node or alias cluster.
   - Reuse count increases.

3. **Evidence accumulation**
   - Positive lesson ratings
   - Positive revision ratings
   - Repeated successful matches
   - Low contradiction rate
   - No strong admin rejection signals

4. **Automatic promotion**
   - Once thresholds are met, the node becomes `canonical`.
   - Promotion is logged as a graph event.

5. **Admin override**
   - Admin can merge, rename, demote, archive, or reject at any time.

### Promotion Signals

- repeated successful resolution count
- average artifact rating
- completion rate
- repeat use across users
- consistency with parent scope
- alias confidence

### Demotion or Review Signals

- repeated low ratings
- high duplicate overlap
- frequent admin edits
- conflicting curriculum scope
- contradictory alias proposals

### Required Event Logging

Every lifecycle change must emit a graph event:

- node created
- alias added
- node reused
- node promoted
- node demoted
- node merged
- node archived
- node rejected
- admin edit applied

These events must be visible in admin.

---

## Artifact Model

Generated artifacts should never be “just cached strings”.

Each artifact must store:

- `id`
- `artifactType`
  - lesson
  - lesson_questions
  - revision_pack
  - revision_questions
  - plan_summary
  - hints
  - explanation
- `nodeId`
- `scope`
- `pedagogyVersion`
- `promptVersion`
- `model`
- `provider`
- `createdAt`
- `status`
  - active
  - preferred
  - stale
  - deprecated
  - rejected
- `ratingSummary`
- `regenerationReason`
- `payload`

### Artifact Reuse Rules

- high-rated artifacts become preferred
- neutral artifacts remain usable
- low-rated artifacts are kept historically but should not remain preferred
- regeneration creates a new artifact, not an overwrite

### Rating Inputs

- learner rating
- completion outcome
- reteach frequency
- revision outcome after lesson
- admin rating

---

## Identity Rules

This rebuild requires strict identity discipline.

### Must Use IDs

- lesson launches
- revision plans
- revision topics
- generated hints once selected
- lesson sessions
- revision sessions
- analytics
- admin events

### Must Not Rely On Raw Strings

- selected plan topics
- revision synthetic topic creation
- planner suggestions after selection
- subject identity
- graph promotion logic

Raw strings may still exist in prompts and display copy, but not as identity anchors.

---

## What Must Be Removed

### Remove As Runtime Sources Of Truth

- `src/lib/data/learning-content.ts`
- frontend-authored lesson topic trees
- frontend-authored lesson bodies
- frontend-authored lesson questions
- frontend-authored revision question prompts
- frontend-authored revision hints as canonical content
- local subject fallback catalogs as runtime truth in `src/lib/data/onboarding.ts`

### Remove As Architectural Concepts

- “seeded vs dynamic lesson” split
- “synthetic revision topic as string-only fallback” as a primary model
- “selected topic = label string” identity model

---

## What Must Remain

These remain, but as structured schemas and generation contracts rather than local content.

- lesson stage order
- lesson section requirements
- revision flow requirements
- intervention taxonomy
- quality standards
- scoring structure
- scheduling rules
- tone and voice expectations

---

## Admin Requirements

The admin section must become the operational surface for graph and artifact health.

### Required Admin Areas

1. **Graph Overview**
   - countries
   - curriculums
   - grades
   - subjects
   - topics
   - subtopics
   - canonical vs provisional counts

2. **Provisional Queue**
   - newly created nodes
   - auto-promotion candidates
   - duplicate candidates
   - low-confidence nodes

3. **Node Detail View**
   - label
   - aliases
   - lineage
   - parent/children
   - trust score
   - lifecycle status
   - related artifacts
   - event history
   - usage analytics

4. **Merge / Rename / Reparent Tools**
   - merge duplicates
   - change labels
   - move nodes within scope
   - demote or reject

5. **Artifact Quality View**
   - preferred lesson per node
   - preferred revision pack per node
   - rating distributions
   - stale artifacts
   - regen candidates

6. **Event Timeline**
   - all automatic promotions
   - all admin overrides
   - all merges
   - all rejections
   - all regeneration events

### Admin Interaction Rules

- default view should highlight important actions, not raw database complexity
- destructive graph actions must require confirmation
- node histories must remain auditable
- merged/rejected nodes must remain traceable

### Admin Design Rules

Use:

- dark-first surfaces from `docs/design-langauge.md`
- soft elevated cards and meaningful status colors from `docs/workstreams/design-color-01.md`
- one dominant action per panel
- no dense spreadsheet-first UI unless needed for bulk operations

---

## Target Runtime Flows

### Lesson Flow

1. learner chooses or types a topic
2. resolution service maps request to node
3. if no node exists, create provisional node
4. fetch preferred lesson artifact for node and scope
5. if missing or poor-quality, generate new lesson artifact
6. launch lesson session using artifact id + node id
7. collect ratings and outcomes
8. feed ratings back into artifact ranking and graph trust

### Revision Flow

1. learner creates or updates revision plan
2. plan stores node ids, not labels
3. fetch preferred revision pack per node
4. if missing or stale, generate new revision pack
5. run revision session using artifact ids
6. collect attempt outcomes and ratings
7. feed outcomes into scheduling and artifact quality

### Planner Flow

1. subject chosen from graph
2. hint chips generated from graph-aware generation
3. every selected chip resolves to a node id before submission
4. plan stores node ids
5. summaries and question packs are generated from those ids

---

## Data Migration Strategy

This rebuild needs careful migration to avoid breaking live history.

### Migration Rules

- do not destroy historical lesson sessions
- do not destroy historical revision attempts
- preserve old records even if they are string-based
- backfill graph ids where possible
- mark ambiguous history as unresolved rather than guessing silently

### Migration Steps

1. create new graph tables and artifact tables
2. import existing subject/topic/subtopic metadata from current state where safe
3. map existing lesson sessions to graph nodes
4. map existing revision topics and plans to graph nodes
5. keep unresolved legacy items flagged for review
6. switch new runtime writes to id-based model
7. phase out old string-only paths

---

## Testing Rules

Every phase must follow RED/GREEN TDD.

### Required Test Categories

- graph resolution tests
- provisional creation tests
- promotion and demotion rule tests
- duplicate merge tests
- lesson artifact generation tests
- revision artifact generation tests
- planner canonicalization tests
- migration tests
- admin event visibility tests
- integration tests for lesson and revision end-to-end flows

### Required Non-Functional Checks

- type safety
- persistence integrity
- backward compatibility for old sessions
- no silent planner failures
- no runtime fallback to local seeded content

---

## Phased Rebuild

## Phase 0 — Foundations And Audit

### Objective

Lock the target architecture and identify every old seeded path.

### Tasks

- [x] Audit every place subjects, topics, subtopics, lessons, lesson questions, and revision prompts are locally authored
- [x] Audit every string-based identity path in lesson and revision
- [x] Document all existing fallback paths and where they trigger
- [x] Define the canonical graph schema
- [x] Define the artifact schema
- [x] Define graph event schema
- [ ] Define rating and regeneration rules
- [ ] Define promotion/demotion thresholds for provisional nodes

### Exit Criteria

- a single architecture decision record exists
- all seeded paths are inventoried
- schema contracts are approved

---

## Phase 1 — Backend Graph Introduction

### Objective

Create the adaptable graph as the new backend anchor.

### Tasks

- [x] Add persistent graph tables or equivalent storage for countries, curriculums, grades, subjects, topics, subtopics, aliases, and graph events
- [x] Add lifecycle fields: `canonical`, `provisional`, `review_needed`, `merged`, `archived`, `rejected`
- [x] Add provenance fields and trust scoring
- [x] Add alias support and normalized label matching
- [x] Add graph repository APIs for fetch, create, update, merge, archive, reject
- [x] Add event logging for all graph changes
- [x] Add tests for node creation, retrieval, update, merge, archive, reject

### Exit Criteria

- graph exists independently of frontend hardcoded data
- graph nodes have stable ids and lifecycle state

---

## Phase 2 — Frontend Catalog Removal

### Objective

Stop treating local files as the source of truth for subjects and structure.

### Tasks

- [x] Remove runtime dependence on `src/lib/data/onboarding.ts` for subject truth
- [x] Replace onboarding subject loading with backend graph-backed fetches
- [x] Replace local curriculum subject trees with graph-backed fetches
- [x] Preserve local-only fallback only if explicitly required for offline/dev, never as production truth
- [x] Update onboarding state so it stores selected node ids from backend graph
- [x] Add tests proving onboarding no longer depends on local hardcoded subject catalogs

### Exit Criteria

- no production subject catalog is authored in frontend files

---

## Phase 3 — Single Lesson Generation Pipeline

### Objective

Remove seeded lesson delivery and use one lesson generation pipeline everywhere.

### Tasks

- [x] Remove `src/lib/data/learning-content.ts` as a runtime lesson source
- [x] Remove seeded lesson selection paths from repositories and app state
- [x] Make curriculum-tree launches use the same lesson generation path as freeform topic discovery
- [x] Generate lessons against graph node ids
- [x] Persist generated lessons as artifacts
- [x] Persist generated lesson question sets as artifacts
- [x] Update lesson sessions to reference `nodeId` and `artifactId`
- [x] Preserve lesson runtime mechanics in `lesson-system.ts` but remove content authorship responsibility
- [x] Remove obsolete “seeded vs dynamic” terminology from code and docs
- [x] Add tests proving there is only one lesson creation path

### Exit Criteria

- every lesson launch goes through one artifact-backed pipeline

---

## Phase 4 — Lesson Artifact Quality And Rating

### Objective

Make lesson caching safe, observable, and quality-aware.

### Tasks

- [ ] Add learner lesson rating capture
- [ ] Add admin lesson rating / override controls
- [ ] Rank lesson artifacts per node and scope
- [ ] Prefer high-rated artifacts
- [ ] Regenerate on low-rated artifacts
- [ ] Keep historical artifacts immutable
- [ ] Add event logging for preferred artifact changes
- [ ] Add tests for artifact preference and regeneration rules

### Exit Criteria

- lesson reuse is quality-aware, not naive cache reuse

---

## Phase 5 — Revision Generation Service

### Objective

Replace deterministic revision prompt templates with generated revision packs.

### Tasks

- [ ] Create revision pack schema
- [ ] Create revision question set schema
- [ ] Add AI generation path for revision packs
- [ ] Generate question prompts, expected skills, misconception cues, help ladders, and transfer prompts from node ids
- [ ] Replace local prompt generation in `src/lib/revision/engine.ts`
- [ ] Persist revision packs as artifacts
- [ ] Persist revision question sets as artifacts
- [ ] Update revision sessions to reference revision artifact ids
- [ ] Add tests proving revision no longer depends on local prompt templates

### Exit Criteria

- revision content is generated and persisted, not hardcoded in code

---

## Phase 6 — Planner Rebuild On IDs

### Objective

Make revision planning fully graph-aware and eliminate string identity bugs.

### Tasks

- [ ] Change revision plans to store node ids instead of topic title strings
- [ ] Change planner hint chips to carry resolved node ids
- [ ] Require chip and typed-topic selection to resolve to nodes before submission
- [ ] Create provisional nodes when typed topics do not resolve
- [ ] Generate plan summaries from node ids and learner context
- [ ] Remove string-only synthetic topic identity assumptions from `src/lib/revision/plans.ts`
- [ ] Add planner validation UI for unresolved or low-confidence mappings
- [ ] Add tests for planner canonicalization, provisional creation, and id-based plan creation

### Exit Criteria

- planner cannot silently fail because of label mismatch

---

## Phase 7 — Provisional Graph Automation

### Objective

Let the graph grow naturally through real usage.

### Tasks

- [ ] Add provisional node creation during topic resolution misses
- [ ] Add reuse counters and trust scoring
- [ ] Add promotion thresholds
- [ ] Add demotion and review thresholds
- [ ] Add duplicate detection and alias clustering
- [ ] Add automatic promotion job or service
- [ ] Add graph event logging for all automatic transitions
- [ ] Add tests for auto-promotion, demotion, duplicate detection, and merge suggestions

### Exit Criteria

- graph can grow automatically without losing stable ids

---

## Phase 8 — Admin Graph Operations

### Objective

Make graph evolution inspectable and controllable in admin.

### Tasks

- [ ] Build graph overview page
- [ ] Build provisional queue page
- [ ] Build node detail page
- [ ] Build merge/reparent/archive/reject controls
- [ ] Build event timeline view
- [ ] Build artifact quality panel per node
- [ ] Build promotion and duplicate candidate views
- [ ] Add filters by country, curriculum, grade, status, trust, and origin
- [ ] Add audit history for every admin change
- [ ] Ensure all admin screens follow `docs/design-langauge.md` and `docs/workstreams/design-color-01.md`

### Exit Criteria

- admin can inspect and mold graph evolution safely

---

## Phase 9 — Legacy Migration

### Objective

Bring old lesson and revision history forward without data loss.

### Tasks

- [ ] Add migration/backfill scripts for legacy subject/topic labels
- [ ] Backfill graph ids onto historical lesson sessions where possible
- [ ] Backfill graph ids onto historical revision topics and plans where possible
- [ ] Mark ambiguous legacy records as unresolved instead of guessing silently
- [ ] Add admin tooling for unresolved legacy mappings
- [ ] Add tests for migration correctness and non-destructive behavior

### Exit Criteria

- old history survives
- new writes use id-based models

---

## Phase 10 — Cleanup And Deletion Of Old Paths

### Objective

Remove obsolete seeded architecture completely.

### Tasks

- [ ] Delete `src/lib/data/learning-content.ts` runtime usage
- [ ] Delete remaining seeded lesson/revision fallback terminology
- [ ] Delete old local authored revision prompt generation
- [ ] Delete unused seeded content repository paths
- [ ] Update docs to reflect the single dynamic pipeline
- [ ] Update admin content dashboards to reflect graph/artifact health rather than seeded coverage

### Exit Criteria

- there is no production runtime dependency on hardcoded lesson or revision content

---

## Phase 11 — Quality, Monitoring, And Governance

### Objective

Make the new system safe to operate at scale.

### Tasks

- [ ] Add artifact generation success/error monitoring
- [ ] Add graph growth monitoring
- [ ] Add duplicate-rate monitoring
- [ ] Add low-rating regeneration monitoring
- [ ] Add promotion/demotion dashboards
- [ ] Add model and prompt version tracking
- [ ] Add rollback strategy for bad artifact versions
- [ ] Add alerting for unresolved-topic spikes
- [ ] Add audit exports for admin graph actions

### Exit Criteria

- graph and artifact systems are observable and operationally safe

---

## Acceptance Criteria

This workstream is complete only when:

- no production lesson content is hardcoded in frontend runtime files
- no production revision content is hardcoded in frontend runtime files
- subjects/topics/subtopics are not hardcoded in frontend as runtime truth
- all lesson launches use one generated artifact pipeline
- all revision launches use one generated artifact pipeline
- revision plans store ids, not strings
- unresolved topics can create provisional nodes
- provisional nodes can progress automatically
- graph progression is logged
- admin can inspect and edit graph evolution
- artifact reuse is rating-aware
- legacy history remains intact

---

## Risks

### Risk 1 — Graph Drift

If provisional node creation is too loose, the graph becomes duplicate-heavy and inconsistent.

Mitigation:

- aliases
- duplicate detection
- scope-aware matching
- trust scores
- admin merge tools

### Risk 2 — Loss Of Canonical Anchors

If graph identity is not persisted before seeded paths are removed, runtime flows become label-based again.

Mitigation:

- build graph ids first
- migrate plans and sessions before deleting old flows

### Risk 3 — Bad Cache Reuse

If low-rated artifacts are reused without regeneration, quality stagnates.

Mitigation:

- artifact ranking
- low-rating regeneration triggers
- immutable history

### Risk 4 — Migration Corruption

If old sessions are force-mapped incorrectly, historical analytics become untrustworthy.

Mitigation:

- unresolved status
- admin mapping tools
- non-destructive backfill

---

## Non-Goals

These are not part of this workstream unless explicitly added later:

- full offline-first curriculum generation
- replacing the lesson pedagogy framework
- replacing the revision pedagogical structure with unconstrained freeform generation
- hiding graph operations from admin

---

## Build Notes

All implementation under this workstream must:

- follow RED/GREEN TDD
- avoid destructive migrations without a clear rollback plan
- preserve mobile and desktop quality
- preserve dark and light themes
- use design tokens and hierarchy rules from `docs/design-langauge.md`
- use soft status color semantics and elevated card treatment from `docs/workstreams/design-color-01.md`

---

## Final Outcome

When complete, Doceo will have:

- one structured teaching framework
- one adaptable global graph
- one generated content system for lessons and revision
- one id-based identity model
- one admin surface to observe and shape graph growth

This is the architecture that allows the app to expand organically across countries and subjects without being trapped by local seeded blueprints.
