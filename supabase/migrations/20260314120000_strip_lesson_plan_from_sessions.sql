-- T3.3e: Strip the embedded lessonPlan from session_json in lesson_sessions.
-- The full lesson is now stored in curriculum_lessons and referenced by lesson_id only.
-- Wrapped in DO block so it is a no-op on fresh databases where the table may not exist yet.

do $$
begin
  if exists (select 1 from information_schema.tables where table_name = 'lesson_sessions') then
    update lesson_sessions
    set session_json = session_json - 'lessonPlan'
    where session_json ? 'lessonPlan';
  end if;
end $$;
