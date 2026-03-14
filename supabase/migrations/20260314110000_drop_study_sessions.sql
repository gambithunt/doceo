-- T5.2e: Drop the legacy study_sessions table.
-- LessonSession (lesson_sessions) is the canonical model.
-- study_sessions was a holdover from the first prototype and is no longer written to.

drop table if exists study_sessions;
