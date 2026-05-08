import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const localHome = join(root, ".storybook-home");
mkdirSync(localHome, { recursive: true });

const storybookBin = join(root, "node_modules", "storybook", "bin", "index.cjs");
const result = spawnSync(
  process.execPath,
  [storybookBin, ...process.argv.slice(2), "--disable-telemetry"],
  {
    cwd: root,
    env: {
      ...process.env,
      HOME: localHome,
      STORYBOOK_DISABLE_TELEMETRY: "1",
      STORYBOOK_TELEMETRY_DISABLED: "1",
      USERPROFILE: localHome
    },
    stdio: "inherit"
  }
);

if (result.error) {
  console.error(result.error);
}

process.exit(result.status ?? 1);
