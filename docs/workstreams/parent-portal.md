# Parent Portal — Workstream

A strategic initiative to allow parents to track student progress, mastery levels, and AI-driven insights without compromising the student's private learning environment.

---

## 1. Vision & Strategy

### The Philosophy: Observer, Not Overseer

The Parent Portal is not a "second student" view. It is an **observer lens** designed to give parents high-signal data about their child's academic health while respecting the student's autonomous learning journey. This distinction is critical: parents see patterns and progress, not surveillance.

**Why This Matters:**
- Students need psychological safety to struggle, ask "dumb" questions, and learn at their own pace
- Parents need visibility to support their child's education and identify when intervention is needed
- The AI tutor needs to maintain its "warm friend" relationship with the student without parental oversight creating performance anxiety

### Key Objectives
- **High-Signal Progress:** Surface mastery heatmaps and cognitive profiles that answer "How is my child doing?" in 30 seconds
- **AI-Driven Synthesis:** Provide "Parent-Teacher Conference" summaries of recent activity—nuanced insights that raw data cannot convey
- **Privacy First:** Maintain the student's "safe space" by summarizing chat history rather than exposing raw transcripts. The student is not being watched; their progress is being celebrated.
- **Actionable Home-Support:** Suggest offline activities to reinforce school concepts, acknowledging that not all learning happens in the app
- **Cultural Sensitivity:** Home hints must be appropriate for diverse South African socioeconomic contexts—low-cost, accessible activities that don't assume resources

### Success Definition
Parents log in 2+ times per week not out of anxiety, but because the portal gives them confidence and actionable ways to support their child. Students feel supported, not surveilled.

---

## 2. Conceptual Model

### Relationship Linkage

**Role Extension:** 
Utilize the existing `role: 'parent'` in `UserProfile` (`src/lib/types.ts:48`). Parents are full users in the system with their own authentication and profile data.

**The Handshake Protocol:**

```
┌─────────────────────────────────────────────────────────────────┐
│  STUDENT SIDE                    │  PARENT SIDE                │
│  ─────────────                   │  ───────────                │
│                                  │                             │
│  1. Navigate to Settings         │  1. Sign up / Log in as     │
│  2. Click "Invite Parent"        │     parent role             │
│  3. System generates:            │  2. Dashboard shows         │
│     - 6-digit Connection Code    │     "Add Student" CTA       │
│     - Expires in 24 hours        │  3. Enter Connection Code   │
│     - Rate limited (3/hour)      │  4. System validates:       │
│  4. Share code with parent       │     - Code exists           │
│     (WhatsApp/SMS/etc)           │     - Not expired           │
│                                  │     - Not already used      │
│                                  │  5. Create link record      │
│                                  │  6. Parent sees student     │
│                                  │     data immediately        │
└─────────────────────────────────────────────────────────────────┘
```

**Data Model Extension:**
```sql
-- New table: student_parent_links
CREATE TABLE student_parent_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID REFERENCES auth.users(id) NOT NULL,
  student_id UUID REFERENCES auth.users(id) NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'revoked', 'pending')),
  connection_code TEXT, -- stored only during pending state
  code_expires_at TIMESTAMPTZ,
  linked_at TIMESTAMPTZ DEFAULT now(),
  revoked_at TIMESTAMPTZ,
  revoked_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(parent_id, student_id)
);

-- Index for quick lookups
CREATE INDEX idx_parent_links_parent ON student_parent_links(parent_id);
CREATE INDEX idx_parent_links_student ON student_parent_links(student_id);
```

**Relationship Cardinality:**
- 1 Parent → N Students (parent can track multiple children)
- 1 Student → N Parents (student can have both parents, guardians, etc.)
- N Students → N Parents (grandparents, tutors with permission)

### Data Synchronization & Privacy Architecture

**Cloud Mandate for Students:**
For parents to see live data, student sessions must sync to Supabase. This creates a UX consideration:
- Students using the app offline will have stale data visible to parents
- The parent dashboard should show a "Last Synced" timestamp prominently
- Consider a gentle reminder to students: "Sync your progress so [Parent Name] can see how you're doing!"

**Data Access Matrix:**

| Data Type | Parent Can View | Notes |
|-----------|----------------|-------|
| `LearnerProfile` signals | ✅ Yes | Full cognitive profile, adapted learning preferences |
| `LessonSession` metadata | ✅ Yes | Topic, subject, completion %, confidence score, time spent, stage reached |
| `LessonSession.messages` | ❌ No | Raw chat transcript is private to student |
| AI Synthesis Summary | ✅ Yes | Curated insights from AI analysis of sessions |
| Mastery heatmap | ✅ Yes | Subject/topic-level mastery percentages |
| Revision topics | ✅ Yes | What student is reviewing and when |
| Analytics events | ✅ Yes | High-level activity patterns |
| Settings/Preferences | ❌ No | Student's UI preferences, theme, etc. |

