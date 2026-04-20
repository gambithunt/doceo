import { getAuthenticatedHeaders } from '$lib/authenticated-fetch';

export type LessonTtsState = 'idle' | 'playing' | 'paused';

export interface LessonTtsPlayRequest {
  lessonSessionId: string;
  lessonMessageId: string;
  content: string;
}

export interface LessonTtsCallbacks {
  onStateChange?: (state: LessonTtsState) => void;
}

interface LessonTtsRouteResponse {
  ok: true;
  audioUrl: string;
}

interface LessonAudioLike {
  src: string;
  currentTime: number;
  onplay: (() => void) | null;
  onpause: (() => void) | null;
  onended: (() => void) | null;
  onerror: (() => void) | null;
  play: () => Promise<void>;
  pause: () => void;
}

interface LessonTtsOptions {
  fetcher?: typeof fetch;
  getAuthenticatedHeaders?: (baseHeaders?: Record<string, string>) => Promise<Record<string, string>>;
  createAudio?: (src: string) => LessonAudioLike | null;
}

export interface LessonTtsController {
  available: boolean;
  play: (request: LessonTtsPlayRequest, callbacks?: LessonTtsCallbacks) => Promise<boolean>;
  stop: () => void;
  resume: () => Promise<boolean>;
  destroy: () => void;
}

function defaultCreateAudio(src: string): LessonAudioLike | null {
  if (typeof Audio === 'undefined') {
    return null;
  }

  return new Audio(src) as LessonAudioLike;
}

export function createLessonTts(options: LessonTtsOptions = {}): LessonTtsController {
  const fetcher = options.fetcher ?? fetch;
  const authHeaders = options.getAuthenticatedHeaders ?? getAuthenticatedHeaders;
  const createAudio = options.createAudio ?? defaultCreateAudio;
  let currentAudio: LessonAudioLike | null = null;
  let currentCallbacks: LessonTtsCallbacks | null = null;
  let currentState: LessonTtsState = 'idle';

  function emitState(nextState: LessonTtsState): void {
    if (currentState === nextState) {
      return;
    }

    currentState = nextState;
    currentCallbacks?.onStateChange?.(nextState);
  }

  function detachCurrentAudio(): void {
    if (!currentAudio) {
      return;
    }

    currentAudio.onplay = null;
    currentAudio.onpause = null;
    currentAudio.onended = null;
    currentAudio.onerror = null;
    currentAudio = null;
  }

  function clearPlayback(): void {
    detachCurrentAudio();
    if (currentState !== 'idle') {
      currentState = 'idle';
      currentCallbacks?.onStateChange?.('idle');
    }
    currentCallbacks = null;
  }

  function stop(): void {
    if (!currentAudio) {
      return;
    }

    currentAudio.pause();
    currentAudio.currentTime = 0;
    clearPlayback();
  }

  async function play(request: LessonTtsPlayRequest, callbacks: LessonTtsCallbacks = {}): Promise<boolean> {
    const content = request.content.trim();
    if (!content) {
      return false;
    }

    if (currentAudio) {
      stop();
    }

    currentCallbacks = callbacks;

    let routePayload: LessonTtsRouteResponse;
    try {
      const response = await fetcher('/api/tts/lesson', {
        method: 'POST',
        headers: await authHeaders({
          'Content-Type': 'application/json'
        }),
        body: JSON.stringify({
          lessonSessionId: request.lessonSessionId,
          lessonMessageId: request.lessonMessageId,
          content
        })
      });

      if (!response.ok) {
        clearPlayback();
        return false;
      }

      routePayload = (await response.json()) as LessonTtsRouteResponse;
    } catch {
      clearPlayback();
      return false;
    }

    const audio = createAudio(routePayload.audioUrl);
    if (!audio) {
      clearPlayback();
      return false;
    }

    currentAudio = audio;
    audio.onplay = () => {
      if (currentAudio === audio) {
        emitState('playing');
      }
    };
    audio.onpause = () => {
      if (currentAudio === audio && audio.currentTime > 0) {
        emitState('paused');
      }
    };
    audio.onended = () => {
      if (currentAudio === audio) {
        clearPlayback();
      }
    };
    audio.onerror = () => {
      if (currentAudio === audio) {
        clearPlayback();
      }
    };

    try {
      await audio.play();
      emitState('playing');
      return true;
    } catch {
      clearPlayback();
      return false;
    }
  }

  async function resume(): Promise<boolean> {
    if (!currentAudio || currentState !== 'paused') {
      return false;
    }

    try {
      await currentAudio.play();
      emitState('playing');
      return true;
    } catch {
      clearPlayback();
      return false;
    }
  }

  return {
    available: true,
    play,
    stop,
    resume,
    destroy: stop
  };
}
