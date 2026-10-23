import nextEnv from "@next/env";
import { spawnSync } from "node:child_process";
nextEnv.loadEnvConfig(process.cwd());
if (process.env.REENTRY_AI_PROVIDER !== "nvidia")
  throw new Error("Configure NVIDIA for this explicit live journey.");
const result = spawnSync(
  "pnpm",
  [
    "exec",
    "playwright",
    "test",
    "--config",
    "playwright.commerce.config.ts",
    "--grep",
    "@agent-live",
  ],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      REENTRY_TEST_LIVE: "1",
      REENTRY_TEST_PRODUCTION: "1",
    },
  },
);
process.exitCode = result.status ?? 1;
