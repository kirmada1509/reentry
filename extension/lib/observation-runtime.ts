import { browser } from "wxt/browser";
import { z } from "zod";
import { onMessage } from "./messages";
import { readAgent, updateAgent as persistAgent } from "./observation-state";
import type { AgentState } from "./observation-state";
import {
  eventSchema,
  scopeAllows,
  scopeSchema,
  sessionSchema,
} from "../../src/features/observation/protocol";
import type {
  AgentBridgeRequest,
  CompanionStatus,
  ObservationScope,
} from "../../src/features/observation/protocol";

import {
  agentActionSchema,
  agentHistorySchema,
  historyRequestSchema,
  agentViewSchema,
} from "../../src/features/agent/schema";
import { startRecoveryRuntime } from "./recovery-runtime";
const ALARM = "reentry-observation-delivery";
const SCRIPT = "reentry-observer-v1";
const hostPattern = (origin: string) =>
  `${new URL(origin).protocol}//${new URL(origin).hostname}/*`;
export const permissionPatterns = (scope: ObservationScope) =>
  scope.allSites
    ? ["http://*/*", "https://*/*"]
    : [...new Set(scope.origins.map(hostPattern))];
class DeliveryError extends Error {
  constructor(readonly status: number) {
    super("Local connection failed.");
  }
}

