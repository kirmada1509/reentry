import "server-only";
import { createHash } from "node:crypto";
import type Database from "better-sqlite3";
import { AppError } from "@/lib/http/errors";
import { scopeAllows, sessionSchema } from "../observation/protocol";
import type { ObservationEvent } from "../observation/protocol";
import type { AgentTask } from "./schema";
import {
  defaultReminderPolicy,
  localTime,
  reminderPolicySchema,
} from "./recovery-schema";
import type {
  ReminderPolicy,
  RecoveryTick,
  RecoveryView,
  RecoveryDelivery,
} from "./recovery-schema";

type Recovery = {
  task_id: string;
  last_active: number;
  returned_at: number | null;
  url: string | null;
  waiting: number;
  muted: number;
  snoozed_until: number | null;
};
const MINUTE = 60_000;
const unfinished = (t: AgentTask) =>
  !t.dismissed && !["completed", "cancelled"].includes(t.stage);
const eligible = (t: AgentTask) =>
  unfinished(t) && t.stage !== "candidate" && t.intent !== "research";

/** Deterministic policy; neither website prose nor the model can schedule alerts. */
export class RecoveryStore {
  constructor(
    readonly db: Database.Database,
    readonly now: () => number,
    private readonly currentTasks: () => AgentTask[],
  ) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS agent_reminder_policy (id INTEGER PRIMARY KEY CHECK(id=1), version INTEGER NOT NULL, body TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS agent_recovery (task_id TEXT PRIMARY KEY, last_active INTEGER NOT NULL, returned_at INTEGER, url TEXT, waiting INTEGER NOT NULL DEFAULT 0, muted INTEGER NOT NULL DEFAULT 0, snoozed_until INTEGER);
      CREATE TABLE IF NOT EXISTS agent_work_pages (origin TEXT NOT NULL, page_key TEXT NOT NULL, url TEXT NOT NULL, last_active INTEGER NOT NULL, PRIMARY KEY(origin,page_key));
      CREATE TABLE IF NOT EXISTS agent_reminders (id TEXT PRIMARY KEY, task_id TEXT NOT NULL, day TEXT NOT NULL, created INTEGER NOT NULL, state TEXT NOT NULL, UNIQUE(task_id,day));
    `);
    db.prepare("INSERT OR IGNORE INTO agent_reminder_policy VALUES(1,0,?)").run(
      JSON.stringify(defaultReminderPolicy),
    );
  }
  policy() {
    const row = this.db
      .prepare("SELECT version,body FROM agent_reminder_policy WHERE id=1")
      .get() as { version: number; body: string };
    return {
      version: row.version,
      policy: reminderPolicySchema.parse(JSON.parse(row.body)),
    };
  }
  configure(policy: ReminderPolicy, expectedVersion: number) {
    const result = this.db
      .prepare(
        "UPDATE agent_reminder_policy SET version=version+1,body=? WHERE id=1 AND version=?",
      )
      .run(JSON.stringify(reminderPolicySchema.parse(policy)), expectedVersion);
    if (!result.changes)
      throw new AppError(
        "REMINDER_CONFLICT",
        "Reminder settings changed. Close and reopen settings to review before saving.",
        409,
      );
  }
  capture(task: AgentTask, event: ObservationEvent) {
    const page = this.db
      .prepare(
        "SELECT url,last_active FROM agent_work_pages WHERE origin=? AND page_key=?",
      )
      .get(event.page.origin, event.page.pageKey) as
      { url: string; last_active: number } | undefined;
    this.db
      .prepare(
        "INSERT OR IGNORE INTO agent_recovery(task_id,last_active,url) VALUES(?,?,?)",
      )
      .run(task.id, Date.parse(event.observedAt), page?.url ?? null);
    // Evidence arrival may be delayed; never move the activity clock backwards.
    this.db
      .prepare(
        "UPDATE agent_recovery SET last_active=MAX(last_active,?),url=COALESCE(?,url) WHERE task_id=?",
      )
      .run(
        Math.max(Date.parse(event.observedAt), page?.last_active ?? 0),
        page?.url ?? null,
        task.id,
      );
  }
  change(id: string, action: "wait" | "resume" | "snooze" | "mute" | "unmute") {
    if (action === "wait")
      this.db
        .prepare("UPDATE agent_recovery SET waiting=1 WHERE task_id=?")
        .run(id);
    if (action === "resume")
      this.db
        .prepare(
          "UPDATE agent_recovery SET waiting=0,snoozed_until=NULL,last_active=?,returned_at=? WHERE task_id=?",
        )
        .run(this.now(), this.now(), id);
    if (action === "snooze")
      this.db
        .prepare("UPDATE agent_recovery SET snoozed_until=? WHERE task_id=?")
        .run(this.now() + 60 * MINUTE, id);
    if (action === "mute" || action === "unmute")
      this.db
        .prepare("UPDATE agent_recovery SET muted=? WHERE task_id=?")
        .run(action === "mute" ? 1 : 0, id);
  }
  remove(id: string) {
    this.db.prepare("DELETE FROM agent_recovery WHERE task_id=?").run(id);
    this.db.prepare("DELETE FROM agent_reminders WHERE task_id=?").run(id);
    this.prunePages(true);
  }
  clear() {
    for (const table of [
      "agent_recovery",
      "agent_work_pages",
      "agent_reminders",
    ])
      this.db.prepare(`DELETE FROM ${table}`).run();
    this.db
      .prepare(
        "UPDATE agent_reminder_policy SET version=version+1,body=? WHERE id=1",
      )
      .run(JSON.stringify(defaultReminderPolicy));
  }
  private ensure(tasks: AgentTask[]) {
    for (const task of tasks)
      this.db
        .prepare(
          "INSERT OR IGNORE INTO agent_recovery(task_id,last_active) VALUES(?,?)",
        )
        .run(task.id, Date.parse(task.updatedAt));
  }
  private rows() {
    return this.db.prepare("SELECT * FROM agent_recovery").all() as Recovery[];
  }
  view(): RecoveryView {
    return this.db.transaction((): RecoveryView => {
      const tasks = this.currentTasks();
      this.ensure(tasks);
      const settings = this.policy();
      const active = new Set(
        tasks.filter((t) => !t.dismissed).map((t) => t.id),
      );
      return {
        ...settings,
        items: this.rows()
          .filter((r) => active.has(r.task_id))
          .map((r) => ({
            taskId: r.task_id,
            state: r.waiting
              ? "waiting"
              : r.returned_at && this.now() - r.returned_at < 5 * MINUTE
                ? "returned"
                : this.now() - r.last_active < 90_000
                  ? "active"
                  : this.now() - r.last_active >=
                      settings.policy.awayMinutes * MINUTE
                    ? "interrupted"
                    : "away",
            lastActive: new Date(r.last_active).toISOString(),
            returnedAt: r.returned_at
              ? new Date(r.returned_at).toISOString()
              : null,
            url: r.url,
            muted: Boolean(r.muted),
            snoozedUntil:
              r.snoozed_until && r.snoozed_until > this.now()
                ? new Date(r.snoozed_until).toISOString()
                : null,
          })),
        deliveryFailed: Boolean(
          this.db
            .prepare(
              "SELECT 1 FROM agent_reminders WHERE state='failed' AND created>? LIMIT 1",
            )
            .get(this.now() - 86_400_000),
        ),
      };
    })();
  }
  private prunePages(removeUnreferenced = false) {
    this.db
      .prepare(
        "DELETE FROM agent_work_pages WHERE last_active<? OR (? AND NOT EXISTS (SELECT 1 FROM agent_task_pages WHERE origin=agent_work_pages.origin AND page_key=agent_work_pages.page_key))",
      )
      .run(this.now() - 86_400_000, removeUnreferenced ? 1 : 0);
    // Keep a bounded pending lookup while the model is still discovering a task.
    this.db
      .prepare(
        "DELETE FROM agent_work_pages WHERE rowid NOT IN (SELECT rowid FROM agent_work_pages ORDER BY last_active DESC LIMIT 1000)",
      )
      .run();
    this.db
      .prepare("DELETE FROM agent_reminders WHERE created<?")
      .run(this.now() - 32 * 86_400_000);
  }
  tick(
    deviceId: string,
    input: RecoveryTick,
    processingEnabled: boolean,
  ): RecoveryDelivery {
    return this.db.transaction(() => {
      const tasks = this.currentTasks();
      this.ensure(tasks);
      const device = this.db
        .prepare(
          "SELECT session FROM observation_devices WHERE id=? AND revoked=0",
        )
        .get(deviceId) as { session: string | null } | undefined;
      const session = device?.session
        ? sessionSchema.parse(JSON.parse(device.session))
        : null;
      const settings = this.db
        .prepare("SELECT enabled,session FROM agent_settings WHERE id=1")
        .get() as { enabled: number; session: string | null };
      const valid =
        session && !session.paused && session.id === input.sessionId;
      // Stale heartbeats cannot extend a task or claim a reminder on replay.
      if (Math.abs(this.now() - Date.parse(input.observedAt)) > MINUTE)
        throw new AppError(
          "PRESENCE_EXPIRED",
          "Refresh the browser connection before updating reminders.",
          409,
        );
      const policy = this.policy().policy;
      const running = Boolean(
        processingEnabled &&
        valid &&
        settings.enabled &&
        settings.session === session?.id,
      );
      if (valid && input.current) {
        const url = new URL(input.current.url);
        if (!scopeAllows(session.scope, url.origin, ""))
          throw new AppError("SITE_DENIED", "This site is not enabled.", 403);
        const key = createHash("sha256").update(url.pathname).digest("hex");
        if (key !== input.current.pageKey)
          throw new AppError("PAGE_MISMATCH", "Refresh the current page.", 400);
        const captured = Date.parse(input.observedAt);
        this.db
          .prepare(
            "INSERT INTO agent_work_pages VALUES(?,?,?,?) ON CONFLICT(origin,page_key) DO UPDATE SET url=excluded.url,last_active=MAX(last_active,excluded.last_active)",
          )
          .run(url.origin, key, url.href, captured);
        const linked = this.db
          .prepare(
            "SELECT task_id FROM agent_task_pages WHERE origin=? AND page_key=?",
          )
          .all(url.origin, key) as { task_id: string }[];
        for (const { task_id } of linked) {
          const task = tasks.find((t) => t.id === task_id);
          if (!task || !unfinished(task)) continue;
          this.db
            .prepare(
              "UPDATE agent_recovery SET last_active=MAX(last_active,?),url=?,returned_at=CASE WHEN ?-last_active>=? THEN ? ELSE returned_at END WHERE task_id=?",
            )
            .run(
              captured,
              url.href,
              captured,
              policy.awayMinutes * MINUTE,
              captured,
              task_id,
            );
          // Waiting is an explicit user choice; merely viewing a page cannot undo it.
        }
      }
      const clock = localTime(this.now(), policy);
      const rows = this.rows();
      const available = (r: Recovery) => {
        const task = tasks.find((t) => t.id === r.task_id);
        return (
          running &&
          policy.enabled &&
          input.notificationsReady &&
          !clock.quiet &&
          task &&
          eligible(task) &&
          !r.waiting &&
          !r.muted &&
          (!r.snoozed_until || r.snoozed_until <= this.now()) &&
          this.now() - r.last_active >= policy.awayMinutes * MINUTE
        );
      };
      const activeIds = (
        this.db
          .prepare(
            "SELECT id,task_id FROM agent_reminders WHERE day=? AND state IN ('reserved','delivered')",
          )
          .all(clock.day) as { id: string; task_id: string }[]
      )
        .filter((a) =>
          rows.some((r) => r.task_id === a.task_id && available(r)),
        )
        .map((r) => r.id);
      let notification: RecoveryDelivery["notification"] = null;
      for (const r of rows
        .filter(available)
        .sort((a, b) => a.last_active - b.last_active)) {
        const id =
          "reentry-return-" +
          createHash("sha256")
            .update(`${r.task_id}:${clock.day}`)
            .digest("hex");
        // Commit a daily reservation BEFORE the external OS effect. Never resend
        // an ambiguous attempt after a worker/network crash; it can be missed.
        const result = this.db
          .prepare(
            "INSERT OR IGNORE INTO agent_reminders VALUES(?,?,?,?, 'reserved')",
          )
          .run(id, r.task_id, clock.day, this.now());
        if (result.changes) {
          notification = { id };
          activeIds.push(id);
          break;
        }
      }
      this.prunePages();
      return { notification, activeIds };
    })();
  }
  mayDeliver(
    id: string,
    deviceId: string,
    sessionId: string,
    processingEnabled: boolean,
  ) {
    return this.db.transaction(() => {
      const tasks = this.currentTasks();
      const settings = this.db
        .prepare("SELECT enabled,session FROM agent_settings WHERE id=1")
        .get() as { enabled: number; session: string | null };
      const attempt = this.db
        .prepare("SELECT task_id,day,state FROM agent_reminders WHERE id=?")
        .get(id) as { task_id: string; day: string; state: string } | undefined;
      const row =
        attempt && this.rows().find((r) => r.task_id === attempt.task_id);
      const task = attempt && tasks.find((t) => t.id === attempt.task_id);
      const device = this.db
        .prepare(
          "SELECT session FROM observation_devices WHERE id=? AND revoked=0",
        )
        .get(deviceId) as { session: string | null } | undefined;
      const session = device?.session
        ? sessionSchema.parse(JSON.parse(device.session))
        : null;
      const policy = this.policy().policy;
      const clock = localTime(this.now(), policy);
      return Boolean(
        processingEnabled &&
        settings.enabled &&
        settings.session === sessionId &&
        attempt?.state === "reserved" &&
        attempt.day === clock.day &&
        policy.enabled &&
        !clock.quiet &&
        task &&
        eligible(task) &&
        row &&
        !row.waiting &&
        !row.muted &&
        (!row.snoozed_until || row.snoozed_until <= this.now()) &&
        this.now() - row.last_active >= policy.awayMinutes * MINUTE &&
        session &&
        !session.paused &&
        session.id === sessionId,
      );
    })();
  }
  acknowledge(id: string, state: "delivered" | "failed" | "cancelled") {
    this.db
      .prepare(
        "UPDATE agent_reminders SET state=? WHERE id=? AND state='reserved'",
      )
      .run(state, id);
  }
}
