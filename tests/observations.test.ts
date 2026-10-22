import { randomUUID } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { ObservationStore } from "@/features/observation/store";
import { eventSchema, scopeSchema } from "@/features/observation/protocol";
import type { ObservationEvent } from "@/features/observation/protocol";

const app = "http://127.0.0.1:3000";
const site = "https://example.com";
const extensionId = "nabinfdlobegbkgehppcipkhbddjbdka";
const scope = {
  allSites: false,
  origins: [site],
  policy: "local-observation-v1" as const,
};
const cleanup: Array<() => void> = [];
afterEach(() => {
  for (const fn of cleanup.splice(0).reverse()) fn();
});
function setup() {
  let now = Date.now();
  const directory = mkdtempSync(path.join(tmpdir(), "reentry-observations-"));
  cleanup.push(() => rmSync(directory, { recursive: true, force: true }));
  const filename = path.join(directory, "agent.sqlite");
  let store = new ObservationStore(filename, () => now);
  cleanup.push(() => store.close());
  const pair = store.pair(store.challenge(), extensionId);
  const session = store.setSession(pair.deviceId, scope, false, app).session;
  const event: ObservationEvent = {
    version: 1,
    eventId: randomUUID(),
    sessionId: session.id,
    deviceId: pair.deviceId,
    observedAt: new Date(now).toISOString(),
    reason: "navigation",
    page: {
      origin: site,
      title: "Fictional application",
      content: "Attach transcript",
      pageKey: "c".repeat(64),
      fields: [{ label: "Essay", present: false }],
    },
  };
  return {
    get store() {
      return store;
    },
    pair,
    event,
    advance(ms: number) {
      now += ms;
    },
    restart() {
      store.close();
      store = new ObservationStore(filename, () => now);
    },
  };
}
describe("local observation authority", () => {
  it("does not extend text retention when an old queued observation is delivered later", () => {
    const s = setup();
    s.advance(86_399_000);
    s.store.accept(s.pair.deviceId, s.event, app);
    expect(s.store.dashboard().observations).toHaveLength(1);
    s.advance(1001);
    expect(s.store.dashboard().observations).toEqual([]);
  });
  it("retains only the newest thousand observations without losing durable dedup receipts", () => {
    const s = setup();
    for (let n = 0; n < 1002; n++)
      s.store.accept(
        s.pair.deviceId,
        { ...s.event, eventId: randomUUID() },
        app,
      );
    expect(
      s.store.db.prepare("SELECT COUNT(*) AS n FROM observations").get(),
    ).toEqual({ n: 1000 });
    expect(
      s.store.db
        .prepare("SELECT COUNT(*) AS n FROM observation_receipts")
        .get(),
    ).toEqual({ n: 1002 });
  });
  it("pairs once, expires challenges and invalidates previous devices on replacement", () => {
    const s = setup();
    const c = s.store.challenge();
    s.advance(120_001);
    expect(() => s.store.pair(c, extensionId)).toThrow("Connect");
    const c2 = s.store.challenge();
    s.store.pair(c2, extensionId);
    expect(() => s.store.pair(c2, extensionId)).toThrow("Connect");
    expect(() => s.store.accept(s.pair.deviceId, s.event, app)).toThrow(
      "Connect",
    );
  });
  it("persists acknowledgement/deduplication across reopen and rejects changed event IDs", () => {
    const s = setup();
    expect(s.store.accept(s.pair.deviceId, s.event, app)).toMatchObject({
      duplicate: false,
    });
    s.restart();
    expect(s.store.accept(s.pair.deviceId, s.event, app)).toMatchObject({
      duplicate: true,
    });
    expect(s.store.dashboard().observations).toEqual([s.event]);
    expect(() =>
      s.store.accept(
        s.pair.deviceId,
        { ...s.event, page: { ...s.event.page, content: "Changed" } },
        app,
      ),
    ).toThrow("already used");
  });
  it("rejects cross-device, stale sessions, paused delivery, denied origins and clock replay", () => {
    const s = setup();
    for (const event of [
      { ...s.event, deviceId: randomUUID() },
      { ...s.event, sessionId: randomUUID() },
      { ...s.event, page: { ...s.event.page, origin: app } },
      { ...s.event, page: { ...s.event.page, origin: `${site}:443` } },
      { ...s.event, observedAt: new Date(Date.now() + 120_000).toISOString() },
      {
        ...s.event,
        observedAt: new Date(Date.now() - 86_410_000).toISOString(),
      },
    ])
      expect(() => s.store.accept(s.pair.deviceId, event, app)).toThrow();
    s.store.pause();
    expect(() => s.store.accept(s.pair.deviceId, s.event, app)).toThrow(
      "no longer permitted",
    );
    const resumed = s.store.setSession(s.pair.deviceId, scope, false, app);
    expect(resumed.session.id).not.toBe(s.event.sessionId);
    expect(() => s.store.accept(s.pair.deviceId, s.event, app)).toThrow(
      "no longer permitted",
    );
    expect(s.store.dashboard().observations).toHaveLength(0);
  });
  it("rolls back the receipt when persistence fails, so retry can commit once", () => {
    const s = setup();
    s.store.db.exec(
      "CREATE TRIGGER fail_observation BEFORE INSERT ON observations BEGIN SELECT RAISE(ABORT, 'test write failure'); END;",
    );
    expect(() => s.store.accept(s.pair.deviceId, s.event, app)).toThrow(
      "test write failure",
    );
    expect(
      s.store.db
        .prepare("SELECT COUNT(*) AS n FROM observation_receipts")
        .get(),
    ).toEqual({ n: 0 });
    s.store.db.exec("DROP TRIGGER fail_observation");
    expect(s.store.accept(s.pair.deviceId, s.event, app)).toMatchObject({
      duplicate: false,
    });
  });
  it("clears text and revokes delayed requests without task resurrection", () => {
    const s = setup();
    s.store.accept(s.pair.deviceId, s.event, app);
    s.store.clear();
    s.restart();
    expect(s.store.dashboard()).toMatchObject({
      paired: false,
      observations: [],
    });
    expect(() => s.store.accept(s.pair.deviceId, s.event, app)).toThrow(
      "Connect",
    );
    expect(
      s.store.db
        .prepare("SELECT COUNT(*) AS n FROM observation_receipts")
        .get(),
    ).toEqual({ n: 1 });
  });
  it("expires observed text while retaining receipts beyond the delivery window", () => {
    const s = setup();
    s.store.accept(s.pair.deviceId, s.event, app);
    s.advance(86_400_001);
    expect(s.store.dashboard().observations).toEqual([]);
    expect(() => s.store.accept(s.pair.deviceId, s.event, app)).toThrow(
      "expired",
    );
    expect(
      s.store.db
        .prepare("SELECT COUNT(*) AS n FROM observation_receipts")
        .get(),
    ).toEqual({ n: 1 });
  });
  it("requires the bound bearer token and rejects arbitrary website origins", () => {
    const s = setup();
    const req = (origin?: string, token = s.pair.token) =>
      new Request(`${app}/api/agent/device`, {
        headers: {
          "x-reentry-device": s.pair.deviceId,
          "x-reentry-extension": extensionId,
          authorization: `Bearer ${token}`,
          ...(origin ? { origin } : {}),
        },
      });
    expect(s.store.authenticate(req())).toBe(s.pair.deviceId);
    expect(s.store.authenticate(req(`chrome-extension://${extensionId}`))).toBe(
      s.pair.deviceId,
    );
    expect(() => s.store.authenticate(req(site))).toThrow("Connect");
    expect(() => s.store.authenticate(req(undefined, "b".repeat(64)))).toThrow(
      "Connect",
    );
    expect(() => s.store.authenticate(new Request(app))).toThrow("Connect");
  });
  it("rejects loose scope URLs, overlong content, raw answers and unexpected fields", () => {
    const s = setup();
    expect(
      scopeSchema.safeParse({ ...scope, origins: [site + "/path"] }).success,
    ).toBe(false);
    expect(
      eventSchema.safeParse({
        ...s.event,
        page: { ...s.event.page, content: "x".repeat(8001) },
      }).success,
    ).toBe(false);
    expect(
      eventSchema.safeParse({
        ...s.event,
        page: {
          ...s.event.page,
          fields: [{ label: "Essay", present: true, value: "private" }],
        },
      }).success,
    ).toBe(false);
  });
});
