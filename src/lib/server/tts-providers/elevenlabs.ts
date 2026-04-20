import type { TtsAudioFormat, TtsLanguageCode } from '$lib/server/tts-config';
import {
  classifyTtsProviderError,
  extractProviderErrorDetails,
  mimeTypeForFormat,
  TtsProviderError,
  type TtsSynthesisResult
} from './types';

interface ElevenLabsTtsRequest {
  text: string;
  model: string;
  voiceId: string;
  format: TtsAudioFormat;
  languageCode: TtsLanguageCode | null;
  stability: number;
  similarityBoost: number;
  style: number;
  speakerBoost: boolean;
}

interface ElevenLabsTtsAdapterOptions {
  apiKey: string;
  fetch?: typeof fetch;
}

function toOutputFormat(format: TtsAudioFormat): string {
  return format === 'wav' ? 'pcm_44100' : 'mp3_44100_128';
}

export function createElevenLabsTtsAdapter(options: ElevenLabsTtsAdapterOptions) {
  const fetcher = options.fetch ?? fetch;

  return {
    async synthesize(request: ElevenLabsTtsRequest): Promise<TtsSynthesisResult> {
      if (!options.apiKey) {
        throw new TtsProviderError(
          classifyTtsProviderError({
            provider: 'elevenlabs',
            status: 0,
            code: 'missing_api_key',
            message: 'ElevenLabs TTS API key is missing.'
          })
        );
      }

      let response: Response;
      try {
        response = await fetcher(
          `https://api.elevenlabs.io/v1/text-to-speech/${request.voiceId}?output_format=${toOutputFormat(request.format)}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'xi-api-key': options.apiKey
            },
            body: JSON.stringify({
              text: request.text,
              model_id: request.model,
              ...(request.languageCode ? { language_code: request.languageCode } : {}),
              voice_settings: {
                stability: request.stability,
                similarity_boost: request.similarityBoost,
                style: request.style,
                use_speaker_boost: request.speakerBoost
              }
            })
          }
        );
      } catch (error) {
        throw new TtsProviderError(
          classifyTtsProviderError({
            provider: 'elevenlabs',
            status: 0,
            message: error instanceof Error ? error.message : 'ElevenLabs TTS request failed.'
          })
        );
      }

      if (!response.ok) {
        const detail = await extractProviderErrorDetails(response);
        throw new TtsProviderError(
          classifyTtsProviderError({
            provider: 'elevenlabs',
            status: response.status,
            code: detail.code,
            message: detail.message
          })
        );
      }

      return {
        audio: await response.arrayBuffer(),
        mimeType: response.headers.get('content-type') || mimeTypeForFormat(request.format),
        provider: 'elevenlabs',
        model: request.model,
        voice: request.voiceId
      };
    }
  };
}
