import { spawnSync } from "node:child_process";

const command = process.platform === "win32" ? "next.cmd" : "next";
const result = spawnSync(command, ["start"], {
  env: {
    ...process.env,
    NODE_ENV: "production"
  },
  shell: true,
  stdio: "inherit"
});

process.exit(result.status ?? 1);
