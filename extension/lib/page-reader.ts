import { PageController } from "@page-agent/page-controller";

/** Experimental local-only reader. No delivery, persistence, model or action tools. */
export async function readPageFoundation() {
  if (!/^(127\.0\.0\.1|localhost)$/.test(location.hostname))
    throw new Error("The foundation reader is restricted to local test pages.");
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
      .map((field) => field.value)
      .filter((value) => value.length >= 3)
      .sort((a, b) => b.length - a.length);
    const redact = (text: string) => {
      for (const answer of answers) text = text.split(answer).join("[private]");
      return text;
    };
    return {
      origin: location.origin,
      title: redact(state.title).slice(0, 240),
      content: redact(state.content).slice(0, 8000),
    };
  } finally {
    controller.dispose();
  }
}
