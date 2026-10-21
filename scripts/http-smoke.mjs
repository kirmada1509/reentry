import assert from "node:assert/strict";
import nextEnvironment from "@next/env";
const { loadEnvConfig } = nextEnvironment;
import { root } from "./project.mjs";

loadEnvConfig(root, true);
const port = Number(process.argv[2] || process.env.PORT || 3000);
assert(
  Number.isInteger(port) && port > 0 && port <= 65535,
  "Invalid smoke-test port",
);
const base = "http://127.0.0.1:" + port;
for (const endpoint of ["live", "ready"]) {
  const response = await fetch(base + "/api/health/" + endpoint, {
    signal: AbortSignal.timeout(10000),
  });
  assert.equal(response.status, 200);
  assert.match(response.headers.get("x-request-id") || "", /^[a-f0-9-]{36}$/);
  assert.equal(response.headers.get("cache-control"), "no-store");
  const body = await response.json();
  assert.equal(body.status, endpoint === "live" ? "ok" : "ready");
}
const page = await fetch(base, { signal: AbortSignal.timeout(20000) });
assert.equal(page.status, 200);
assert.match(await page.text(), /Save your place/);
const missing = await fetch(base + "/missing-starter-smoke", {
  signal: AbortSignal.timeout(10000),
});
assert.equal(missing.status, 404);
console.log(
  "HTTP smoke passed: ReEntry page, liveness, readiness, correlation IDs, and missing route.",
);
