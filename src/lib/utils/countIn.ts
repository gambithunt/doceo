/**
 * countIn — Svelte action that animates a number from 0 (or oldValue) to a
 * target value on mount / when the value changes.
 *
 * Spec: fast start, decelerates into the final value.
 * Easing: cubic-bezier(0.22, 1, 0.36, 1) — strong ease-out.
 * Duration: ≤ 500ms, scales with delta for small changes.
 * On value change: counts from old → new, not from zero.
 * Interruption: snaps to final value if element is removed mid-animation.
 */

type CountInOptions = {
  value: number;
  /** Optional: format the displayed number (e.g. append "%") */
  format?: (n: number) => string;
  /** Max duration in ms. Default 500 */
  maxDuration?: number;
};

function easeOut(t: number): number {
  // Approximation of cubic-bezier(0.22, 1, 0.36, 1) via a simple ease-out curve
  return 1 - Math.pow(1 - t, 3);
}

function scaledDuration(delta: number, max: number): number {
  if (delta <= 1) return 150;
  if (delta <= 5) return 200;
  return Math.min(max, 300 + delta * 0.5);
}

export function countIn(node: HTMLElement, options: CountInOptions) {
  let { value, format = (n) => String(Math.round(n)), maxDuration = 500 } = options;
  let start = 0;
  let current = 0;
  let rafId: number;
  let startTime: number | null = null;

  function run(from: number, to: number) {
    cancelAnimationFrame(rafId);
    startTime = null;
    const delta = Math.abs(to - from);
    const duration = scaledDuration(delta, maxDuration);

    function frame(now: number) {
      if (startTime === null) startTime = now;
      const elapsed = now - startTime;
      const t = Math.min(elapsed / duration, 1);
      const eased = easeOut(t);
      current = from + (to - from) * eased;
      node.textContent = format(current);
      if (t < 1) {
        rafId = requestAnimationFrame(frame);
      } else {
        node.textContent = format(to);
        current = to;
      }
    }

    rafId = requestAnimationFrame(frame);
  }

  node.classList.add('count-in');
  run(start, value);

  return {
    update(newOptions: CountInOptions) {
      const prev = current;
      value = newOptions.value;
      format = newOptions.format ?? format;
      maxDuration = newOptions.maxDuration ?? maxDuration;
      run(prev, value);
    },
    destroy() {
      cancelAnimationFrame(rafId);
      // Snap to final value on teardown
      node.textContent = format(value);
    }
  };
}
