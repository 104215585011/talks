export type RuntimeEnvironment = "development" | "test" | "production";

export type RequiredServerEnv = {
  DATABASE_URL: string;
  MODEL_API_BASE_URL: string;
  MODEL_API_KEY: string;
  MODEL_NAME: string;
  FISH_AUDIO_API_KEY: string;
  FISH_AUDIO_LATENCY: string;
  FISH_AUDIO_MODEL: string;
  FISH_AUDIO_REFERENCE_ID_CARLOS: string;
  FISH_AUDIO_REFERENCE_ID_EMMA: string;
  FISH_AUDIO_REFERENCE_ID_JAKE: string;
  FISH_AUDIO_REFERENCE_ID_KENJI: string;
  FISH_AUDIO_REFERENCE_ID_SOPHIE: string;
  AZURE_TTS_API_KEY: string;
  AZURE_TTS_REGION: string;
  JWT_SECRET: string;
};
