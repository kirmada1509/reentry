import { createHash, randomUUID } from "node:crypto";
import { afterEach, expect, it } from "vitest";
import { ObservationStore } from "@/features/observation/store";
import { taskSchema } from "@/features/agent/schema";
import {
  defaultReminderPolicy,
  localTime,
  recoveryTickSchema,
  workLink,
} from "@/features/agent/recovery-schema";
import type { RecoveryTick } from "@/features/agent/recovery-schema";

const close: Array<() => void> = [];
afterEach(() => close.splice(0).forEach((f) => f()));
const app = "http://127.0.0.1:3000",
  site = "https://application.example",
  url = site + "/application";
const pageKey = createHash("sha256").update("/application").digest("hex");
const processing = {
  provider: "test",
  model: "fixture",
  hosted: false,
  available: true,
  consentId: "c".repeat(64),
};
function setup(start = "2026-10-23T10:00:00.000Z") {
  let now = Date.parse(start);
  const store = new ObservationStore(":memory:", () => now);
  close.push(() => store.close());
  const device = store.pair(
    store.challenge(),
    "nabinfdlobegbkgehppcipkhbddjbdka",
  );
  const session = store.setSession(
    device.deviceId,
    { allSites: false, origins: [site], policy: "local-observation-v1" },
    false,
    app,
  ).session;
  store.agent.action(
    {
      action: "enable",
      sessionId: session.id,
      consentId: processing.consentId,
    },
    processing,
  );
  const task = taskSchema.parse({
    id: randomUUID(),
    revision: 1,
    origin: site,
    goal: "Complete the fictional application",
    intent: "application",
    finishCondition: "Matching application confirmation",
    stage: "ongoing",
    nextAction: "Add the remaining referee",
    evidence: [{ eventId: randomUUID(), quote: "Application draft saved" }],
    corrected: false,
    dismissed: false,
    updatedAt: new Date(now).toISOString(),
  });
  store.db
    .prepare("INSERT INTO agent_tasks VALUES(?,?)")
    .run(task.id, JSON.stringify(task));
  store.db
    .prepare("INSERT INTO agent_task_pages VALUES(?,?,?)")
    .run(task.id, site, pageKey);
  const recovery = store.agent.recovery;
  const policy = (change: Partial<typeof defaultReminderPolicy> = {}) =>
    recovery.configure(
      {
        ...defaultReminderPolicy,
        enabled: true,
        quietEnabled: false,
        ...change,
      },
      recovery.policy().version,
    );
  const tick = (
    current: RecoveryTick["current"] = null,
    notificationsReady = true,
    processingAllowed = true,
  ) =>
    recovery.tick(
      device.deviceId,
      {
        sessionId: session.id,
        observedAt: new Date(now).toISOString(),
        current,
        notificationsReady,
      },
      processingAllowed,
    );
  const change = (action: "wait" | "resume" | "mute" | "unmute" | "snooze") =>
    store.agent.action(
      {
        action: "recovery",
        id: task.id,
        expectedRevision: store.agent.tasks()[0]!.revision,
        change: action,
      },
      processing,
    );
  return {
    store,
    device,
    session,
    task,
    recovery,
    policy,
    tick,
    change,
    advance: (ms: number) => {
      now += ms;
    },
    setTime: (s: string) => {
      now = Date.parse(s);
    },
    get now() {
      return now;
    },
  };
}
it("does not remind by default or during brief tab switches; reserves only once per task/day", () => {
  const s = setup();
  s.tick({ url, pageKey });
  s.advance(45 * 60_000);
  expect(s.tick().notification).toBeNull();
  s.policy();
  s.tick({ url, pageKey });
  s.advance(44 * 60_000 + 59_999);
  expect(s.tick().notification).toBeNull();
  s.advance(1);
  const first = s.tick().notification!;
  expect(first).not.toBeNull();
  s.recovery.acknowledge(first.id, "delivered");
  expect(s.tick()).toEqual({ notification: null, activeIds: [first.id] });
  s.advance(60 * 60_000);
  expect(s.tick().notification).toBeNull();
  s.setTime("2026-10-24T10:00:00.000Z");
  expect(s.tick().notification?.id).not.toBe(first.id);
});
it("keeps safe return links and a short interrupted/returned recovery state without changing task revisions", () => {
  const s = setup();
  s.tick({ url, pageKey });
  s.advance(45 * 60_000);
  expect(s.recovery.view().items[0]).toMatchObject({
    state: "interrupted",
    url,
  });
  s.tick({ url, pageKey });
  expect(s.recovery.view().items[0]!.state).toBe("returned");
  expect(s.store.agent.tasks()[0]!.revision).toBe(1);
  s.advance(5 * 60_000);
  expect(s.recovery.view().items[0]!.state).toBe("away");
});
it("honours timezone, overnight/daytime quiet hours and DST calendar days", () => {
  const s = setup("2026-10-23T18:00:00Z");
  s.policy({ quietEnabled: true, timeZone: "Asia/Kolkata" });
  s.advance(45 * 60_000);
  expect(s.tick().notification).toBeNull();
  s.setTime("2026-10-24T02:29:59Z");
  expect(s.tick().notification).toBeNull();
  s.advance(1000);
  expect(s.tick().notification).not.toBeNull();
  const p = { ...defaultReminderPolicy, timeZone: "America/New_York" };
  expect(localTime(Date.parse("2026-11-01T05:30:00Z"), p)).toEqual(
    localTime(Date.parse("2026-11-01T06:30:00Z"), p),
  );
  expect(
    localTime(Date.parse("2026-10-23T10:00:00Z"), {
      ...p,
      timeZone: "UTC",
      quietStart: 9 * 60,
      quietEnd: 17 * 60,
    }).quiet,
  ).toBe(true);
});
it("waiting, snooze and cancellation persist independently of page updates; resume restarts away timer", () => {
  const s = setup();
  s.policy();
  s.change("wait");
  s.advance(46 * 60_000);
  expect(s.tick().notification).toBeNull();
  s.tick({ url, pageKey });
  expect(s.recovery.view().items[0]!.state).toBe("waiting");
  s.change("resume");
  s.advance(46 * 60_000);
  s.change("snooze");
  expect(s.tick().notification).toBeNull();
  s.advance(60 * 60_000);
  s.change("mute");
  expect(s.tick().notification).toBeNull();
  s.change("unmute");
  expect(s.tick().notification).not.toBeNull();
});
it.each(["finish", "dismiss", "delete"] as const)(
  "%s cancels stale reminders and deleting removes recovery records",
  (action) => {
    const s = setup();
    s.policy();
    s.advance(46 * 60_000);
    expect(s.tick().notification).not.toBeNull();
    s.store.agent.action(
      { action, id: s.task.id, expectedRevision: 1 },
      processing,
    );
    expect(s.tick()).toEqual({ notification: null, activeIds: [] });
    if (action === "delete") {
      expect(s.store.db.prepare("SELECT * FROM agent_recovery").all()).toEqual(
        [],
      );
      expect(s.store.db.prepare("SELECT * FROM agent_reminders").all()).toEqual(
        [],
      );
    }
  },
);
it("does not nag speculative research, completed tasks or cancelled tasks", () => {
  for (const patch of [
    { stage: "candidate", intent: "research" },
    { stage: "ongoing", intent: "research" },
    { stage: "completed" },
    { stage: "cancelled" },
  ]) {
    const s = setup();
    s.policy();
    s.store.db
      .prepare("UPDATE agent_tasks SET body=?")
      .run(JSON.stringify({ ...s.task, ...patch }));
    s.advance(46 * 60_000);
    expect(s.tick().notification).toBeNull();
  }
});
it("pause, revoked pairing, missing permission and changed processing consent cannot deliver", () => {
  const s = setup();
  s.policy();
  s.advance(46 * 60_000);
  expect(s.tick(null, false).notification).toBeNull();
  expect(s.tick(null, true, false).notification).toBeNull();
  s.store.agent.stop();
  expect(s.tick().notification).toBeNull();
  s.store.pair(s.store.challenge(), "nabinfdlobegbkgehppcipkhbddjbdka");
  expect(s.tick().notification).toBeNull();
});
it("rejects stale/out-of-scope/forged presence and strips credentials, query strings and fragments from work links", () => {
  const s = setup();
  expect(() =>
    s.recovery.tick(
      s.device.deviceId,
      {
        sessionId: s.session.id,
        observedAt: new Date(s.now - 60_001).toISOString(),
        current: null,
        notificationsReady: true,
      },
      true,
    ),
  ).toThrow("Refresh");
  expect(() => s.tick({ url: site + "/other", pageKey })).toThrow("Refresh");
  expect(() =>
    s.tick({ url: "https://outside.example/application", pageKey }),
  ).toThrow("not enabled");
  expect(workLink(url + "?token=private#secret")).toBe(url);
  expect(workLink("https://name:password@example.com/secret")).toBeNull();
  expect(workLink("javascript:alert(1)")).toBeNull();
  expect(
    recoveryTickSchema.safeParse({
      sessionId: s.session.id,
      observedAt: new Date(s.now).toISOString(),
      current: { url: url + "?token=private", pageKey },
      notificationsReady: true,
    }).success,
  ).toBe(false);
});
it("a failed durable reservation rolls back and never acknowledges a notification", () => {
  const s = setup();
  s.policy();
  s.advance(46 * 60_000);
  s.store.db.exec(
    "CREATE TRIGGER reject_reminder BEFORE INSERT ON agent_reminders BEGIN SELECT RAISE(ABORT,'disk full'); END",
  );
  expect(() => s.tick()).toThrow("disk full");
  expect(s.store.db.prepare("SELECT * FROM agent_reminders").all()).toEqual([]);
  s.store.db.exec("DROP TRIGGER reject_reminder");
  expect(s.tick().notification).not.toBeNull();
});
it("does not resend ambiguous/failed attempts after restart and surfaces failure; clear resets policy/data", () => {
  const s = setup();
  s.policy();
  s.advance(46 * 60_000);
  const id = s.tick().notification!.id;
  // A fresh store over the same durable database represents a worker restart.
  const Restart = s.recovery
    .constructor as typeof import("@/features/agent/recovery-store").RecoveryStore;
  const restarted = new Restart(
    s.store.db,
    () => s.now,
    () => s.store.agent.tasks(),
  );
  expect(
    restarted.tick(
      s.device.deviceId,
      {
        sessionId: s.session.id,
        observedAt: new Date(s.now).toISOString(),
        current: null,
        notificationsReady: true,
      },
      true,
    ).notification,
  ).toBeNull();
  restarted.acknowledge(id, "failed");
  restarted.acknowledge(id, "delivered");
  expect(restarted.view().deliveryFailed).toBe(true);
  expect(s.tick().notification).toBeNull();
  s.store.clear();
  expect(s.recovery.policy().policy.enabled).toBe(false);
  expect(s.store.db.prepare("SELECT * FROM agent_reminders").all()).toEqual([]);
});
it("rejects conflicting settings and task actions while keeping existing settings", () => {
  const s = setup();
  s.policy();
  expect(() => s.recovery.configure(defaultReminderPolicy, 0)).toThrow(
    "settings changed",
  );
  expect(s.recovery.policy().policy.enabled).toBe(true);
  expect(() =>
    s.store.agent.action(
      {
        action: "recovery",
        id: s.task.id,
        expectedRevision: 2,
        change: "wait",
      },
      processing,
    ),
  ).toThrow("task changed");
});

