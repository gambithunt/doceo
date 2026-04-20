import { serverEnv } from '$lib/server/env';
import { createLessonTtsArtifactRepository, type LessonTtsArtifactRepository } from '$lib/server/lesson-tts-artifact-repository';
import { createLessonTtsCacheKey } from '$lib/server/tts-cache-key';
import { getTtsConfig, type AppTtsSettings } from '$lib/server/tts-config';
import { checkTtsEntitlement, type TtsEntitlementResult } from '$lib/server/tts-entitlements';
import { createTtsObservability, type TtsObservability } from '$lib/server/tts-observability';
import { createElevenLabsTtsAdapter, createOpenAITtsAdapter } from '$lib/server/tts-providers';
import {
  TtsProviderError,
  type NormalizedTtsProviderError,
  type TtsProviderId,
  type TtsSynthesisResult
} from '$lib/server/tts-providers';

const TTS_CACHE_VERSION = 'v1';

interface LessonTtsProvider {
  synthesize(request: Record<string, unknown>): Promise<TtsSynthesisResult>;
}

interface LessonTtsProviderRuntime {
  provider: TtsProviderId;
  model: string;
  voice: string;
  format: 'mp3' | 'wav';
  languageCode: 'en';
  speed: number | null;
  styleInstruction: string | null;
  providerSettings: Record<string, unknown>;
  request: Record<string, unknown>;
}

interface TtsSynthesisExecutionResult {
  runtime: LessonTtsProviderRuntime;
  result: TtsSynthesisResult;
  fallbackFromProvider: TtsProviderId | null;
  reasonCategory: NormalizedTtsProviderError['category'] | null;
}

export interface LessonTtsRequest {
  userId: string;
  profileId: string | null;
  lessonSessionId: string;
  lessonMessageId: string;
  content: string;
}

export interface LessonTtsResult {
  audioUrl: string;
  mimeType: string;
  provider: TtsProviderId;
  fallbackUsed: boolean;
  cacheHit: boolean;
  expiresAt: string | null;
}

export interface AdminTtsPreviewResult {
  audio: Uint8Array;
  mimeType: string;
}

export class LessonTtsServiceError extends Error {
  code: 'bad_request' | 'entitlement_denied' | 'tts_unavailable' | 'synthesis_failed';
  normalizedError: NormalizedTtsProviderError | null;
  primaryError: NormalizedTtsProviderError | null;
  fallbackError: NormalizedTtsProviderError | null;

  constructor(input: {
    code: LessonTtsServiceError['code'];
    message: string;
    normalizedError?: NormalizedTtsProviderError | null;
    primaryError?: NormalizedTtsProviderError | null;
    fallbackError?: NormalizedTtsProviderError | null;
  }) {
    super(input.message);
    this.name = 'LessonTtsServiceError';
    this.code = input.code;
    this.normalizedError = input.normalizedError ?? null;
    this.primaryError = input.primaryError ?? null;
    this.fallbackError = input.fallbackError ?? null;
  }
}

