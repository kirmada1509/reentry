import "server-only";
import { createHash, randomUUID } from "node:crypto";
import type Database from "better-sqlite3";
import { AppError } from "@/lib/http/errors";
import {
  eventSchema,
  scopeAllows,
  sessionSchema,
} from "../observation/protocol";
import type { ObservationEvent } from "../observation/protocol";
import type {
  AgentAction,
  AgentDecision,
  AgentTask,
  AgentView,
} from "./schema";
import { taskSchema } from "./schema";
import { sourceSpans } from "./prompt";
import type { DecisionContext } from "./prompt";
import {
  affirmativeReceipt,
  completionAllowed,
  hasSubject,
  normalizeSubject,
  blockingFailure,
  finalReview,
} from "./progress";

import { RecoveryStore } from "./recovery-store";

const HOUR = 3_600_000;
type Settings = {
  enabled: number;
  session: string | null;
  consent: string | null;
  version: number;
};
export type Job = {
  id: string;
  state: string;
  attempt: number;
  calls: number;
  context: string | null;
  proposal: string | null;
  lease: number;
  created: number;
  request_id: string;
};
export class TaskStore {
  readonly recovery: RecoveryStore;
  constructor(
    readonly db: Database.Database,
    readonly now = () => Date.now(),
  ) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS agent_settings (id INTEGER PRIMARY KEY CHECK(id=1), enabled INTEGER NOT NULL, session TEXT, consent TEXT, version INTEGER NOT NULL);
      INSERT OR IGNORE INTO agent_settings VALUES(1,0,NULL,NULL,0);
      CREATE TABLE IF NOT EXISTS agent_tasks (id TEXT PRIMARY KEY, body TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS agent_jobs (id TEXT PRIMARY KEY, state TEXT NOT NULL, attempt INTEGER NOT NULL DEFAULT 1, calls INTEGER NOT NULL DEFAULT 0, context TEXT, proposal TEXT, lease INTEGER NOT NULL DEFAULT 0, created INTEGER NOT NULL, request_id TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS agent_effects (id TEXT PRIMARY KEY, task_id TEXT, created INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS agent_task_history (task_id TEXT NOT NULL, revision INTEGER NOT NULL, body TEXT NOT NULL, PRIMARY KEY(task_id,revision));
      CREATE TABLE IF NOT EXISTS agent_task_pages (task_id TEXT NOT NULL, origin TEXT NOT NULL, page_key TEXT NOT NULL, PRIMARY KEY(task_id,origin,page_key));
      CREATE TABLE IF NOT EXISTS agent_calls (id INTEGER PRIMARY KEY, created INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS agent_deleted_pages (task_id TEXT NOT NULL, origin TEXT NOT NULL, page_key TEXT NOT NULL, deleted_at INTEGER NOT NULL, PRIMARY KEY(task_id,origin,page_key));
      CREATE TABLE IF NOT EXISTS agent_seen_receipts (digest TEXT PRIMARY KEY, first_seen INTEGER NOT NULL);
    `);
    this.recovery = new RecoveryStore(db, now, () => this.tasks());
  }
  settings() {
    return this.db
      .prepare("SELECT * FROM agent_settings WHERE id=1")
      .get() as Settings;
  }
  tasks() {
    return (
      this.db.prepare("SELECT body FROM agent_tasks ORDER BY rowid").all() as {
        body: string;
      }[]
    ).map((r) => taskSchema.parse(JSON.parse(r.body)));
  }
  event(id: string) {
    const row = this.db
      .prepare("SELECT body FROM observations WHERE id=?")
      .get(id) as { body: string } | undefined;
    if (!row) return null;
    const event = eventSchema.parse(JSON.parse(row.body));
    return this.now() - Date.parse(event.observedAt) <= 86_400_000
      ? event
      : null;
  }
  allowed(event: ObservationEvent) {
    const settings = this.settings();
    const row = this.db
      .prepare(
        "SELECT session FROM observation_devices WHERE id=? AND revoked=0",
      )
      .get(event.deviceId) as { session: string | null } | undefined;
    const session = row?.session
      ? sessionSchema.parse(JSON.parse(row.session))
      : null;
    return Boolean(
      settings.enabled &&
      session &&
      !session.paused &&
      settings.session === session.id &&
      event.sessionId === session.id &&
      scopeAllows(session.scope, event.page.origin, ""),
    );
  }
  stop() {
    this.db
      .prepare(
        "UPDATE agent_settings SET enabled=0, version=version+1 WHERE id=1 AND enabled=1",
      )
      .run();
    this.db
      .prepare(
        "UPDATE agent_jobs SET state='stale' WHERE state IN ('pending','running')",
      )
      .run();
  }
  clear() {
    this.stop();
    this.recovery.clear();
    for (const table of [
      "agent_tasks",
      "agent_jobs",
      "agent_effects",
      "agent_task_history",
      "agent_task_pages",
      "agent_deleted_pages",
      "agent_seen_receipts",
    ])
      this.db.prepare(`DELETE FROM ${table}`).run();
    // Only opaque job identifiers live in graph checkpoints, never page bodies.
    for (const table of ["checkpoints", "writes"])
      if (
        this.db
          .prepare(
            "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
          )
          .get(table)
      )
        this.db
          .prepare(`DELETE FROM ${table} WHERE thread_id LIKE 'agent:%'`)
          .run();
  }
  enqueue(event: ObservationEvent, requestId: string = randomUUID()) {
    if (affirmativeReceipt(event.page.content))
      this.db
        .prepare("INSERT OR IGNORE INTO agent_seen_receipts VALUES(?,?)")
        .run(this.receiptDigest(event), Date.parse(event.observedAt));
    if (
      !this.allowed(event) ||
      this.db
        .prepare(
          "SELECT 1 FROM agent_deleted_pages WHERE origin=? AND deleted_at>=?",
        )
        .get(event.page.origin, Date.parse(event.observedAt))
    )
      return;
    const newer = this.superseded(event);
    if (newer) return;
    // Coalesce pending work by site; history remains available through the tool.
    for (const job of this.pending()) {
      if (this.event(job.id)?.page.origin === event.page.origin)
        this.db
          .prepare(
            "UPDATE agent_jobs SET state='stale' WHERE id=? AND state='pending'",
          )
          .run(job.id);
    }
    this.db
      .prepare(
        "INSERT OR IGNORE INTO agent_jobs(id,state,created,request_id) VALUES(?,'pending',?,?)",
      )
      .run(event.eventId, this.now(), requestId);
  }
  private receiptDigest(event: ObservationEvent) {
    return createHash("sha256")
      .update(
        event.page.origin +
          "\n" +
          event.page.pageKey +
          "\n" +
          normalizeSubject(event.page.content.replace(/\[\d+\]/g, "")),
      )
      .digest("hex");
  }
  private superseded(event: ObservationEvent) {
    const rowid = (id: string) =>
      (
        this.db
          .prepare("SELECT rowid AS n FROM observations WHERE id=?")
          .get(id) as { n: number } | undefined
      )?.n ?? 0;
    return this.recent(event.page.origin).some(
      (e) =>
        e.eventId !== event.eventId &&
        (Date.parse(e.observedAt) > Date.parse(event.observedAt) ||
          (e.observedAt === event.observedAt &&
            rowid(e.eventId) > rowid(event.eventId))),
    );
  }
  recent(origin: string) {
    return (
      this.db
        .prepare(
          "SELECT body FROM observations ORDER BY received DESC,rowid DESC LIMIT 1000",
        )
        .all() as { body: string }[]
    )
      .map((r) => eventSchema.parse(JSON.parse(r.body)))
      .filter(
        (e) =>
          e.page.origin === origin &&
          this.allowed(e) &&
          this.now() - Date.parse(e.observedAt) <= 86_400_000,
      )
      .slice(0, 4);
  }
  pending() {
    return this.db
      .prepare(
        "SELECT * FROM agent_jobs WHERE state IN ('pending','running') ORDER BY created",
      )
      .all() as Job[];
  }
  job(id: string) {
    return this.db.prepare("SELECT * FROM agent_jobs WHERE id=?").get(id) as
      Job | undefined;
  }
  remaining() {
    this.db
      .prepare("DELETE FROM agent_calls WHERE created < ?")
      .run(this.now() - HOUR);
    return Math.max(
      0,
      30 -
        (
          this.db.prepare("SELECT COUNT(*) AS n FROM agent_calls").get() as {
            n: number;
          }
        ).n,
    );
  }
  claim(consent: string): Job | null {
    return this.db.transaction(() => {
      this.prune();
      if (!this.settings().enabled || this.settings().consent !== consent)
        return null;
      if (
        this.pending().some(
          (j) => j.state === "running" && j.lease > this.now(),
        )
      )
        return null;
      const last = this.db
        .prepare("SELECT MAX(created) AS t FROM agent_calls")
        .get() as { t: number | null };
      if (!this.remaining() || (last.t !== null && this.now() - last.t < 8000))
        return null;
      for (const job of this.pending()) {
        const event = this.event(job.id);
        if (!event || !this.allowed(event)) {
          this.finish(job.id, "stale");
          continue;
        }
        if (job.state === "pending") {
          const context = {
            current: event.eventId,
            version: this.settings().version,
            tasks: this.tasks()
              .filter((t) => t.origin === event.page.origin)
              .slice(-8),
            history: [] as string[],
            toolResults: [] as DecisionContext["toolResults"],
          };
          this.db
            .prepare("UPDATE agent_jobs SET context=? WHERE id=?")
            .run(JSON.stringify(context), job.id);
        }
        this.db
          .prepare("UPDATE agent_jobs SET state='running', lease=? WHERE id=?")
          .run(this.now() + 210_000, job.id);
        return this.job(job.id)!;
      }
      return null;
    })();
  }
  context(id: string): DecisionContext {
    const job = this.job(id);
    if (!job || job.state !== "running" || job.lease < this.now())
      throw new Error("Job no longer active.");
    const snapshot = JSON.parse(job.context!) as {
      current: string;
      tasks: AgentTask[];
      history: string[];
      toolResults: DecisionContext["toolResults"];
    };
    const current = this.event(snapshot.current);
    if (!current || !this.allowed(current)) throw new Error("Context revoked.");
    return {
      current,
      tasks: snapshot.tasks.map((task) => taskSchema.parse(task)),
      history: snapshot.history
        .map((key) => this.event(key))
        .filter((e): e is ObservationEvent => Boolean(e)),
      toolResults: snapshot.toolResults,
    };
  }
  charge(id: string, consent: string) {
    this.db.transaction(() => {
      this.context(id);
      if (
        this.settings().consent !== consent ||
        !this.remaining() ||
        this.job(id)!.calls >= 3
      )
        throw new Error("Inference budget or consent changed.");
      this.db
        .prepare("INSERT INTO agent_calls(created) VALUES(?)")
        .run(this.now());
      this.db.prepare("UPDATE agent_jobs SET calls=calls+1 WHERE id=?").run(id);
    })();
  }
  propose(id: string, decision: AgentDecision) {
    this.db
      .prepare(
        "UPDATE agent_jobs SET proposal=? WHERE id=? AND state='running'",
      )
      .run(JSON.stringify(decision), id);
  }
  tool(id: string, decision: AgentDecision) {
    const job = this.job(id)!;
    const context = this.context(id);
    const snapshot = JSON.parse(job.context!) as {
      history: string[];
      toolResults: DecisionContext["toolResults"];
    };
    if (decision.tool === "inspect_history") {
      const history = this.recent(context.current.page.origin)
        .filter((e) => e.eventId !== id)
        .slice(0, 3);
      snapshot.history = history.map((e) => e.eventId);
      // Text is loaded just-in-time, not duplicated into graph/job memory.
      snapshot.toolResults.push({
        tool: decision.tool,
        result: history.map((e) => e.eventId),
      });
    } else if (decision.tool === "read_task") {
      const task = context.tasks.find((t) => t.id === decision.taskId);
      if (!task) throw new Error("Unknown task.");
      snapshot.toolResults.push({
        tool: decision.tool,
        result: (
          this.db
            .prepare(
              "SELECT body FROM agent_task_history WHERE task_id=? ORDER BY revision DESC LIMIT 5",
            )
            .all(task.id) as { body: string }[]
        ).map((row) => taskSchema.parse(JSON.parse(row.body))),
      });
    } else throw new Error("Invalid read tool.");
    this.db
      .prepare(
        "UPDATE agent_jobs SET context=?, proposal=NULL WHERE id=? AND state='running'",
      )
      .run(JSON.stringify(snapshot), id);
  }
  apply(id: string, decision: AgentDecision, consent: string) {
    return this.db.transaction(() => {
      if (this.db.prepare("SELECT id FROM agent_effects WHERE id=?").get(id))
        return "accepted";
      const context = this.context(id);
      const snapshot = JSON.parse(this.job(id)!.context!) as {
        version: number;
      };
      if (
        snapshot.version !== this.settings().version ||
        this.settings().consent !== consent ||
        this.superseded(context.current)
      ) {
        this.finish(id, "stale");
        return "stale";
      }
      if (decision.tool === "ignore") {
        this.finish(id, "ignored");
        return "ignored";
      }
      if (decision.tool !== "upsert_task" && decision.tool !== "complete_task")
        throw new Error("Not an effect.");
      const old = context.tasks.find((t) => t.id === decision.taskId);
      if (old?.dismissed) {
        this.finish(id, "stale");
        return "stale";
      }
      if (!old && affirmativeReceipt(context.current.page.content)) {
        this.finish(id, "ignored");
        return "ignored";
      }
      if (!old) {
        if (
          this.db
            .prepare(
              "SELECT 1 FROM agent_deleted_pages WHERE origin=? AND page_key=?",
            )
            .get(context.current.page.origin, context.current.page.pageKey)
        ) {
          this.finish(id, "ignored");
          return "ignored";
        }
        const pages = this.db
          .prepare(
            "SELECT task_id FROM agent_task_pages WHERE origin=? AND page_key=?",
          )
          .all(context.current.page.origin, context.current.page.pageKey) as {
          task_id: string;
        }[];
        if (
          pages.some((p) => {
            const task = this.tasks().find((t) => t.id === p.task_id);
            return (
              task &&
              (task.dismissed ||
                ["completed", "cancelled"].includes(task.stage))
            );
          })
        ) {
          this.finish(id, "ignored");
          return "ignored";
        }
      }
      if (!old && this.tasks().length >= 100)
        throw new Error("Task capacity reached.");
      if (old && ["completed", "cancelled"].includes(old.stage)) {
        this.finish(id, "ignored");
        return "ignored";
      }
      const event = context.current;
      let task: AgentTask;
      if (decision.tool === "complete_task") {
        if (!old) throw new Error("Missing completion task.");
        const anchor = this.event(decision.anchorEventId);
        const between = (
          this.db
            .prepare("SELECT body FROM observations ORDER BY rowid")
            .all() as { body: string }[]
        )
          .map((r) => eventSchema.parse(JSON.parse(r.body)))
          .filter(
            (e) =>
              e.streamId === event.streamId &&
              e.eventId !== event.eventId &&
              Date.parse(e.observedAt) > Date.parse(anchor?.observedAt ?? "") &&
              Date.parse(e.observedAt) < Date.parse(event.observedAt),
          );
        const seen = this.db
          .prepare("SELECT first_seen FROM agent_seen_receipts WHERE digest=?")
          .get(this.receiptDigest(event)) as { first_seen: number } | undefined;
        if (
          (decision.receiptSubject &&
            !hasSubject(decision.receiptSubject, old.subject ?? "")) ||
          this.tasks().some(
            (t) =>
              t.id !== old.id &&
              t.subject &&
              !hasSubject(t.subject, old.subject ?? "") &&
              hasSubject(event.page.content, t.subject),
          ) ||
          !completionAllowed(
            old,
            event,
            anchor,
            between,
            this.now(),
            Boolean(seen && seen.first_seen < Date.parse(event.observedAt)),
          ) ||
          !decision.evidence.some(
            (e) => e.eventId === event.eventId && affirmativeReceipt(e.quote),
          )
        )
          throw new Error("Completion evidence is not fresh and task-matched.");
        const progress = [...old.progress];
        if (anchor && !progress.some((p) => p.eventId === anchor.eventId))
          progress.push({
            kind: "review_ready",
            summary: "Final review recovered from recent page evidence.",
            eventId: anchor.eventId,
            observedAt: anchor.observedAt,
            streamId: anchor.streamId,
            evidence: sourceSpans({
              current: anchor,
              tasks: [],
              history: [],
              toolResults: [],
            })
              .slice(0, 3)
              .map(({ eventId, quote }) => ({ eventId, quote })),
          });
        task = taskSchema.parse({
          ...old,
          revision: old.revision + 1,
          stage: "completed",
          completedBy: "observation",
          nextAction:
            "Finished according to the observed confirmation. Reopen if this is incorrect.",
          evidence: decision.evidence,
          updatedAt: new Date(this.now()).toISOString(),
          progress: [
            ...progress.slice(-11),
            {
              kind: "confirmed",
              summary: "A fresh matching confirmation was observed.",
              eventId: event.eventId,
              observedAt: event.observedAt,
              streamId: event.streamId,
              evidence: decision.evidence,
            },
          ],
        });
      } else {
        const subject = old?.subject ?? decision.subject;
        const knownSubject = Boolean(
          old?.subject &&
          decision.subject &&
          hasSubject(old.subject, decision.subject) &&
          hasSubject(decision.subject, old.subject),
        );
        if (
          decision.subject &&
          ((!hasSubject(event.page.content, decision.subject) &&
            !(
              knownSubject &&
              event.streamId &&
              old?.progress.at(-1)?.streamId === event.streamId
            )) ||
            (old &&
              !hasSubject(
                old.subject ??
                  old.goal + " " + old.evidence.map((e) => e.quote).join(" "),
                decision.subject,
              )))
        )
          throw new Error(
            "Subject must be supported by this task and current evidence.",
          );
        const checkpoint =
          decision.checkpoint && blockingFailure(event.page.content)
            ? { ...decision.checkpoint, kind: "blocked" as const }
            : decision.checkpoint;
        if (
          checkpoint?.kind === "review_ready" &&
          (!subject || !finalReview(event, subject))
        )
          throw new Error(
            "Final review requires current subject and final action.",
          );
        const progress = [...(old?.progress ?? [])];
        if (checkpoint)
          progress.push({
            ...checkpoint,
            eventId: event.eventId,
            observedAt: event.observedAt,
            streamId: event.streamId,
            evidence: decision.evidence,
          });
        task = taskSchema.parse({
          id: old?.id ?? randomUUID(),
          revision: (old?.revision ?? 0) + 1,
          origin: context.current.page.origin,
          goal: old?.corrected ? old.goal : decision.goal,
          finishCondition: old?.corrected
            ? old.finishCondition
            : decision.finishCondition,
          intent: old?.corrected ? old.intent : decision.intent,
          corrected: old?.corrected ?? false,
          stage:
            checkpoint?.kind === "cancelled" ? "cancelled" : decision.stage,
          nextAction: decision.nextAction,
          evidence: decision.evidence,
          dismissed: false,
          updatedAt: new Date(this.now()).toISOString(),
          subject,
          progress: progress.slice(-12),
        });
      }
      this.db
        .prepare(
          "INSERT INTO agent_tasks VALUES(?,?) ON CONFLICT(id) DO UPDATE SET body=excluded.body",
        )
        .run(task.id, JSON.stringify(task));
      this.remember(task);
      this.db
        .prepare("INSERT OR IGNORE INTO agent_task_pages VALUES(?,?,?)")
        .run(
          task.id,
          context.current.page.origin,
          context.current.page.pageKey,
        );
      this.recovery.capture(task, context.current);
      this.db
        .prepare("INSERT INTO agent_effects VALUES(?,?,?)")
        .run(id, task.id, this.now());
      this.db
        .prepare("UPDATE agent_settings SET version=version+1 WHERE id=1")
        .run();
      this.finish(id, "accepted");
      return "accepted";
    })();
  }
  private remember(task: AgentTask) {
    this.db
      .prepare("INSERT INTO agent_task_history VALUES(?,?,?)")
      .run(task.id, task.revision, JSON.stringify(task));
    this.db
      .prepare(
        "DELETE FROM agent_task_history WHERE task_id=? AND revision NOT IN (SELECT revision FROM agent_task_history WHERE task_id=? ORDER BY revision DESC LIMIT 10)",
      )
      .run(task.id, task.id);
  }
  finish(id: string, state: string) {
    this.db
      .prepare("UPDATE agent_jobs SET state=?,lease=0 WHERE id=?")
      .run(state, id);
  }
  action(
    input: AgentAction,
    processing: AgentView["processing"],
    requestId: string = randomUUID(),
  ) {
    this.db.transaction(() => {
      if (input.action === "reminder_policy") {
        this.recovery.configure(input.policy, input.expectedVersion);
        return;
      }
      if (input.action === "disable") {
        this.stop();
        return;
      }
      if (input.action === "enable") {
        const row = this.db
          .prepare(
            "SELECT session FROM observation_devices WHERE revoked=0 ORDER BY rowid DESC LIMIT 1",
          )
          .get() as { session: string | null } | undefined;
        const session = row?.session
          ? sessionSchema.parse(JSON.parse(row.session))
          : null;
        if (
          !processing.available ||
          input.consentId !== processing.consentId ||
          !session ||
          input.sessionId !== session.id ||
          session.paused
        )
          throw new AppError(
            "AGENT_CONSENT_REQUIRED",
            "Enable a site and review the current model's processing notice first.",
            409,
          );
        this.stop();
        this.db
          .prepare(
            "UPDATE agent_settings SET enabled=1,session=?,consent=? WHERE id=1",
          )
          .run(session.id, input.consentId);
        const latest = this.db
          .prepare(
            "SELECT body FROM observations ORDER BY received DESC,rowid DESC LIMIT 1",
          )
          .get() as { body: string } | undefined;
        if (latest)
          this.enqueue(eventSchema.parse(JSON.parse(latest.body)), requestId);
        return;
      }
      if (input.action === "retry") {
        if (
          this.settings().consent !== processing.consentId ||
          !this.settings().enabled
        )
          throw new AppError(
            "AGENT_CONSENT_REQUIRED",
            "Enable AI understanding first.",
            409,
          );
        const failed = this.db
          .prepare(
            "SELECT * FROM agent_jobs WHERE state='failed' ORDER BY created DESC LIMIT 1",
          )
          .get() as Job | undefined;
        if (failed)
          this.db
            .prepare(
              "UPDATE agent_jobs SET state='pending',attempt=attempt+1,calls=0,context=NULL,proposal=NULL WHERE id=?",
            )
            .run(failed.id);
        return;
      }
      const old = this.tasks().find((t) => t.id === input.id);
      if (!old || old.revision !== input.expectedRevision)
        throw new AppError(
          "TASK_CONFLICT",
          "This task changed. Reload and review before saving; your input is still here.",
          409,
        );
      if (input.action === "recovery") {
        if (old.dismissed || ["completed", "cancelled"].includes(old.stage))
          throw new AppError(
            "TASK_FINISHED",
            "Reopen this task before changing recovery settings.",
            409,
          );
        this.recovery.view();
        this.recovery.change(old.id, input.change);
        return;
      }
      if (input.action === "delete") {
        this.db
          .prepare(
            "INSERT OR IGNORE INTO agent_deleted_pages SELECT task_id,origin,page_key,? FROM agent_task_pages WHERE task_id=?",
          )
          .run(this.now(), old.id);
        for (const table of ["agent_task_history", "agent_task_pages"])
          this.db.prepare(`DELETE FROM ${table} WHERE task_id=?`).run(old.id);
        this.db.prepare("DELETE FROM agent_tasks WHERE id=?").run(old.id);
        this.recovery.remove(old.id);
        this.db
          .prepare(
            "UPDATE agent_jobs SET context=NULL,proposal=NULL,state=CASE WHEN state IN ('pending','running') THEN 'stale' ELSE state END",
          )
          .run();
        this.db
          .prepare("UPDATE agent_settings SET version=version+1 WHERE id=1")
          .run();
        return;
      }
      const task = taskSchema.parse({
        ...old,
        ...(input.action === "correct"
          ? {
              goal: input.goal,
              finishCondition: input.finishCondition,
              intent: input.intent,
              corrected: true,
              completedBy: undefined,
              nextAction: "Review the task using your corrected goal.",
              stage: input.intent === "research" ? "candidate" : "uncertain",
            }
          : input.action === "finish"
            ? {
                stage: "completed",
                completedBy: "user",
                nextAction:
                  "Marked finished by you. Reopen if you need to return.",
              }
            : input.action === "reopen"
              ? {
                  stage: "uncertain",
                  completedBy: undefined,
                  progress: [],
                  nextAction:
                    "Review the current page to establish fresh progress.",
                }
              : { dismissed: true }),
        revision: old.revision + 1,
        updatedAt: new Date(this.now()).toISOString(),
      });
      if (input.action === "reopen") this.recovery.change(old.id, "resume");
      this.remember(task);
      this.db
        .prepare("UPDATE agent_tasks SET body=? WHERE id=?")
        .run(JSON.stringify(task), old.id);
      this.db
        .prepare("UPDATE agent_settings SET version=version+1 WHERE id=1")
        .run();
    })();
  }
  view(processing: AgentView["processing"]): AgentView {
    this.prune();
    const settings = this.settings();
    const enabled = Boolean(
      settings.enabled && settings.consent === processing.consentId,
    );
    const jobs = this.pending();
    const failed = this.db
      .prepare(
        "SELECT state FROM agent_jobs ORDER BY created DESC,rowid DESC LIMIT 1",
      )
      .get() as { state: string } | undefined;
    const remaining = this.remaining();
    return {
      enabled,
      recovery: this.recovery.view(),
      processing,
      callsRemaining: remaining,
      tasks: this.tasks().filter((t) => !t.dismissed),
      status:
        settings.enabled && !enabled
          ? "needs-consent"
          : !enabled
            ? "off"
            : !remaining
              ? "budget"
              : jobs.some((j) => j.state === "running")
                ? "thinking"
                : failed?.state === "failed"
                  ? "unavailable"
                  : "ready",
    };
  }
  prune() {
    this.db
      .prepare(
        "UPDATE agent_jobs SET state='stale' WHERE created < ? AND state IN ('pending','running')",
      )
      .run(this.now() - 86_400_000);
    // Job contexts contain short task excerpts. Keep them bounded to one day.
    this.db
      .prepare("DELETE FROM agent_jobs WHERE created < ?")
      .run(this.now() - 86_400_000);
    for (const table of ["checkpoints", "writes"])
      if (
        this.db
          .prepare(
            "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
          )
          .get(table)
      )
        this.db
          .prepare(
            `DELETE FROM ${table} WHERE thread_id LIKE 'agent:%' AND substr(thread_id,7,36) NOT IN (SELECT id FROM agent_jobs)`,
          )
          .run();
    this.db
      .prepare("DELETE FROM agent_effects WHERE created < ?")
      .run(this.now() - 2 * 86_400_000);
  }
}
