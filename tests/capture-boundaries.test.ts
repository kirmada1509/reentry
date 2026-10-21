import { describe, expect, it } from "vitest";
import { appOriginSchema } from "@/features/capture/config";
import {
  bridgeRequestSchema,
  captureSchema,
  httpUrlSchema,
  isAppSender,
  isFresh,
  CAPTURE_TTL_MS,
} from "@/features/capture/protocol";

const origin = "http://127.0.0.1:3000";
const capture = {
  id: crypto.randomUUID(),
  title: "Instructions",
  url: "https://example.org/instructions",
  text: "  One referee.\nKeep this spacing.  ",
  capturedAt: new Date().toISOString(),
  mode: "selection" as const,
  extractorVersion: 1 as const,
};

describe("capture boundaries", () => {
  it("accepts only the exact app origin, top-level page and no extension sender", () => {
    expect(
      isAppSender(
        { url: `${origin}/?capture=abc`, origin, frameId: 0 },
        origin,
      ),
    ).toBe(true);
    for (const sender of [
      { url: "http://127.0.0.1:3001/" },
      { url: "http://localhost:3000/" },
      { url: "https://127.0.0.1:3000/" },
      { url: "http://127.0.0.1.evil.test:3000/" },
      { url: origin, origin: "null" },
      { url: origin, frameId: 2 },
      { url: origin, id: "another-extension" },
      {},
    ]) {
      expect(isAppSender(sender, origin)).toBe(false);
    }
  });

  it("rejects credentials, script destinations, extra payload fields and invalid ids", () => {
    for (const url of [
      "javascript:alert(1)",
      "data:text/html,hello",
      "file:///tmp/test",
      "https://user:pass@example.org",
      "example.org",
      "",
    ])
      expect(httpUrlSchema.safeParse(url).success).toBe(false);
    expect(httpUrlSchema.parse("https://example.org/work?q=1#section")).toBe(
      "https://example.org/work?q=1#section",
    );
    expect(
      bridgeRequestSchema.safeParse({
        version: 1,
        type: "capture.get",
        captureId: capture.id,
        unexpected: true,
      }).success,
    ).toBe(false);
    expect(
      bridgeRequestSchema.safeParse({
        version: 1,
        type: "capture.ack",
        captureId: "bad",
        taskId: crypto.randomUUID(),
      }).success,
    ).toBe(false);
  });

  it("preserves raw selection text and refuses empty/oversized evidence", () => {
    expect(captureSchema.parse(capture).text).toBe(capture.text);
    for (const text of ["", " \n ", "x".repeat(20_001)])
      expect(captureSchema.safeParse({ ...capture, text }).success).toBe(false);
    expect(
      isFresh(capture, Date.parse(capture.capturedAt) + CAPTURE_TTL_MS),
    ).toBe(false);
    expect(isFresh(capture, Date.parse(capture.capturedAt) - 1)).toBe(false);
  });

  it("requires local exact-origin configuration", () => {
    expect(appOriginSchema.safeParse(origin).success).toBe(true);
    for (const value of [
      origin + "/",
      origin + "/path",
      "https://example.org",
      "http://0.0.0.0:3000",
      "http://user:pass@localhost:3000",
    ])
      expect(appOriginSchema.safeParse(value).success).toBe(false);
  });
});