**Supabase RLS Policies:**
```sql
-- Parents can read lesson_sessions for linked students
CREATE POLICY "Parents can view linked student sessions"
ON lesson_sessions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM student_parent_links
    WHERE parent_id = auth.uid()
    AND student_id = lesson_sessions.student_id
    AND status = 'active'
  )
);

-- Parents can read learner_profiles for linked students
CREATE POLICY "Parents can view linked student profiles"
ON learner_profiles FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM student_parent_links
    WHERE parent_id = auth.uid()
    AND student_id = learner_profiles.student_id
    AND status = 'active'
  )
);

-- But NOT the messages - those remain private
-- (no RLS policy allowing parent access to lesson_messages table)
```

---

## 3. Implementation Roadmap

### Phase 1: Foundation & Linking (Weeks 1-3)

**Database Schema:**
- [ ] Create `student_parent_links` table with fields above
- [ ] Add RLS policies for secure parent access
- [ ] Create trigger to clean up expired connection codes (run daily)

**Connection Code System:**
- [ ] **Generate Code:**
  - Use `crypto.getRandomValues()` for cryptographically secure 6-digit code
  - Store hashed code in DB (not plaintext for security)
  - Set 24-hour expiration
  - Rate limit: max 3 codes per student per hour
- [ ] **Validate Code:**
  - Check existence, expiration, and usage status
  - Atomic operation: validate + create link in single transaction
  - Return clear error messages ("Code expired", "Already used", "Invalid")

**Connection UI:**
- [ ] **Student-side "Invite Parent" flow:**
  - Location: Settings page (`src/routes/(app)/settings/+page.svelte`)
  - UI: Button → Modal showing generated code + copy button
  - Show expiration countdown
  - Display "Codes generated today: X/3" to prevent abuse
  - Include help text: "Share this code with your parent. They'll need to enter it within 24 hours."
  
- [ ] **Parent-side "Add Student" flow:**
  - Location: Parent dashboard (new route `/parent`)
  - UI: Empty state with prominent "Add Your Child" CTA
  - Input: 6-digit code with auto-advance between fields
  - Validation: Real-time feedback on invalid/expired codes
  - Success: Immediate redirect to that student's overview

**Authentication Updates:**
- [ ] Modify `admin-guard.ts` or create new `parent-guard.ts`:
  - Check `user.role === 'parent'`
  - Verify parent has active link to requested student_id
  - Return 403 if no link exists
- [ ] Update `app-state.ts` store methods:
  - `generateConnectionCode()` - student action
  - `validateConnectionCode()` - parent action
  - `getLinkedStudents()` - fetch all students parent can view

**Edge Cases:**
- What if student regenerates a new code before parent uses old one? → Old code invalidated, new code active
- What if parent enters wrong code 5 times? → Rate limit, show "Try again in 15 minutes"
- What if student tries to link to themselves? → Blocked at validation

---

### Phase 2: The Parent Dashboard (Weeks 4-6)

**New Route Structure:**
```
/src/routes/parent/
  +layout.svelte          # Parent-specific layout with student switcher
  +layout.server.ts       # Load linked students on entry
  +page.svelte            # Default dashboard (first student or empty state)
  [student_id]/
    +page.svelte          # Individual student view
    +page.server.ts       # Load student data with parent guard
```

**Student Selector Component:**
- Location: Top of parent layout, sticky header
- UI: Horizontal scrollable cards showing each linked student
  - Student avatar (initials or photo if available)
  - Student name
  - Current status indicator (online/offline/learning)
  - Quick stats: "3 lessons this week"
- Behavior: 
  - Click to switch active student
  - URL updates to `/parent/[student_id]`
  - State persists on refresh

**Dashboard Layout (Per Student):**

