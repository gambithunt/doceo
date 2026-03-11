import { json } from "@sveltejs/kit";
import { f as fetchCountries, a as fetchCurriculums, b as fetchGrades, d as fetchSubjects } from "../../../../../chunks/onboarding-repository.js";
async function GET({ url }) {
  const type = url.searchParams.get("type");
  const countryId = url.searchParams.get("countryId") ?? "";
  const curriculumId = url.searchParams.get("curriculumId") ?? "";
  const gradeId = url.searchParams.get("gradeId") ?? "";
  if (type === "countries") {
    return json({ options: await fetchCountries() });
  }
  if (type === "curriculums") {
    return json({ options: await fetchCurriculums(countryId) });
  }
  if (type === "grades") {
    return json({ options: await fetchGrades(curriculumId) });
  }
  if (type === "subjects") {
    return json({ options: await fetchSubjects(curriculumId, gradeId) });
  }
  return json({ options: [] });
}
export {
  GET
};
