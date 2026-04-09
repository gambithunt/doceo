# todo

Ignore this untill we decide to implement support for more contries

When you're ready to expand:
  - Seed graph tables with another country's curriculum tree (country → curriculum → grade → subject nodes)
  - Remove the ZA-only filter from Phase 2
  - The graph catalog repository already handles the full hierarchy generically — fetchCurriculums(countryId),
  fetchGrades(curriculumId), etc. No code changes needed in the repository layer.
