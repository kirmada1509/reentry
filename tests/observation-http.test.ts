import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, afterEach, expect, it, vi } from "vitest";
const callbacks = vi.hoisted(() => [] as Array<() => Promise<void>>);
vi.mock("next/server", () => ({
  after: (callback: () => Promise<void>) => callbacks.push(callback),
}));
vi.mock("next/navigation", () => ({ unstable_rethrow: () => {} }));
import { GET, POST } from "@/app/api/agent/web/route";
import { POST as DEVICE, OPTIONS } from "@/app/api/agent/device/route";
const dir = mkdtempSync(path.join(tmpdir(), "reentry-agent-http-"));
afterAll(() => rmSync(dir, { recursive: true, force: true }));
afterEach(async () => {
  await Promise.all(callbacks.splice(0).map((fn) => fn()));
  vi.unstubAllEnvs();
});
it("enforces exact web/extension origin and preserves request IDs for rejections", async () => {
  vi.stubEnv("REENTRY_AGENT_DB", path.join(dir, "agent.sqlite"));
  vi.stubEnv("REENTRY_APP_ORIGIN", "http://127.0.0.1:3000");
  const app = "http://127.0.0.1:3000";
  const id = "nabinfdlobegbkgehppcipkhbddjbdka";
  const req = (
    url: string,
    headers: Record<string, string> = {},
    body?: unknown,
  ) =>
    new Request(url, {
      method: body ? "POST" : "GET",
      headers: { host: new URL(url).host, ...headers },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  expect((await GET(req(app + "/api/agent/web"))).status).toBe(403);
  expect(
    (
      await GET(
        req(app + "/api/agent/web", {
          "x-reentry-web": "1",
          origin: "https://attacker.example",
        }),
      )
    ).status,
  ).toBe(403);
  expect(
    (
      await GET(
        req(app + "/api/agent/web", {
          "x-reentry-web": "1",
          "sec-fetch-site": "same-origin",
        }),
      )
    ).status,
  ).toBe(200);
  const response = await POST(
    req(
      app + "/api/agent/web",
      { "content-type": "application/json", origin: app, "x-reentry-web": "1" },
      { action: "challenge" },
    ),
  );
  const { challenge } = await response.json();
  const wrong = await DEVICE(
    req(
      app + "/api/agent/device",
      {
        "content-type": "application/json",
        "x-reentry-extension": id,
        origin: "https://attacker.example",
      },
      { action: "pair", challenge },
    ),
  );
  expect(wrong.status).toBe(403);
  expect(wrong.headers.get("x-request-id")).toBeTruthy();
  expect(
    (
      await DEVICE(
        req(
          app + "/api/agent/device",
          { "content-type": "application/json", "x-reentry-extension": id },
          { action: "pair", challenge },
        ),
      )
    ).status,
  ).toBe(200);
  expect(
    (
      await DEVICE(
        req(
          app + "/api/agent/device",
          { "content-type": "application/json", "x-reentry-extension": id },
          { action: "status" },
        ),
      )
    ).status,
  ).toBe(401);
  expect(
    (
      await GET(
        req("http://127.0.0.1:3001/api/agent/web", {
          origin: app,
          "x-reentry-web": "1",
        }),
      )
    ).status,
  ).toBe(403);
  const preflight = (origin: string) =>
    req(app + "/api/agent/device", {
      origin,
      "access-control-request-method": "POST",
    });
  expect((await OPTIONS(preflight("https://attacker.example"))).status).toBe(
    403,
  );
  expect(
    (await OPTIONS(preflight(`chrome-extension://${id}`))).headers.get(
      "access-control-allow-origin",
    ),
  ).toBe(`chrome-extension://${id}`);
});
