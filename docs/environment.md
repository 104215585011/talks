# Environment Templates

LinguaAI separates development, test, and production configuration. Real API keys and
database credentials must never be committed.

## Local Development

Template: `.env.local.example`

Use this for local development against a local PostgreSQL database.

```env
DATABASE_URL="postgresql://linguaai:linguaai@localhost:5432/linguaai_dev?schema=public"
REDIS_URL="redis://localhost:6379"
MODEL_API_KEY="replace-with-local-model-key"
MODEL_API_BASE_URL="https://v2.aicodee.com"
MODEL_NAME="MiniMax-M2.7-highspeed"
FISH_AUDIO_API_KEY="replace-with-local-fish-audio-key"
FISH_AUDIO_LATENCY="balanced"
FISH_AUDIO_MODEL="s2-pro"
FISH_AUDIO_REFERENCE_ID_EMMA="replace-with-emma-reference-id"
FISH_AUDIO_REFERENCE_ID_JAKE="replace-with-jake-reference-id"
FISH_AUDIO_REFERENCE_ID_SOPHIE="replace-with-sophie-reference-id"
FISH_AUDIO_REFERENCE_ID_KENJI="replace-with-kenji-reference-id"
FISH_AUDIO_REFERENCE_ID_CARLOS="replace-with-carlos-reference-id"
AZURE_TTS_API_KEY="replace-with-azure-tts-key"
AZURE_TTS_REGION="replace-with-azure-region"
JWT_SECRET="replace-with-local-dev-secret"
MESSAGE_ENCRYPTION_KEY="replace-with-32-byte-local-message-secret"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

## Test

Template: `.env.test.example`

Use this for automated tests and isolated QA environments.

```env
DATABASE_URL="postgresql://linguaai:linguaai@localhost:5432/linguaai_test?schema=public"
REDIS_URL=""
MODEL_API_KEY="test-placeholder"
MODEL_API_BASE_URL="https://v2.aicodee.com"
MODEL_NAME="MiniMax-M2.7-highspeed"
FISH_AUDIO_API_KEY="test-placeholder"
FISH_AUDIO_LATENCY="balanced"
FISH_AUDIO_MODEL="s2-pro"
FISH_AUDIO_REFERENCE_ID_EMMA="test-placeholder"
FISH_AUDIO_REFERENCE_ID_JAKE="test-placeholder"
FISH_AUDIO_REFERENCE_ID_SOPHIE="test-placeholder"
FISH_AUDIO_REFERENCE_ID_KENJI="test-placeholder"
FISH_AUDIO_REFERENCE_ID_CARLOS="test-placeholder"
AZURE_TTS_API_KEY="test-placeholder"
AZURE_TTS_REGION="test-placeholder"
JWT_SECRET="replace-with-test-secret"
MESSAGE_ENCRYPTION_KEY="replace-with-32-byte-test-message-secret"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

## Production

Template: `.env.production.example`

Use hosting-provider secret storage for production values.

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/linguaai?schema=public"
REDIS_URL="rediss://USER:PASSWORD@HOST:6379"
MODEL_API_KEY="set-in-hosting-provider"
MODEL_API_BASE_URL="https://v2.aicodee.com"
MODEL_NAME="MiniMax-M2.7-highspeed"
FISH_AUDIO_API_KEY="set-in-hosting-provider"
FISH_AUDIO_LATENCY="balanced"
FISH_AUDIO_MODEL="s2-pro"
FISH_AUDIO_REFERENCE_ID_EMMA="set-in-hosting-provider"
FISH_AUDIO_REFERENCE_ID_JAKE="set-in-hosting-provider"
FISH_AUDIO_REFERENCE_ID_SOPHIE="set-in-hosting-provider"
FISH_AUDIO_REFERENCE_ID_KENJI="set-in-hosting-provider"
FISH_AUDIO_REFERENCE_ID_CARLOS="set-in-hosting-provider"
AZURE_TTS_API_KEY="set-in-hosting-provider"
AZURE_TTS_REGION="set-in-hosting-provider"
JWT_SECRET="set-in-hosting-provider"
MESSAGE_ENCRYPTION_KEY="set-in-hosting-provider"
NEXT_PUBLIC_APP_URL="https://linguaai.example.com"
```

Do not put `NODE_ENV` in dotenv files. The npm scripts set the correct runtime
mode for Next.js; overriding it in `.env.local` can produce invalid production
chunks.

## Sprint 3 Speech Keys

## Distributed Rate Limiting

API routes call a shared rate limiter before auth, chat, and speech work. Set
`REDIS_URL` to a Redis-compatible connection string to use a distributed counter
across serverless instances. Local development can use
`redis://localhost:6379`; hosted Redis providers usually require `rediss://...`.
If `REDIS_URL` is empty or Redis is unavailable, the server falls back to the
in-process limiter so requests fail closed as rate-limited only after local
thresholds are reached, rather than crashing the API route.

## Model API

`POST /api/chat/message` calls an OpenAI-compatible chat completions endpoint.
Set `MODEL_API_KEY` to your gateway key, `MODEL_API_BASE_URL` to
`https://v2.aicodee.com`, and `MODEL_NAME` to `MiniMax-M2.7-highspeed`. If
`MODEL_API_KEY` is unset or still a placeholder, the local chat engine returns a
deterministic fallback stream for development and tests.

`POST /api/speech/synthesize` uses Fish Audio first. Fill `FISH_AUDIO_API_KEY`
with your Fish Audio token and the five `FISH_AUDIO_REFERENCE_ID_*` values with
the production reference IDs selected for Emma, Jake, Sophie, Kenji, and Carlos.
`FISH_AUDIO_MODEL` defaults to `s2-pro`; `FISH_AUDIO_LATENCY` defaults to
`balanced` to reduce first-audio latency while preserving voice quality. If Fish
Audio is not configured or returns a non-OK response, the server attempts Azure TTS with
`AZURE_TTS_API_KEY` and `AZURE_TTS_REGION`; local development falls back to a
tiny WAV response so UI and tests do not block on external credentials.

`POST /api/speech/recognize` is the server fallback for browsers without Web
Speech API support. It uses the same `FISH_AUDIO_API_KEY` against Fish Audio ASR
and sends `ignore_timestamps=true` for lower latency. If Fish Audio is not
configured or returns a non-OK response, the endpoint returns an empty local
fallback transcript.