it("rechecks current durable task/session/policy state immediately before a reserved delivery", () => {
  const s = setup();
  s.policy();
  s.advance(46 * 60_000);
  const id = s.tick().notification!.id;
  expect(s.recovery.mayDeliver(id, s.device.deviceId, s.session.id, true)).toBe(
    true,
  );
  s.change("wait");
  expect(s.recovery.mayDeliver(id, s.device.deviceId, s.session.id, true)).toBe(
    false,
  );
  s.change("resume");
  s.advance(46 * 60_000);
  expect(s.recovery.mayDeliver(id, s.device.deviceId, s.session.id, true)).toBe(
    true,
  );
  s.store.agent.action(
    { action: "delete", id: s.task.id, expectedRevision: 1 },
    processing,
  );
  expect(s.recovery.mayDeliver(id, s.device.deviceId, s.session.id, true)).toBe(
    false,
  );
  expect(s.recovery.view().items).toEqual([]);
  expect(s.tick()).toEqual({ notification: null, activeIds: [] });
});

it("retains a bounded pending work link when the user leaves before AI task discovery finishes", () => {
  const s = setup();
  s.store.db.prepare("DELETE FROM agent_tasks").run();
  s.store.db.prepare("DELETE FROM agent_task_pages").run();
  s.tick({ url, pageKey });
  s.advance(20_000);
  s.tick();
  s.store.db
    .prepare("INSERT INTO agent_tasks VALUES(?,?)")
    .run(s.task.id, JSON.stringify(s.task));
  s.store.db
    .prepare("INSERT INTO agent_task_pages VALUES(?,?,?)")
    .run(s.task.id, site, pageKey);
  s.recovery.capture(s.task, {
    version: 1,
    eventId: randomUUID(),
    deviceId: s.device.deviceId,
    sessionId: s.session.id,
    observedAt: new Date(s.now - 20_000).toISOString(),
    reason: "navigation",
    page: {
      origin: site,
      title: "Application",
      content: "Application draft saved",
      fields: [],
      pageKey,
    },
  });
  expect(s.recovery.view().items[0]!.url).toBe(url);
  s.store.agent.action(
    { action: "delete", id: s.task.id, expectedRevision: 1 },
    processing,
  );
  expect(s.store.db.prepare("SELECT * FROM agent_work_pages").all()).toEqual(
    [],
  );
});
