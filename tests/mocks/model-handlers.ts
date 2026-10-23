import { http, HttpResponse } from "msw/http";
import type { DecisionContext } from "../../src/features/agent/prompt";
import { delay } from "msw";
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
    ) as DecisionContext;
    if (agentContext.current) {
      const c = agentContext.current;
      if (c.page.content.includes("fake-unavailable"))
        return new HttpResponse(null, { status: 503 });
      if (c.page.content.includes("fake-delay")) await delay(1500);
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
        decision = c.page.content.includes("Unrelated notes")
          ? { tool: "ignore" }
          : {
              tool: "upsert_task",
              taskId:
                agentContext.tasks.find((t) =>
                  application
                    ? /application|scholarship/i.test(t.goal)
                    : t.goal.includes("Cedar") ||
                      t.evidence.some((e) => e.quote.includes("Cedar")),
                )?.id ?? null,
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
