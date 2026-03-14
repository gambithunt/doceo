-- The original onboarding schema migration seeded IEB Grade 7 subjects with IDs
-- that do not match what makeSubject() in onboarding.ts generates.
-- The pattern in TypeScript is: `${curriculumId}-${gradeId}-${slug}`
-- For IEB that produces: ieb-ieb-grade-7-<slug>
-- The original migration used: ieb-grade-7-<slug> (missing the ieb- prefix from curriculumId)
--
-- The expand_onboarding_reference_data migration already inserts the correct IDs.
-- This migration removes the stale wrong-ID rows so the app never sees duplicates.

delete from curriculum_subjects
where id in (
  'ieb-grade-7-mathematics',
  'ieb-grade-7-english-home-language',
  'ieb-grade-7-afrikaans-additional-language',
  'ieb-grade-7-natural-sciences',
  'ieb-grade-7-social-sciences',
  'ieb-grade-7-technology',
  'ieb-grade-7-economic-and-management-sciences',
  'ieb-grade-7-life-orientation',
  'ieb-grade-7-creative-arts'
);
