import nextEnv from "@next/env";
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
nextEnv.loadEnvConfig(process.cwd());
const kind = process.argv[2],
  requested = process.argv[3];
if (!["application", "shopping"].includes(kind ?? "") || !requested)
  throw new Error(
    "Use test:agent:demo application|shopping <fresh-output-directory>.",
  );
if (process.env.REENTRY_AI_PROVIDER !== "nvidia")
  throw new Error(
    "This explicit recording requires configured NVIDIA processing.",
  );
const directory = path.resolve(requested);
if (existsSync(directory))
  throw new Error("Choose a fresh directory to preserve previous trials.");
mkdirSync(directory, { recursive: true });
const result = spawnSync(
  "pnpm",
  [
    "exec",
    "playwright",
    "test",
    ...(kind === "shopping"
      ? ["--config", "playwright.commerce.config.ts"]
      : []),
    "--grep",
    `@agent-demo-${kind}`,
  ],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      REENTRY_TEST_LIVE: "1",
      REENTRY_TEST_PRODUCTION: "1",
      REENTRY_AGENT_DEMO_KIND: kind,
      REENTRY_AGENT_DEMO_DIR: directory,
    },
  },
);
writeFileSync(
  path.join(directory, "run.json"),
  JSON.stringify(
    {
      kind,
      commit: execFileSync("git", ["rev-parse", "HEAD"], {
        encoding: "utf8",
      }).trim(),
      status: result.status,
      complete: result.status === 0,
      provider: "nvidia",
      operatorRetries: 0,
      createdAt: new Date().toISOString(),
    },
    null,
    2,
  ) + "\n",
);
process.exitCode = result.status ?? 1;
