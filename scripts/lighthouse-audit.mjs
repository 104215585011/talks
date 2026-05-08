import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { createRequire } from "node:module";

const root = process.cwd();
const require = createRequire(import.meta.url);
const outputDir = resolve(root, "docs", "lighthouse");
const tempDir = resolve(root, ".tmp", "lighthouse");
const port = Number(process.env.LIGHTHOUSE_PORT ?? 3020);
const baseUrl = `http://127.0.0.1:${port}`;
const pages = [
  { path: "/", slug: "home" },
  { path: "/login", slug: "login" },
  { path: "/characters", slug: "characters" },
  { path: "/chat", slug: "chat" }
];
const thresholds = {
  accessibility: 0.9,
  "best-practices": 0.9,
  performance: 0.8,
  seo: 0.9
};

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
    TEMP: tempDir,
    TMP: tempDir,
    TMPDIR: tempDir,
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

function getChromePath() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("playwright").chromium.executablePath();
  } catch {
    return process.env.CHROME_PATH;
  }
}

async function waitForServer() {
  const deadline = Date.now() + 20_000;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(baseUrl);

      if (response.ok) {
        return;
      }
    } catch {
      await new Promise((resolveDelay) => setTimeout(resolveDelay, 500));
    }
  }

  throw new Error(`Next server did not become ready at ${baseUrl}`);
}

function startServer() {
  return spawn(command("npm"), ["start"], {
    cwd: root,
    detached: process.platform !== "win32",
    env: cleanEnv({
      PORT: String(port)
    }),
    shell: process.platform === "win32",
    stdio: "inherit"
  });
}

function scoreOf(report, category) {
  return report.categories[category]?.score ?? 0;
}

function assertScores(report, slug) {
  const failures = Object.entries(thresholds)
    .filter(([category, threshold]) => scoreOf(report, category) < threshold)
    .map(
      ([category, threshold]) =>
        `${slug} ${category}=${Math.round(scoreOf(report, category) * 100)} < ${
          threshold * 100
        }`
    );

  if (failures.length > 0) {
    throw new Error(`Lighthouse threshold failed: ${failures.join(", ")}`);
  }
}

function runLighthouse(chromePath) {
  const rows = [];

  for (const page of pages) {
    const outputPath = join(outputDir, page.slug);
    const url = `${baseUrl}${page.path}`;

    const args = [
      url,
      "--preset=desktop",
      "--quiet",
      "--only-categories=performance,accessibility,best-practices,seo",
      "--output=json",
      "--output=html",
      `--output-path=${outputPath}`,
      "--chrome-flags=--headless=new --no-sandbox --disable-gpu"
    ];
    const result = spawnSync(command("lighthouse"), args, {
      cwd: root,
      encoding: "utf8",
      env: chromePath
        ? cleanEnv({
            CHROME_PATH: chromePath
          })
        : cleanEnv(),
      shell: process.platform === "win32",
      stdio: "pipe"
    });

    const reportPath = `${outputPath}.report.json`;

    if (result.status !== 0 && !existsSync(reportPath)) {
      process.stdout.write(result.stdout ?? "");
      process.stderr.write(result.stderr ?? "");
      throw new Error(`lighthouse ${url} failed`);
    }

    if (result.status !== 0) {
      console.warn(`Lighthouse completed ${page.slug}; ignored Chrome temp cleanup warning.`);
    }

    const report = JSON.parse(readFileSync(reportPath, "utf8"));
    assertScores(report, page.slug);
    rows.push({
      accessibility: Math.round(scoreOf(report, "accessibility") * 100),
      bestPractices: Math.round(scoreOf(report, "best-practices") * 100),
      performance: Math.round(scoreOf(report, "performance") * 100),
      seo: Math.round(scoreOf(report, "seo") * 100),
      slug: page.slug,
      url
    });
  }

  return rows;
}

function writeSummary(rows) {
  const lines = [
    "# Lighthouse Baseline",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "| Page | Performance | Accessibility | Best Practices | SEO |",
    "| --- | ---: | ---: | ---: | ---: |",
    ...rows.map(
      (row) =>
        `| ${row.url} | ${row.performance} | ${row.accessibility} | ${row.bestPractices} | ${row.seo} |`
    ),
    "",
    "Thresholds: Performance >= 80, Accessibility >= 90, Best Practices >= 90, SEO >= 90."
  ];

  writeFileSync(join(outputDir, "summary.md"), `${lines.join("\n")}\n`);
}

let server;

try {
  rmSync(outputDir, { force: true, recursive: true });
  mkdirSync(outputDir, { recursive: true });
  mkdirSync(tempDir, { recursive: true });
  run(command("npm"), ["run", "build"]);
  server = startServer();
  await waitForServer();
  const rows = runLighthouse(getChromePath());
  writeSummary(rows);
  console.table(rows);
} finally {
  if (server?.pid) {
    if (process.platform === "win32") {
      spawnSync("taskkill", ["/pid", String(server.pid), "/T", "/F"], { stdio: "ignore" });
    } else {
      process.kill(-server.pid);
    }
  }
}
