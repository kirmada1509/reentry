import { defineUnlistedScript } from "wxt/utils/define-unlisted-script";
import { browser } from "wxt/browser";
import { sendMessage } from "../lib/messages";
import { readObservedPage } from "../lib/page-reader";
import type { ObservationEvent } from "../../src/features/observation/protocol";

declare global {
  interface Window {
    __reentryObserverStarted?: boolean;
  }
}
export default defineUnlistedScript(() => {
  if (
    window.__reentryObserverStarted ||
    window.top !== window ||
    location.origin === __REENTRY_APP_ORIGIN__
  )
    return;
  window.__reentryObserverStarted = true;
  let observer: MutationObserver | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let lastUrl = "";
  let fingerprint = "";
  let lastRead = 0;
  let busy = false;
  let enabled = false;
  let reason: ObservationEvent["reason"] = "navigation";
  const redactLabel = (label: string) => {
    for (const field of document.querySelectorAll<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >("input,textarea,select")) {
      if (
        field.value &&
        !field.matches(
          '[type="checkbox"],[type="radio"],[type="submit"],[type="button"]',
        )
      )
        label = label.split(field.value).join("[private]");
    }
    return label.slice(0, 100);
  };
  const privateField = (field: Element) =>
    field.matches(
      'input[type="password"],input[type="hidden"],input[type="file"],input[type="email"],input[type="tel"],input[autocomplete^="cc-"],input[autocomplete="one-time-code"]',
    ) ||
    /password|secret|token|credit|card.?number|security.?code|ssn|social.?security|phone|email|address|birth/i.test(
      `${field.getAttribute("name") ?? ""} ${field.id} ${field.getAttribute("autocomplete") ?? ""}`,
    ) ||
    Boolean(
      field.closest(
        '[hidden],[aria-hidden="true"],[data-private],[data-reentry-private],[contenteditable]',
      ),
    );
  const fields = () =>
    Array.from(
      document.querySelectorAll<
        HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      >("input,textarea,select"),
    )
      .filter(
        (field) => !privateField(field) && field.getClientRects().length > 0,
      )
      .slice(0, 30)
      .map((field) => ({
        label: redactLabel(
          field.labels?.[0]?.textContent?.trim() ||
            field.getAttribute("aria-label") ||
            "Form field",
        ),
        present:
          field instanceof HTMLInputElement &&
          ["checkbox", "radio"].includes(field.type)
            ? field.checked
            : Boolean(field.value.trim()),
      }));
  const digest = async (value: string) =>
    Array.from(
      new Uint8Array(
        await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)),
      ),
    )
      .map((n) => n.toString(16).padStart(2, "0"))
      .join("");
  async function capture() {
    timer = undefined;
    if (!enabled || document.visibilityState !== "visible") return;
    if (busy) {
      schedule(reason);
      return;
    }
    busy = true;
    const observedReason = reason;
    reason = "page-change";
    try {
      const context = await sendMessage("agentContext", undefined);
      if (!context) {
        stop();
        return;
      }
      const currentUrl = location.href;
      const page = {
        ...(await readObservedPage()),
        pageKey: await digest(location.pathname),
        fields: fields(),
      };
      // Navigation in the middle of extraction must not attach stale evidence.
      if (location.href !== currentUrl) {
        schedule("navigation");
        return;
      }
      const next = await digest(JSON.stringify(page));
      if (next === fingerprint && observedReason !== "submit-attempt") return;
      lastRead = Date.now();
      const queued = await sendMessage("agentObserve", {
        version: 1,
        eventId: crypto.randomUUID(),
        ...context,
        observedAt: new Date().toISOString(),
        reason: observedReason,
        page,
      });
      if (queued) fingerprint = next;
    } catch {
      await sendMessage("agentReaderFailed", undefined).catch(() => undefined);
    } finally {
      busy = false;
    }
  }
  function schedule(next: ObservationEvent["reason"]) {
    if (reason !== "submit-attempt") reason = next;
    // A fixed coalescing window cannot be starved by a page's animation/timer.
    if (timer) return;
    timer = setTimeout(
      () => {
        void capture();
      },
      Math.max(700, 2000 - (Date.now() - lastRead)),
    );
  }
  function stop() {
    enabled = false;
    observer?.disconnect();
    observer = null;
    if (timer) clearTimeout(timer);
    timer = undefined;
  }
  async function refresh() {
    try {
      if (!(await sendMessage("agentContext", undefined))) {
        stop();
        return;
      }
      if (enabled) return;
      enabled = true;
      observer = new MutationObserver((mutations) => {
        const meaningful = mutations.some((m) => {
          const target =
            m.target instanceof Element ? m.target : m.target.parentElement;
          return (
            target &&
            !target.closest(
              '[data-reentry],[data-page-agent],[aria-live="off"],script,style,time,[role="timer"],[role="marquee"]',
            ) &&
            (Boolean(target.closest('main,article,form,[role="main"]')) ||
              (!document.querySelector('main,article,[role="main"]') &&
                Boolean(target.closest("#root,#app,body"))))
          );
        });
        if (meaningful) schedule("page-change");
      });
      observer.observe(document.documentElement, {
        subtree: true,
        childList: true,
        characterData: true,
        attributes: true,
        attributeFilter: [
          "aria-invalid",
          "aria-checked",
          "aria-expanded",
          "disabled",
          "hidden",
        ],
      });
      schedule("navigation");
    } catch {
      stop();
    }
  }
  let formFingerprint = "";
  document.addEventListener(
    "input",
    (event) => {
      if (
        !enabled ||
        !(event.target instanceof Element) ||
        privateField(event.target)
      )
        return;
      const next = JSON.stringify(fields());
      if (next !== formFingerprint) {
        formFingerprint = next;
        schedule("form-status");
      }
    },
    true,
  );
  document.addEventListener(
    "change",
    () => {
      if (enabled) schedule("form-status");
    },
    true,
  );
  document.addEventListener(
    "submit",
    () => {
      if (enabled) schedule("submit-attempt");
    },
    true,
  );
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible")
      void refresh().then(() => schedule("page-change"));
  });
  browser.runtime.onMessage.addListener((message: unknown) => {
    if (
      typeof message === "object" &&
      message !== null &&
      "reentryObserver" in message
    )
      void refresh();
  });
  setInterval(() => {
    if (lastUrl !== location.href) {
      lastUrl = location.href;
      schedule("navigation");
    }
    // Also reconciles a pause made in the app while its companion was closed.
    void refresh();
  }, 5000);
  void refresh();
});
