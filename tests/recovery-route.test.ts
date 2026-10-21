import { afterEach, describe, expect, it, vi } from "vitest";
const callbacks = vi.hoisted(() => [] as Array<() => Promise<void>>);
vi.mock("next/server", () => ({
  after: (callback: () => Promise<void>) => callbacks.push(callback),
}));
vi.mock("next/navigation", () => ({ unstable_rethrow: () => {} }));
import { GET, POST } from "@/app/api/recovery/route";
const origin = "http://127.0.0.1:3000";
afterEach(async () => {
  await Promise.all(callbacks.splice(0).map((callback) => callback()));
  vi.unstubAllEnvs();
});
function configure() {
  vi.stubEnv("REENTRY_APP_ORIGIN", origin);
  vi.stubEnv("REENTRY_AI_PROVIDER", "ollama");
  vi.stubEnv("REENTRY_AI_MODEL", "reentry-test");
}
describe("recovery HTTP boundary", () => {
  it("exposes local processing setup without endpoint or credentials and preserves manual mode", async () => {
    vi.stubEnv("REENTRY_AI_PROVIDER", "disabled");
    vi.stubEnv("REENTRY_AI_MODEL", "");
    const response = await GET(new Request(origin + "/api/recovery"));
    expect(await response.json()).toEqual({
      enabled: false,
      provider: "disabled",
      model: null,
      processing: "local",
    });
    expect(response.headers.get("cache-control")).toBe("no-store");
  });
  it("requires current hosted-processing consent before any model request", async () => {
    vi.stubEnv("REENTRY_AI_PROVIDER", "nvidia");
    vi.stubEnv("REENTRY_AI_MODEL", "nvidia/test-model");
    vi.stubEnv("NVIDIA_API_KEY", "synthetic-nvidia-credential");
    const send = vi.spyOn(globalThis, "fetch");
    const statusResponse = await GET(new Request(origin + "/api/recovery"));
    const status = await statusResponse.json();
    expect(status.processing).toBe("hosted");
    for (const consent of [undefined, "stale-consent"]) {
      const response = await POST(
        new Request(origin + "/api/recovery", {
          method: "POST",
          headers: {
            origin,
            "content-type": "application/json",
            ...(consent ? { "x-reentry-consent": consent } : {}),
          },
          body: "{}",
        }),
      );
      expect(response.status).toBe(403);
      expect((await response.json()).error.code).toBe(
        "PROCESSING_CONSENT_REQUIRED",
      );
    }
    const response = await POST(
      new Request(origin + "/api/recovery", {
        method: "POST",
        headers: {
          origin,
          "content-type": "application/json",
          "x-reentry-consent": status.consentId,
        },
        body: "{}",
      }),
    );
    expect(response.status).toBe(400); // Passed consent, rejected invalid evidence.
    expect(send).not.toHaveBeenCalled();
  });
  it("rejects cross-origin and originless inference before contacting a model", async () => {
    configure();
    const send = vi.spyOn(globalThis, "fetch");
    for (const from of ["https://external.example", undefined]) {
      const response = await POST(
        new Request(origin + "/api/recovery", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            ...(from ? { origin: from } : {}),
          },
          body: JSON.stringify({ privateTask: "not-for-logs" }),
        }),
      );
      expect(response.status).toBe(403);
      const body = await response.json();
      expect(body.error.requestId).toBe(response.headers.get("x-request-id"));
      expect(JSON.stringify(body)).not.toContain("not-for-logs");
    }
    expect(send).not.toHaveBeenCalled();
  });
  it("rejects malformed and oversized input without model side effects", async () => {
    configure();
    const send = vi.spyOn(globalThis, "fetch");
    for (const [body, status] of [
      ["{}", 400],
      ["x".repeat(193 * 1024), 413],
    ] as const) {
      const response = await POST(
        new Request(origin + "/api/recovery", {
          method: "POST",
          headers: { origin, "content-type": "application/json" },
          body,
        }),
      );
      expect(response.status).toBe(status);
    }
    expect(send).not.toHaveBeenCalled();
  });
});
