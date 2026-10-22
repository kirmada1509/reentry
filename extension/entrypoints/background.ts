import { browser } from "wxt/browser";
import { defineBackground } from "wxt/utils/define-background";
import {
  idSchema,
  bridgeRequestSchema,
  captureSchema,
  httpUrlSchema,
  isAppSender,
  PENDING_LIMIT,
} from "../../src/features/capture/protocol";
import type {
  BridgeRequest,
  BridgeResponse,
  CheckContext,
  CheckFailure,
} from "../../src/features/capture/protocol";
import { onMessage } from "../lib/messages";
import { updatePending } from "../lib/pending";
import { checkForTab, markCheck, updateChecks } from "../lib/checks";
import { agentBridgeSchema } from "../../src/features/observation/protocol";
import { startObservationRuntime } from "../lib/observation-runtime";

export default defineBackground(() => {
  const appOrigin = __REENTRY_APP_ORIGIN__;
  const observation = startObservationRuntime(appOrigin);
  const previewUrl = browser.runtime.getURL("/capture.html");
  function assertInternalSender(sender: { id?: string; url?: string }) {
    if (
      sender.id !== browser.runtime.id ||
      !sender.url ||
      new URL(sender.url).pathname !== "/capture.html"
    )
      throw new Error("Capture preview required.");
  }
  onMessage("pending", async ({ sender }) => {
    assertInternalSender(sender);
    return updatePending((items) => ({ items, result: items }));
  });
  onMessage("confirm", async ({ data, sender }) => {
    assertInternalSender(sender);
    const id = idSchema.parse(data.id);
    const capture = await updatePending((items) => {
      const item = items.find((item) => item.capture.id === id);
      if (!item) throw new Error("Capture expired or was discarded.");
      return {
        items: items.map((entry) =>
          entry.capture.id === id
            ? { ...entry, status: "confirmed" as const }
            : entry,
        ),
        result: item,
      };
    });
    const url = new URL(capture.check ? "/check" : "/", appOrigin);
    url.searchParams.set("capture", id);
    if (capture.check) {
      url.searchParams.set("task", capture.check.taskId);
      url.searchParams.set("check", capture.check.id);
    }
    await browser.tabs.create({ url: url.href });
  });
  onMessage("discard", async ({ data, sender }) => {
    assertInternalSender(sender);
    const id = idSchema.parse(data.id);
    const removed = await updatePending((items) => ({
      items: items.filter((item) => item.capture.id !== id),
      result: items.find((item) => item.capture.id === id),
    }));
    if (removed?.check)
      await markCheck(removed.check.id, "cancelled", "cancelled");
  });

  async function handleBridge(request: BridgeRequest): Promise<BridgeResponse> {
    if (request.type === "capture.purge") {
      await updatePending((items) => ({
        items: items.filter(
          (item) =>
            !request.captureIds.includes(item.capture.id) &&
            !(item.check && request.taskIds.includes(item.check.taskId)) &&
            !(request.before && item.capture.capturedAt <= request.before),
        ),
        result: undefined,
      }));
      await updateChecks((items) => ({
        items: items.filter(
          (item) =>
            !request.taskIds.includes(item.context.taskId) &&
            !(request.before && item.context.startedAt <= request.before),
        ),
        result: undefined,
      }));
      return { status: "purged" };
    }
    if (request.type === "check.start") {
      const check = request.check;
      const existing = await updateChecks((items) => ({
        items,
        result: items.find((item) => item.context.id === check.id),
      }));
      if (existing) {
        if (JSON.stringify(existing.context) !== JSON.stringify(check))
          return { status: "rejected" };
        if (existing.state === "failed" || existing.state === "cancelled")
          return { status: "unavailable" };
        return { status: "check-started", checkId: check.id };
      }
      const hasRoom = await updateChecks((items) => ({
        items,
        result: items.length < 20,
      }));
      if (!hasRoom) return { status: "unavailable" };
      const tab = await browser.tabs.create({ url: check.sourceUrl });
      if (tab.id === undefined) return { status: "unavailable" };
      const tabId = tab.id;
      await updateChecks((items) => ({
        items: [...items, { context: check, tabId, state: "awaiting" }],
        result: undefined,
      }));
      return { status: "check-started", checkId: check.id };
    }
    if (request.type === "check.status") {
      const session = await updateChecks((items) => ({
        items,
        result: items.find(
          (item) =>
            item.context.id === request.checkId &&
            item.context.taskId === request.taskId,
        ),
      }));
      return session
        ? {
            status: "check-status",
            checkId: request.checkId,
            state: session.state,
            ...(session.reason ? { reason: session.reason } : {}),
          }
        : { status: "unavailable" };
    }
    if (request.type === "check.cancel") {
      await updateChecks((items) => ({
        items: items.map((item) =>
          item.context.id === request.checkId &&
          item.context.taskId === request.taskId
            ? {
                ...item,
                state: "cancelled" as const,
                reason: "cancelled" as const,
              }
            : item,
        ),
        result: undefined,
      }));
      await updatePending((items) => ({
        items: items.filter(
          (item) =>
            item.check?.id !== request.checkId ||
            item.check.taskId !== request.taskId,
        ),
        result: undefined,
      }));
      return { status: "check-cancelled" };
    }
    const result = await updatePending<BridgeResponse>((items) => {
      const item = items.find(
        (item) =>
          item.capture.id === request.captureId && item.status === "confirmed",
      );
      if (request.type === "capture.get")
        return {
          items,
          result: item
            ? {
                status: "capture",
                capture: item.capture,
                ...(item.check ? { check: item.check } : {}),
              }
            : { status: "unavailable" },
        };
      if (
        item?.check &&
        (request.checkId !== item.check.id ||
          request.taskId !== item.check.taskId)
      )
        return { items, result: { status: "rejected" } };
      if (item && !item.check && request.checkId)
        return { items, result: { status: "rejected" } };
      return {
        items: items.filter((entry) => entry !== item),
        result: { status: "acknowledged" },
      };
    });
    if (
      request.type === "capture.ack" &&
      request.checkId &&
      result.status === "acknowledged"
    )
      await updateChecks((items) => ({
        items: items.filter(
          (item) =>
            item.context.id !== request.checkId ||
            item.context.taskId !== request.taskId,
        ),
        result: undefined,
      }));
    return result;
  }

  let externalRequests: Promise<unknown> = Promise.resolve();
  browser.runtime.onMessageExternal.addListener(
    (raw: unknown, sender, sendResponse) => {
      const parsed = bridgeRequestSchema.safeParse(raw);
      const agent = agentBridgeSchema.safeParse(raw);
      if (
        !isAppSender(sender, appOrigin) ||
        (!parsed.success && !agent.success)
      ) {
        sendResponse({ status: "rejected" } satisfies BridgeResponse);
        return false;
      }
      const next = externalRequests
        .catch(() => undefined)
        .then(() =>
          agent.success
            ? observation.bridge(agent.data)
            : parsed.success
              ? handleBridge(parsed.data)
              : { status: "rejected" },
        );
      externalRequests = next;
      void next.then(sendResponse, () =>
        sendResponse({ status: "unavailable" } satisfies BridgeResponse),
      );
      return true;
    },
  );

  browser.tabs.onRemoved.addListener((tabId) => {
    void checkForTab(tabId)
      .then((session) => {
        if (session?.state === "awaiting")
          return markCheck(session.context.id, "failed", "source-closed");
      })
      .catch(() => undefined);
  });

  browser.action.onClicked.addListener((tab) => {
    void (async () => {
      let error: CheckFailure = "capture-failed";
      let check: CheckContext | undefined;
      try {
        if (tab.id !== undefined) {
          const session = await checkForTab(tab.id);
          check = session?.context;
          if (session?.state === "captured") {
            const existing = await updatePending((items) => ({
              items,
              result: items.find(
                (item) =>
                  item.check?.id === session.context.id &&
                  item.check.taskId === session.context.taskId,
              ),
            }));
            if (existing) {
              await browser.tabs.create({
                url: `${previewUrl}?id=${existing.capture.id}`,
              });
              return;
            }
          }
        }
        if (tab.id === undefined || !httpUrlSchema.safeParse(tab.url).success) {
          error = "unsupported";
          throw new Error("Unsupported page.");
        }
        const results = await browser.scripting.executeScript({
          target: { tabId: tab.id },
          func: () => {
            const active = document.activeElement;
            if (
              active instanceof HTMLInputElement ||
              active instanceof HTMLTextAreaElement ||
              (active instanceof HTMLElement && active.isContentEditable)
            )
              return { blocked: true };
            const selection = window.getSelection();
            const editable = (node: Node | null) =>
              (node instanceof Element ? node : node?.parentElement)?.closest(
                'input, textarea, [contenteditable]:not([contenteditable="false"]), [role="textbox"]',
              );
            if (
              editable(selection?.anchorNode ?? null) ||
              editable(selection?.focusNode ?? null)
            )
              return { blocked: true };
            const range = selection?.rangeCount
              ? selection.getRangeAt(0)
              : undefined;
            const node = range?.commonAncestorContainer;
            const element =
              node instanceof Element ? node : node?.parentElement;
            const anchor = element?.closest("[id]");
            const region = element?.closest("section,article,main");
            const heading = region?.querySelector("h1,h2,h3");
            const headingText = heading?.textContent?.trim().slice(0, 250);
            const section =
              anchor?.id && anchor.id.length <= 250
                ? {
                    key: `id:${anchor.tagName.toLowerCase()}:${anchor.id}`,
                    label: (
                      anchor.getAttribute("aria-label") ||
                      headingText ||
                      anchor.id
                    ).slice(0, 300),
                  }
                : heading && headingText
                  ? {
                      key: `heading:${heading.tagName.toLowerCase()}:${headingText}`,
                      label: headingText,
                    }
                  : undefined;
            return {
              section,
              text: selection?.toString() ?? "",
              title: document.title || "Untitled page",
              url: location.href,
            };
          },
        });
        const result = results[0]?.result;
        if (!result || result.blocked) {
          error = "unsupported";
          throw new Error("Select ordinary page instructions.");
        }
        if (!result.text?.trim()) {
          error = "no-selection";
          throw new Error("Select text first.");
        }
        const parsed = captureSchema.safeParse({
          id: crypto.randomUUID(),
          title: result.title,
          text: result.text,
          url: result.url,
          ...(result.section ? { section: result.section } : {}),
          capturedAt: new Date().toISOString(),
          mode: "selection",
          extractorVersion: 1,
        });
        if (!parsed.success) {
          error = "too-large";
          throw new Error("Selection exceeds capture limits.");
        }
        error = "storage-failed";
        await updatePending((items) => {
          if (items.length >= PENDING_LIMIT)
            throw new Error("Pending capture capacity reached.");
          return {
            items: [
              ...items,
              {
                capture: parsed.data,
                status: "draft",
                ...(check ? { check } : {}),
              },
            ],
            result: undefined,
          };
        });
        if (check) await markCheck(check.id, "captured");
        await browser.tabs.create({
          url: `${previewUrl}?id=${parsed.data.id}`,
        });
      } catch {
        if (check)
          await markCheck(check.id, "failed", error).catch(() => undefined);
        await browser.tabs.create({ url: `${previewUrl}?error=${error}` });
      }
    })();
  });
});
