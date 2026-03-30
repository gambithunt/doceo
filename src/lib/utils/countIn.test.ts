import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { countIn } from './countIn';

// Mock requestAnimationFrame / cancelAnimationFrame for synchronous testing
let rafCallbacks: Map<number, FrameRequestCallback> = new Map();
let rafId = 0;

beforeEach(() => {
  rafCallbacks.clear();
  rafId = 0;

  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    const id = ++rafId;
    rafCallbacks.set(id, cb);
    return id;
  });

  vi.stubGlobal('cancelAnimationFrame', (id: number) => {
    rafCallbacks.delete(id);
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function flushFrames(count = 100, timeStep = 10) {
  let t = 0;
  for (let i = 0; i < count; i++) {
    t += timeStep;
    const cbs = Array.from(rafCallbacks.entries());
    for (const [id, cb] of cbs) {
      rafCallbacks.delete(id);
      cb(t);
    }
    if (rafCallbacks.size === 0) break;
  }
}

function makeNode(): HTMLElement {
  return { textContent: '', classList: { add: vi.fn() } } as unknown as HTMLElement;
}

describe('countIn action', () => {
  it('sets count-in class on mount', () => {
    const node = makeNode();
    countIn(node, { value: 10 });
    expect(node.classList.add).toHaveBeenCalledWith('count-in');
  });

  it('starts from 0 on mount', () => {
    const node = makeNode();
    countIn(node, { value: 50 });
    // Before any frames, textContent is initial (may be set in first rAF)
    flushFrames(1, 1);
    // After first frame, value is somewhere between 0 and 50
    const val = parseInt(node.textContent ?? '0');
    expect(val).toBeGreaterThanOrEqual(0);
    expect(val).toBeLessThanOrEqual(50);
  });

  it('reaches target value after animation completes', () => {
    const node = makeNode();
    countIn(node, { value: 75 });
    flushFrames(200, 10); // 2000ms total >> 500ms max
    expect(node.textContent).toBe('75');
  });

  it('uses custom format function', () => {
    const node = makeNode();
    countIn(node, { value: 80, format: (n) => `${Math.round(n)}%` });
    flushFrames(200, 10);
    expect(node.textContent).toBe('80%');
  });

  it('counts from old value to new on update', () => {
    const node = makeNode();
    const action = countIn(node, { value: 50 });
    flushFrames(200, 10); // complete first animation
    expect(node.textContent).toBe('50');

    action.update({ value: 75 });
    flushFrames(1, 1); // mid animation
    const val = parseInt(node.textContent ?? '0');
    // Should be between 50 and 75, not between 0 and 75
    expect(val).toBeGreaterThanOrEqual(50);
    expect(val).toBeLessThanOrEqual(75);
  });

  it('snaps to final value on destroy', () => {
    const node = makeNode();
    const action = countIn(node, { value: 100 });
    flushFrames(1, 1); // only one frame
    action.destroy();
    expect(node.textContent).toBe('100');
  });

  it('cancels in-progress animation when updated', () => {
    const node = makeNode();
    const action = countIn(node, { value: 1000 });
    flushFrames(5, 10); // partway through
    const sizeBeforeUpdate = rafCallbacks.size;

    action.update({ value: 2000 });
    // Update should cancel old rAF and start fresh
    // After update there should be exactly 1 pending frame
    expect(rafCallbacks.size).toBe(1);
  });
});
