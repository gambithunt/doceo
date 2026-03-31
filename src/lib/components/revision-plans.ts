export function getRevisionPlansHeader() {
  return {
    eyebrow: 'Saved plans',
    title: 'Your revision plans',
    summary: 'Saved plans you can launch directly into revision.'
  };
}

export function formatSavedPlansCount(count: number): string {
  return `${count} saved`;
}
