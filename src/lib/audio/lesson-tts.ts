import { getAuthenticatedHeaders } from '$lib/authenticated-fetch';

export type LessonTtsState = 'idle' | 'loading' | 'playing' | 'paused';
export type LessonTtsUpgradeTier = 'standard' | 'premium';

export interface LessonTtsError {
  code: 'entitlement_denied' | 'tts_unavailable' | 'unknown';
  message: string;
  upgradeTier?: LessonTtsUpgradeTier;
}

export type LessonTtsPlayResult =
  | { started: true }
  | { started: false; error: LessonTtsError | null };

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

interface LessonTtsRouteErrorResponse {
  error: string;
  code?: string;
  upgradeTier?: LessonTtsUpgradeTier;
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
  play: (request: LessonTtsPlayRequest, callbacks?: LessonTtsCallbacks) => Promise<LessonTtsPlayResult>;
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
  let activeRequestId = 0;

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
    activeRequestId += 1;

    if (!currentAudio && currentState === 'idle') {
      return;
    }

    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
    }

    clearPlayback();
  }

  async function play(
    request: LessonTtsPlayRequest,
    callbacks: LessonTtsCallbacks = {}
  ): Promise<LessonTtsPlayResult> {
    const content = request.content.trim();
    if (!content) {
      return { started: false, error: null };
    }

    if (currentAudio) {
      stop();
    }

    const requestId = ++activeRequestId;
    currentCallbacks = callbacks;
    emitState('loading');

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
        if (requestId !== activeRequestId) {
          return { started: false, error: null };
        }
        const payload = (await response.json().catch(() => null)) as LessonTtsRouteErrorResponse | null;
        clearPlayback();
        return {
          started: false,
          error: payload?.code === 'entitlement_denied'
            ? {
                code: 'entitlement_denied',
                message: payload.error ?? 'Tutor audio requires a paid plan.',
                upgradeTier: payload.upgradeTier ?? 'standard'
              }
            : payload?.code === 'tts_unavailable'
              ? {
                  code: 'tts_unavailable',
                  message: payload.error ?? 'Tutor audio is unavailable right now.'
                }
              : {
                  code: 'unknown',
                  message: payload?.error ?? 'Tutor audio could not be started.'
                }
        };
      }

      routePayload = (await response.json()) as LessonTtsRouteResponse;
    } catch {
      if (requestId !== activeRequestId) {
        return { started: false, error: null };
      }
      clearPlayback();
      return {
        started: false,
        error: {
          code: 'unknown',
          message: 'Tutor audio could not be started.'
        }
      };
    }

    if (requestId !== activeRequestId) {
      return { started: false, error: null };
    }

    const audio = createAudio(routePayload.audioUrl);
    if (!audio) {
      clearPlayback();
      return {
        started: false,
        error: {
          code: 'tts_unavailable',
          message: 'Audio playback is unavailable on this device.'
        }
      };
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
      if (requestId !== activeRequestId) {
        audio.pause();
        audio.currentTime = 0;
        return { started: false, error: null };
      }
      emitState('playing');
      return { started: true };
    } catch {
      if (requestId !== activeRequestId) {
        return { started: false, error: null };
      }
      clearPlayback();
      return {
        started: false,
        error: {
          code: 'tts_unavailable',
          message: 'Tutor audio could not be played.'
        }
      };
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
