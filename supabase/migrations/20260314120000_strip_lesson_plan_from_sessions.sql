-- T3.3e: Strip the embedded lessonPlan from session_json in lesson_sessions.
-- The full lesson is now stored in curriculum_lessons and referenced by lesson_id only.

update lesson_sessions
set session_json = session_json - 'lessonPlan'
where session_json ? 'lessonPlan';
