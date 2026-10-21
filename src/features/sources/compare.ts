import { diffWordsWithSpace } from "diff";
import type { Capture } from "../capture/protocol";
import type { ComparisonReason } from "./schema";

type ComparableCapture = Pick<Capture, "url" | "text" | "section"> & {
  mode: string;
  extractorVersion: number;
};
export function compareSources(
  before: ComparableCapture,
  after: ComparableCapture,
  sameSection: boolean,
): {
  status: "unchanged" | "changed" | "incomparable";
  reason?: ComparisonReason;
} {
  if (new URL(before.url).href !== new URL(after.url).href)
    return { status: "incomparable", reason: "different-url" };
  if (before.mode !== after.mode)
    return { status: "incomparable", reason: "different-mode" };
  if (before.extractorVersion !== after.extractorVersion)
    return { status: "incomparable", reason: "different-extractor" };
  if (
    before.section &&
    after.section &&
    before.section.key !== after.section.key
  )
    return { status: "incomparable", reason: "different-section" };
  if (!sameSection)
    return { status: "incomparable", reason: "section-unconfirmed" };
  return { status: before.text === after.text ? "unchanged" : "changed" };
}

export function textChanges(before: string, after: string) {
  const pieces = diffWordsWithSpace(before, after, {
    timeout: 100,
    maxEditLength: 2000,
  });
  if (!pieces) return { parts: [], limited: true };
  const changes = pieces
    .filter((piece) => piece.added || piece.removed)
    .map((piece) => ({
      kind: piece.added ? ("Added" as const) : ("Removed" as const),
      text: piece.value,
    }));
  return { parts: changes.slice(0, 20), limited: changes.length > 20 };
}

export const checkMessages = {
  awaiting: "Awaiting a fresh capture",
  unchanged: "Unchanged within the captured section",
  changed: "Text changed — review your saved next action",
  incomparable: "Captures cannot be compared",
  failed: "Could not check the instructions",
  cancelled: "Check cancelled — instructions remain unverified",
};

export const reasonMessages: Record<string, string> = {
  "different-url":
    "The new capture has a different URL. It is not evidence of a change to the saved source.",
  "different-section":
    "The page sections differ. Select the original instruction section in a new check.",
  "different-mode": "These captures used different extraction modes.",
  "different-extractor": "The capture methods have different versions.",
  "section-unconfirmed":
    "The same instruction section was not confirmed. No unchanged or changed conclusion was made.",
  cancelled:
    "The check was cancelled or its preview discarded. Your saved context is unchanged.",
  "no-selection":
    "No instruction text was selected. Start a new check and select the relevant section.",
  unsupported:
    "The source could not be captured as ordinary page instructions.",
  "too-large":
    "The capture exceeded the supported size. Select a shorter section in a new check.",
  "storage-failed":
    "The extension could not keep the new capture. Your saved instructions remain available.",
  "capture-failed":
    "The page could not be read. No source comparison was completed.",
  "source-closed": "The source tab closed before instructions were captured.",
  "extension-unavailable":
    "The extension could not start or report this check. Check its setup and try again.",
  "source-unavailable":
    "You reported that the source could not be read. No source comparison was completed.",
  "context-lost":
    "The extension no longer has this check session. Start a new check; your saved task is intact.",
};
