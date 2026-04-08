export type ModelTier = 'fast' | 'default' | 'thinking';

export type AiMode =
  | 'tutor'
  | 'subject-hints'
  | 'topic-shortlist'
  | 'lesson-selector'
  | 'lesson-plan'
  | 'lesson-chat'
  | 'revision-pack'
  | 'revision-evaluate'
  | 'subject-verify'
  | 'institution-verify'
  | 'programme-verify';

const DEFAULT_MODEL_TIER_BY_MODE: Record<AiMode, ModelTier> = {
  'subject-hints': 'fast',
  'topic-shortlist': 'fast',
  'lesson-selector': 'fast',
  'subject-verify': 'fast',
  'institution-verify': 'fast',
  'programme-verify': 'fast',
  tutor: 'default',
  'lesson-chat': 'default',
  'lesson-plan': 'thinking',
  'revision-pack': 'thinking',
  'revision-evaluate': 'fast'
};

const MODEL_TIER_ENV_VARS: Record<ModelTier, string> = {
  fast: 'GITHUB_MODELS_FAST',
  default: 'GITHUB_MODELS_DEFAULT',
  thinking: 'GITHUB_MODELS_THINKING'
};

export function getDefaultModelTierForMode(mode: AiMode): ModelTier {
  return DEFAULT_MODEL_TIER_BY_MODE[mode];
}

export function getEnvVarNameForModelTier(tier: ModelTier): string {
  return MODEL_TIER_ENV_VARS[tier];
}

export function resolveModelForTier(
  tier: ModelTier,
  env: Partial<Record<string, string>>
): string | null {
  const value = env[getEnvVarNameForModelTier(tier)];
  return value && value.length > 0 ? value : null;
}