```
┌─────────────────────────────────────────────────────────────────┐
│  Parent Dashboard — [Student Name]                              │
├─────────────────────────────────────────────────────────────────┤
│  ┌───────────────────────────────────────────────────────────┐ │
│  │  AI INSIGHT CARD (Full Width)                              │ │
│  │  "This week, Sarah mastered 2 new topics in Mathematics    │ │
│  │   and showed strong progress in solving linear equations.  │ │
│  │   She responds well to step-by-step explanations."         │ │
│  │                                                            │ │
│  │  🏠 HOME HINT: Practice cooking measurements together      │ │
│  │   to reinforce fraction concepts.                          │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌──────────────┐  ┌──────────────────────────────────────┐    │
│  │  MASTERY     │  │  ACTIVITY TIMELINE                   │    │
│  │  HEATMAP     │  │  ──────────────────────────────────  │    │
│  │              │  │  📚 Mathematics                      │    │
│  │  [Visual     │  │  Linear Equations                    │    │
│  │   grid       │  │  ✅ Complete | 85% confidence        │    │
│  │   showing    │  │  45 mins | 2 days ago                │    │
│  │   subject/   │  │                                      │    │
│  │   topic      │  │  📊 Mathematical Literacy            │    │
│  │   progress]  │  │  Budgeting & Financial Planning      │    │
│  │              │  │  🔄 In Progress | Stage 3/7          │    │
│  │              │  │  30 mins | Today                     │    │
│  │              │  │                                      │    │
│  └──────────────┘  └──────────────────────────────────────┘    │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │  COGNITIVE PROFILE                                         │ │
│  │  Visual Learner: ████████░░ 80%                           │ │
│  │  Step-by-Step:   ██████████ 95% ← Strong preference       │ │
│  │  Real-World Examples: ██████░░░░ 60%                      │ │
│  │                                                            │ │
│  │  📈 Learning Style Insights updated 2 days ago            │ │
│  └───────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

**Mastery Heatmap:**
- Visual: Grid or treemap showing all subjects and topics
- Color coding:
  - 🟢 Green (70-100%): Mastered
  - 🟡 Yellow (40-69%): Developing
  - 🔴 Red (0-39%): Needs attention
  - ⚪ Gray: Not started
- Interactions:
  - Hover: Show exact percentage and last activity date
  - Click: Expand to topic detail view
- Data source: `state.progress` aggregated by subject/topic

**Cognitive Profile Panel:**
- Display the 7 learner profile signals from `LearnerProfile`:
  - analogies_preference
  - step_by_step
  - visual_learner
  - real_world_examples
  - abstract_thinking
  - needs_repetition
  - quiz_performance
- Visual: Horizontal bar charts or "preference cards"
- Context: Explain what each means in parent-friendly language
  - Instead of "step_by_step: 0.85", show "Sarah learns best with detailed, step-by-step instructions"
- Trend indicators: ↑ Improving, ↓ Declining, → Stable (compare to last week)

**Activity Timeline:**
- List of recent `lessonSessions` (last 10-20)
- Each item shows:
  - Subject icon (colored per design system)
  - Topic title
  - Completion status (emoji + text)
  - Confidence score (if complete)
  - Time spent
  - Timestamp (relative: "2 hours ago", "Yesterday")
- Group by date: "Today", "Yesterday", "This Week", "Earlier"
- Empty state: "No activity yet. Sarah hasn't completed any lessons this week."

**Last Sync Indicator:**
- Prominent badge showing data freshness
- "Last updated 5 minutes ago" (green)
- "Last updated 2 hours ago" (yellow)
- "Last updated 1 day ago" (red) + "Student may be using app offline"

---

### Phase 3: AI Parent-Teacher Insights (Weeks 7-9)

**Synthesis Engine Architecture:**

**New API Route:** `POST /api/ai/parent-summary`

**Request Payload:**
```typescript
interface ParentSummaryRequest {
  studentId: string;
  parentId: string;
  timeframe: 'week' | 'month' | 'custom';
  startDate?: string;
  endDate?: string;
}
```

**Data Aggregation Logic:**
1. Query last 5-10 `lessonSessions` from Supabase
2. Fetch current `LearnerProfile` 
3. Fetch mastery data across subjects
4. DO NOT fetch `LessonMessage[]` (privacy protected)

**AI Prompt Engineering:**
```
You are Doceo's "Parent-Teacher Conference" assistant. Your role is to synthesize 
a student's learning data into a warm, insightful summary for their parent.

INPUT DATA:
- Recent lessons: [Array of lesson metadata: topic, subject, completion%, confidence, time]
- Learner profile: [Cognitive preferences and performance signals]
- Mastery trends: [Subject-level progress over time]

OUTPUT FORMAT (JSON):
{
  "summary": "2-3 sentences celebrating progress and noting patterns. Warm, specific, encouraging.",
  "strengths": ["Specific strength 1", "Specific strength 2"],
  "areasForSupport": ["Gentle area for improvement 1"], // Optional, max 1-2
  "homeHint": {
    "activity": "Low-cost, accessible activity name",
    "description": "2-3 sentence instructions for parent",
    "subjectConnection": "How this reinforces school learning",
    "materials": ["common household items"],
    "timeRequired": "15-30 mins"
  },
  "engagementMetrics": {
    "lessonsCompleted": 5,
    "totalTimeMinutes": 180,
    "consistency": "daily" | "regular" | "intermittent",
    "confidenceTrend": "improving" | "stable" | "needs attention"
  }
}

TONE GUIDELINES:
- Celebrate effort, not just achievement
- Use the student's name naturally
- Avoid educational jargon - translate concepts to everyday language
- Be culturally sensitive - activities should work in diverse South African homes
- Never reveal specific chat content - only patterns and progress
- Frame challenges as opportunities: "Working on..." not "Struggling with..."

HOME HINT CULTURAL CONSIDERATIONS:
- Assume limited resources: no expensive materials, no special equipment
- Leverage daily activities: cooking, shopping, walking, telling stories
- Examples: "Practice fractions while cutting a sandwich", "Estimate totals while shopping", 
  "Discuss cause/effect while watching the news"
```

**Caching Strategy:**
- Cache summaries for 6 hours (parent dashboard loads are frequent)
- Store in new table `parent_summaries` with TTL
- Invalidate cache when student completes a new lesson

**Insight Cards UI:**
- Full-width card at top of dashboard
- AI-generated content formatted with markdown support
- "Home Hint" section visually distinct (accent color background)
- Feedback buttons: "👍 Helpful" / "👎 Not relevant" (track engagement)
- "Refresh" button for on-demand regeneration (rate limited)

**Example Output:**
```markdown
## This Week with Sarah

Sarah completed **4 lessons** across Mathematics and Natural Sciences, spending a total 
of **2.5 hours** learning. She's showing strong progress in **linear equations** and 
responded really well to the step-by-step approach.

