import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/commerce",
  workers: 1,
  timeout: 30_000,
  use: { baseURL: "http://127.0.0.1:4177", testIdAttribute: "data-test" },
  outputDir: "test-results/commerce",
  webServer: {
    command: "pnpm sandbox:commerce",
    url: "http://127.0.0.1:4177/",
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
  },
});
