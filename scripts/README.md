# Subject Popularity Analysis

This directory contains scripts for analyzing subject popularity from onboarding data and applying weights to the subject topics catalog.

## Files

- `analyze-subject-popularity.ts` - Analysis script that reads onboarding data and produces popularity JSON
- `seed-popularity.json` - Baseline popularity weights for seed data

## Usage

### Running the Analysis Script

1. Ensure you have a `.env` file with Supabase credentials:

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

2. Run the analysis script:

```bash
npx tsx scripts/analyze-subject-popularity.ts
```

3. The script will output `scripts/seed-popularity.json` with the computed popularity data.

### Updating Admin Weights

After running the analysis script, you can update the `admin_weight` values in the `subject_topics` table:

```sql
-- Example: Update weights based on popularity data
UPDATE subject_topics
SET admin_weight = (
  SELECT COALESCE(p.subjects->>subject_topics.subject_key, '0')::int
  FROM json_each(read_file('scripts/seed-popularity.json')) AS p(key, value)
  WHERE p.key = subject_topics.subject_key
),
updated_at = now();
```

Alternatively, use the Supabase dashboard or a migration to update weights.

## Re-running the Analysis

The script is idempotent and safe to run multiple times. Recommended frequency:

- After deploying to a new environment
- Quarterly to refresh popularity data
- After significant changes to onboarding flow

## Data Source

The script reads from:

- `student_onboarding` - Filtered for `education_type = 'University'`
- `student_selected_subjects` - Subject picks for university profiles
- `student_custom_subjects` - Custom subjects for university profiles

## Output Format

```json
{
  "generated_at": "2026-04-13T00:00:00.000Z",
  "source": "student_onboarding analysis",
  "total_students": 150,
  "total_subject_picks": 423,
  "subjects": {
    "computer-science": 45,
    "mathematics": 38,
    ...
  }
}
```

## Subject Key Normalization

Subject names are normalized to kebab-case (e.g., "Computer Science" → "computer-science") to match the `subject_key` format in `subject_topics`.