**What stands out:** Sarah asks thoughtful questions when concepts get challenging. 
She doesn't rush through—she's building deep understanding.

---

🏠 **Home Hint: Fraction Practice While Cooking**

*Reinforces: Mathematics — Fractions & Decimals*

Next time you're preparing a meal together, ask Sarah to help with measurements:
- "We need ¾ cup of flour. Can you show me what that looks like?"
- "If this recipe serves 4 and we're 2 people, what fraction of each ingredient do we need?"

**Time:** 15 minutes during meal prep  
**Materials:** Measuring cups, any recipe
```

---

### Phase 4: The Pulse — Notifications (Weeks 10-11)

**Milestone Event Detection:**

Hook into `app-state.ts` store actions to detect:

1. **High Mastery Achieved:**
   - Trigger: `masteryLevel >= 0.85` on a topic
   - Action: Create `pulse_event` record
   - Payload: Subject, topic, mastery percentage, date

2. **Lesson Completion:**
   - Trigger: `lessonSession.status === 'complete'`
   - Action: Create pulse if confidence score > 0.75

3. **Revision Plan Complete:**
   - Trigger: All topics in revision plan reviewed
   - Action: Celebration-worthy pulse

4. **Consistency Streak:**
   - Trigger: 5+ days of activity in a row
   - Action: Streak milestone pulse

5. **Breakthrough Moment:**
   - Trigger: Reteach count > 2, then eventual completion
   - Action: "Persistence pays off" pulse

**Pulse Data Model:**
```sql
CREATE TABLE pulse_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES auth.users(id) NOT NULL,
  parent_id UUID REFERENCES auth.users(id), -- populated when sent
  type TEXT CHECK (type IN ('mastery', 'completion', 'revision_complete', 'streak', 'breakthrough')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  metadata JSONB, -- lesson_id, topic, subject, score, etc.
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  sent_at TIMESTAMPTZ -- when parent was notified
);

CREATE INDEX idx_pulse_events_parent ON pulse_events(parent_id, is_read, created_at DESC);
```

**Delivery Mechanisms:**

1. **In-App Notification Bell:**
   - Location: Parent dashboard header
   - Badge: Red dot with unread count
   - Dropdown: List of recent pulses with timestamps
   - "Mark all as read" action

2. **Email Notifications (Future):**
   - Weekly digest of pulses
   - Immediate notification for major milestones (configurable)
   - Unsubscribe options per pulse type

3. **Push Notifications (Future Mobile App):**
   - Real-time when student achieves milestone

**Pulse UI Cards:**
```
┌─────────────────────────────────────────────────────┐
│  🎉 New Achievement!                    2 hrs ago   │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Sarah mastered Linear Equations!                   │
│                                                     │
│  After working through 3 lessons and 2 practice    │
│  sessions, she's achieved 87% confidence in        │
│  solving linear equations.                         │
│                                                     │
│  [View Details]        [Celebrate! 🎊]              │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**Celebration Flow:**
- Parent clicks "Celebrate!" → Shows confetti animation
- Optional: Send celebration back to student (appears in their dashboard: "Mom celebrated your progress!")
- Tracks engagement: "Parents celebrated 45 milestones this week"

---

## 4. Technical Architecture Deep Dive

### State Management Strategy

**Parent State Model:**
Unlike students who use hybrid local/cloud storage, parents are **database-driven only**:

```typescript
// Parent-specific store (new file: parent-store.ts)
interface ParentState {
  linkedStudents: Array<{
    studentId: string;
    name: string;
    grade: string;
    avatarUrl?: string;
    lastActivityAt: string;
  }>;
  selectedStudentId: string | null;
  summary: ParentSummary | null;
  pulseEvents: PulseEvent[];
  masteryData: MasteryHeatmap;
  isLoading: boolean;
  error: string | null;
}
```

**Data Loading Pattern:**
1. On parent dashboard load: Fetch linked students list
2. On student selection: 
   - Fetch summary (cached or generate new)
   - Fetch mastery heatmap
   - Fetch activity timeline
   - Fetch pulse events
3. Real-time updates (optional): Subscribe to Supabase realtime for new pulses

**Sync Indicator Implementation:**
```typescript
// Show last sync time from student's app state
function getDataFreshness(studentId: string): DataFreshness {
  const lastSync = getStudentLastSync(studentId); // from lesson_sessions metadata
  const minutesAgo = Date.now() - new Date(lastSync).getTime() / 60000;
  
  if (minutesAgo < 15) return { status: 'fresh', text: 'Updated moments ago' };
  if (minutesAgo < 60) return { status: 'recent', text: `Updated ${Math.floor(minutesAgo)} mins ago` };
  if (minutesAgo < 1440) return { status: 'stale', text: `Updated ${Math.floor(minutesAgo / 60)} hours ago` };
  return { status: 'old', text: `Updated ${Math.floor(minutesAgo / 1440)} days ago` };
}
```

### Security & Privacy Implementation

**Defense in Depth:**

1. **Application Layer:**
   - `parent-guard.ts` checks parent role and active link
   - All parent API routes validate `parent_id` matches `auth.uid()`
   - Students can revoke parent access at any time (updates `status = 'revoked'`)

