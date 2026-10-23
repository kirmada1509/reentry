import { afterEach, beforeEach, expect, it, vi } from "vitest";
const fake = vi.hoisted(() => ({
  browser: {
    permissions: {
      contains: vi.fn(),
      onRemoved: { addListener: vi.fn() },
      onAdded: { addListener: vi.fn() },
    },
    windows: {
      getLastFocused: vi.fn(),
      onFocusChanged: { addListener: vi.fn() },
    },
    tabs: {
      query: vi.fn(),
      create: vi.fn(),
      onActivated: { addListener: vi.fn() },
      onRemoved: { addListener: vi.fn() },
      onUpdated: { addListener: vi.fn() },
    },
    idle: { queryState: vi.fn() },
    notifications: {
      getPermissionLevel: vi.fn(),
      getAll: vi.fn(),
      create: vi.fn(),
      clear: vi.fn(),
      onClicked: { addListener: vi.fn(), hasListener: vi.fn() },
    },
    alarms: {
      get: vi.fn(),
      create: vi.fn(),
      onAlarm: { addListener: vi.fn() },
    },
    storage: { local: { get: vi.fn(), set: vi.fn() } },
    runtime: { getURL: vi.fn() },
  },
}));
vi.mock("wxt/browser", () => ({ browser: fake.browser }));
import {
  startRecoveryRuntime,
  recoveryAlarm,
} from "../extension/lib/recovery-runtime";
import type { AgentState } from "../extension/lib/observation-state";
const id = "reentry-return-" + "a".repeat(64);
const sessionId = "12345678-1234-4234-8234-123456789abc";
let ledger: Record<string, unknown>;
const state = (): AgentState => ({
  pairing: {
    deviceId: "12345678-1234-4234-8234-123456789abd",
    token: "b".repeat(64),
  },
  challenge: null,
  session: {
    id: sessionId,
    scope: {
      allSites: false,
      origins: ["https://application.example"],
      policy: "local-observation-v1",
    },
    paused: false,
  },
  halted: false,
  queue: [],
  dropped: 0,
  lastDelivered: null,
  problem: "none",
});
beforeEach(() => {
  vi.resetAllMocks();
  ledger = {};
  fake.browser.permissions.contains.mockResolvedValue(true);
  fake.browser.notifications.getPermissionLevel.mockResolvedValue("granted");
  fake.browser.notifications.getAll.mockResolvedValue({});
  fake.browser.notifications.create.mockResolvedValue(id);
  fake.browser.notifications.clear.mockResolvedValue(true);
  fake.browser.windows.getLastFocused.mockResolvedValue({ focused: true });
  fake.browser.tabs.query.mockResolvedValue([
    { url: "https://application.example/application?private=yes#private" },
  ]);
  fake.browser.idle.queryState.mockResolvedValue("active");
  fake.browser.alarms.get.mockResolvedValue(undefined);
  fake.browser.alarms.create.mockResolvedValue(undefined);
  fake.browser.storage.local.get.mockImplementation(async () => ledger);
  fake.browser.storage.local.set.mockImplementation(async (value) => {
    ledger = { ...ledger, ...value };
  });
  fake.browser.runtime.getURL.mockImplementation(
    (path) => "chrome-extension://fixture" + path,
  );
});
afterEach(() => vi.restoreAllMocks());
async function setup(
  reply: unknown = { notification: { id }, activeIds: [id] },
  readState = vi.fn(async () => state()),
) {
  const post = vi.fn(async (input: unknown) => {
    const request = input as { action: string };
    return request.action === "recovery_tick"
      ? reply
      : request.action === "notification_check"
        ? { allowed: true }
        : { acknowledged: true };
  });
  const runtime = startRecoveryRuntime({
    appOrigin: "http://127.0.0.1:3000",
    iconUrl: "chrome-extension://fixture/return.png",
    readState,
    post,
    permitted: vi.fn(async () => true),
  });
  await runtime.tick();
  await Promise.resolve();
  return { runtime, post, readState };
}
it("persists an attempt before notifying and does not repeat a duplicate claim after a worker restart", async () => {
  const { post } = await setup();
  expect(fake.browser.notifications.create).toHaveBeenCalledTimes(1);
  expect(
    fake.browser.notifications.create.mock.invocationCallOrder[0],
  ).toBeGreaterThan(
    fake.browser.storage.local.set.mock.invocationCallOrder[0]!,
  );
  expect(post).toHaveBeenCalledWith(
    expect.objectContaining({
      action: "recovery_tick",
      tick: expect.objectContaining({
        current: expect.objectContaining({
          url: "https://application.example/application",
        }),
      }),
    }),
    expect.anything(),
  );
  await setup();
  expect(fake.browser.notifications.create).toHaveBeenCalledTimes(1);
  expect(fake.browser.alarms.create).toHaveBeenCalledWith(recoveryAlarm, {
    periodInMinutes: 1,
  });
});
it("a failed durable ledger write prevents the external notification and records delivery failure", async () => {
  fake.browser.storage.local.set.mockRejectedValue(new Error("disk full"));
  const { post } = await setup();
  expect(fake.browser.notifications.create).not.toHaveBeenCalled();
  expect(post).toHaveBeenCalledWith(
    { action: "notification_result", delivery: { id, result: "failed" } },
    expect.anything(),
  );
});
it("clears stale notifications on cancellation or local-server failure", async () => {
  fake.browser.notifications.getAll.mockResolvedValue({
    [id]: true,
    "other-extension-note": true,
  });
  const { runtime, post } = await setup({ notification: null, activeIds: [] });
  expect(fake.browser.notifications.clear).toHaveBeenCalledWith(id);
  expect(fake.browser.notifications.clear).not.toHaveBeenCalledWith(
    "other-extension-note",
  );
  fake.browser.notifications.clear.mockClear();
  post.mockRejectedValue(new Error("offline"));
  await runtime.tick();
  expect(fake.browser.notifications.clear).toHaveBeenCalledWith(id);
});
it("checks cancellation again immediately before the OS effect", async () => {
  const { runtime, post } = await setup({ notification: null, activeIds: [] });
  post.mockImplementation(async (input: unknown) =>
    (input as { action: string }).action === "recovery_tick"
      ? { notification: { id }, activeIds: [id] }
      : { allowed: false },
  );
  await runtime.tick();
  expect(fake.browser.notifications.create).not.toHaveBeenCalled();
  expect(post).toHaveBeenCalledWith(
    { action: "notification_result", delivery: { id, result: "cancelled" } },
    expect.anything(),
  );
});
it("an acknowledgement outage does not misreport an already-created notification as failed", async () => {
  const { runtime, post } = await setup({ notification: null, activeIds: [] });
  post.mockImplementation(async (input: unknown) => {
    const request = input as { action: string; delivery?: { result: string } };
    if (request.action === "recovery_tick")
      return { notification: { id }, activeIds: [id] };
    if (request.action === "notification_check") return { allowed: true };
    throw new Error("ack lost");
  });
  await runtime.tick();
  expect(fake.browser.notifications.create).toHaveBeenCalledTimes(1);
  expect(post).not.toHaveBeenCalledWith(
    { action: "notification_result", delivery: { id, result: "failed" } },
    expect.anything(),
  );
});
it("does not mark idle, unfocused or incognito browsing as active work", async () => {
  fake.browser.idle.queryState.mockResolvedValue("locked");
  const { runtime, post } = await setup({ notification: null, activeIds: [] });
  expect(post).toHaveBeenLastCalledWith(
    expect.objectContaining({
      tick: expect.objectContaining({ current: null }),
    }),
    expect.anything(),
  );
  fake.browser.idle.queryState.mockResolvedValue("active");
  fake.browser.windows.getLastFocused.mockResolvedValue({ focused: false });
  await runtime.tick();
  expect(post).toHaveBeenLastCalledWith(
    expect.objectContaining({
      tick: expect.objectContaining({ current: null }),
    }),
    expect.anything(),
  );
  fake.browser.windows.getLastFocused.mockResolvedValue({ focused: true });
  fake.browser.tabs.query.mockResolvedValue([
    { incognito: true, url: "https://application.example/application" },
  ]);
  await runtime.tick();
  expect(post).toHaveBeenLastCalledWith(
    expect.objectContaining({
      tick: expect.objectContaining({ current: null }),
    }),
    expect.anything(),
  );
});
it("uses a generic notification without exposing goal, site, form answers or next-action text", async () => {
  await setup();
  const options = fake.browser.notifications.create.mock.calls[0]![1];
  expect(options).toMatchObject({
    title: "Your work is still here",
    message: "Open ReEntry for your last progress and a gentle next step.",
  });
  expect(JSON.stringify(options)).not.toContain("application.example");
});

it("starts normally when Chrome omits the ungranted optional notifications and idle namespaces", async () => {
  const notifications = fake.browser.notifications,
    idle = fake.browser.idle;
  fake.browser.permissions.contains.mockResolvedValue(false);
  Object.defineProperty(fake.browser, "notifications", {
    value: undefined,
    writable: true,
    configurable: true,
  });
  Object.defineProperty(fake.browser, "idle", {
    value: undefined,
    writable: true,
    configurable: true,
  });
  try {
    const { post } = await setup({ notification: null, activeIds: [] });
    expect(post).toHaveBeenCalledWith(
      expect.objectContaining({
        tick: expect.objectContaining({ notificationsReady: false }),
      }),
      expect.anything(),
    );
  } finally {
    Object.defineProperty(fake.browser, "notifications", {
      value: notifications,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(fake.browser, "idle", {
      value: idle,
      writable: true,
      configurable: true,
    });
  }
});
