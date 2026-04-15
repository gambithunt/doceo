#!/usr/bin/env npx tsx
/**
 * Analyze subject popularity from onboarding data.
 * Reads student_onboarding and subject selections to produce a popularity map.
 *
 * Usage: npx tsx scripts/analyze-subject-popularity.ts
 *
 * Requires Supabase environment variables:
 * - SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY (for reading student data)
 *
 * Output: scripts/seed-popularity.json
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

interface OnboardingRow {
  profile_id: string;
  education_type: string | null;
  level: string | null;
  programme: string | null;
}

interface SelectedSubjectRow {
  profile_id: string;
  subject_name: string | null;
}

interface CustomSubjectRow {
  profile_id: string;
  subject_name: string | null;
}

interface SeedPopularityData {
  generated_at: string;
  source: string;
  total_students: number;
  total_subject_picks: number;
  subjects: Record<string, number>;
}

function normalizeSubjectToKey(subjectName: string): string {
  return subjectName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function computeSubjectPopularity(
  onboardingRows: OnboardingRow[],
  selectedSubjectRows: SelectedSubjectRow[],
  customSubjectRows: CustomSubjectRow[]
): Record<string, number> {
  const universityProfileIds = new Set<string>();

  for (const row of onboardingRows) {
    if (row.education_type === 'University' && row.profile_id) {
      universityProfileIds.add(row.profile_id);
    }
  }

  const subjectCounts = new Map<string, number>();

  for (const row of selectedSubjectRows) {
    if (row.profile_id && row.subject_name && universityProfileIds.has(row.profile_id)) {
      const key = normalizeSubjectToKey(row.subject_name);
      subjectCounts.set(key, (subjectCounts.get(key) ?? 0) + 1);
    }
  }

  for (const row of customSubjectRows) {
    if (row.profile_id && row.subject_name && universityProfileIds.has(row.profile_id)) {
      const key = normalizeSubjectToKey(row.subject_name);
      subjectCounts.set(key, (subjectCounts.get(key) ?? 0) + 1);
    }
  }

  return Object.fromEntries(subjectCounts);
}

async function main() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables are required.');
    console.error('Copy .env.example to .env and fill in your Supabase credentials.');
    process.exit(1);
  }

  console.log('Connecting to Supabase...');
  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log('Fetching university onboarding records...');
  const { data: onboardingData, error: onboardingError } = await supabase
    .from('student_onboarding')
    .select('profile_id, education_type, level, programme')
    .eq('education_type', 'University');

  if (onboardingError) {
    console.error('Error fetching onboarding data:', onboardingError);
    process.exit(1);
  }

  console.log(`Found ${onboardingData?.length ?? 0} university onboarding records.`);

  console.log('Fetching selected subjects...');
  const { data: selectedData, error: selectedError } = await supabase
    .from('student_selected_subjects')
    .select('profile_id, subject_name');

  if (selectedError) {
    console.error('Error fetching selected subjects:', selectedError);
    process.exit(1);
  }

  console.log('Fetching custom subjects...');
  const { data: customData, error: customError } = await supabase
    .from('student_custom_subjects')
    .select('profile_id, subject_name');

  if (customError) {
    console.error('Error fetching custom subjects:', customError);
    process.exit(1);
  }

  const onboardingRows = (onboardingData ?? []) as OnboardingRow[];
  const selectedRows = (selectedData ?? []) as SelectedSubjectRow[];
  const customRows = (customData ?? []) as CustomSubjectRow[];

  console.log('Computing subject popularity...');
  const subjects = computeSubjectPopularity(onboardingRows, selectedRows, customRows);

  const seedData: SeedPopularityData = {
    generated_at: new Date().toISOString(),
    source: 'student_onboarding analysis',
    total_students: new Set(onboardingRows.map((r) => r.profile_id)).size,
    total_subject_picks: selectedRows.length + customRows.length,
    subjects
  };

  const outputPath = path.join(process.cwd(), 'scripts', 'seed-popularity.json');
  const outputDir = path.dirname(outputPath);

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(outputPath, JSON.stringify(seedData, null, 2));
  console.log(`\nSeed popularity data written to: ${outputPath}`);
  console.log(`Total students analyzed: ${seedData.total_students}`);
  console.log(`Total subject picks: ${seedData.total_subject_picks}`);
  console.log(`Unique subjects found: ${Object.keys(subjects).length}`);

  if (Object.keys(subjects).length === 0) {
    console.warn('\nWarning: No university subjects found in the database.');
    console.warn('This is expected for a fresh database. Using default weights.');
  }
}

main().catch((error) => {
  console.error('Unexpected error:', error);
  process.exit(1);
});