import { AppError } from "@/lib/http/errors";
import { compareSources } from "../sources/compare";
import { captureDigest } from "../tasks/storage";
import { captureSchema } from "../capture/protocol";
import { proposalSchema, recoveryInputSchema } from "./schema";
import type { RecoveryInput } from "./schema";

export async function inputDigest(input: RecoveryInput) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(JSON.stringify(input)),
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}
export async function validateInput(raw: unknown) {
  const input = recoveryInputSchema.parse(raw);
  const { task, check } = input;
  const after = check.after!;
  const before = captureSchema.strip().parse(check.before);
  if (
    JSON.stringify(task.source) !== JSON.stringify(check.before) ||
    (await captureDigest(before)) !== check.before.digest ||
    (await captureDigest(captureSchema.strip().parse(after))) !==
      after.digest ||
    compareSources(before, after, check.sameSection!).status !== check.status
  )
    throw new AppError(
      "INVALID_EVIDENCE",
      "Source evidence does not match this checkpoint.",
      400,
    );
  return input;
}
export function validateProposal(raw: unknown, input: RecoveryInput) {
  const proposal = proposalSchema.parse(raw);
  const { task, check } = input;
  if (proposal.confirmedProgress !== task.progress)
    throw new Error("Confirmed progress was changed.");
  if (
    proposal.assessment === "changed" &&
    (check.status !== "changed" || !proposal.changes.length)
  )
    throw new Error("Changed assessment lacks changed evidence.");
  if (proposal.assessment === "unchanged" && proposal.changes.length)
    throw new Error("Unchanged assessment cannot include changes.");
  if (proposal.assessment !== "uncertain" && proposal.questions.length)
    throw new Error("An unresolved question requires an uncertain assessment.");
  if (proposal.assessment === "uncertain" && !proposal.questions.length)
    throw new Error("Uncertainty requires a question.");
  for (const change of proposal.changes) {
    if (
      change.before.sourceId !== check.before.id ||
      change.after.sourceId !== check.after!.id ||
      !check.before.text.includes(change.before.quote) ||
      !check.after!.text.includes(change.after.quote)
    )
      throw new Error("Evidence reference or quote is invalid.");
  }
  // Completion is exclusively user-confirmed. This is a narrow additional guard,
  // not a semantic proof about every possible instruction or contradiction.
  if (
    /\b(mark|declare)\b.{0,35}\b(complete|done|finished)\b|\balready (uploaded|submitted|completed)\b/i.test(
      proposal.nextAction.instruction,
    )
  )
    throw new Error("Action invents completion.");
  return proposal;
}
