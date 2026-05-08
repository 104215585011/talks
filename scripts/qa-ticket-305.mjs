import { createHmac } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { performance } from "node:perf_hooks";

const BASE_URL = process.env.QA_BASE_URL ?? "http://127.0.0.1:3000";
const ENV_PATH = ".env.local";

function loadLocalEnv(path) {
  if (!existsSync(path)) {
    return;
  }

  for (const rawLine of readFileSync(path, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#") || !line.includes("=")) {
      continue;
    }

    const index = line.indexOf("=");
    const key = line.slice(0, index).trim();
    let value = line.slice(index + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] ??= value;
  }
}

function configured(name) {
  const value = process.env[name];
  return Boolean(value && !/replace-with|placeholder/i.test(value));
}

function signJwt(payload, secret) {
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(
    JSON.stringify({
      ...payload,
      iat: now,
      exp: now + 60 * 60
    })
  ).toString("base64url");
  const signature = createHmac("sha256", secret).update(`${header}.${body}`).digest("base64url");
  return `${header}.${body}.${signature}`;
}

function makeSilentWavBase64({ sampleRate = 16000, durationMs = 300 } = {}) {
  const channels = 1;
  const bitsPerSample = 16;
  const sampleCount = Math.floor((sampleRate * durationMs) / 1000);
  const dataSize = sampleCount * channels * (bitsPerSample / 8);
  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(channels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * channels * (bitsPerSample / 8), 28);
  buffer.writeUInt16LE(channels * (bitsPerSample / 8), 32);
  buffer.writeUInt16LE(bitsPerSample, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataSize, 40);

  return buffer.toString("base64");
}

async function timedFetch(path, options = {}) {
  const started = performance.now();
  let response;
  let bodyText = "";
  let bytes = 0;
  let error = null;

  try {
    response = await fetch(`${BASE_URL}${path}`, {
      ...options,
      signal: AbortSignal.timeout(options.timeoutMs ?? 30000)
    });
    const arrayBuffer = await response.arrayBuffer();
    bytes = arrayBuffer.byteLength;
    const contentType = response.headers.get("content-type") ?? "";
    if (contentType.includes("application/json") || bytes < 2048) {
      bodyText = Buffer.from(arrayBuffer).toString("utf8");
    }
  } catch (caught) {
    error = caught instanceof Error ? caught.message : String(caught);
  }

  return {
    bytes,
    contentType: response?.headers.get("content-type") ?? null,
    durationMs: Math.round(performance.now() - started),
    error,
    speechProvider: response?.headers.get("x-speech-provider") ?? null,
    status: response?.status ?? null,
    bodyText
  };
}

function authHeaders(token) {
  return {
    authorization: `Bearer ${token}`,
    "content-type": "application/json"
  };
}

async function runSynthesize(token) {
  const characters = ["emma", "jake", "sophie", "kenji", "carlos"];
  const results = [];

  results.push({
    case: "no-jwt",
    ...(await timedFetch("/api/speech/synthesize", {
      body: JSON.stringify({ characterId: "emma", text: "Hello." }),
      headers: { "content-type": "application/json" },
      method: "POST",
      timeoutMs: 10000
    }))
  });

  for (const characterId of characters) {
    results.push({
      case: characterId,
      ...(await timedFetch("/api/speech/synthesize", {
        body: JSON.stringify({ characterId, text: "Hello, this is a short Sprint 3 voice check." }),
        headers: authHeaders(token),
        method: "POST"
      }))
    });
  }

  results.push({
    case: "invalid-character",
    ...(await timedFetch("/api/speech/synthesize", {
      body: JSON.stringify({ characterId: "invalid-character", text: "Hello." }),
      headers: authHeaders(token),
      method: "POST",
      timeoutMs: 10000
    }))
  });

  return results;
}

async function runRecognize(token) {
  const languages = ["en-US", "fr-FR", "ja-JP", "es-MX", "zh-CN"];
  const audioBase64 = makeSilentWavBase64();
  const results = [];

  results.push({
    case: "no-jwt",
    ...(await timedFetch("/api/speech/recognize", {
      body: JSON.stringify({ audioBase64, language: "en-US", mimeType: "audio/wav" }),
      headers: { "content-type": "application/json" },
      method: "POST",
      timeoutMs: 10000
    }))
  });

  for (const language of languages) {
    const result = await timedFetch("/api/speech/recognize", {
      body: JSON.stringify({ audioBase64, language, mimeType: "audio/wav" }),
      headers: authHeaders(token),
      method: "POST",
      timeoutMs: 30000
    });
    let parsed = null;
    try {
      parsed = result.bodyText ? JSON.parse(result.bodyText) : null;
    } catch {
      parsed = null;
    }
    results.push({
      case: language,
      provider: parsed?.provider ?? null,
      transcriptLength: parsed?.transcript?.length ?? null,
      ...result
    });
  }

  return results;
}

async function runPerformance() {
  const concurrency = Number(process.env.QA_CONCURRENCY ?? 100);
  const total = Number(process.env.QA_TOTAL_REQUESTS ?? 500);
  const durations = [];
  let completed = 0;
  let failed = 0;

  async function worker() {
    while (completed < total) {
      const current = completed;
      completed += 1;
      if (current >= total) {
        return;
      }
      const result = await timedFetch("/api/characters", { method: "GET", timeoutMs: 10000 });
      durations.push(result.durationMs);
      if (result.status !== 200 || result.error) {
        failed += 1;
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  durations.sort((a, b) => a - b);
  const percentile = (p) => durations[Math.min(durations.length - 1, Math.ceil(durations.length * p) - 1)] ?? null;

  return {
    endpoint: "GET /api/characters",
    concurrency,
    total,
    successes: total - failed,
    failures: failed,
    failureRate: total ? Number((failed / total).toFixed(4)) : null,
    p50Ms: percentile(0.5),
    p95Ms: percentile(0.95),
    p99Ms: percentile(0.99)
  };
}

loadLocalEnv(ENV_PATH);

const requiredEnv = [
  "MODEL_API_BASE_URL",
  "MODEL_NAME",
  "FISH_AUDIO_API_KEY",
  "FISH_AUDIO_REFERENCE_ID_EMMA",
  "FISH_AUDIO_REFERENCE_ID_JAKE",
  "FISH_AUDIO_REFERENCE_ID_SOPHIE",
  "FISH_AUDIO_REFERENCE_ID_KENJI",
  "FISH_AUDIO_REFERENCE_ID_CARLOS",
  "JWT_SECRET",
  "DATABASE_URL"
];

if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET is required for QA token generation");
}

const token = signJwt(
  {
    sub: "qa-ticket-305-user",
    email: "qa-ticket-305@example.test"
  },
  process.env.JWT_SECRET
);

const report = {
  baseUrl: BASE_URL,
  envConfigured: Object.fromEntries(requiredEnv.map((name) => [name, configured(name)])),
  synthesize: await runSynthesize(token),
  recognize: await runRecognize(token),
  performance: await runPerformance()
};

console.log(JSON.stringify(report, null, 2));
