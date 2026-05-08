import { existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { spawn, spawnSync } from "node:child_process";

const root = process.cwd();
const port = Number(process.env.K6_PORT ?? 3021);
const localBaseUrl = `http://127.0.0.1:${port}`;
const dockerBaseUrl = `http://host.docker.internal:${port}`;

function command(name) {
  return process.platform === "win32" ? `${name}.cmd` : name;
}

function cleanEnv(extra = {}) {
  const env = {};

  for (const [key, value] of Object.entries(process.env)) {
    if (key.toLowerCase() !== "path") {
      env[key] = value;
    }
  }

  env.Path = process.env.Path ?? process.env.PATH ?? "";

  return {
    ...env,
    ...extra
  };
}

function run(commandName, args, options = {}) {
  const result = spawnSync(commandName, args, {
    cwd: root,
    env: cleanEnv(options.env),
    shell: process.platform === "win32",
    stdio: "inherit"
  });

  if (result.status !== 0) {
    throw new Error(`${commandName} ${args.join(" ")} failed`);
  }
}

async function waitForServer() {
  const deadline = Date.now() + 20_000;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${localBaseUrl}/api/characters`);

      if (response.ok) {
        return;
      }
    } catch {
      await new Promise((resolveDelay) => setTimeout(resolveDelay, 500));
    }
  }

  throw new Error(`Next server did not become ready at ${localBaseUrl}`);
}

function startServer() {
  return spawn(command("npm"), ["start"], {
    cwd: root,
    env: cleanEnv({
      PORT: String(port)
    }),
    shell: process.platform === "win32",
    stdio: "inherit"
  });
}

function hasLocalK6() {
  const result = spawnSync(process.platform === "win32" ? "where" : "which", ["k6"], {
    shell: process.platform === "win32",
    stdio: "ignore"
  });

  return result.status === 0;
}

function runK6() {
  mkdirSync(resolve(root, "docs", "perf"), { recursive: true });

  if (hasLocalK6()) {
    run("k6", ["run", "scripts/k6-load.js"], {
      env: {
        BASE_URL: localBaseUrl
      }
    });
    return;
  }

  run("docker", [
    "run",
    "--rm",
    "-v",
    `${root}:/work`,
    "-w",
    "/work",
    "-e",
    `BASE_URL=${dockerBaseUrl}`,
    "-e",
    `LOAD_VUS=${process.env.LOAD_VUS ?? "100"}`,
    "-e",
    `LOAD_DURATION=${process.env.LOAD_DURATION ?? "60s"}`,
    "grafana/k6:latest",
    "run",
    "scripts/k6-load.js"
  ]);
}

let server;

try {
  mkdirSync(resolve(root, "docs", "perf"), { recursive: true });
  run(command("npm"), ["run", "build"]);
  server = startServer();
  await waitForServer();
  runK6();

  if (!existsSync(resolve(root, "docs", "perf", "k6-report.txt"))) {
    throw new Error("k6 did not write docs/perf/k6-report.txt");
  }
} finally {
  if (server?.pid) {
    if (process.platform === "win32") {
      spawnSync("taskkill", ["/pid", String(server.pid), "/T", "/F"], { stdio: "ignore" });
    } else {
      process.kill(server.pid);
    }
  }
}
