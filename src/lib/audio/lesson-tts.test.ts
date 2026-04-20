import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createLessonTts } from './lesson-tts';

interface MockAudio {
  src: string;
  currentTime: number;
  onplay?: () => void;
  onerror?: () => void;
  onpause?: () => void;
  onended?: () => void;
  play: ReturnType<typeof vi.fn>;
  pause: ReturnType<typeof vi.fn>;
}

describe('createLessonTts', () => {
  const getAuthenticatedHeaders = vi.fn();

  beforeEach(() => {
    vi.resetAllMocks();
    getAuthenticatedHeaders.mockImplementation(async (baseHeaders = {}) => ({
      ...baseHeaders,
      Authorization: 'Bearer token'
    }));
  });

  it('no-ops cleanly when audio playback is unavailable', async () => {
    const onStateChange = vi.fn();
    const tts = createLessonTts({
      getAuthenticatedHeaders,
      fetcher: vi.fn()
    });

    expect(tts.available).toBe(true);
    expect(
      await tts.play(
        {
          lessonSessionId: 'lesson-session-1',
          lessonMessageId: 'lesson-message-1',
          content: ''
        },
        { onStateChange }
      )
    ).toBe(false);

    tts.stop();
    tts.destroy();

    expect(onStateChange).not.toHaveBeenCalled();
  });

  it('fetches lesson audio and reports playback state changes', async () => {
    const audio: MockAudio = {
      src: '',
      currentTime: 0,
      play: vi.fn(async () => {
        audio.onplay?.();
      }),
      pause: vi.fn(() => {
        audio.onpause?.();
      })
    };
    const onStateChange = vi.fn();
    const tts = createLessonTts({
      getAuthenticatedHeaders,
      fetcher: vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          ok: true,
          audioUrl: 'https://storage.example/audio.mp3'
        })
      }),
      createAudio: (url) => {
        audio.src = url;
        return audio as never;
      }
    });

    expect(tts.available).toBe(true);
    expect(
      await tts.play(
        {
          lessonSessionId: 'lesson-session-1',
          lessonMessageId: 'lesson-message-1',
          content: 'Tutor bubble copy'
        },
        { onStateChange }
      )
    ).toBe(true);
    expect(audio.src).toBe('https://storage.example/audio.mp3');
    expect(onStateChange).toHaveBeenNthCalledWith(1, 'playing');

    audio.currentTime = 5;
    audio.onpause?.();
    expect(onStateChange).toHaveBeenNthCalledWith(2, 'paused');

    expect(await tts.resume()).toBe(true);
    expect(audio.play).toHaveBeenCalledTimes(2);
    expect(onStateChange).toHaveBeenNthCalledWith(3, 'playing');

    audio.onended?.();
    expect(onStateChange).toHaveBeenLastCalledWith('idle');

    tts.stop();
    tts.destroy();
    expect(audio.pause).not.toHaveBeenCalled();
  });
});
