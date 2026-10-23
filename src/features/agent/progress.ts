import type { ObservationEvent } from "../observation/protocol";
import type { AgentTask } from "./schema";

export const normalizeSubject = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
export const hasSubject = (text: string, subject: string) =>
  normalizeSubject(text).includes(
    normalizeSubject(subject).replace(
      /\s+(?:application|checkout|final review)$/,
      "",
    ),
  );
export const blockingFailure = (text: string) =>
  /validation error|error:|payment (?:failed|declined)|application not submitted|order not confirmed/i.test(
    text,
  );
export const finalReview = (event: ObservationEvent, subject: string) =>
  hasSubject(event.page.content, subject) &&
  !blockingFailure(event.page.content) &&
  !affirmativeReceipt(event.page.content) &&
  /\b(?:final review|checkout:? overview|review (?:your |the )?(?:order|application))\b/i.test(
    event.page.content,
  ) &&
  /\b(?:finish|submit|place order|confirm order)\b/i.test(event.page.content);

// Conservative English success gate in addition to the model's interpretation.
// Page evidence remains untrusted: this is observed success, not a server receipt
// signature or proof that payment/application processing actually succeeded.
export function affirmativeReceipt(text: string) {
  return (
    /thank you for your order|your order (?:has been |was )?(?:confirmed|placed|dispatched)|order confirmed|application (?:has been |was )?(?:successfully )?(?:submitted|received)|submission (?:confirmed|successful)/i.test(
      text,
    ) &&
    !/\b(?:no application submitted|no order confirmation|not yet submitted|not received|failed|failure|declined|cancelled|canceled|not submitted|not confirmed|unverified|example receipt|historical receipt|previous order)\b/i.test(
      text,
    )
  );
}

export function completionAllowed(
  task: AgentTask,
  current: ObservationEvent,
  anchor: ObservationEvent | null,
  between: ObservationEvent[],
  now: number,
  seenBefore: boolean,
) {
  const checkpoint = task.progress.find(
    (p) =>
      p.eventId === anchor?.eventId &&
      ["review_ready", "submit_attempt"].includes(p.kind),
  );
  if (
    !anchor ||
    !task.subject ||
    (!checkpoint && !finalReview(anchor, task.subject)) ||
    blockingFailure(anchor.page.content) ||
    (checkpoint?.kind === "submit_attempt" &&
      anchor.reason !== "submit-attempt") ||
    task.corrected ||
    task.dismissed ||
    task.intent === "research" ||
    ["completed", "cancelled"].includes(task.stage) ||
    !current.streamId ||
    current.streamId !== anchor.streamId ||
    current.deviceId !== anchor.deviceId ||
    current.sessionId !== anchor.sessionId ||
    current.page.origin !== anchor.page.origin ||
    Date.parse(current.observedAt) <= Date.parse(anchor.observedAt) ||
    now - Date.parse(current.observedAt) > 120_000 ||
    Date.parse(current.observedAt) - Date.parse(anchor.observedAt) >
      1_800_000 ||
    seenBefore ||
    !affirmativeReceipt(current.page.content) ||
    !hasSubject(anchor.page.content, task.subject)
  )
    return false;
  // Receipt-only pages may omit an item. In that case only a direct transition
  // from the final review is accepted; intervening pages break the chain.
  const directSubject = hasSubject(current.page.content, task.subject);
  if (
    !directSubject &&
    (current.page.pageKey === anchor.page.pageKey || between.length)
  )
    return false;
  if (
    between.some((e) =>
      /\b(?:failed|declined|cancelled|canceled|validation error)\b/i.test(
        e.page.content,
      ),
    )
  )
    return false;
  return true;
}