export function startObservationRuntime(appOrigin: string) {
  let volatileStorageFailure = false;
  let localHalt = false;
  let flushing: Promise<void> | null = null;
  let commands: Promise<unknown> = Promise.resolve();
  async function updateAgent<T>(
    change: (state: AgentState) => { state: AgentState; result: T },
  ): Promise<T> {
    try {
      return await persistAgent(change);
    } catch (error) {
      volatileStorageFailure = true;
      localHalt = true;
      throw error;
    }
  }
  function serial<T>(operation: () => Promise<T>) {
    const next = commands.catch(() => undefined).then(operation);
    commands = next;
    return next;
  }
  const companion = (sender: {
    id?: string;
    url?: string;
    frameId?: number;
  }) => {
    if (
      sender.id !== browser.runtime.id ||
      sender.url !== browser.runtime.getURL("/companion.html") ||
      (sender.frameId !== undefined && sender.frameId !== 0)
    )
      throw new Error("Open the ReEntry companion.");
  };
  async function post(input: unknown, pairing?: AgentState["pairing"]) {
    const response = await fetch(`${appOrigin}/api/agent/device`, {
      method: "POST",
      credentials: "omit",
      cache: "no-store",
      signal: AbortSignal.timeout(7000),
      headers: {
        "content-type": "application/json",
        "x-reentry-extension": browser.runtime.id,
        ...(pairing
          ? {
              authorization: `Bearer ${pairing.token}`,
              "x-reentry-device": pairing.deviceId,
            }
          : {}),
      },
      body: JSON.stringify(input),
    });
    if (!response.ok) throw new DeliveryError(response.status);
    return response.json() as Promise<unknown>;
  }
  const recovery = startRecoveryRuntime({
    appOrigin,
    iconUrl: browser.runtime.getURL("/return.png"),
    readState: readAgent,
    post,
    permitted,
  });
  async function markFailure(error: unknown, deviceId?: string) {
    await updateAgent((state) => {
      if (deviceId && state.pairing?.deviceId !== deviceId)
        return { state, result: undefined };
      const revoked = error instanceof DeliveryError && error.status === 401;
      return {
        state: {
          ...state,
          ...(revoked
            ? {
                halted: true,
                pairing: null,
                session: null,
                queue: [],
                dropped: state.dropped + state.queue.length,
              }
            : {}),
          problem: revoked ? "revoked" : "offline",
        },
        result: undefined,
      };
    }).catch(() => {
      volatileStorageFailure = true;
    });
  }
  async function permitted(origin: string, state: AgentState) {
    return Boolean(
      state.pairing &&
      !localHalt &&
      state.session &&
      !state.halted &&
      !state.session.paused &&
      scopeAllows(state.session.scope, origin, appOrigin) &&
      (await browser.permissions.contains({ origins: [hostPattern(origin)] })),
    );
  }
  async function source(
    sender: {
      id?: string;
      url?: string;
      frameId?: number;
      tab?: { id?: number; url?: string };
    },
    state: AgentState,
  ) {
    if (
      sender.id !== browser.runtime.id ||
      !sender.tab?.id ||
      sender.frameId !== 0 ||
      !sender.url
    )
      return null;
    const current = await browser.tabs.get(sender.tab.id).catch(() => null);
    if (
      !current?.url ||
      new URL(current.url).origin !== new URL(sender.url).origin
    )
      return null;
    const origin = new URL(sender.url).origin;
    return (await permitted(origin, state)) ? origin : null;
  }
  async function reconcileScripts() {
    const state = await readAgent();
    await browser.scripting
      .unregisterContentScripts({ ids: [SCRIPT] })
      .catch(() => undefined);
    const enabled =
      state.pairing && state.session && !state.halted && !state.session.paused;
    if (enabled && state.session) {
      const patterns = permissionPatterns(state.session.scope);
      if (await browser.permissions.contains({ origins: patterns })) {
        await browser.scripting.registerContentScripts([
          {
            id: SCRIPT,
            matches: patterns,
            js: ["observer.js"],
            runAt: "document_idle",
            persistAcrossSessions: true,
            allFrames: false,
          },
        ]);
        for (const tab of await browser.tabs.query({})) {
          if (
            tab.id &&
            tab.url &&
            (await permitted(new URL(tab.url).origin, state))
          ) {
            await browser.scripting
              .executeScript({
                target: { tabId: tab.id },
                files: ["/observer.js"],
              })
              .catch(() => undefined);
          }
        }
      } else {
        await updateAgent((s) => ({
          state: { ...s, halted: true, problem: "permission" },
          result: undefined,
        }));
      }
    }
    for (const tab of await browser.tabs.query({}))
      if (tab.id)
        await browser.tabs
          .sendMessage(tab.id, { reentryObserver: "refresh" })
          .catch(() => undefined);
  }
  async function syncAndDeliver() {
    let state = await updateAgent((s) => {
      const queue = s.queue.filter(
        (event) => Date.now() - Date.parse(event.observedAt) <= 86_400_000,
      );
      const next = {
        ...s,
        queue,
        dropped: s.dropped + s.queue.length - queue.length,
      };
      return {
        state: next,
        result: next,
      };
    });
    if (!state.pairing) return;
    const attemptedDevice = state.pairing.deviceId;
    try {
      // Reconcile a local pause/permission loss before any further hosted work.
      if (state.halted || localHalt)
        await post(
          { action: "task_change", change: { action: "disable" } },
          state.pairing,
        );
      const remote = z
        .strictObject({ session: sessionSchema.nullable() })
        .parse(await post({ action: "status" }, state.pairing));
      await updateAgent((s) => {
        if (
          s.pairing?.deviceId !== state.pairing?.deviceId ||
          s.session?.id !== state.session?.id
        )
          return { state: s, result: undefined };
        // A local pause must never be undone by an older server response.
        const paused = !remote.session || remote.session.paused;
        return {
          state: {
            ...s,
            session: remote.session,
            halted: s.halted || paused,
            problem: s.problem === "offline" ? "none" : s.problem,
          },
          result: undefined,
        };
      });
      state = await readAgent();
      if (localHalt || state.halted || !state.session || state.session.paused) {
        await reconcileScripts();
        return;
      }
      for (const event of state.queue) {
        const latest = await readAgent();
        if (
          latest.halted ||
          localHalt ||
          latest.session?.id !== event.sessionId ||
          !latest.pairing
        )
          break;
        try {
          const ack = z
            .strictObject({ accepted: z.uuid(), duplicate: z.boolean() })
            .parse(await post({ action: "event", event }, latest.pairing));
          if (ack.accepted !== event.eventId)
            throw new Error("Invalid acknowledgement.");
          await updateAgent((s) => ({
            state: {
              ...s,
              queue: s.queue.filter((e) => e.eventId !== event.eventId),
              lastDelivered: new Date().toISOString(),
              problem: "none",
            },
            result: undefined,
          }));
        } catch (error) {
          if (
            error instanceof DeliveryError &&
            [400, 409, 413].includes(error.status)
          ) {
            await updateAgent((s) => ({
              state: {
                ...s,
                queue: s.queue.filter((e) => e.eventId !== event.eventId),
                dropped: s.dropped + 1,
              },
              result: undefined,
            }));
          } else throw error;
        }
      }
    } catch (error) {
      await markFailure(error, attemptedDevice);
    }
  }
  function flush() {
    if (!flushing)
      flushing = syncAndDeliver()
        .then(() => recovery.tick())
        .finally(() => {
          flushing = null;
        });
    return flushing;
  }
  async function status(): Promise<CompanionStatus> {
    const state = await readAgent();
    return {
      notificationsReady: await recovery.ready().catch(() => false),
      paired: Boolean(state.pairing),
      session: state.session
        ? {
            ...state.session,
            paused: state.session.paused || state.halted || localHalt,
          }
        : null,
      pending: state.queue.length,
      dropped: state.dropped,
      lastDelivered: state.lastDelivered,
      problem: volatileStorageFailure ? "storage" : state.problem,
      challengeReady: Boolean(
        state.challenge && state.challenge.until > Date.now(),
      ),
    };
  }
  onMessage("agentTasks", async ({ sender }) => {
    companion(sender);
    const state = await readAgent();
    if (!state.pairing) throw new Error("Connect the browser first.");
    return agentViewSchema.parse(
      await post({ action: "tasks" }, state.pairing),
    );
  });
  onMessage("agentTaskHistory", async ({ sender, data }) => {
    companion(sender);
    const state = await readAgent();
    if (!state.pairing) throw new Error("Connect the browser first.");
    return agentHistorySchema.parse(
      await post(
        { action: "task_history", request: historyRequestSchema.parse(data) },
        state.pairing,
      ),
    );
  });
  onMessage("agentTaskChange", async ({ sender, data }) => {
    companion(sender);
    const state = await readAgent();
    if (!state.pairing) throw new Error("Connect the browser first.");
    const result = agentViewSchema.parse(
      await post(
        { action: "task_change", change: agentActionSchema.parse(data) },
        state.pairing,
      ),
    );
    await recovery.tick();
    return result;
  });
  onMessage("agentStatus", async ({ sender }) => {
    companion(sender);
    await flush();
    return status();
  });
  onMessage("agentPair", ({ sender }) =>
    serial(async () => {
      companion(sender);
      const before = await readAgent();
      if (!before.challenge || before.challenge.until < Date.now())
        throw new Error("Start connecting again from ReEntry.");
      const pair = z
        .strictObject({
          deviceId: z.uuid(),
          token: z.string().regex(/^[a-f0-9]{64}$/),
        })
        .parse(
          await post({ action: "pair", challenge: before.challenge.value }),
        );
      await updateAgent((s) => ({
        state: {
          ...s,
          pairing: pair,
          challenge: null,
          session: null,
          halted: true,
          queue: [],
          dropped: s.dropped + s.queue.length,
          problem: "none",
        },
        result: undefined,
      }));
      await reconcileScripts();
      return status();
    }),
  );
  onMessage("agentConfigure", ({ data, sender }) =>
    serial(async () => {
      companion(sender);
      const input = z
        .strictObject({ scope: scopeSchema, paused: z.boolean() })
        .parse(data);
      const { scope, paused } = input;
      if (scope.origins.includes(appOrigin))
        throw new Error("Choose a supported site.");
      const before = await readAgent();
      if (!before.pairing) throw new Error("Connect to ReEntry first.");
      localHalt = true;
      // Stop locally before the network operation, including when the server is down.
      await updateAgent((s) => ({
        state: {
          ...s,
          halted: true,
          session: s.session ? { ...s.session, paused: true } : null,
          queue: [],
          dropped: s.dropped + s.queue.length,
        },
        result: undefined,
      }));
      await reconcileScripts();
      if (
        !paused &&
        !(await browser.permissions.contains({
          origins: permissionPatterns(scope),
        }))
      )
        throw new Error("Allow site access before observing.");
      try {
        const remote = z
          .strictObject({ session: sessionSchema })
          .parse(
            await post({ action: "session", scope, paused }, before.pairing),
          );
        await updateAgent((s) => ({
          state: {
            ...s,
            session: remote.session,
            halted: paused,
            problem: "none",
          },
          result: undefined,
        }));
        localHalt = paused;
        volatileStorageFailure = false;
        await reconcileScripts();
        return status();
      } catch (error) {
        await markFailure(error, before.pairing.deviceId);
        throw new Error(
          "Paused on this browser. The local app is unavailable; reconnect before resuming.",
        );
      }
    }),
  );
  onMessage("agentContext", async ({ sender }) => {
    const state = await readAgent();
    return (await source(sender, state)) && state.pairing && state.session
      ? { deviceId: state.pairing.deviceId, sessionId: state.session.id }
      : null;
  });
  onMessage("agentObserve", async ({ data, sender }) => {
    const parsed = eventSchema.safeParse(data);
    if (!parsed.success) return false;
    const state = await readAgent();
    const origin = await source(sender, state);
    if (
      !origin ||
      origin !== parsed.data.page.origin ||
      state.session?.id !== data.sessionId ||
      state.pairing?.deviceId !== data.deviceId
    )
      return false;
    // MessageSender.url can retain the document's initial path after SPA
    // history navigation. Bind evidence to Chrome's current tab path instead.
    const tab = await browser.tabs.get(sender.tab!.id!).catch(() => null);
    if (!tab?.url || new URL(tab.url).origin !== origin) return false;
    const pageKey = Array.from(
      new Uint8Array(
        await crypto.subtle.digest(
          "SHA-256",
          new TextEncoder().encode(new URL(tab.url).pathname),
        ),
      ),
    )
      .map((n) => n.toString(16).padStart(2, "0"))
      .join("");
    if (pageKey !== parsed.data.page.pageKey) return false;
    try {
      // Browser-owned, session-scoped tab identity survives page navigation and
      // worker suspension. It is never supplied by the website or the model.
      const streamKey = `reentry-stream:${data.sessionId}:${sender.tab!.id!}`;
      const streams = await browser.storage.session.get(streamKey);
      const streamId = streams[streamKey] ?? crypto.randomUUID();
      await browser.storage.session.set({ [streamKey]: streamId });
      parsed.data.streamId = z.uuid().parse(streamId);
      const queued = await updateAgent((s) => {
        if (s.halted || s.session?.id !== data.sessionId)
          return { state: s, result: false };
        const cutoff = Date.now() - 86_400_000;
        const queue = s.queue.filter((e) => Date.parse(e.observedAt) > cutoff);
        const dropped = s.dropped + s.queue.length - queue.length;
        if (
          queue.length >= 100 ||
          new TextEncoder().encode(JSON.stringify([...queue, parsed.data]))
            .length > 1_000_000
        )
          return {
            state: { ...s, queue, dropped: dropped + 1, problem: "capacity" },
            result: false,
          };
        return {
          state: { ...s, queue: [...queue, parsed.data], dropped },
          result: true,
        };
      });
      if (queued) void flush();
      return queued;
    } catch {
      volatileStorageFailure = true;
      return false;
    }
  });
  onMessage("agentReaderFailed", async ({ sender }) => {
    if (await source(sender, await readAgent()))
      await updateAgent((s) => ({
        state: { ...s, problem: "reader" },
        result: undefined,
      }));
  });
  browser.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === ALARM) void flush().catch(() => undefined);
  });
  browser.permissions.onRemoved.addListener(() => {
    void reconcileScripts()
      .then(flush)
      .catch(() => undefined);
  });
  browser.commands.onCommand.addListener((command, tab) => {
    if (command === "open-companion")
      void (
        tab?.id
          ? browser.sidePanel.open({ tabId: tab.id })
          : browser.tabs.create({
              url: browser.runtime.getURL("/companion.html"),
            })
      ).catch(() =>
        browser.tabs.create({
          url: browser.runtime.getURL("/companion.html"),
        }),
      );
  });
  void browser.alarms.create(ALARM, { periodInMinutes: 1 });
  void reconcileScripts()
    .then(flush)
    .catch(() => {
      volatileStorageFailure = true;
    });
  return {
    async bridge(request: AgentBridgeRequest) {
      if (request.type === "agent.pair") {
        await updateAgent((s) => ({
          state: {
            ...s,
            challenge: {
              value: request.challenge,
              until: Date.now() + 120_000,
            },
          },
          result: undefined,
        }));
        await browser.tabs.create({
          url: browser.runtime.getURL("/companion.html"),
        });
      } else if (request.type === "agent.open")
        await browser.tabs.create({
          url: browser.runtime.getURL("/companion.html"),
        });
      else {
        await flush();
        await reconcileScripts();
      }
      return { status: "agent-ready" };
    },
  };
}
