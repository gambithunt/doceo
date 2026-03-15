export function extractHintChipLabels(hintsText: string): string[] {
  return Array.from(
    new Set(
      hintsText
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
    )
  );
}
