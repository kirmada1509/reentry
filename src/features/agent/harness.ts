import "server-only";
import { Annotation, END, START, StateGraph } from "@langchain/langgraph";
import { SqliteSaver } from "@langchain/langgraph-checkpoint-sqlite";
import type { StructuredModel } from "@/lib/ai/model";
import { agentRequest, validateDecision } from "./prompt";
import { AppError } from "@/lib/http/errors";
import { decisionSchema } from "./schema";
import type { AgentView } from "./schema";
import type { TaskStore } from "./store";

const State = Annotation.Root({ jobId: Annotation<string>() });

/** Graph memory contains only a job ID. SQLite product records own all effects. */
export function createTaskHarness(
  store: TaskStore,
  model: () => StructuredModel,
  processing: () => AgentView["processing"],
  timeoutMs: number,
  afterEffect?: () => void,
) {
  const saver = new SqliteSaver(store.db);
  const graph = new StateGraph(State)
    .addNode("reason", async ({ jobId }) => {
      store.charge(jobId, processing().consentId);
      const context = store.context(jobId);
      const signal = AbortSignal.timeout(timeoutMs);
      let cancel: (() => void) | undefined;
      let output: Awaited<ReturnType<StructuredModel["generate"]>>;
      try {
        const deadline = new Promise<never>((_, reject) => {
          cancel = () => reject(new Error("Inference deadline reached."));
          signal.addEventListener("abort", cancel, { once: true });
        });
        output = await Promise.race([
          model().generate(agentRequest(context), signal),
          deadline,
        ]);
      } finally {
        if (cancel) signal.removeEventListener("abort", cancel);
      }
      signal.throwIfAborted();
      store.propose(jobId, validateDecision(output.candidate, context));
      return {};
    })
    .addNode("read", ({ jobId }) => {
      const job = store.job(jobId)!;
      if (job.calls >= 3) throw new Error("Read-tool budget exceeded.");
      store.tool(jobId, decisionSchema.parse(JSON.parse(job.proposal!)));
      return {};
    })
    .addNode("accept", ({ jobId }) => {
      const job = store.job(jobId);
      if (!job) return {};
      store.apply(
        jobId,
        decisionSchema.parse(JSON.parse(job.proposal!)),
        processing().consentId,
      );
      afterEffect?.();
      return {};
    })
    .addEdge(START, "reason")
    .addConditionalEdges(
      "reason",
      ({ jobId }) => {
        const job = store.job(jobId);
        if (!job || job.state !== "running") return "end";
        const decision = decisionSchema.parse(JSON.parse(job.proposal!));
        return decision.tool === "inspect_history" ||
          decision.tool === "read_task"
          ? "read"
          : "accept";
      },
      { read: "read", accept: "accept", end: END },
    )
    .addEdge("read", "reason")
    .addEdge("accept", END)
    .compile({ checkpointer: saver });
  let working = false;
  return {
    graph,
    async tick() {
      if (working) return null;
      working = true;
      let id: string | undefined;
      try {
        const current = processing();
        if (!current.available) return null;
        const job = store.claim(current.consentId);
        if (!job) return null;
        id = job.id;
        const config = {
          configurable: { thread_id: `agent:${id}:${job.attempt}` },
          recursionLimit: 12,
        };
        const saved = await graph.getState(config);
        await graph.invoke(saved.next.length ? null : { jobId: id }, config);
        await saver.deleteThread(config.configurable.thread_id);
        return {
          id,
          state: store.job(id)?.state ?? "cleared",
          requestId: job.request_id,
        };
      } catch (error) {
        // Never log provider bodies, page data or arbitrary exception messages.
        if (id && store.job(id)?.state === "running")
          store.finish(id, "failed");
        return id
          ? {
              id,
              state: store.job(id)?.state ?? "cleared",
              requestId: store.job(id)?.request_id,
              failureCode:
                error instanceof AppError
                  ? error.code
                  : error instanceof Error &&
                      error.message === "Inference deadline reached."
                    ? "MODEL_TIMEOUT"
                    : "INVALID_DECISION",
            }
          : null;
      } finally {
        working = false;
      }
    },
  };
}
