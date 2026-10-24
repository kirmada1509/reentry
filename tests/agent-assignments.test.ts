import historyBudget from "./fixtures/agent-history-budget.json";
import { createHash, randomUUID } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, expect, it } from "vitest";
import { ObservationStore } from "@/features/observation/store";
import type { ObservationEvent } from "@/features/observation/protocol";
import { pageIdentity } from "@/features/observation/page-identity";
import { workLink } from "@/features/agent/recovery-schema";
import { createTaskHarness } from "@/features/agent/harness";
import {
  agentRequest,
  sourceSpans,
  validateDecision,
} from "@/features/agent/prompt";
import type { DecisionContext } from "@/features/agent/prompt";
import { assignmentStatus, completionAllowed } from "@/features/agent/progress";

const clean: Array<() => void> = [];
afterEach(() =>
  clean
    .splice(0)
    .reverse()
    .forEach((fn) => fn()),
);
const app = "http://127.0.0.1:3000",
  site = "https://fictional-campus.example";
const processing = {
  provider: "fake",
  model: "test",
  hosted: false,
  available: true,
  consentId: "c".repeat(64),
};
function setup() {
  const directory = mkdtempSync(path.join(tmpdir(), "reentry-assignment-"));
  let now = Date.now();
  const file = path.join(directory, "test.sqlite");
  let db = new ObservationStore(file, () => now);
  clean.push(() => {
    db.close();
    rmSync(directory, { recursive: true, force: true });
  });
  const device = db.pair(db.challenge(), "nabinfdlobegbkgehppcipkhbddjbdka");
  const session = db.setSession(
    device.deviceId,
    { allSites: false, origins: [site], policy: "local-observation-v1" },
    false,
    app,
  ).session;
  db.agent.action(
    {
      action: "enable",
      consentId: processing.consentId,
      sessionId: session.id,
    },
    processing,
  );
  const streamId = randomUUID();
  function event(
    status = "No submissions have been made yet",
    id = "12307",
  ): ObservationEvent {
    now += 9000;
    return {
      version: 1,
      eventId: randomUUID(),
      deviceId: device.deviceId,
      sessionId: session.id,
      streamId,
      observedAt: new Date(now).toISOString(),
      reason: "page-change",
      page: {
        origin: site,
        title: "Lab Assignment 1",
        pageKey: createHash("sha256")
          .update(pageIdentity(new URL(`${site}/mod/assign/view.php?id=${id}`)))
          .digest("hex"),
        content: `Lab Assignment 1\nSubmit a self-created dataset with 100 data points and 5 dimensions. Refer to the assignment email for further instructions.\nSubmission status\n${status}\nGrading status\nNot graded`,
        fields: [],
      },
    };
  }
  async function apply(e: ObservationEvent, complete = false) {
    db.accept(device.deviceId, e, app);
    return createTaskHarness(
      db.agent,
      () => ({
        generate: async (request) => {
          const c = JSON.parse(
            request.messages[1]!.content,
          ) as DecisionContext & {
            completionAnchors: Array<{ taskId: string; eventId: string }>;
          };
          const task = c.tasks[0];
          const spans = sourceSpans(c);
          const candidate =
            complete && task
              ? {
                  tool: "complete_task",
                  taskId: task.id,
                  anchorEventId: c.completionAnchors[0]!.eventId,
                  receiptSubject: "Lab Assignment 1",
                  evidenceRefs: [
                    spans.find((s) => s.quote === "Submitted for grading")!.id,
                  ],
                }
              : {
                  tool: "upsert_task",
                  taskId: task?.id ?? null,
                  intent: "assignment",
                  goal: "Submit Lab Assignment 1",
                  subject: "Lab Assignment 1",
                  finishCondition: "This assignment is submitted for grading",
                  stage: "ongoing",
                  nextAction:
                    "Review the referenced assignment email, then prepare the dataset",
                  checkpoint: {
                    kind:
                      assignmentStatus(e.page.content) === "draft"
                        ? "draft_saved"
                        : "editing",
                    summary: "Assignment is not submitted",
                  },
                  evidenceRefs: ["current:0", "current:2", "current:3"],
                };
          return {
            candidate,
            provider: "fake",
            model: "test",
            modelDigest: null,
            settings: {},
          };
        },
      }),
      () => processing,
      1000,
    ).tick();
  }
  return {
    get db() {
      return db;
    },
    event,
    apply,
    restart() {
      db.close();
      db = new ObservationStore(file, () => now);
    },
  };
}