2. **Database Layer:**
   - RLS policies strictly limit row access
   - No direct access to `lesson_messages` table for parents
   - Connection codes hashed with bcrypt (not plaintext)

3. **Audit Trail:**
   - Log all parent access to student data
   - Log when connections are created/revoked
   - Parents can see which data was accessed when (transparency)

**Privacy Controls for Students:**
- Toggle: "Allow parents to see my activity" (can pause sharing temporarily)
- Toggle: "Allow celebration messages" (opt-in to parent celebrations)
- Delete: "Remove parent access" (permanent unlink)

**Data Retention on Unlink:**
- When parent link is revoked:
  - Set `status = 'revoked'`
  - Keep audit logs for 90 days
  - Delete cached summaries immediately
  - Parent can no longer access any student data

### Error Handling & Edge Cases

**Connection Failures:**
```typescript
enum ConnectionError {
  CODE_EXPIRED = 'This code has expired. Generate a new one.',
  CODE_INVALID = 'Invalid code. Check the numbers and try again.',
  CODE_USED = 'This code has already been used.',
  RATE_LIMITED = 'Too many attempts. Try again in 15 minutes.',
  ALREADY_LINKED = 'You are already connected to this student.',
  SELF_LINK = 'You cannot connect to yourself.'
}
```

**Data Loading Failures:**
- Student data unavailable → Show cached data with "Last updated X ago" warning
- Summary generation fails → Show fallback message: "Sarah completed 3 lessons this week. Full insights temporarily unavailable."
- Complete API failure → Friendly error state with retry button

**Parent with No Linked Students:**
- Empty state with clear CTA
- Visual illustration (parent and child learning together)
- Help text: "Connect with your child's account to see their progress"
- Button: "Add Your First Student"

**Student Deletes Account:**
- Cascade: All parent links auto-revoked
- Parents see: "This student account has been removed" with option to remove from list

### Performance Optimization

**Database Queries:**
- Use materialized view for mastery heatmap (refresh every hour)
- Index all foreign keys and query fields
- Use `select` to fetch only needed columns (not `*`)
- Implement cursor-based pagination for activity timeline

**Frontend Optimization:**
- Skeleton loaders while data fetches
- Lazy load activity timeline (infinite scroll)
- Cache summary in memory for 5 minutes
- Debounce "mark as read" actions

**AI Generation:**
- Cache summaries for 6 hours minimum
- Pre-generate during low-traffic hours (2-4 AM)
- Fallback to template-based summary if AI service down
- Rate limit: 1 refresh per 10 minutes per student

---

## 4b. Codebase Integration Notes

> This section documents codebase-specific findings from a scan of the existing implementation. Use these notes to avoid integration pitfalls and align implementation with current architecture.

### Critical: Route Group Blocker

The `(app)` layout (`src/routes/(app)/+layout.svelte:24`) redirects any signed-in user to `/onboarding` if `onboarding.completed` is false. Parents will **never** have onboarding completed (they skip it entirely), so they will be trapped in an infinite redirect loop if any `(app)` route is used.

**Fix:** The parent portal routes **must** live at `src/routes/parent/` — a sibling to `(app)/`, not inside it. This is already the structure proposed in Phase 2, but the blocker must be called out explicitly: do not place parent routes inside the `(app)` group.

Additionally, update `src/routes/(app)/+layout.svelte` to skip the onboarding redirect for parent roles:
```typescript
// src/routes/(app)/+layout.svelte
if (!$appState.onboarding.completed && $appState.profile.role !== 'parent') {
  void goto(onboardingPath());
}
```

---

### Critical: `entryPathForState` Must Handle Parent Role

`src/lib/routing.ts:64` — `entryPathForState()` routes signed-in users to either `/dashboard` (onboarding done) or `/onboarding` (not done). A parent will always be sent to `/onboarding`.

**Fix:** Add a role branch before the onboarding check:

```typescript
// src/lib/routing.ts
export function entryPathForState(state: AppState): string {
  if (state.auth.status !== 'signed_in') return '/';
  if (state.profile.role === 'parent') {
    return '/parent'; // Parent portal entry — empty state or first student
  }
  return state.onboarding.completed ? dashboardPath() : onboardingPath();
}
```

Also add a `parentPath()` helper:
```typescript
export function parentPath(studentId?: string): string {
  return studentId ? `/parent/${encodeURIComponent(studentId)}` : '/parent';
}
```

---

### Mastery Heatmap: Correct Data Source

Phase 2 references `state.progress` as the data source for the mastery heatmap. **This is incorrect.** `AppState.progress` is `Record<lessonId, LessonProgress>` — a map of lesson completion data — and `LessonProgress` does not carry subject/topic metadata.

**Correct data source:** `LessonSession[]` stored in `lesson_sessions` Supabase table. Each session has:
- `subjectId`, `subject`, `topicId`, `topicTitle` — for grouping into heatmap cells
- `confidenceScore` (0–1) — use as the mastery proxy
- `status` — only `'complete'` sessions count toward mastery
- `lastActiveAt` — determines cell recency

Heatmap aggregation logic: group completed `lessonSessions` by `(subjectId, topicId)`, take the max (or most recent) `confidenceScore` as the mastery value for that cell. Sessions with `status !== 'complete'` show as "in progress" (grey or partial fill).

