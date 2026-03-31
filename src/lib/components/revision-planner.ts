export function shouldClosePlannerOnKey(key: string): boolean {
  return key === 'Escape';
}

export function openDateInputPicker(input: HTMLInputElement | null): void {
  if (!input) {
    return;
  }

  if (typeof input.showPicker === 'function') {
    try {
      input.showPicker();
      return;
    } catch {
      // Fall back to the browser's default focus/click behavior.
    }
  }

  input.focus();
  input.click();
}