it("retains only a safe assignment identifier in return links and distinguishes resources", () => {
  const url = `${site}/mod/assign/view.php?id=12307&sesskey=secret&redirect=private#answer`;
  expect(workLink(url)).toBe(`${site}/mod/assign/view.php?id=12307`);
  expect(workLink(`${site}/other?q=secret#answer`)).toBe(`${site}/other`);
  for (const query of [
    "",
    "id=1&id=2",
    "id=secret",
    "id=-1",
    "id=0",
    "id=1234567890123456",
  ])
    expect(workLink(`${site}/mod/assign/view.php?${query}`)).toBeNull();
  expect(pageIdentity(new URL(url))).not.toBe(
    pageIdentity(new URL(`${site}/mod/assign/view.php?id=12308`)),
  );
});

it("reads adjacent DOM table cells and rejects draft, contradictory and instructional success phrases", () => {
  expect(
    assignmentStatus(
      "Submission status\n[3]<td >Submitted for grading />\nGrading status\nNot graded",
    ),
  ).toBe("submitted");
  expect(
    assignmentStatus(
      "Submission status\nDraft (not submitted)\nGrading status\nNot graded",
    ),
  ).toBe("draft");
  expect(
    assignmentStatus(
      "Instructions: look for Submitted for grading.\nSubmission status\nNo submissions have been made yet",
    ),
  ).toBe("pending");
  expect(assignmentStatus("Submitted for grading")).toBeNull();
  expect(
    assignmentStatus(
      "Submission status No submissions have been made yet\nSubmission status Submitted for grading",
    ),
  ).toBeNull();
});

it("discovers an assignment without a form, preserves draft history on restart and completes only after its status changes", async () => {
  const s = setup();
  expect((await s.apply(s.event()))?.state).toBe("accepted");
  const first = s.db.agent.tasks()[0]!;
  expect(first.intent).toBe("assignment");
  expect(first.resourceKey).toBeDefined();
  expect(first.nextAction).toContain("email");
  expect((await s.apply(s.event("Draft (not submitted)")))?.state).toBe(
    "accepted",
  );
  s.restart();
  const draft = s.db.agent.tasks()[0]!;
  expect(draft.id).toBe(first.id);
  expect(draft.progress.at(-1)?.kind).toBe("draft_saved");
  expect(draft.stage).toBe("ongoing");
  expect((await s.apply(s.event("Submitted for grading"), true))?.state).toBe(
    "accepted",
  );
  const done = s.db.agent.tasks()[0]!;
  expect(done.stage).toBe("completed");
  expect(done.completedBy).toBe("observation");
  expect(done.progress.some((p) => p.kind === "draft_saved")).toBe(true);
});

it("keeps identically named assignments separate and ignores first-seen submitted work", async () => {
  const s = setup();
  await s.apply(s.event());
  await s.apply(s.event("No submissions have been made yet", "12308"));
  expect(s.db.agent.tasks()).toHaveLength(2);
  expect(new Set(s.db.agent.tasks().map((t) => t.resourceKey)).size).toBe(2);
  await s.apply(s.event("Submitted for grading", "12309"));
  expect(s.db.agent.tasks()).toHaveLength(2);
});

