import { json } from "@sveltejs/kit";
import { z } from "zod";
import { c as completeOnboarding } from "../../../../../chunks/onboarding-repository.js";
const CompleteOnboardingSchema = z.object({
  profileId: z.string().min(1),
  countryId: z.string().min(1),
  curriculumId: z.string(),
  gradeId: z.string(),
  schoolYear: z.string(),
  term: z.string(),
  selectedSubjectIds: z.array(z.string()),
  selectedSubjectNames: z.array(z.string()),
  customSubjects: z.array(z.string()),
  isUnsure: z.boolean(),
  educationType: z.enum(["School", "University"]),
  provider: z.string(),
  programme: z.string(),
  level: z.string()
});
async function POST({ request }) {
  const raw = await request.json();
  const parsed = CompleteOnboardingSchema.safeParse(raw);
  if (!parsed.success) {
    return json({ error: parsed.error.message }, { status: 400 });
  }
  try {
    const result = await completeOnboarding(parsed.data);
    return json(result);
  } catch (err) {
    const { getSubjectsByCurriculumAndGrade, getRecommendedSubject, getSelectionMode } = await import("../../../../../chunks/onboarding.js");
    const { deduplicateSubjects } = await import("../../../../../chunks/strings.js");
    const subjects = getSubjectsByCurriculumAndGrade(parsed.data.curriculumId, parsed.data.gradeId);
    const customSubjects = deduplicateSubjects(parsed.data.customSubjects);
    const recommendation = getRecommendedSubject(parsed.data.selectedSubjectIds, customSubjects, subjects);
    const selectionMode = getSelectionMode(parsed.data.selectedSubjectIds, customSubjects, parsed.data.isUnsure);
    if (process.env.NODE_ENV !== "production") {
      console.warn("[onboarding/complete] Database unavailable, using local fallback.", err);
    }
    return json({ recommendation, selectionMode, subjects });
  }
}
export {
  POST
};
