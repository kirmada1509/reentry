import { http, HttpResponse } from "msw/http";
import { sourceSpans } from "../../src/features/agent/prompt";
import type { DecisionContext } from "../../src/features/agent/prompt";
import { delay } from "msw";
import { assignmentStatus } from "../../src/features/agent/progress";
export const MOCK_MODEL = "reentry-test";
export const MOCK_DIGEST = "synthetic-model-digest-not-a-real-model";
export const modelHandlers = [
  http.get("*/api/tags", () =>
    HttpResponse.json({ models: [{ name: MOCK_MODEL, digest: MOCK_DIGEST }] }),
  ),
  http.post("*/api/chat", async ({ request }) => {
    const body = (await request.json()) as {
      model: string;
      messages: { role: string; content: string }[];
    };
    const agentContext = JSON.parse(
      body.messages[1]!.content,
    ) as DecisionContext & {
      completionAnchors?: Array<{ taskId: string; eventId: string }>;
    };
    if (agentContext.current) {
      const c = agentContext.current;
      if (c.page.content.includes("fake-unavailable"))
        return new HttpResponse(null, { status: 503 });
      if (c.page.content.includes("fake-delay")) await delay(1500);
      if (c.page.title === "Fictional campus · Lab Assignment 1") {
        // Deterministic test transport, never used as production interpretation.
        const status = assignmentStatus(c.page.content);
        const task = agentContext.tasks[0];
        const anchor = agentContext.completionAnchors?.find(
          (a) => a.taskId === task?.id,
        );
        const receipt = sourceSpans(agentContext).find(
          (s) =>
            s.eventId === c.eventId &&
            s.quote.includes("Submitted for grading"),
        );
        const decision =
          status === "submitted"
            ? task && anchor && receipt
              ? {
                  tool: "complete_task",
                  taskId: task.id,
                  anchorEventId: anchor.eventId,
                  receiptSubject: "Lab Assignment 1",
                  evidenceRefs: [receipt.id],
                }
              : { tool: "ignore" }
            : {
                tool: "upsert_task",
                taskId: task?.id ?? null,
                goal: "Submit Lab Assignment 1",
                subject: "Lab Assignment 1",
                intent: "assignment",
                stage: "ongoing",
                finishCondition:
                  "The same assignment shows Submitted for grading",
                nextAction:
                  status === "draft"
                    ? "Review the saved draft and submit the assignment"
                    : "Review the referenced assignment email, then prepare the dataset",
                checkpoint: {
                  kind: status === "draft" ? "draft_saved" : "editing",
                  summary:
                    status === "draft"
                      ? "Draft saved; not submitted"
                      : "No submission has been made",
                },
                evidenceRefs: ["current:0"],
              };
        return HttpResponse.json({
          model: body.model,
          done: true,
          done_reason: "stop",
          message: { role: "assistant", content: JSON.stringify(decision) },
        });
      }
      let decision: unknown = { tool: "inspect_history" };
      if (agentContext.toolResults.length) {
        const application = /application|scholarship/i.test(
          c.page.title + " " + c.page.content,
        );
        const purchase = /cart ready|checkout started/i.test(c.page.content);
        const goal = application
          ? "Work on the scholarship application"
          : purchase
            ? "Buy the Cedar backpack"
            : "Compare the Cedar backpack";
        const subject = c.page.content.includes("Northstar Opportunity Award")
          ? "Northstar Opportunity Award"
          : undefined;
        const review =
          /final review/i.test(c.page.content) &&
          !/Still to do/.test(c.page.content);
        const receipt = /Application successfully submitted/i.test(
          c.page.content,
        );
        const blocked = /Validation error:/i.test(c.page.content);
        const changed = /Supply two referees|requires two referees/i.test(
          c.page.content,
        );
        const saved = /Draft saved in this browser|Saved in this browser/i.test(
          c.page.content,
        );
        const task = agentContext.tasks.find((t) =>
          application
            ? (t.subject === subject && Boolean(subject)) ||
              /application|scholarship/i.test(t.goal)
            : t.goal.includes("Cedar") ||
              t.evidence.some((e) => e.quote.includes("Cedar")),
        );
        const anchor = agentContext.completionAnchors?.find(
          (point) => point.taskId === task?.id,
        );
        const receiptRef = sourceSpans(agentContext).find(
          (s) =>
            s.eventId === c.eventId &&
            /Application successfully submitted/i.test(s.quote),
        );
        decision =
          receipt && task && anchor && receiptRef
            ? {
                tool: "complete_task",
                taskId: task.id,
                anchorEventId: anchor.eventId,
                receiptSubject: subject ?? null,
                evidenceRefs: [receiptRef.id],
              }
            : c.page.content.includes("Unrelated notes")
              ? { tool: "ignore" }
              : {
                  tool: "upsert_task",
                  taskId: task?.id ?? null,
                  goal,
                  intent: application
                    ? "application"
                    : purchase
                      ? "purchase"
                      : "research",
                  stage: application || purchase ? "ongoing" : "candidate",
                  finishCondition: application
                    ? "A matching application submission receipt is visible"
                    : purchase
                      ? "An order confirmation matching this backpack is visible"
                      : "Decide whether the backpack belongs on my shortlist",
                  nextAction: application
                    ? "Review the remaining application sections"
                    : "Compare the backpack details",
                  ...(application
                    ? {
                        checkpoint: {
                          kind: blocked
                            ? "blocked"
                            : review
                              ? "review_ready"
                              : changed
                                ? "requirements_changed"
                                : saved
                                  ? "draft_saved"
                                  : "editing",
                          summary: blocked
                            ? "Validation needs attention; application not submitted"
                            : review
                              ? "Application ready for final review"
                              : changed
                                ? "Two referees now required; preserve transcript progress"
                                : saved
                                  ? "Application draft saved; transcript progress retained"
                                  : "Application editing in progress",
                        },
                        ...(subject ? { subject } : {}),
                      }
                    : {}),
                  evidenceRefs: [
                    c.page.content.includes("fake-invalid")
                      ? "current:999"
                      : "current:0",
                  ],
                };
      }
      return HttpResponse.json({
        model: body.model,
        done: true,
        done_reason: "stop",
        message: { role: "assistant", content: JSON.stringify(decision) },
      });
    }
    const context = JSON.parse(body.messages[1]!.content) as {
      goal: string;
      confirmedProgress: string;
      before: { sourceId: string; text: string };
      after: { sourceId: string; text: string };
    };
    const mode = context.goal.match(/case:([a-z-]+)/)?.[1] ?? "valid";
    if (mode === "unavailable") return new HttpResponse(null, { status: 503 });
    if (mode === "timeout" || mode === "cancel" || mode === "stale")
      await delay(3000);
    if (mode === "empty")
      return HttpResponse.json({
        model: body.model,
        done: true,
        done_reason: "stop",
        message: { role: "assistant", content: "" },
      });
    const proposal = {
      assessment: "changed",
      summary:
        "The captured instructions now require two referees. Your transcript progress is preserved.",
      confirmedProgress: context.confirmedProgress,
      changes: [
        {
          description: "Referee count increased",
          before: {
            sourceId: context.before.sourceId,
            quote: "Supply one referee.",
          },
          after: {
            sourceId: context.after.sourceId,
            quote: "Supply two referees.",
          },
        },
      ],
      questions: [],
      nextAction: {
        instruction:
          "Find and add the first referee; the second remains to be done afterward.",
        target: "work",
      },
    };
    if (mode === "bad-quote")
      proposal.changes[0]!.after.quote = "Invented quotation";
    if (mode === "bad-id")
      proposal.changes[0]!.after.sourceId = crypto.randomUUID();
    if (mode === "progress")
      proposal.confirmedProgress = "Everything submitted";
    if (mode === "destination")
      proposal.nextAction.target = "https://untrusted.example/";
    if (mode === "completion") Object.assign(proposal, { completed: true });
    return HttpResponse.json({
      model: body.model,
      done: mode !== "truncated",
      done_reason: mode === "truncated" ? "length" : "stop",
      message: {
        role: "assistant",
        content:
          mode === "malformed"
            ? "{broken"
            : mode === "refused"
              ? "I cannot help"
              : JSON.stringify(proposal),
      },
    });
  }),
];
