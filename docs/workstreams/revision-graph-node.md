# Revision Graph Node — Foreign Key Fix

## Problem

When a user clicks "Revise" on a topic in the Revision tab, the server crashes with:

```
insert or update on table "curriculum_graph_nodes" violates foreign key constraint
"curriculum_graph_nodes_parent_id_fkey"
```

**Root cause:** `resolveTopicNode()` in `revision-generation-service.ts:68-76` calls `createProvisionalNode` with `parentId: topic.subjectId`. The `subjectId` on `RevisionTopic` is a **curriculum subject ID** (e.g. `"mathematics"`, set from `state.curriculum.subjects[].id`), not a graph node ID (e.g. `"graph-subject-mathematics"`). The `curriculum_graph_nodes` table has a self-referencing FK on `parent_id`, so inserting a row whose `parent_id` points to a non-existent row fails.

This only triggers when:
1. The topic has no existing `nodeId`, AND
2. No node matches the topic title at `subtopic` or `topic` level in the graph

In that case the fallback path creates a provisional node with a bad `parentId`.

**Affected file:** `src/lib/server/revision-generation-service.ts` (line 71)

---

## Strategy

Resolve the subject to a valid graph node before using it as `parentId`. If no subject node exists in the graph, create a provisional subject node first. This is safer than passing `null` because it preserves the hierarchy for future graph reconciliation.

---

## Tasks

- [x] **Task 1 — Add `resolveSubjectNode` helper**

- [x] **Task 2 — Wire `resolveSubjectNode` into `resolveTopicNode`**

**File:** `src/lib/server/revision-generation-service.ts`

Replace line 71:
```ts
parentId: topic.subjectId || null,
```

With a call to the new helper. The updated `resolveTopicNode` becomes:

```ts
async function resolveTopicNode(
  graphRepository: GraphRepository,
  request: RevisionPackRequest,
  topic: RevisionTopic
): Promise<GraphNodeRecord> {
  // 1. Try existing nodeId
  if (topic.nodeId) {
    const existing = await graphRepository.getNodeById(topic.nodeId);
    if (existing) return existing;
  }

  const scope = buildScope(request);

  // 2. Try subtopic label match
  const subtopicMatch = await graphRepository.findNodeByLabel(scope, 'subtopic', topic.topicTitle);
  if (subtopicMatch.node) return subtopicMatch.node;

  // 3. Try topic label match
  const topicMatch = await graphRepository.findNodeByLabel(scope, 'topic', topic.topicTitle);
  if (topicMatch.node) return topicMatch.node;

  // 4. Resolve subject → graph node ID for parentId
  const parentNodeId = await resolveSubjectNode(graphRepository, scope, topic);

  return graphRepository.createProvisionalNode({
    type: 'topic',
    label: topic.topicTitle,
    parentId: parentNodeId,
    scope,
    description: topic.curriculumReference,
    origin: 'learner_discovered',
    trustScore: 0.4
  });
}
```

**What changes:** Only the `parentId` line. Instead of passing the raw `topic.subjectId` (a curriculum ID), we pass the resolved graph node ID (or `null` if resolution fails).

---

- [x] **Task 3 — Unit test: provisional topic with no prior graph data**

- [x] **Task 4 — Unit test: subject node reuse**

Add a second test confirming that if a subject graph node already exists (e.g. `graph-subject-mathematics` from bootstrap), it gets reused rather than creating a duplicate.

```ts
it('reuses existing subject node as parent when creating provisional topic', async () => {
  const topic = createTopic({
    lessonSessionId: 'revision-session-new-math-topic',
    nodeId: null,
    topicTitle: 'Probability Basics',
    subjectId: 'graph-subject-mathematics',
    subject: 'Mathematics',
    curriculumReference: 'CAPS Grade 6'
  });

  generator.mockResolvedValueOnce({
    payload: {
      ...createGeneratedPack(),
      questions: [
        {
          ...createGeneratedPack().questions[0],
          revisionTopicId: 'revision-session-new-math-topic'
        }
      ]
    },
    provider: 'github-models',
    model: 'openai/gpt-4.1-mini'
  });

  const result = await service.startRevisionSession({
    request: {
      student: createProfile(),
      learnerProfile: createLearnerProfile(),
      topics: [topic],
      recommendationReason: 'Due today',
      mode: 'deep_revision',
      source: 'do_today'
    }
  });

  const nodes = graphStore.snapshot().nodes;
  const provisionalTopic = nodes.find(
    (n) => n.label === 'Probability Basics' && n.type === 'topic'
  );

  expect(provisionalTopic).toBeTruthy();
  // parentId should be the existing bootstrapped subject node
  expect(provisionalTopic?.parentId).toBe('graph-subject-mathematics');
});
```

---

- [x] **Task 5 — Run tests and verify**

Run the full test suite to confirm:

```bash
npx vitest run src/lib/server/revision-generation-service.test.ts
```

Then run the broader suite to catch any regressions:

```bash
npx vitest run
```

---

- [ ] **Task 6 — Manual E2E verification**

1. Start dev server: `npm run dev`
2. Navigate to the Revision tab
3. Click "Revise" on a topic (especially one without a pre-existing graph node)
4. Confirm: no 500 error, revision session loads correctly
5. Check Supabase `curriculum_graph_nodes` table to verify the provisional nodes were created with valid `parent_id` values

---

## Files touched

| File | Change |
|------|--------|
| `src/lib/server/revision-generation-service.ts` | Add `resolveSubjectNode`, update `resolveTopicNode` |
| `src/lib/server/revision-generation-service.test.ts` | Add 2 new test cases |

## Files read-only (no changes needed)

| File | Reason |
|------|--------|
| `src/lib/server/graph-repository.ts` | `createProvisionalNode` and `findNodeByLabel` already support `'subject'` type — no changes needed |
| `src/lib/types.ts` | `RevisionTopic` already has both `subjectId` and `subject` fields — no changes needed |
| `src/routes/api/ai/revision-pack/+server.ts` | Route handler passes data through correctly — no changes needed |

## No Svelte 5 changes required

This bug is entirely server-side (graph repository + revision generation service). No Svelte components, runes, or client-side code changes are needed.
