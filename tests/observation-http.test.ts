import { randomUUID } from "node:crypto";
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
import { GET as TASKS, POST as CHANGE } from "@/app/api/agent/tasks/route";
import { ObservationStore } from "@/features/observation/store";
const dir = mkdtempSync(path.join(tmpdir(), "reentry-agent-http-"));
afterAll(() => rmSync(dir, { recursive: true, force: true }));
afterEach(async () => {
  await Promise.all(callbacks.splice(0).map((fn) => fn()));
  vi.unstubAllEnvs();
});
it("guards automatic processing consent and task controls independently of observation", async () => {
  const filename = path.join(dir, "tasks.sqlite");
  vi.stubEnv("REENTRY_AGENT_DB", filename);
  vi.stubEnv("REENTRY_APP_ORIGIN", "http://127.0.0.1:3000");
  vi.stubEnv("REENTRY_AI_PROVIDER", "ollama");
  vi.stubEnv("REENTRY_AI_MODEL", "fixture-model");
  const app = "http://127.0.0.1:3000";
  const request = (body?: unknown, origin = app) =>
    new Request(app + "/api/agent/tasks", {
      method: body ? "POST" : "GET",
      headers: {
        host: "127.0.0.1:3000",
        origin,
        "x-reentry-web": "1",
        "content-type": "application/json",
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  expect(
    (await TASKS(request(undefined, "https://untrusted.example"))).status,
  ).toBe(403);
  const config = await (await TASKS(request())).json();
  expect(config.enabled).toBe(false);
  expect(
    (
      await CHANGE(
        request({
          action: "enable",
          consentId: config.processing.consentId,
          sessionId: randomUUID(),
        }),
      )
    ).status,
  ).toBe(409);
  const local = new ObservationStore(filename);
  try {
    const paired = local.pair(
      local.challenge(),
      "nabinfdlobegbkgehppcipkhbddjbdka",
    );
    const reviewed = local.setSession(
      paired.deviceId,
      {
        allSites: false,
        origins: ["https://example.com"],
        policy: "local-observation-v1",
      },
      false,
      app,
    );
    expect(
      (
        await CHANGE(
          request({
            action: "enable",
            consentId: "d".repeat(64),
            sessionId: reviewed.session.id,
          }),
        )
      ).status,
    ).toBe(409);
    const enabled = await CHANGE(
      request({
        action: "enable",
        consentId: config.processing.consentId,
        sessionId: reviewed.session.id,
      }),
    );
    expect(enabled.status).toBe(200);
    expect(enabled.headers.get("x-request-id")).toBeTruthy();
    expect((await enabled.json()).enabled).toBe(true);
    const replacement = local.setSession(
      paired.deviceId,
      {
        allSites: false,
        origins: ["https://another.example"],
        policy: "local-observation-v1",
      },
      false,
      app,
    );
    const stale = await CHANGE(
      request({
        action: "enable",
        consentId: config.processing.consentId,
        sessionId: reviewed.session.id,
      }),
    );
    expect(stale.status).toBe(409);
    expect(local.agent.settings().enabled).toBe(0);
    expect(
      (
        await CHANGE(
          request({
            action: "enable",
            consentId: config.processing.consentId,
            sessionId: replacement.session.id,
          }),
        )
      ).status,
    ).toBe(200);
    const malformed = await CHANGE(
      request({ action: "correct", id: "bad", expectedRevision: 0 }),
    );
    expect(malformed.status).toBe(400);
    vi.stubEnv("REENTRY_AI_MODEL", "different-fixture-model");
    const changed = await (await TASKS(request())).json();
    expect(changed.enabled).toBe(false);
    expect(changed.status).toBe("needs-consent");
    expect(
      (
        await CHANGE(
          request({
            action: "enable",
            consentId: config.processing.consentId,
            sessionId: replacement.session.id,
          }),
        )
      ).status,
    ).toBe(409);
  } finally {
    local.close();
  }
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