it("requires a fresh same-assignment, same-tab pending-to-submitted transition; generic work needs user completion", async () => {
  const s = setup(),
    pending = s.event();
  await s.apply(pending);
  const task = s.db.agent.tasks()[0]!,
    receipt = s.event("Submitted for grading");
  const allowed = (
    current = receipt,
    anchor: ObservationEvent | null = pending,
    seen = false,
  ) =>
    completionAllowed(
      task,
      current,
      anchor,
      [],
      Date.parse(receipt.observedAt),
      seen,
    );
  expect(allowed()).toBe(true);
  expect(allowed({ ...receipt, streamId: randomUUID() })).toBe(false);
  expect(
    allowed({ ...receipt, page: { ...receipt.page, pageKey: "f".repeat(64) } }),
  ).toBe(false);
  expect(
    allowed({
      ...receipt,
      page: {
        ...receipt.page,
        content: "Lab Assignment 1\nSubmission status\nDraft (not submitted)",
      },
    }),
  ).toBe(false);
  expect(allowed(receipt, null)).toBe(false);
  expect(allowed(receipt, pending, true)).toBe(false);
  expect(allowed({ ...receipt, observedAt: pending.observedAt })).toBe(false);
  expect(
    completionAllowed(
      task,
      receipt,
      pending,
      [],
      Date.parse(receipt.observedAt) + 120001,
      false,
    ),
  ).toBe(false);
  expect(
    completionAllowed(
      { ...task, corrected: true },
      receipt,
      pending,
      [],
      Date.parse(receipt.observedAt),
      false,
    ),
  ).toBe(false);
  expect(
    completionAllowed(
      { ...task, intent: "work" },
      receipt,
      pending,
      [],
      Date.parse(receipt.observedAt),
      false,
    ),
  ).toBe(false);
  const request = agentRequest({
    current: receipt,
    tasks: [{ ...task, intent: "work" }],
    history: [pending],
    toolResults: [],
  });
  expect(JSON.parse(request.messages[1]!.content).completionAnchors).toEqual(
    [],
  );
});

it("preserves earlier tasks when an old path-only assignment return link cannot identify its resource", async () => {
  const s = setup();
  await s.apply(s.event());
  const task = s.db.agent.tasks()[0]!;
  s.db.agent.db
    .prepare("UPDATE agent_recovery SET url=? WHERE task_id=?")
    .run(`${site}/mod/assign/view.php`, task.id);
  s.restart();
  expect(s.db.agent.recovery.view().items[0]?.url).toBeNull();
  expect(s.db.agent.tasks()[0]?.id).toBe(task.id);
  expect(s.db.agent.history(task.id, task.revision).revisions[0]?.goal).toBe(
    task.goal,
  );
});

it("keeps a captured application receipt with three historical observations within the existing model input budget", () => {
  const context = historyBudget.context as DecisionContext;
  const request = agentRequest(context);
  expect(
    Buffer.byteLength(JSON.stringify(request.messages)),
  ).toBeLessThanOrEqual(request.maxInputBytes);
  const input = JSON.parse(request.messages[1]!.content);
  expect(
    input.completionAnchors.some(
      (anchor: { eventId: string }) =>
        anchor.eventId === context.tasks[0]!.progress.at(-1)!.eventId,
    ),
  ).toBe(true);
  expect(
    sourceSpans(context).some((span) =>
      span.quote.includes("Application successfully submitted"),
    ),
  ).toBe(true);
});

it("does not spend an inference call or show an AI failure for first-seen already-submitted assignments", async () => {
  const s = setup();
  expect(await s.apply(s.event("Submitted for grading"))).toBeNull();
  expect(s.db.agent.tasks()).toHaveLength(0);
  expect(s.db.agent.pending()).toHaveLength(0);
  expect(s.db.agent.remaining()).toBe(30);
});

it("does not offer educational assignment intent for scholarship applications without an assignment submission table", () => {
  const c = historyBudget.context as DecisionContext;
  const request = agentRequest(c);
  const choices = JSON.stringify(request.schema);
  expect(choices).not.toContain('"assignment"');
  expect(() =>
    validateDecision(
      {
        tool: "upsert_task",
        taskId: null,
        intent: "assignment",
        goal: "Submit this application",
        stage: "ongoing",
        finishCondition: "Receive a matching receipt",
        nextAction: "Review the application",
        evidenceRefs: ["current:0"],
      },
      c,
    ),
  ).toThrow("Assignment intent requires");
});