**Fix:** Update Phase 2 heatmap section:
> ~~Data source: `state.progress` aggregated by subject/topic~~
> Data source: `lesson_sessions` table, grouped by `(subjectId, topicId)`, using `confidenceScore` on `status = 'complete'` records.

---

### Appendix B Correction: No `mastery_records` Table

Appendix B index references:
```sql
CREATE INDEX idx_mastery_student_subject ON mastery_records(student_id, subject_id);
```

There is no `mastery_records` table in the codebase. Mastery data lives in `lesson_sessions`. Replace with:
```sql
CREATE INDEX idx_lesson_sessions_student_topic
  ON lesson_sessions(student_id, subject_id, topic_id, last_active_at DESC)
  WHERE status = 'complete';
```

---

### `UserProfile` Fields for Parent Users

`UserProfile` (`src/lib/types.ts:44`) has student-specific fields (`grade`, `gradeId`, `curriculum`, `curriculumId`, `schoolYear`, `term`) that are meaningless for parents. These will be empty strings when a parent signs up without onboarding.

**Implication:** Parent-facing code must never display or depend on these fields. The parent API routes should fetch the linked *student's* profile for curriculum context. No schema change needed — the existing fields just stay empty for parent accounts.

---

### `bootstrap` API and `saveAppState` — Role Awareness

`GET /api/state/bootstrap` loads a full `AppState` including `lessonSessions`, `learnerProfile`, `revisionTopics`, etc. When called for a parent user, this returns an empty student shell, which is harmless but wasteful.

`saveAppState` in `src/lib/server/state-repository.ts` syncs student-specific tables (`lesson_sessions`, `learner_profiles`, `revision_topics`, `lesson_messages`). If a parent's browser somehow triggers a sync, these upserts will produce empty/no-op writes.

**Implication:** Parent users should never call `POST /api/state/sync` — the parent store is database-driven and uses dedicated parent API routes. Add a role check in the sync endpoint to return early for non-student roles.

---

### Parent Auth Flow — Onboarding Skip

The current auth flow (`src/lib/stores/app-state.ts` `signUp`) creates a student profile and begins onboarding. There is no mechanism to sign up as a parent role.

**Required:** The landing page (`src/routes/+page.svelte` → `LandingView`) needs a role toggle or separate entry point for parents:
- Option A: "Sign in as a parent" link → shows simplified auth form without onboarding
- Option B: Role selection step immediately after auth, before onboarding screen
- Profile creation must set `role = 'parent'` server-side (never client-overridden, matching existing security posture where role is excluded from client sync)

---

### Admin Guard — Pattern to Replicate

`src/lib/server/admin/admin-guard.ts` is the established pattern for role-based API guards. The `parent-guard.ts` should mirror this file's structure but also validate the `student_parent_links` record (active link between `auth.uid()` and requested `studentId`).

Place at: `src/lib/server/parent/parent-guard.ts`

---

### Bug: `getDataFreshness` Math Error

Section 4 contains a bug in the sync indicator implementation:

```typescript
// WRONG — operator precedence divides getTime() first, then subtracts
const minutesAgo = Date.now() - new Date(lastSync).getTime() / 60000;
```

Fix:
```typescript
// CORRECT
const minutesAgo = (Date.now() - new Date(lastSync).getTime()) / 60000;
```

---

### Security: Remove `parentId` from `ParentSummaryRequest`

`ParentSummaryRequest` (Phase 3) includes `parentId` as a request body field. This is a security flaw — a caller could pass any `parentId` to probe cached summaries for parents they aren't. The parent identity must always be derived server-side from `auth.uid()`.

**Fix:** Remove `parentId` from the interface; derive it in the API handler:
```typescript
interface ParentSummaryRequest {
  studentId: string;
  // parentId removed — use auth.uid() server-side
  timeframe: 'week' | 'month' | 'custom';
  startDate?: string;
  endDate?: string;
}
```

---

### Activity Timeline: `timeSpentMinutes` Lives on `LessonProgress`, Not `LessonSession`

The activity timeline displays "time spent" per session. `LessonSession` (`src/lib/types.ts:347`) has no `timeSpentMinutes` field. The `timeSpentMinutes` field is on `LessonProgress` (`src/lib/types.ts:196`), which is the quiz/practice progress record.

For the timeline, derive session duration from `LessonSession` timestamps:
```typescript
const timeSpent = session.completedAt
  ? (new Date(session.completedAt).getTime() - new Date(session.startedAt).getTime()) / 60000
  : (new Date(session.lastActiveAt).getTime() - new Date(session.startedAt).getTime()) / 60000;
```

---

### Cognitive Profile Trends Require Historical Snapshots

Phase 2 specifies trend indicators (↑ Improving, ↓ Declining, → Stable) comparing to the prior week. `LearnerProfile` (`src/lib/types.ts:297`) only stores the *current* values — there is no weekly snapshot history.

**Options:**
- **MVP:** Omit trend arrows; show current values only
- **Post-MVP:** Add a `learner_profile_snapshots` table capturing weekly snapshots for trend computation
- **Alternative:** Query `lesson_signals` records (individual signal events stored per session) and compute trailing 7-day vs prior 7-day average

