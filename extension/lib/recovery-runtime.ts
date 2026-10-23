import { z } from "zod";
import { browser } from "wxt/browser";
import type { AgentState } from "./observation-state";
import {
  recoveryDeliverySchema,
  workLink,
} from "../../src/features/agent/recovery-schema";

const PREFIX = "reentry-return-";
const LEDGER = "reentry-notification-attempts-v1";
export const recoveryAlarm = "reentry-return-check";

export function startRecoveryRuntime(options: {
  appOrigin: string;
  iconUrl: string;
  readState: () => Promise<AgentState>;
  post: (input: unknown, pairing: AgentState["pairing"]) => Promise<unknown>;
  permitted: (origin: string, state: AgentState) => Promise<boolean>;
}) {
  let ticking: Promise<void> | null = null;
  async function ready() {
    return (
      (await browser.permissions.contains({
        permissions: ["notifications", "idle"],
      })) && (await browser.notifications.getPermissionLevel()) === "granted"
    );
  }
  async function clearExcept(active: string[]) {
    if (
      !(await browser.permissions.contains({ permissions: ["notifications"] }))
    )
      return;
    const shown = await browser.notifications.getAll();
    for (const id of Object.keys(shown))
      if (id.startsWith(PREFIX) && !active.includes(id))
        await browser.notifications.clear(id);
  }
  async function sample(state: AgentState) {
    if (!state.session || state.halted || state.session.paused) return null;
    const focused = await browser.windows.getLastFocused();
    if (!focused.focused) return null;
    if (
      (await browser.permissions.contains({ permissions: ["idle"] })) &&
      (await browser.idle.queryState(60)) !== "active"
    )
      return null;
    const [tab] = await browser.tabs.query({
      active: true,
      lastFocusedWindow: true,
    });
    if (!tab?.url || tab.incognito) return null;
    const url = workLink(tab.url);
    if (
      !url ||
      url.length > 2000 ||
      !(await options.permitted(new URL(url).origin, state))
    )
      return null;
    const pageKey = Array.from(
      new Uint8Array(
        await crypto.subtle.digest(
          "SHA-256",
          new TextEncoder().encode(new URL(url).pathname),
        ),
      ),
    )
      .map((n) => n.toString(16).padStart(2, "0"))
      .join("");
    return { url, pageKey };
  }
  async function run() {
    try {
      const state = await options.readState();
      if (!state.pairing) {
        await clearExcept([]);
        return;
      }
      const result = recoveryDeliverySchema.parse(
        await options.post(
          {
            action: "recovery_tick",
            tick: {
              sessionId: state.session?.id ?? null,
              observedAt: new Date().toISOString(),
              current: await sample(state),
              notificationsReady: !state.halted && (await ready()),
            },
          },
          state.pairing,
        ),
      );
      await clearExcept(result.activeIds);
      if (!result.notification) return;
      const { id } = result.notification;
      try {
        const saved = await browser.storage.local.get(LEDGER);
        const ledger = (saved[LEDGER] ?? {}) as Record<string, number>;
        if (ledger[id]) return;
        const retained = Object.fromEntries(
          Object.entries(ledger).filter(
            ([, at]) => at > Date.now() - 32 * 86_400_000,
          ),
        );
        if (Object.keys(retained).length >= 4000)
          throw new Error("Notification ledger full.");
        // A failed durable write must never be followed by an OS notification.
        await browser.storage.local.set({
          [LEDGER]: { ...retained, [id]: Date.now() },
        });
        const latest = await options.readState();
        if (
          !latest.session ||
          !latest.pairing ||
          latest.pairing.deviceId !== state.pairing.deviceId ||
          latest.halted ||
          latest.session?.id !== state.session?.id ||
          !(await ready())
        ) {
          await options
            .post(
              {
                action: "notification_result",
                delivery: { id, result: "cancelled" },
              },
              state.pairing,
            )
            .catch(() => undefined);
          return;
        }
        const check = z.strictObject({ allowed: z.boolean() }).parse(
          await options.post(
            {
              action: "notification_check",
              id,
              sessionId: latest.session.id,
            },
            latest.pairing,
          ),
        );
        if (!check.allowed) {
          await options.post(
            {
              action: "notification_result",
              delivery: { id, result: "cancelled" },
            },
            latest.pairing,
          );
          return;
        }
        await browser.notifications.create(id, {
          type: "basic",
          iconUrl: options.iconUrl,
          title: "Your work is still here",
          message:
            "Open ReEntry for your last progress and a gentle next step.",
          priority: 0,
        });
        await options
          .post(
            {
              action: "notification_result",
              delivery: { id, result: "delivered" },
            },
            state.pairing,
          )
          .catch(() => undefined);
      } catch {
        await options
          .post(
            {
              action: "notification_result",
              delivery: { id, result: "failed" },
            },
            state.pairing,
          )
          .catch(() => undefined);
      }
    } catch {
      // Offline, revoked or invalid state cannot leave a stale visible reminder.
      await clearExcept([]).catch(() => undefined);
    }
  }
  function tick() {
    if (!ticking)
      ticking = run().finally(() => {
        ticking = null;
      });
    return ticking;
  }
  browser.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === recoveryAlarm) void tick();
  });
  browser.tabs.onActivated.addListener(() => {
    void tick();
  });
  browser.tabs.onRemoved.addListener(() => {
    void tick();
  });
  browser.tabs.onUpdated.addListener((_id, change) => {
    if (change.status === "complete" || change.url) void tick();
  });
  browser.windows.onFocusChanged.addListener(() => {
    void tick();
  });
  browser.permissions.onRemoved.addListener(() => {
    void tick();
  });
  const notificationClicked = (id: string) => {
    if (id.startsWith(PREFIX))
      void browser.tabs
        .create({ url: `${options.appOrigin}/observe` })
        .then(() => browser.notifications.clear(id))
        .catch(() => undefined);
  };
  async function installNotificationListener() {
    // Chrome omits optional API namespaces entirely until permission is granted.
    if (
      await browser.permissions.contains({ permissions: ["notifications"] })
    ) {
      if (!browser.notifications.onClicked.hasListener(notificationClicked))
        browser.notifications.onClicked.addListener(notificationClicked);
    }
  }
  browser.permissions.onAdded.addListener(() => {
    void installNotificationListener()
      .then(tick)
      .catch(() => undefined);
  });
  void installNotificationListener().catch(() => undefined);
  // Alarms can disappear on restart/update. Reconcile on EVERY worker start.
  void browser.alarms
    .get(recoveryAlarm)
    .then((alarm) => {
      if (!alarm)
        return browser.alarms.create(recoveryAlarm, { periodInMinutes: 1 });
    })
    .then(tick)
    .catch(() => undefined);
  return { tick, ready };
}
