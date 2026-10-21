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
import type { BridgeResponse } from "../../src/features/capture/protocol";
import { onMessage } from "../lib/messages";
import { updatePending } from "../lib/pending";

export default defineBackground(() => {
  const appOrigin = __REENTRY_APP_ORIGIN__;
  const previewUrl = browser.runtime.getURL("/capture.html");

  function assertInternalSender(sender: { id?: string; url?: string }) {
    if (
      sender.id !== browser.runtime.id ||
      !sender.url?.startsWith(previewUrl)
    ) {
      throw new Error("Capture preview required.");
    }
  }

  onMessage("pending", async ({ sender }) => {
    assertInternalSender(sender);
    return updatePending((items) => ({ items, result: items }));
  });
  onMessage("confirm", async ({ data, sender }) => {
    assertInternalSender(sender);
    const id = idSchema.parse(data.id);
    await updatePending((items) => {
      if (!items.some((item) => item.capture.id === id))
        throw new Error("Capture expired or was discarded.");
      return {
        items: items.map((item) =>
          item.capture.id === id
            ? { ...item, status: "confirmed" as const }
            : item,
        ),
        result: undefined,
      };
    });
    const url = new URL(appOrigin);
    url.searchParams.set("capture", id);
    await browser.tabs.create({ url: url.href });
  });
  onMessage("discard", async ({ data, sender }) => {
    assertInternalSender(sender);
    const id = idSchema.parse(data.id);
    await updatePending((items) => ({
      items: items.filter((item) => item.capture.id !== id),
      result: undefined,
    }));
  });

  // Chrome's external callback listener must return true while storage is read.
  browser.runtime.onMessageExternal.addListener(
    (raw: unknown, sender, sendResponse) => {
      if (!isAppSender(sender, appOrigin)) {
        sendResponse({ status: "rejected" } satisfies BridgeResponse);
        return false;
      }
      const parsed = bridgeRequestSchema.safeParse(raw);
      if (!parsed.success) {
        sendResponse({ status: "rejected" } satisfies BridgeResponse);
        return false;
      }
      const request = parsed.data;
      void updatePending<BridgeResponse>((items) => {
        const item = items.find(
          (candidate) =>
            candidate.capture.id === request.captureId &&
            candidate.status === "confirmed",
        );
        if (request.type === "capture.get") {
          return {
            items,
            result: item
              ? { status: "capture", capture: item.capture }
              : { status: "unavailable" },
          };
        }
        // A repeated acknowledgement is harmless after an earlier successful one.
        return {
          items: items.filter(
            (candidate) =>
              candidate.capture.id !== request.captureId ||
              candidate.status !== "confirmed",
          ),
          result: { status: "acknowledged" },
        };
      }).then(sendResponse, () =>
        sendResponse({ status: "unavailable" } satisfies BridgeResponse),
      );
      return true;
    },
  );

  browser.action.onClicked.addListener((tab) => {
    void (async () => {
      let error = "capture-failed";
      try {
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
            return {
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
            items: [...items, { capture: parsed.data, status: "draft" }],
            result: undefined,
          };
        });
        await browser.tabs.create({
          url: `${previewUrl}?id=${parsed.data.id}`,
        });
      } catch {
        await browser.tabs.create({ url: `${previewUrl}?error=${error}` });
      }
    })();
  });
});
