import http from "k6/http";
import { check, sleep } from "k6";

const baseUrl = __ENV.BASE_URL || "http://127.0.0.1:3021";
const email = __ENV.K6_EMAIL || `k6-${Date.now()}@example.com`;
const password = __ENV.K6_PASSWORD || "Password123!";
const loadVus = Number(__ENV.LOAD_VUS || 100);
const loadDuration = __ENV.LOAD_DURATION || "60s";

function durationToSeconds(duration) {
  const match = /^(\d+)(s|m)$/.exec(duration);

  if (!match) {
    return 60;
  }

  const value = Number(match[1]);

  return match[2] === "m" ? value * 60 : value;
}

const scenarioGapSeconds = 5;
const loadDurationSeconds = durationToSeconds(loadDuration);
const detailStart = `${loadDurationSeconds + scenarioGapSeconds}s`;
const loginStart = `${loadDurationSeconds * 2 + scenarioGapSeconds * 2}s`;
const loginMaxDuration = `${loadDurationSeconds + scenarioGapSeconds}s`;

export const options = {
  scenarios: {
    characters_list_load: {
      duration: loadDuration,
      executor: "constant-vus",
      exec: "charactersList",
      vus: loadVus
    },
    characters_detail_load: {
      duration: loadDuration,
      executor: "constant-vus",
      exec: "charactersDetail",
      startTime: detailStart,
      vus: loadVus
    },
    auth_login_concurrency: {
      executor: "per-vu-iterations",
      exec: "authLogin",
      iterations: 1,
      maxDuration: loginMaxDuration,
      startTime: loginStart,
      vus: loadVus
    }
  },
  thresholds: {
    "http_req_duration{endpoint:auth_login}": ["p(95)<500"],
    "http_req_duration{endpoint:characters_detail}": ["p(95)<500"],
    "http_req_duration{endpoint:characters_list}": ["p(95)<500"],
    http_req_failed: ["rate<0.01"]
  }
};

export function setup() {
  http.post(
    `${baseUrl}/api/auth/register`,
    JSON.stringify({
      email,
      name: "K6 Load User",
      password
    }),
    {
      headers: {
        "content-type": "application/json",
        "x-forwarded-for": "198.51.100.1"
      },
      tags: {
        endpoint: "auth_register_setup"
      }
    }
  );

  return {
    email,
    password
  };
}

function requestHeaders() {
  const ip = `198.51.${__VU % 255}.${__ITER % 255}`;

  return {
    "content-type": "application/json",
    "x-forwarded-for": ip
  };
}

export function charactersList() {
  const characters = http.get(`${baseUrl}/api/characters`, {
    headers: requestHeaders(),
    tags: {
      endpoint: "characters_list"
    }
  });
  check(characters, {
    "GET /api/characters returns 200": (response) => response.status === 200
  });

  sleep(1);
}

export function charactersDetail() {
  const character = http.get(`${baseUrl}/api/characters/emma`, {
    headers: requestHeaders(),
    tags: {
      endpoint: "characters_detail"
    }
  });
  check(character, {
    "GET /api/characters/:id returns 200": (response) => response.status === 200
  });

  sleep(1);
}

export function authLogin(data) {
  sleep(Math.random() * Math.max(loadDurationSeconds - 1, 1));

  const login = http.post(
    `${baseUrl}/api/auth/login`,
    JSON.stringify({
      email: data.email,
      password: data.password
    }),
    {
      headers: requestHeaders(),
      tags: {
        endpoint: "auth_login"
      }
    }
  );
  check(login, {
    "POST /api/auth/login returns 200": (response) => response.status === 200
  });
}

export function handleSummary(data) {
  const metric = (name) => data.metrics[name]?.values ?? {};
  const endpointLine = (label, name) => {
    const values = metric(name);
    const threshold = data.metrics[name]?.thresholds?.["p(95)<500"]?.ok;

    return `- ${label}: p95 ${values["p(95)"] ?? "n/a"}ms (${threshold ? "PASS" : "FAIL"})`;
  };
  const lines = [
    "TICKET-402 k6 Non-AI API Load Test",
    `Generated: ${new Date().toISOString()}`,
    `Base URL: ${baseUrl}`,
    `Load: ${loadVus} VU / ${loadDuration} for character endpoints; ${loadVus} login VUs distributed across ${loadDuration}`,
    `Scenario order: /api/characters, /api/characters/:id, /api/auth/login`,
    "",
    "Thresholds:",
    "- http_req_failed rate < 1%",
    "- P95 < 500ms for GET /api/characters",
    "- P95 < 500ms for GET /api/characters/:id",
    "- P95 < 500ms for POST /api/auth/login",
    "",
    "Observed:",
    `- http_req_failed rate: ${metric("http_req_failed").rate ?? "n/a"}`,
    `- http_req_duration p95: ${metric("http_req_duration")["p(95)"] ?? "n/a"}ms`,
    endpointLine("GET /api/characters", "http_req_duration{endpoint:characters_list}"),
    endpointLine("GET /api/characters/:id", "http_req_duration{endpoint:characters_detail}"),
    endpointLine("POST /api/auth/login", "http_req_duration{endpoint:auth_login}"),
    `- http_reqs: ${metric("http_reqs").count ?? "n/a"}`,
    `- iterations: ${metric("iterations").count ?? "n/a"}`,
    "",
    "Raw summary:",
    JSON.stringify(data.metrics, null, 2)
  ];

  return {
    "docs/perf/k6-report.txt": `${lines.join("\n")}\n`
  };
}