Recommend shipping without trend arrows in Phase 2 and adding a snapshot table post-MVP.

---

### Student "Online/Offline" Status Requires Supabase Realtime Presence

The student selector card spec includes a "current status indicator (online/offline/learning)". No realtime presence system exists in the codebase. Implementing this requires Supabase Realtime presence channels.

**Recommendation:** Defer to post-MVP. For Phase 2 MVP, replace with a simpler "last active" relative timestamp (e.g. "Active 5 mins ago") derived from `max(lastActiveAt)` across the student's sessions — no realtime subscription needed.

---

### `parent_summaries` Table Schema Missing from Appendix B

Phase 3 mentions caching AI summaries in a `parent_summaries` table with TTL, but the schema is never defined. Add to Appendix B:

```sql
CREATE TABLE parent_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID REFERENCES auth.users(id) NOT NULL,
  student_id UUID REFERENCES auth.users(id) NOT NULL,
  timeframe TEXT NOT NULL DEFAULT 'week',
  summary_json JSONB NOT NULL,
  generated_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  feedback TEXT CHECK (feedback IN ('helpful', 'not_relevant')),
  UNIQUE(parent_id, student_id, timeframe)
);

CREATE INDEX idx_parent_summaries_lookup
  ON parent_summaries(parent_id, student_id, expires_at DESC);
```

Invalidation: update `expires_at = now()` when the student completes a new lesson (via trigger or API hook).

---

### `pulse_events.parent_id` Nullable Index Issue

The `pulse_events` schema has `parent_id` as nullable ("populated when sent"). The index `idx_pulse_events_parent ON pulse_events(parent_id, ...)` performs poorly when `parent_id IS NULL` since PostgreSQL includes NULLs in B-tree indexes but equality queries on NULL don't match. Additionally, if events are created without a `parent_id` and populated later, a fetch by `parent_id` before population silently returns nothing.

**Fix:** Populate `parent_id` at event creation time by querying `student_parent_links` for all active parents of the student. Store one row per parent, not one row per student:

```sql
-- Revised: one pulse row per (student, parent) pair
ALTER TABLE pulse_events ALTER COLUMN parent_id SET NOT NULL;
```

Or create a separate `pulse_deliveries` join table if the fan-out model is preferred.

---

### Settings Page Is Empty — "Invite Parent" UI Has No Foundation

`src/routes/(app)/settings/+page.svelte` is ~305 bytes — just a shell component with no content. Phase 1 places the "Invite Parent" button here. This is correct but the page needs to be built from scratch; there is no existing settings UI to extend.

---

## 5. UI/UX Design Specifications

### Design Language Alignment

The Parent Portal follows the same design system (`docs/desgin-langauge.md`) with parent-specific adaptations:

**Color Usage:**
- Same dark-first palette (`--color-bg: #0f1229`)
- Accent color for primary actions (lime green)
- Subject colors for heatmap (blue, purple, orange, etc.)
- Success/warning states for sync indicator

**Typography:**
- Hero greeting: "Hey [Parent Name]! Here's how [Student Name] is doing"
- Student names in bold to personalize
- Metrics use large numbers (`--text-3xl`)
- Descriptions use muted text (`--color-text-soft`)

**Components:**
- `.card--parent` variant with softer shadows (less gamified than student view)
- `.insight-card` full-width with gradient background
- `.pulse-card` with celebration icon and timestamp
- `.mastery-cell` small squares for heatmap grid

**Motion:**
- Subtle hover lifts on cards (same as dashboard)
- Pulse cards animate in with slight delay (staggered)
- Celebration confetti on milestone interaction
- Smooth transitions when switching between students

### Mobile Responsiveness

**Mobile Layout:**
- Student selector: Horizontal scroll at top
- Insight card: Full width, stacked content
- Mastery heatmap: Scrollable grid or accordion by subject
- Activity timeline: Full width, condensed view
- Bottom nav: Home, Students, Pulse, Settings

**Touch Interactions:**
- Swipe between students
- Pull to refresh data
- Long press on pulse to mark as read

### Accessibility

- All color-coded information also has text labels
- ARIA labels on interactive elements
- Keyboard navigation support
- Screen reader optimized (announce data freshness)
- High contrast mode support

---

## 6. Testing Strategy

### Unit Tests
- Connection code generation (cryptographically secure)
- RLS policy validation (parent can only see linked students)
- Summary generation prompt formatting
- Data freshness calculations

### Integration Tests
- End-to-end connection flow (student generates → parent connects)
- Dashboard data loading with various permission scenarios
- AI summary API with mock student data
- Pulse event creation and delivery

### E2E Tests (Playwright)
- Parent logs in → sees empty state → connects to student → sees data
- Student revokes access → parent sees permission denied
- Switch between multiple students
- Mobile responsive layout verification

### Security Tests
- Attempt to access student data without link → 403
- Attempt to use expired code → error
- Attempt brute force on connection code → rate limited
- SQL injection on student_id parameter → sanitized

### Load Tests
- 1000 concurrent parent dashboard loads
- AI summary generation under load (queue management)
- Database query performance with 10k+ lesson sessions

---

## 7. Deployment & Rollout