export function createLessonTtsService(dependencies?: {
  getTtsConfig?: () => Promise<AppTtsSettings>;
  checkEntitlement?: (userId: string) => Promise<TtsEntitlementResult>;
  artifactRepository?: LessonTtsArtifactRepository;
  observability?: TtsObservability;
  providers?: Record<TtsProviderId, LessonTtsProvider>;
}) {
  const loadConfig = dependencies?.getTtsConfig ?? getTtsConfig;
  const entitlementChecker = dependencies?.checkEntitlement ?? checkTtsEntitlement;
  const artifactRepository = dependencies?.artifactRepository ?? createLessonTtsArtifactRepository();
  const observability = dependencies?.observability ?? createTtsObservability();
  const providers: Record<TtsProviderId, LessonTtsProvider> =
    dependencies?.providers ?? {
      openai: createOpenAITtsAdapter({ apiKey: serverEnv.openaiApiKey }),
      elevenlabs: createElevenLabsTtsAdapter({ apiKey: serverEnv.elevenlabsApiKey })
    };

  function resolveProviderRuntime(config: AppTtsSettings, providerId: TtsProviderId): LessonTtsProviderRuntime | null {
    if (providerId === 'openai') {
      if (!config.openai.enabled) {
        return null;
      }

      return {
        provider: 'openai',
        model: config.openai.model,
        voice: config.openai.voice,
        format: config.openai.format,
        languageCode: config.languageDefault,
        speed: config.openai.speed,
        styleInstruction: config.openai.styleInstruction,
        providerSettings: {},
        request: {
          text: '',
          model: config.openai.model,
          voice: config.openai.voice,
          format: config.openai.format,
          speed: config.openai.speed,
          styleInstruction: config.openai.styleInstruction
        }
      };
    }

    if (!config.elevenlabs.enabled) {
      return null;
    }

    return {
      provider: 'elevenlabs',
      model: config.elevenlabs.model,
      voice: config.elevenlabs.voiceId,
      format: config.elevenlabs.format,
      languageCode: config.elevenlabs.languageCode ?? config.languageDefault,
      speed: null,
      styleInstruction: null,
      providerSettings: {
        stability: config.elevenlabs.stability,
        similarityBoost: config.elevenlabs.similarityBoost,
        style: config.elevenlabs.style,
        speakerBoost: config.elevenlabs.speakerBoost
      },
      request: {
        text: '',
        model: config.elevenlabs.model,
        voiceId: config.elevenlabs.voiceId,
        format: config.elevenlabs.format,
        languageCode: config.elevenlabs.languageCode,
        stability: config.elevenlabs.stability,
        similarityBoost: config.elevenlabs.similarityBoost,
        style: config.elevenlabs.style,
        speakerBoost: config.elevenlabs.speakerBoost
      }
    };
  }

  async function maybeReadCache(input: {
    runtime: LessonTtsProviderRuntime;
    content: string;
    cacheEnabled: boolean;
  }) {
    const key = createLessonTtsCacheKey({
      provider: input.runtime.provider,
      modelId: input.runtime.model,
      voiceId: input.runtime.voice,
      languageCode: input.runtime.languageCode,
      format: input.runtime.format,
      speed: input.runtime.speed,
      styleInstruction: input.runtime.styleInstruction,
      providerSettings: input.runtime.providerSettings,
      text: input.content,
      cacheVersion: TTS_CACHE_VERSION
    });

    if (!input.cacheEnabled) {
      return { key, artifact: null };
    }

    const artifact = await artifactRepository.getArtifactByCacheKey(key.cacheKey);
    return { key, artifact };
  }

  async function executeSynthesis(input: {
    primaryRuntime: LessonTtsProviderRuntime;
    fallbackRuntime: LessonTtsProviderRuntime | null;
    normalizedText: string;
  }): Promise<TtsSynthesisExecutionResult> {
    try {
      const result = await synthesizeWithRuntime(input.primaryRuntime, input.normalizedText);

      return {
        runtime: input.primaryRuntime,
        result,
        fallbackFromProvider: null,
        reasonCategory: null
      };
    } catch (error) {
      if (!(error instanceof TtsProviderError)) {
        throw error;
      }

      const primaryError = error.normalized;
      if (!primaryError.fallbackEligible || !input.fallbackRuntime) {
        throw new LessonTtsServiceError({
          code: 'synthesis_failed',
          message: primaryError.message,
          normalizedError: primaryError,
          primaryError
        });
      }

      try {
        const fallbackResult = await synthesizeWithRuntime(input.fallbackRuntime, input.normalizedText);

        return {
          runtime: input.fallbackRuntime,
          result: fallbackResult,
          fallbackFromProvider: input.primaryRuntime.provider,
          reasonCategory: primaryError.category
        };
      } catch (fallbackError) {
        if (!(fallbackError instanceof TtsProviderError)) {
          throw fallbackError;
        }

        throw new LessonTtsServiceError({
          code: 'synthesis_failed',
          message: fallbackError.normalized.message,
          normalizedError: fallbackError.normalized,
          primaryError,
          fallbackError: fallbackError.normalized
        });
      }
    }
  }

  async function synthesizeWithRuntime(
    runtime: LessonTtsProviderRuntime,
    normalizedText: string
  ): Promise<TtsSynthesisResult> {
    return providers[runtime.provider].synthesize({
      ...runtime.request,
      text: normalizedText
    });
  }

  async function persistSynthesisResult(input: {
    request: LessonTtsRequest;
    runtime: LessonTtsProviderRuntime;
    key: ReturnType<typeof createLessonTtsCacheKey>;
    fallbackFromProvider: TtsProviderId | null;
    cacheEnabled: boolean;
    result: TtsSynthesisResult;
  }): Promise<LessonTtsResult> {
    if (!input.cacheEnabled) {
      throw new Error('Non-cached lesson TTS playback is not supported in Phase 3');
    }

    const artifact = await artifactRepository.createReadyArtifact({
      cacheKey: input.key.cacheKey,
      cacheVersion: TTS_CACHE_VERSION,
      lessonSessionId: input.request.lessonSessionId,
      lessonMessageId: input.request.lessonMessageId,
      profileId: input.request.profileId,
      provider: input.runtime.provider,
      fallbackFromProvider: input.fallbackFromProvider,
      model: input.runtime.model,
      voice: input.runtime.voice,
      languageCode: input.runtime.languageCode,
      format: input.runtime.format,
      speed: input.runtime.speed,
      styleInstruction: input.runtime.styleInstruction,
      providerSettings: input.runtime.providerSettings,
      textHash: input.key.textHash,
      audio: new Uint8Array(input.result.audio),
      mimeType: input.result.mimeType
    });
    const signed = await artifactRepository.createSignedUrl(artifact);

    if (!signed) {
      throw new Error('Failed to create lesson TTS playback URL');
    }

    return {
      audioUrl: signed.url,
      mimeType: input.result.mimeType,
      provider: input.result.provider,
      fallbackUsed: input.fallbackFromProvider !== null,
      cacheHit: false,
      expiresAt: signed.expiresAt
    };
  }

  async function previewAdminTts(input: {
    profileId: string | null;
    content: string;
  }): Promise<AdminTtsPreviewResult> {
    const requestId = crypto.randomUUID();
    const trimmedContent = input.content.trim();

    if (!trimmedContent) {
      await observability.recordGenerationEvent({
        requestId,
        profileId: input.profileId,
        lessonSessionId: null,
        lessonMessageId: null,
        cacheHit: false,
        providerUsed: null,
        fallbackFromProvider: null,
        fallbackToProvider: null,
        status: 'failure',
        reasonCategory: 'bad_request',
        textLength: 0,
        estimatedCostUsd: null
      });

      throw new LessonTtsServiceError({
        code: 'bad_request',
        message: 'Preview content must not be empty.'
      });
    }

    const config = await loadConfig();
    if (!config.enabled || !config.previewEnabled || config.rolloutScope !== 'lessons') {
      throw new LessonTtsServiceError({
        code: 'tts_unavailable',
        message: 'Admin TTS preview is not currently enabled.'
      });
    }

    const primaryRuntime = resolveProviderRuntime(config, config.defaultProvider);
    if (!primaryRuntime) {
      throw new LessonTtsServiceError({
        code: 'tts_unavailable',
        message: 'The configured primary TTS provider is unavailable.'
      });
    }

    const fallbackRuntime =
      config.fallbackProvider && config.fallbackProvider !== primaryRuntime.provider
        ? resolveProviderRuntime(config, config.fallbackProvider)
        : null;

    const normalized = createLessonTtsCacheKey({
      provider: primaryRuntime.provider,
      modelId: primaryRuntime.model,
      voiceId: primaryRuntime.voice,
      languageCode: primaryRuntime.languageCode,
      format: primaryRuntime.format,
      speed: primaryRuntime.speed,
      styleInstruction: primaryRuntime.styleInstruction,
      providerSettings: primaryRuntime.providerSettings,
      text: trimmedContent,
      cacheVersion: TTS_CACHE_VERSION
    }).normalized;

    try {
      const execution = await executeSynthesis({
        primaryRuntime,
        fallbackRuntime,
        normalizedText: normalized.normalizedText
      });

      await observability.recordGenerationEvent({
        requestId,
        profileId: input.profileId,
        lessonSessionId: null,
        lessonMessageId: null,
        cacheHit: false,
        providerUsed: execution.result.provider,
        fallbackFromProvider: execution.fallbackFromProvider,
        fallbackToProvider: execution.fallbackFromProvider ? execution.result.provider : null,
        status: 'success',
        reasonCategory: execution.reasonCategory,
        textLength: normalized.normalizedText.length,
        estimatedCostUsd: null
      });

      return {
        audio: new Uint8Array(execution.result.audio),
        mimeType: execution.result.mimeType
      };
    } catch (error) {
      if (error instanceof LessonTtsServiceError) {
        const providerUsed = error.fallbackError ? fallbackRuntime?.provider ?? null : primaryRuntime.provider;
        const fallbackFromProvider = error.fallbackError ? primaryRuntime.provider : null;
        const fallbackToProvider = error.fallbackError ? fallbackRuntime?.provider ?? null : null;
        const reasonCategory =
          error.fallbackError?.category ?? error.primaryError?.category ?? error.normalizedError?.category ?? null;

        await observability.recordGenerationEvent({
          requestId,
          profileId: input.profileId,
          lessonSessionId: null,
          lessonMessageId: null,
          cacheHit: false,
          providerUsed,
          fallbackFromProvider,
          fallbackToProvider,
          status: 'failure',
          reasonCategory,
          textLength: normalized.normalizedText.length,
          estimatedCostUsd: null
        });
      }

      throw error;
    }
  }

  return {
    previewAdminTts,
    async synthesizeLessonTts(request: LessonTtsRequest): Promise<LessonTtsResult> {
      const requestId = crypto.randomUUID();
      const trimmedContent = request.content.trim();

      if (!trimmedContent) {
        await observability.recordGenerationEvent({
          requestId,
          profileId: request.profileId,
          lessonSessionId: request.lessonSessionId,
          lessonMessageId: request.lessonMessageId,
          cacheHit: false,
          providerUsed: null,
          fallbackFromProvider: null,
          fallbackToProvider: null,
          status: 'failure',
          reasonCategory: 'bad_request',
          textLength: 0,
          estimatedCostUsd: null
        });

        throw new LessonTtsServiceError({
          code: 'bad_request',
          message: 'Lesson TTS content must not be empty.'
        });
      }

      const entitlement = await entitlementChecker(request.userId);
      if (!entitlement.allowed) {
        await observability.recordGenerationEvent({
          requestId,
          profileId: request.profileId,
          lessonSessionId: request.lessonSessionId,
          lessonMessageId: request.lessonMessageId,
          cacheHit: false,
          providerUsed: null,
          fallbackFromProvider: null,
          fallbackToProvider: null,
          status: 'denied',
          reasonCategory: 'entitlement_denied',
          textLength: trimmedContent.length,
          estimatedCostUsd: null
        });

        throw new LessonTtsServiceError({
          code: 'entitlement_denied',
          message: 'Lesson TTS requires a standard or premium plan.'
        });
      }

      const config = await loadConfig();
      if (!config.enabled || config.rolloutScope !== 'lessons') {
        throw new LessonTtsServiceError({
          code: 'tts_unavailable',
          message: 'Lesson TTS is not currently enabled.'
        });
      }

      const primaryRuntime = resolveProviderRuntime(config, config.defaultProvider);
      if (!primaryRuntime) {
        throw new LessonTtsServiceError({
          code: 'tts_unavailable',
          message: 'The configured primary TTS provider is unavailable.'
        });
      }

      const fallbackRuntime =
        config.fallbackProvider && config.fallbackProvider !== primaryRuntime.provider
          ? resolveProviderRuntime(config, config.fallbackProvider)
          : null;

      const primaryLookup = await maybeReadCache({
        runtime: primaryRuntime,
        content: trimmedContent,
        cacheEnabled: config.cacheEnabled
      });
      const normalizedTextLength = primaryLookup.key.normalized.normalizedText.length;

      if (primaryLookup.artifact) {
        const signed = await artifactRepository.createSignedUrl(primaryLookup.artifact);

        if (!signed) {
          throw new LessonTtsServiceError({
            code: 'tts_unavailable',
            message: 'Failed to create lesson TTS playback URL.'
          });
        }

        await observability.recordGenerationEvent({
          requestId,
          profileId: request.profileId,
          lessonSessionId: request.lessonSessionId,
          lessonMessageId: request.lessonMessageId,
          cacheHit: true,
          providerUsed: primaryLookup.artifact.provider,
          fallbackFromProvider: primaryLookup.artifact.fallbackFromProvider,
          fallbackToProvider: primaryLookup.artifact.fallbackFromProvider ? primaryLookup.artifact.provider : null,
          status: 'success',
          reasonCategory: null,
          textLength: normalizedTextLength,
          estimatedCostUsd: null
        });

        return {
          audioUrl: signed.url,
          mimeType: primaryLookup.artifact.format === 'wav' ? 'audio/wav' : 'audio/mpeg',
          provider: primaryLookup.artifact.provider,
          fallbackUsed: primaryLookup.artifact.fallbackFromProvider !== null,
          cacheHit: true,
          expiresAt: signed.expiresAt
        };
      }

      try {
        const execution = await executeSynthesis({
          primaryRuntime,
          fallbackRuntime: null,
          normalizedText: primaryLookup.key.normalized.normalizedText
        });
        const result = await persistSynthesisResult({
          request,
          runtime: execution.runtime,
          key: primaryLookup.key,
          fallbackFromProvider: execution.fallbackFromProvider,
          cacheEnabled: config.cacheEnabled,
          result: execution.result
        });

        await observability.recordGenerationEvent({
          requestId,
          profileId: request.profileId,
          lessonSessionId: request.lessonSessionId,
          lessonMessageId: request.lessonMessageId,
          cacheHit: false,
          providerUsed: result.provider,
          fallbackFromProvider: execution.fallbackFromProvider,
          fallbackToProvider: execution.fallbackFromProvider ? result.provider : null,
          status: 'success',
          reasonCategory: execution.reasonCategory,
          textLength: normalizedTextLength,
          estimatedCostUsd: null
        });

        return result;
      } catch (error) {
        if (error instanceof LessonTtsServiceError) {
          if (error.primaryError?.fallbackEligible && fallbackRuntime) {
            const fallbackLookup = await maybeReadCache({
              runtime: fallbackRuntime,
              content: trimmedContent,
              cacheEnabled: config.cacheEnabled
            });

            if (fallbackLookup.artifact) {
              const signed = await artifactRepository.createSignedUrl(fallbackLookup.artifact);

              if (!signed) {
                throw new LessonTtsServiceError({
                  code: 'tts_unavailable',
                  message: 'Failed to create lesson TTS playback URL.'
                });
              }

              await observability.recordGenerationEvent({
                requestId,
                profileId: request.profileId,
                lessonSessionId: request.lessonSessionId,
                lessonMessageId: request.lessonMessageId,
                cacheHit: true,
                providerUsed: fallbackLookup.artifact.provider,
                fallbackFromProvider: primaryRuntime.provider,
                fallbackToProvider: fallbackLookup.artifact.provider,
                status: 'success',
                reasonCategory: error.primaryError.category,
                textLength: fallbackLookup.key.normalized.normalizedText.length,
                estimatedCostUsd: null
              });

              return {
                audioUrl: signed.url,
                mimeType: fallbackLookup.artifact.format === 'wav' ? 'audio/wav' : 'audio/mpeg',
                provider: fallbackLookup.artifact.provider,
                fallbackUsed: true,
                cacheHit: true,
                expiresAt: signed.expiresAt
              };
            }

            try {
              const fallbackResult = await synthesizeWithRuntime(
                fallbackRuntime,
                fallbackLookup.key.normalized.normalizedText
              );
              const result = await persistSynthesisResult({
                request,
                runtime: fallbackRuntime,
                key: fallbackLookup.key,
                fallbackFromProvider: primaryRuntime.provider,
                cacheEnabled: config.cacheEnabled,
                result: fallbackResult
              });

              await observability.recordGenerationEvent({
                requestId,
                profileId: request.profileId,
                lessonSessionId: request.lessonSessionId,
                lessonMessageId: request.lessonMessageId,
                cacheHit: false,
                providerUsed: result.provider,
                fallbackFromProvider: primaryRuntime.provider,
                fallbackToProvider: result.provider,
                status: 'success',
                reasonCategory: error.primaryError.category,
                textLength: fallbackLookup.key.normalized.normalizedText.length,
                estimatedCostUsd: null
              });

              return result;
            } catch (fallbackError) {
              if (fallbackError instanceof TtsProviderError) {
                await observability.recordGenerationEvent({
                  requestId,
                  profileId: request.profileId,
                  lessonSessionId: request.lessonSessionId,
                  lessonMessageId: request.lessonMessageId,
                  cacheHit: false,
                  providerUsed: fallbackRuntime.provider,
                  fallbackFromProvider: primaryRuntime.provider,
                  fallbackToProvider: fallbackRuntime.provider,
                  status: 'failure',
                  reasonCategory: fallbackError.normalized.category,
                  textLength: fallbackLookup.key.normalized.normalizedText.length,
                  estimatedCostUsd: null
                });

                throw new LessonTtsServiceError({
                  code: 'synthesis_failed',
                  message: fallbackError.normalized.message,
                  normalizedError: fallbackError.normalized,
                  primaryError: error.primaryError,
                  fallbackError: fallbackError.normalized
                });
              }

              throw fallbackError;
            }
          }

          const reasonCategory =
            error.fallbackError?.category ?? error.primaryError?.category ?? error.normalizedError?.category ?? null;
          await observability.recordGenerationEvent({
            requestId,
            profileId: request.profileId,
            lessonSessionId: request.lessonSessionId,
            lessonMessageId: request.lessonMessageId,
            cacheHit: false,
            providerUsed: error.fallbackError ? fallbackRuntime?.provider ?? null : primaryRuntime.provider,
            fallbackFromProvider: error.fallbackError ? primaryRuntime.provider : null,
            fallbackToProvider: error.fallbackError ? fallbackRuntime?.provider ?? null : null,
            status: 'failure',
            reasonCategory,
            textLength: normalizedTextLength,
            estimatedCostUsd: null
          });
        }

        throw error;
      }
    }
  };
}
