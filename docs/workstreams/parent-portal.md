# Parent Portal — Workstream

A strategic initiative to allow parents to track student progress, mastery levels, and AI-driven insights without compromising the student's private learning environment.

---

## 1. Vision & Strategy

The Parent Portal is not a "second student" view. It is an **observer lens** designed to give parents high-signal data about their child's academic health. It bridges the gap between automated AI tutoring and home-based support.

### Key Objectives
- **High-Signal Progress:** Surface mastery heatmaps and cognitive profiles.
- **AI-Driven Synthesis:** Provide "Parent-Teacher" summaries of recent activity.
- **Privacy First:** Maintain the student's "safe space" by summarizing chat history rather than exposing raw transcripts.
- **Actionable Home-Support:** Suggest offline activities to reinforce school concepts.

---

## 2. Conceptual Model

### Relationship Linkage
- **Role Extension:** Utilize the existing `role: 'parent'` in `UserProfile`.
- **The Handshake:**
    - Student generates a unique 6-digit **Connection Code**.
    - Parent enters the code in their dashboard to create a record in a new `student_parent_links` table.
    - Relationship supports 1 parent to N students.

### Data Synchronization
- **Cloud-Mandate:** Student sessions must be synced to Supabase for parents to see live data.
- **Observer RLS:** Supabase Row Level Security (RLS) policies will allow parents to read `lesson_sessions`, `mastery`, and `learner_profiles` for linked student IDs.

---

## 3. Implementation Roadmap

### Phase 1: Foundation & Linking
- [ ] **Database Schema:** Create `student_parent_links` table (parent_id, student_id, status, created_at).
- [ ] **Connection UI:** 
    - [ ] Student-side "Invite Parent" button in Settings.
    - [ ] Parent-side "Add Student" input with code verification.
- [ ] **Admin/Guard Update:** Refine `admin-guard.ts` to support parent-role access to specific student sub-trees.

### Phase 2: The Parent Dashboard
- [ ] **Student Selector:** A high-level switcher if a parent has multiple linked children.
- [ ] **Mastery Heatmap:** A read-only version of the student's subject/topic mastery map.
- [ ] **Cognitive Profile:** Surfacing `LearnerProfile` signals (e.g., "Responds well to: Visual Analogies").
- [ ] **Activity Timeline:** A list of recent `lessonSessions` showing:
    - [ ] Topic title & Subject.
    - [ ] Completion % and Confidence score.
    - [ ] Time spent.

### Phase 3: AI Parent-Teacher Insights
- [ ] **Synthesis Engine:** Create a new AI route `/api/ai/parent-summary`.
    - [ ] Input: Last 5 `lessonSessions` + `LearnerProfile`.
    - [ ] Output: 3-sentence summary + 1 "Home Hint" (reinforcement activity).
- [ ] **Insight Cards:** Render these summaries at the top of the Parent Dashboard.

### Phase 4: Notifications (The "Pulse")
- [ ] **Milestone Events:** Hook into `appState` to trigger a "Pulse" event when:
    - [ ] A student hits "High Mastery" in a topic.
    - [ ] A revision plan is 100% complete.
- [ ] **Parent Alert UI:** A dedicated notification bell or "Wins" section for parents to celebrate student progress.

---

## 4. Technical Constraints & Considerations

- **State Persistence:** Ensure parent views are driven by the database, while students continue to use the hybrid local/cloud `appState` model.
- **Transcript Privacy:** By default, parents should *not* see the raw `LessonMessage[]` array. The `parent-summary` AI should be the primary interface for "content" insight.
- **Mobile First:** Parents are likely to check this on the go; the `MobileNav` and layout must be responsive for the new `parent` screen.

---

## 5. Success Metrics

- **Connection Rate:** % of students who link at least one parent.
- **Parent Retention:** Frequency of parent dashboard logins (aiming for 2x/week).
- **Home Reinforcement:** Usage of the "Home Hint" suggestions (tracked via feedback buttons).