### Feature Flags
- `parent_portal_enabled`: Master toggle
- `ai_insights_enabled`: Phase 3 features
- `pulse_notifications_enabled`: Phase 4 features

### Rollout Strategy
1. **Internal Alpha:** Team members test with test accounts
2. **Beta (10% of users):** Real families opt-in, feedback collection
3. **Gradual Rollout:** 25% → 50% → 100% over 2 weeks
4. **Monitor:** Error rates, parent engagement, student opt-out rate

### Monitoring & Alerting
- Track parent dashboard load times (alert if > 3 seconds)
- Monitor AI summary generation failures
- Alert on unusual access patterns (potential security issue)
- Track feature adoption rates

### Documentation
- **Parent Help Center:** "How to connect with your child"
- **Student Help Center:** "Sharing your progress with parents"
- **FAQ:** Address privacy concerns, explain what parents can/cannot see

---

## 8. Success Metrics & Analytics

### Primary Metrics (North Star)

| Metric | Target | Measurement |
|--------|--------|-------------|
| Connection Rate | 40% of students linked | `% of students with ≥1 parent link` |
| Parent Retention | 2+ logins/week | `weekly_active_parents / total_parents` |
| Home Hint Engagement | 30% click feedback | `clicks on home hints / home hints shown` |
| Student Opt-out | < 5% | `% of students who revoke parent access` |

### Secondary Metrics

- **Time to Connect:** Average time from student generating code to parent connecting (target: < 24 hours)
- **Dashboard Load Time:** p95 < 2 seconds
- **AI Summary Quality:** "Helpful" rating > 80%
- **Pulse Engagement:** % of parents who click celebrate button
- **Multi-Student Rate:** % of parents tracking 2+ children

### Feedback Loops

**Parent Feedback:**
- Quarterly survey: "Is the portal helping you support your child?"
- In-app feedback button on insight cards
- NPS score tracking

**Student Feedback:**
- "How do you feel about sharing progress with parents?" (1-5 scale)
- Opt-out reason collection (if they revoke access)
- Anonymous feedback on parent portal

**Teacher Feedback (Future):**
- If teachers have access: "Are parent insights accurate?"

---

## 9. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Privacy concerns cause low adoption | Medium | High | Clear communication, student controls, transparent data access |
| AI summaries are inaccurate | Medium | Medium | Human review in beta, fallback templates, feedback loops |
| Parents become helicopter monitors | Low | High | Design for celebration not surveillance, emphasize patterns not play-by-play |
| Technical complexity delays launch | Medium | Medium | Phased rollout, cut features if needed, maintain quality over scope |
| Students game the system for parent approval | Low | Medium | Emphasize learning over scores, celebrate effort not just achievement |
| Connection codes are brute-forced | Low | High | Rate limiting, short expiration, hashed storage, audit logs |

---

## 10. Future Enhancements (Post-MVP)

**Short Term (Months 2-3):**
- Email digest (weekly summary)
- Multiple parent support (custody situations)
- Guardian role (grandparents, tutors)

**Medium Term (Months 4-6):**
- Push notifications
- Offline mode (download data for review)
- Export progress reports (PDF for school meetings)
- Teacher integration (teachers can see parent engagement)

**Long Term (Year 2):**
- Predictive analytics ("At risk of falling behind in...")
- Goal setting (parent and student co-create learning goals)
- Community features (parent forums, tips sharing)
- Video summaries (AI-generated video of child's progress)

---

## Appendix A: API Contract

### `POST /api/parent/connect`
Student generates connection code

### `POST /api/parent/validate`
Parent validates connection code

### `GET /api/parent/students`
List linked students

### `GET /api/parent/students/[id]/summary`
Get AI summary for student

### `GET /api/parent/students/[id]/mastery`
Get mastery heatmap data

### `GET /api/parent/students/[id]/activity`
Get activity timeline (paginated)

### `GET /api/parent/pulses`
Get pulse events (unread or all)

### `POST /api/parent/pulses/[id]/read`
Mark pulse as read

---

## Appendix B: Database Schema

See inline SQL above plus:

**Indexes:**
```sql
-- Optimize parent dashboard queries
CREATE INDEX idx_lesson_sessions_student_date ON lesson_sessions(student_id, lastActiveAt DESC);
CREATE INDEX idx_mastery_student_subject ON mastery_records(student_id, subject_id);
```

**Triggers:**
```sql
-- Auto-clean expired connection codes
CREATE OR REPLACE FUNCTION clean_expired_codes()
RETURNS void AS $$
BEGIN
  DELETE FROM student_parent_links 
  WHERE status = 'pending' 
  AND code_expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Run daily via pg_cron or similar
```

---

## Appendix C: Design Mockups

[Link to Figma/Sketch files - to be created]

**Key Screens:**
1. Parent Empty State (no students linked)
2. Connection Flow (step-by-step)
3. Dashboard Overview (single student)
4. Student Selector (multiple children)
5. Mastery Detail View (topic breakdown)
6. Pulse Notifications Panel
7. Settings (manage connections)

---

**Document Version:** 2.0  
**Last Updated:** 2026-03-27  
**Status:** Ready for Development  
**Owner:** Product & Engineering Team
