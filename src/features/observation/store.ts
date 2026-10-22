import "server-only";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { mkdirSync, chmodSync } from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { AppError } from "@/lib/http/errors";
import { authorizeAgentRequest } from "@/features/agent/connection";
import { scopeAllows, sessionSchema } from "./protocol";
import type {
  ObservationEvent,
  ObservationScope,
  ObservationSession,
} from "./protocol";

const DAY = 86_400_000;
const hash = (text: string) => createHash("sha256").update(text).digest("hex");
const denied = () =>
  new AppError("AGENT_UNAUTHORIZED", "Connect the extension again.", 401);
type Device = {
  id: string;
  token_hash: string;
  extension_id: string;
  session: string | null;
  last_seen: string;
};

/** One local authority. Transactions commit before any delivery acknowledgement. */
export class ObservationStore {
  readonly db: Database.Database;
  constructor(
    filename: string,
    private readonly now = () => Date.now(),
  ) {
    mkdirSync(path.dirname(path.resolve(filename)), {
      recursive: true,
      mode: 0o700,
    });
    this.db = new Database(filename);
    if (filename !== ":memory:") chmodSync(filename, 0o600);
    this.db.pragma("journal_mode = WAL");
    this.db.pragma("busy_timeout = 5000");
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS observation_challenges (hash TEXT PRIMARY KEY, expires INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS observation_devices (id TEXT PRIMARY KEY, token_hash TEXT NOT NULL, extension_id TEXT NOT NULL, revoked INTEGER NOT NULL DEFAULT 0, session TEXT, last_seen TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS observation_receipts (id TEXT PRIMARY KEY, digest TEXT NOT NULL, received INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS observations (id TEXT PRIMARY KEY, body TEXT NOT NULL, received INTEGER NOT NULL);
    `);
  }
  challenge() {
    const challenge = randomBytes(32).toString("hex");
    this.db.transaction(() => {
      this.db.prepare("DELETE FROM observation_challenges").run();
      this.db
        .prepare("INSERT INTO observation_challenges VALUES (?, ?)")
        .run(hash(challenge), this.now() + 120_000);
    })();
    return challenge;
  }
  pair(challenge: string, extensionId: string) {
    return this.db.transaction(() => {
      const consumed = this.db
        .prepare(
          "DELETE FROM observation_challenges WHERE hash = ? AND expires > ?",
        )
        .run(hash(challenge), this.now());
      if (!consumed.changes) throw denied();
      // A new explicit pairing replaces the previous browser profile.
      this.db
        .prepare("UPDATE observation_devices SET revoked = 1, session = NULL")
        .run();
      const deviceId = randomUUID();
      const token = randomBytes(32).toString("hex");
      this.db
        .prepare(
          "INSERT INTO observation_devices (id,token_hash,extension_id,last_seen) VALUES (?,?,?,?)",
        )
        .run(
          deviceId,
          hash(token),
          extensionId,
          new Date(this.now()).toISOString(),
        );
      return { deviceId, token };
    })();
  }
  authenticate(request: Request) {
    const id = request.headers.get("x-reentry-device");
    const row = this.db
      .prepare("SELECT * FROM observation_devices WHERE id = ? AND revoked = 0")
      .get(id) as Device | undefined;
    if (
      !row ||
      !authorizeAgentRequest(request, {
        extensionId: row.extension_id,
        tokenHash: row.token_hash,
      })
    )
      throw denied();
    return row.id;
  }
  private device(id: string) {
    const row = this.db
      .prepare("SELECT * FROM observation_devices WHERE id = ? AND revoked = 0")
      .get(id) as Device | undefined;
    if (!row) throw denied();
    return row;
  }
  deviceStatus(id: string) {
    const row = this.device(id);
    this.prune();
    this.db
      .prepare("UPDATE observation_devices SET last_seen = ? WHERE id = ?")
      .run(new Date(this.now()).toISOString(), id);
    return {
      session: row.session
        ? sessionSchema.parse(JSON.parse(row.session))
        : null,
    };
  }
  setSession(
    id: string,
    scope: ObservationScope,
    paused: boolean,
    appOrigin: string,
  ) {
    if (scope.origins.includes(appOrigin))
      throw new AppError("SITE_DENIED", "ReEntry cannot observe itself.", 400);
    const session: ObservationSession = { id: randomUUID(), scope, paused };
    this.db.transaction(() => {
      this.device(id);
      this.db
        .prepare(
          "UPDATE observation_devices SET session = ?, last_seen = ? WHERE id = ?",
        )
        .run(JSON.stringify(session), new Date(this.now()).toISOString(), id);
    })();
    return { session };
  }
  accept(id: string, event: ObservationEvent, appOrigin: string) {
    return this.db.transaction(() => {
      const row = this.device(id);
      const session = row.session
        ? sessionSchema.parse(JSON.parse(row.session))
        : null;
      if (
        event.deviceId !== id ||
        !session ||
        session.paused ||
        event.sessionId !== session.id ||
        !scopeAllows(session.scope, event.page.origin, appOrigin)
      )
        throw new AppError(
          "SESSION_CHANGED",
          "Observation is no longer permitted. Review site controls.",
          409,
        );
      const age = this.now() - Date.parse(event.observedAt);
      if (age > DAY || age < -60_000)
        throw new AppError("EVENT_EXPIRED", "Observation expired.", 409);
      const body = JSON.stringify(event);
      const digest = hash(body);
      const receipt = this.db
        .prepare("SELECT digest FROM observation_receipts WHERE id = ?")
        .get(event.eventId) as { digest: string } | undefined;
      if (receipt) {
        if (receipt.digest !== digest)
          throw new AppError(
            "EVENT_CONFLICT",
            "This observation ID was already used.",
            409,
          );
        return { accepted: event.eventId, duplicate: true };
      }
      this.prune();
      if (
        (
          this.db
            .prepare("SELECT COUNT(*) AS n FROM observation_receipts")
            .get() as { n: number }
        ).n >= 100_000
      )
        throw new AppError(
          "OBSERVATION_CAPACITY",
          "Local observation storage is full. Pause and retry later.",
          429,
        );
      this.db
        .prepare("INSERT INTO observation_receipts VALUES (?,?,?)")
        .run(event.eventId, digest, this.now());
      this.db
        .prepare("INSERT INTO observations VALUES (?,?,?)")
        // Capture time keeps offline delivery from extending text retention.
        .run(event.eventId, body, Date.parse(event.observedAt));
      this.prune();
      return { accepted: event.eventId, duplicate: false };
    })();
  }
  private prune() {
    this.db
      .prepare(
        "DELETE FROM observations WHERE received < ? OR id NOT IN (SELECT id FROM observations ORDER BY received DESC, rowid DESC LIMIT 1000)",
      )
      .run(this.now() - DAY);
    this.db
      .prepare("DELETE FROM observation_receipts WHERE received < ?")
      .run(this.now() - 2 * DAY);
  }
  dashboard() {
    this.prune();
    const row = this.db
      .prepare(
        "SELECT * FROM observation_devices WHERE revoked = 0 ORDER BY rowid DESC LIMIT 1",
      )
      .get() as Device | undefined;
    return {
      paired: Boolean(row),
      session: row?.session
        ? sessionSchema.parse(JSON.parse(row.session))
        : null,
      lastSeen: row?.last_seen ?? null,
      observations: (
        this.db
          .prepare(
            "SELECT body FROM observations ORDER BY received DESC, rowid DESC LIMIT 20",
          )
          .all() as { body: string }[]
      ).map((r) => JSON.parse(r.body) as ObservationEvent),
    };
  }
  pause() {
    this.db.transaction(() => {
      for (const row of this.db
        .prepare("SELECT * FROM observation_devices WHERE revoked = 0")
        .all() as Device[]) {
        if (row.session) {
          const session = sessionSchema.parse(JSON.parse(row.session));
          this.db
            .prepare("UPDATE observation_devices SET session = ? WHERE id = ?")
            .run(JSON.stringify({ ...session, paused: true }), row.id);
        }
      }
    })();
  }
  clear() {
    this.db.transaction(() => {
      this.db
        .prepare("UPDATE observation_devices SET revoked = 1, session = NULL")
        .run();
      this.db.prepare("DELETE FROM observations").run();
      this.db.prepare("DELETE FROM observation_challenges").run();
    })();
  }
  close() {
    this.db.close();
  }
}
