import { http, HttpResponse } from "msw/http";
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
