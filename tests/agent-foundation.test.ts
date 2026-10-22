import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  authorizeAgentRequest,
  observationEnvelopeSchema,
} from "../src/features/agent/connection";

describe("durable agent foundation", () => {
  it("resumes in a different process and does not replay an already committed effect", () => {
    const directory = mkdtempSync(path.join(tmpdir(), "reentry-graph-"));
    const filename = path.join(directory, "graph.sqlite");
    const args = ["--import", "tsx", "scripts/agent-spike.ts"];
    const run = (command: string, taskId = "synthetic-application") =>
      JSON.parse(
        execFileSync(process.execPath, [...args, command, filename, taskId], {
          encoding: "utf8",
        }),
      );
    try {
      const crashed = spawnSync(process.execPath, [...args, "crash", filename]);
      expect(crashed.status).toBe(75);
      expect(run("recover")).toMatchObject({
        task: { revision: 1, stage: "interrupted" },
        effects: { count: 1 },
        pendingNodes: ["await_evidence"],
      });
      expect(run("resume")).toMatchObject({
        task: { revision: 2, stage: "completed" },
        effects: { count: 2 },
        pendingNodes: [],
      });
      expect(run("status")).toMatchObject({
        task: { revision: 2, stage: "completed" },
        effects: { count: 2 },
      });
      run("start", "unverified-task");
      expect(run("reject", "unverified-task")).toMatchObject({
        task: { stage: "unverified", revision: 2 },
        pendingNodes: [],
      });
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  }, 30_000);

  it("rejects missing/wrong credentials, website origins and malformed delivery envelopes", () => {
    const pairing = {
      extensionId: "nabinfdlobegbkgehppcipkhbddjbdka",
      tokenHash: createHash("sha256").update("a".repeat(64)).digest("hex"),
    };
    const request = (origin: string, token = "a".repeat(64)) => ({
      headers: new Headers({ origin, authorization: `Bearer ${token}` }),
    });
    expect(
      authorizeAgentRequest(
        request(`chrome-extension://${pairing.extensionId}`),
        pairing,
      ),
    ).toBe(true);
    expect(
      authorizeAgentRequest(request("http://127.0.0.1:3000"), pairing),
    ).toBe(false);
    expect(
      authorizeAgentRequest(
        request(`chrome-extension://${pairing.extensionId}`, "b".repeat(64)),
        pairing,
      ),
    ).toBe(false);
    expect(authorizeAgentRequest({ headers: new Headers() }, pairing)).toBe(
      false,
    );
    expect(
      observationEnvelopeSchema.safeParse({
        version: 1,
        page: { content: "x".repeat(8001) },
      }).success,
    ).toBe(false);
  });
});
