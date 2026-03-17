-- Add source tracking to curriculum_subjects so we can distinguish
-- curriculum-seeded subjects from those verified and contributed by users.
alter table curriculum_subjects
  add column if not exists source text not null default 'seeded';

-- Mark all existing rows as seeded.
update curriculum_subjects set source = 'seeded' where source = 'seeded';
