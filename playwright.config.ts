import { defineConfig } from "@playwright/test";
import { createServer } from "node:net";
import { cp, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

async function availableOrigin(): Promise<string> {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string")
        return reject(new Error("No test port allocated."));
      const origin = `http://127.0.0.1:${address.port}`;
      server.close((error) => (error ? reject(error) : resolve(origin)));
    });
  });
}

const appOrigin =
  process.env.REENTRY_TEST_APP_ORIGIN ?? (await availableOrigin());
const sourceOrigin =
  process.env.REENTRY_TEST_SOURCE_ORIGIN ?? (await availableOrigin());
// Workers inherit these rather than independently allocating different ports.
process.env.REENTRY_TEST_APP_ORIGIN = appOrigin;
process.env.REENTRY_TEST_SOURCE_ORIGIN = sourceOrigin;
if (!process.env.REENTRY_TEST_FIXTURE_DIR) {
  const directory = await mkdtemp(path.join(tmpdir(), "reentry-sites-"));
  await cp(path.resolve("tests/fixtures/sites"), directory, {
    recursive: true,
  });
  await writeFile(path.join(directory, ".reentry-owned"), process.cwd());
  process.env.REENTRY_TEST_FIXTURE_DIR = directory;
}

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  reporter: [["list"], ["html", { open: "never" }]],
  outputDir: "test-results",
  globalTeardown: "./tests/e2e/global-teardown.ts",
  webServer: [
    {
      command: `pnpm exec wxt build extension --mode e2e && pnpm exec next dev --hostname 127.0.0.1 --port ${new URL(appOrigin).port}`,
      url: appOrigin,
      reuseExistingServer: false,
      timeout: 120_000,
      env: {
        REENTRY_APP_ORIGIN: appOrigin,
        REENTRY_EXTENSION_ID: "nabinfdlobegbkgehppcipkhbddjbdka",
        AXIOM_TOKEN: "",
        AXIOM_DATASET: "",
        OTEL_EXPORTER_OTLP_ENDPOINT: "",
      },
    },
    {
      command: `pnpm exec http-server "$REENTRY_TEST_FIXTURE_DIR" -a 127.0.0.1 -p ${new URL(sourceOrigin).port} -c-1`,
      url: `${sourceOrigin}/instructions.html`,
      reuseExistingServer: false,
      timeout: 20_000,
    },
  ],
});
