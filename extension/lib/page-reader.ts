import { PageController } from "@page-agent/page-controller";

/** Experimental local-only reader. No delivery, persistence, model or action tools. */
export async function readPageFoundation() {
  if (!/^(127\.0\.0\.1|localhost)$/.test(location.hostname))
    throw new Error("The foundation reader is restricted to local test pages.");
  return readObservedPage();
}

/** Call only after the worker has authorized the current site/session. */
export async function readObservedPage() {
  if (document.querySelectorAll("*").length > 10_000)
    throw new Error("This test page exceeds the reader budget.");
  const controller = new PageController({
    passive: true,
    enableMask: false,
    highlightOpacity: 0,
    highlightLabelOpacity: 0,
  });
  try {
    const state = await controller.getBrowserState();
    // Remove echoes of entered answers from title/text as well as attributes.
    // This is tested data minimization, not a guarantee for arbitrary websites.
    const answers = Array.from(
      document.querySelectorAll<
        HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      >("input,textarea,select"),
    )
      .filter(
        (field) =>
          !field.matches(
            '[type="checkbox"],[type="radio"],[type="submit"],[type="button"]',
          ),
      )
      .map((field) => field.value)
      .filter((value) => value.length >= 1)
      .sort((a, b) => b.length - a.length);
    const redact = (text: string) => {
      for (const answer of answers) text = text.split(answer).join("[private]");
      return text;
    };
    return {
      origin: location.origin,
      title: redact(state.title).slice(0, 240),
      // The controller's transient '*' before an element index is reader
      // bookkeeping, not a page change. Keep repeated passive reads stable.
      content: redact(
        state.content.replace(/(^|\n)([ \t]*)\*(?=\[\d+\])/g, "$1$2"),
      ).slice(0, 8000),
    };
  } finally {
    controller.dispose();
  }
}
