import { z } from "zod";

export const scenarioSchema = z.object({
  version: z.enum(["v1", "v2", "cosmetic"]),
});
export type Version = z.infer<typeof scenarioSchema>["version"];
export const requirements = {
  v1: "Attach your transcript. Supply one referee. Keep a copy of your application.",
  v2: "Attach your transcript. Supply two referees. Keep a copy of your application.",
  cosmetic:
    "Attach your transcript! Supply one referee. Keep a copy of your application.",
} satisfies Record<Version, string>;

export const draftSchema = z.object({
  name: z.string().max(120),
  email: z.string().max(200),
  college: z.string().max(200),
  statement: z.string().max(6000),
  transcript: z.boolean(),
  refereeOne: z.string().max(120),
  refereeTwo: z.string().max(120),
});
export type ApplicationDraft = z.infer<typeof draftSchema>;
export const emptyDraft: ApplicationDraft = {
  name: "Alex Morgan",
  email: "alex@example.test",
  college: "Riverside College",
  statement: "",
  transcript: false,
  refereeOne: "",
  refereeTwo: "",
};
export const DRAFT_KEY = "reentry-fictional-scholarship-draft-v1";
export const RECEIPT_KEY = "reentry-fictional-scholarship-receipt-v1";
export const receiptSchema = z.strictObject({
  id: z.uuid(),
  submittedAt: z.iso.datetime(),
});
export function completion(draft: ApplicationDraft, version: Version) {
  return [
    {
      label: "Applicant details",
      complete: Boolean(
        draft.name.trim() &&
        z.email().safeParse(draft.email).success &&
        draft.college.trim(),
      ),
    },
    { label: "Personal statement", complete: Boolean(draft.statement.trim()) },
    { label: "Academic transcript", complete: draft.transcript },
    {
      label: version === "v2" ? "Two referees" : "One referee",
      complete: Boolean(
        draft.refereeOne.trim() &&
        (version !== "v2" || draft.refereeTwo.trim()),
      ),
    },
  ];
}
