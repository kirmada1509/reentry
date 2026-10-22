import { defineConfig } from "@playwright/test";
import { createServer } from "node:net";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

async function availableOrigin() {
  const listener = createServer();
  await new Promise<void>((resolve, reject) => {
    listener.once("error", reject);
    listener.listen(0, "127.0.0.1", resolve);
  });
  const address = listener.address();
  if (!address || typeof address === "string")
    throw new Error("No test port allocated.");
  const origin = `http://127.0.0.1:${address.port}`;
  await new Promise<void>((resolve, reject) =>
    listener.close((error) => (error ? reject(error) : resolve())),
  );
  return origin;
}
const appOrigin =
  process.env.REENTRY_TEST_APP_ORIGIN ?? (await availableOrigin());
if (!process.env.REENTRY_TEST_FIXTURE_DIR) {
  const directory = await mkdtemp(
    path.join(tmpdir(), "reentry-sites-commerce-agent-"),
  );
  await writeFile(path.join(directory, ".reentry-owned"), process.cwd());
  process.env.REENTRY_TEST_FIXTURE_DIR = directory;
}
const directory = process.env.REENTRY_TEST_FIXTURE_DIR;
process.env.REENTRY_TEST_APP_ORIGIN = appOrigin;
process.env.REENTRY_TEST_SOURCE_ORIGIN = "http://127.0.0.1:4177";
process.env.REENTRY_TEST_PRODUCTION = "1";

export default defineConfig({
  testDir: "./tests/commerce",
  workers: 1,
  timeout: 30_000,
  expect: { timeout: 10_000 },
  use: { baseURL: "http://127.0.0.1:4177", testIdAttribute: "data-test" },
  outputDir: "test-results/commerce",
  globalTeardown: "./tests/e2e/global-teardown.ts",
  webServer: [
    {
      command: "pnpm sandbox:commerce",
      url: "http://127.0.0.1:4177/",
      reuseExistingServer: !process.env.CI,
      timeout: 240_000,
    },
    {
      command: `pnpm extension:build && pnpm build && pnpm exec next start --hostname 127.0.0.1 --port ${new URL(appOrigin).port}`,
      url: appOrigin,
      reuseExistingServer: false,
      timeout: 240_000,
      env: {
        REENTRY_APP_ORIGIN: appOrigin,
        REENTRY_AGENT_DB: path.join(directory, "agent.sqlite"),
        REENTRY_AI_PROVIDER: "disabled",
        REENTRY_AI_MODEL: "",
        AXIOM_TOKEN: "",
        AXIOM_DATASET: "",
        OTEL_EXPORTER_OTLP_ENDPOINT: "",
      },
    },
  ],
});
