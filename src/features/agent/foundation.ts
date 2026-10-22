import Database from "better-sqlite3";
import { SqliteSaver } from "@langchain/langgraph-checkpoint-sqlite";
import {
  Annotation,
  Command,
  END,
  START,
  StateGraph,
  interrupt,
} from "@langchain/langgraph";
import { z } from "zod";

const decisionSchema = z.strictObject({
  action: z.enum(["wait", "complete"]),
  explanation: z.string().min(1).max(500),
});
const receiptSchema = z.strictObject({
  eventId: z.uuid(),
  confirmation: z.boolean(),
});
type Receipt = z.infer<typeof receiptSchema>;
export interface FoundationModel {
  decide(receipt: Receipt): Promise<unknown>;
}
const State = Annotation.Root({
  taskId: Annotation<string>(),
  eventId: Annotation<string>(),
  stage: Annotation<string>(),
  receipt: Annotation<Receipt>(),
  decision: Annotation<z.infer<typeof decisionSchema>>(),
});

/** Isolated fixture store: no connection to legacy tasks or live observations. */
export function openFoundation(
  filename: string,
  model: FoundationModel,
  afterEffect?: () => void,
) {
  const db = new Database(filename);
  db.pragma("journal_mode = WAL");
  db.pragma("busy_timeout = 5000");
  db.exec(`
    CREATE TABLE IF NOT EXISTS foundation_tasks (
      id TEXT PRIMARY KEY, stage TEXT NOT NULL, revision INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS foundation_effects (
      id TEXT PRIMARY KEY, task_id TEXT NOT NULL, stage TEXT NOT NULL
    );
  `);
  const saver = new SqliteSaver(db);
  const record = db.transaction(
    (taskId: string, eventId: string, stage: string) => {
      // A committed effect can be replayed after a crash before graph save.
      const inserted = db
        .prepare(
          "INSERT OR IGNORE INTO foundation_effects(id,task_id,stage) VALUES(?,?,?)",
        )
        .run(`${taskId}:${eventId}`, taskId, stage);
      if (inserted.changes) {
        db.prepare(
          `INSERT INTO foundation_tasks(id,stage,revision) VALUES(?,?,1)
           ON CONFLICT(id) DO UPDATE SET stage=excluded.stage,revision=revision+1`,
        ).run(taskId, stage);
      }
      return stage;
    },
  );
  const graph = new StateGraph(State)
    .addNode("checkpoint", (state) => {
      const stage = record(state.taskId, state.eventId, "interrupted");
      afterEffect?.();
      return { stage };
    })
    .addNode("await_evidence", () => ({
      receipt: receiptSchema.parse(
        interrupt({ reason: "Awaiting synthetic confirmation evidence" }),
      ),
    }))
    .addNode("interpret", async (state) => ({
      decision: decisionSchema.parse(await model.decide(state.receipt)),
    }))
    .addNode("complete", (state) => ({
      stage: record(state.taskId, state.receipt.eventId, "completed"),
    }))
    .addNode("wait", (state) => ({
      stage: record(state.taskId, state.receipt.eventId, "unverified"),
    }))
    .addEdge(START, "checkpoint")
    .addEdge("checkpoint", "await_evidence")
    .addEdge("await_evidence", "interpret")
    .addConditionalEdges("interpret", (state) => state.decision.action, {
      complete: "complete",
      wait: "wait",
    })
    .addEdge("complete", END)
    .addEdge("wait", END)
    .compile({ checkpointer: saver });
  return {
    graph,
    resume: (receipt: Receipt) =>
      new Command<
        Receipt,
        typeof State.Update,
        | "checkpoint"
        | "await_evidence"
        | "interpret"
        | "complete"
        | "wait"
        | "__start__"
      >({ resume: receipt }),
    inspect(taskId: string) {
      return {
        task: db
          .prepare("SELECT id,stage,revision FROM foundation_tasks WHERE id=?")
          .get(taskId),
        effects: db
          .prepare(
            "SELECT count(*) AS count FROM foundation_effects WHERE task_id=?",
          )
          .get(taskId),
      };
    },
    close: () => db.close(),
  };
}
