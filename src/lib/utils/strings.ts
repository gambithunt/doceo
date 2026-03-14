export function deduplicateSubjects(subjects: string[]): string[] {
  return Array.from(
    new Set(subjects.map((subject) => subject.trim()).filter((subject) => subject.length > 0))
  );
}
