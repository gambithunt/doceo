import type { TtsAudioFormat } from '$lib/server/tts-config';
import {
  classifyTtsProviderError,
  extractProviderErrorDetails,
  mimeTypeForFormat,
  TtsProviderError,
  type TtsSynthesisResult
} from './types';

interface OpenAITtsRequest {
  text: string;
  model: string;
  voice: string;
  format: TtsAudioFormat;
  speed: number;
  styleInstruction: string | null;
}

interface OpenAITtsAdapterOptions {
  apiKey: string;
  fetch?: typeof fetch;
}

export { TtsProviderError } from './types';

export function createOpenAITtsAdapter(options: OpenAITtsAdapterOptions) {
  const fetcher = options.fetch ?? fetch;

  return {
    async synthesize(request: OpenAITtsRequest): Promise<TtsSynthesisResult> {
      if (!options.apiKey) {
        throw new TtsProviderError(
          classifyTtsProviderError({
            provider: 'openai',
            status: 0,
            code: 'missing_api_key',
            message: 'OpenAI TTS API key is missing.'
          })
        );
      }

      let response: Response;
      try {
        response = await fetcher('https://api.openai.com/v1/audio/speech', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${options.apiKey}`
          },
          body: JSON.stringify({
            model: request.model,
            input: request.text,
            voice: request.voice,
            response_format: request.format,
            speed: request.speed,
            ...(request.styleInstruction ? { instructions: request.styleInstruction } : {})
          })
        });
      } catch (error) {
        throw new TtsProviderError(
          classifyTtsProviderError({
            provider: 'openai',
            status: 0,
            message: error instanceof Error ? error.message : 'OpenAI TTS request failed.'
          })
        );
      }

      if (!response.ok) {
        const detail = await extractProviderErrorDetails(response);
        throw new TtsProviderError(
          classifyTtsProviderError({
            provider: 'openai',
            status: response.status,
            code: detail.code,
            message: detail.message
          })
        );
      }

      return {
        audio: await response.arrayBuffer(),
        mimeType: response.headers.get('content-type') || mimeTypeForFormat(request.format),
        provider: 'openai',
        model: request.model,
        voice: request.voice
      };
    }
  };
}
