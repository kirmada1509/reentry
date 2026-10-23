import { execFileSync, spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, expect, it, vi } from "vitest";
import { ObservationStore } from "@/features/observation/store";
import type { ObservationEvent } from "@/features/observation/protocol";
import { createTaskHarness } from "@/features/agent/harness";
import { validateDecision } from "@/features/agent/prompt";
import type { DecisionContext } from "@/features/agent/prompt";
import type { AgentModelDecision } from "@/features/agent/schema";
import type { StructuredModel } from "@/lib/ai/model";

const clean: Array<() => void> = [];
afterEach(() =>
  clean
    .splice(0)
    .reverse()
    .forEach((fn) => fn()),
);
const app = "http://127.0.0.1:3000",
  site = "https://shop.example";
const processing = {
  provider: "fake",
  model: "test",
  hosted: false,
  available: true,
  consentId: "c".repeat(64),
};
function setup() {
  const dir = mkdtempSync(path.join(tmpdir(), "reentry-task-test-"));
  clean.push(() => rmSync(dir, { recursive: true, force: true }));
  let now = Date.now();
  const file = path.join(dir, "agent.sqlite");
  let db = new ObservationStore(file, () => now);
  clean.push(() => db.close());
  const device = db.pair(db.challenge(), "nabinfdlobegbkgehppcipkhbddjbdka");
  const session = db.setSession(
    device.deviceId,
    { allSites: false, origins: [site], policy: "local-observation-v1" },
    false,
    app,
  ).session;
  function event(
    content = "Cedar backpack — compare details",
    pageKey = "a".repeat(64),
  ): ObservationEvent {
    return {
      version: 1,
      eventId: randomUUID(),
      deviceId: device.deviceId,
      sessionId: session.id,
      observedAt: new Date(now).toISOString(),
      reason: "navigation",
      page: {
        origin: site,
        title: "Cedar backpack",
        content,
        pageKey,
        fields: [],
      },
    };
  }
  return {
    get db() {
      return db;
    },
    event,
    advance(ms = 9000) {
      now += ms;
    },
    restart() {
      db.close();
      db = new ObservationStore(file, () => now);
    },
    enable() {
      db.agent.action(
        {
          action: "enable",
          consentId: processing.consentId,
          sessionId: session.id,
        },
        processing,
      );
    },
    add(e: ObservationEvent) {
      db.accept(device.deviceId, e, app);
    },
  };
}
function proposal(
  _current: ObservationEvent,
  taskId: string | null = null,
): AgentModelDecision {
  return {
    tool: "upsert_task",
    taskId,
    goal: "Compare the Cedar backpack",
    intent: "research",
    stage: "candidate",
    finishCondition: "Choose whether this backpack fits my needs",
    nextAction: "Compare the backpack specifications",
    evidenceRefs: ["current:1"],
  };
}
function model(
  fn: (context: DecisionContext) => unknown | Promise<unknown>,
): StructuredModel {
  return {
    generate: vi.fn(async (request) => ({
      candidate: await fn(JSON.parse(request.messages[1]!.content)),
      provider: "fake",
      model: "test",
      modelDigest: null,
      settings: {},
    })),
  };
}

it("requires separate session consent, survives restart, groups related pages and separates different goals", async () => {
  const s = setup();
  const first = s.event();
  s.add(first);
  expect(s.db.agent.pending()).toHaveLength(0);
  expect(() =>
    s.db.agent.action(
      {
        action: "enable",
        consentId: "d".repeat(64),
        sessionId: s.event().sessionId,
      },
      processing,
    ),
  ).toThrow();
  s.enable();
  let calls = 0;
  const fake = model((c) => {
    calls++;
    if (calls === 1) return { tool: "inspect_history" };
    return proposal(
      c.current,
      c.tasks.find((t) => t.goal.includes("Cedar"))?.id ?? null,
    );
  });
  await createTaskHarness(
    s.db.agent,
    () => fake,
    () => processing,
    1000,
  ).tick();
  const id = s.db.agent.tasks()[0]!.id;
  expect(s.db.agent.tasks()).toHaveLength(1);
  s.restart();
  s.advance();
  s.add(s.event("Cedar backpack — compare weight", "b".repeat(64)));
  await createTaskHarness(
    s.db.agent,
    () => fake,
    () => processing,
    1000,
  ).tick();
  expect(s.db.agent.tasks()[0]).toMatchObject({
    id,
    revision: 2,
    stage: "candidate",
    intent: "research",
  });
  s.advance();
  s.add(s.event("Maple scholarship application — draft saved", "d".repeat(64)));
  await createTaskHarness(
    s.db.agent,
    () =>
      model((c) => ({
        ...proposal(c.current),
        goal: "Apply for Maple scholarship",
        intent: "application",
        stage: "ongoing",
        finishCondition: "A matching application submission receipt is visible",
      })),
    () => processing,
    1000,
  ).tick();
  expect(s.db.agent.tasks()).toHaveLength(2);
  expect(s.db.agent.tasks()[1]!.id).not.toBe(id);
});

it("rejects invented evidence, unknown tools and completion fields", async () => {
  const s = setup();
  const current = s.event();
  const context = { current, tasks: [], history: [], toolResults: [] };
  expect(() =>
    validateDecision(
      {
        ...proposal(current),
        evidence: [{ eventId: current.eventId, quote: "Order confirmed" }],
      },
      context,
    ),
  ).toThrow();
  expect(() =>
    validateDecision({ ...proposal(current), completed: true }, context),
  ).toThrow();
  expect(() =>
    validateDecision({ tool: "run_javascript", code: "submit()" }, context),
  ).toThrow();
  expect(() =>
    validateDecision({ tool: "read_task", taskId: randomUUID() }, context),
  ).toThrow();
  s.enable();
  s.add(current);
  const fake = model(() => ({ tool: "run_javascript" }));
  await createTaskHarness(
    s.db.agent,
    () => fake,
    () => processing,
    1000,
  ).tick();
  expect(s.db.agent.tasks()).toHaveLength(0);
  expect(s.db.agent.view(processing).status).toBe("unavailable");
  s.advance();
  await createTaskHarness(
    s.db.agent,
    () => fake,
    () => processing,
    1000,
  ).tick();
  expect(fake.generate).toHaveBeenCalledTimes(1);
});

it("copies evidence from host-generated references and rejects invented citations or model-written text", () => {
  const s = setup();
  const current = s.event(
    "Cedar (22L) backpack\nWeight: 620g. Price: $72.\nWater resistant shell.",
  );
  const context = { current, tasks: [], history: [], toolResults: [] };
  const result = validateDecision(
    { ...proposal(current), evidenceRefs: ["current:1", "current:2"] },
    context,
  );
  expect(
    result.tool === "upsert_task" && result.evidence.map((e) => e.quote),
  ).toEqual(["Cedar (22L) backpack", "Weight: 620g. Price: $72."]);
  const many = validateDecision(
    {
      ...proposal(current),
      evidenceRefs: ["current:0", "current:1", "current:2", "current:3"],
    },
    context,
  );
  expect(many.tool === "upsert_task" && many.evidence).toHaveLength(3);
  expect(() =>
    validateDecision(
      {
        ...proposal(current),
        evidenceRefs: ["current:0", "current:1", "current:2", "current:999"],
      },
      context,
    ),
  ).toThrow();
  for (const ref of ["invented:0", "history:0:1", "current:999"])
    expect(() =>
      validateDecision({ ...proposal(current), evidenceRefs: [ref] }, context),
    ).toThrow();
  expect(() =>
    validateDecision(
      {
        ...proposal(current),
        evidence: [{ eventId: current.eventId, quote: "Cedar 22L backpack" }],
      },
      context,
    ),
  ).toThrow();
});

it("does not commit a decision after newer source evidence or consent revocation", async () => {
  const s = setup();
  s.enable();
  s.add(s.event());
  const fake = model((c) => {
    s.advance();
    s.add(s.event("Cedar backpack — checkout cancelled"));
    return proposal(c.current);
  });
  await createTaskHarness(
    s.db.agent,
    () => fake,
    () => processing,
    1000,
  ).tick();
  expect(s.db.agent.tasks()).toHaveLength(0);
  const revoke = model((c) => {
    s.db.pause();
    return proposal(c.current);
  });
  s.advance();
  await createTaskHarness(
    s.db.agent,
    () => revoke,
    () => processing,
    1000,
  ).tick();
  expect(s.db.agent.tasks()).toHaveLength(0);
  expect(s.db.agent.settings().enabled).toBe(0);
});

it("rejects a delayed decision when another tab changes evidence within the same millisecond", async () => {
  const s = setup();
  s.enable();
  s.add(s.event());
  await createTaskHarness(
    s.db.agent,
    () =>
      model((c) => {
        s.add(s.event("Cedar backpack — newer same-time page"));
        return proposal(c.current);
      }),
    () => processing,
    1000,
  ).tick();
  expect(s.db.agent.tasks()).toHaveLength(0);
  expect(s.db.agent.pending()).toHaveLength(1);
});

it("preserves corrections and rejects conflicting edits and delayed correction overwrites", async () => {
  const s = setup();
  s.enable();
  s.add(s.event());
  const fake = model((c) => proposal(c.current, c.tasks[0]?.id ?? null));
  await createTaskHarness(
    s.db.agent,
    () => fake,
    () => processing,
    1000,
  ).tick();
  const task = s.db.agent.tasks()[0]!;
  const correction = {
    action: "correct" as const,
    id: task.id,
    expectedRevision: 1,
    goal: "Only compare backpacks",
    finishCondition: "Decide whether to shortlist this bag",
    intent: "research" as const,
  };
  s.db.agent.action(correction, processing);
  expect(() => s.db.agent.action(correction, processing)).toThrow(/changed/);
  s.advance();
  s.add(s.event("Cedar backpack — cart opened"));
  await createTaskHarness(
    s.db.agent,
    () => fake,
    () => processing,
    1000,
  ).tick();
  expect(s.db.agent.tasks()[0]).toMatchObject({
    goal: correction.goal,
    finishCondition: correction.finishCondition,
    corrected: true,
    revision: 3,
  });
  s.advance();
  s.add(s.event("Cedar backpack — checkout"));
  const delayed = model((c) => {
    s.db.agent.action(
      { ...correction, expectedRevision: 3, goal: "Compare later" },
      processing,
    );
    return proposal(c.current, task.id);
  });
  await createTaskHarness(
    s.db.agent,
    () => delayed,
    () => processing,
    1000,
  ).tick();
  expect(s.db.agent.tasks()[0]!.goal).toBe("Compare later");
});

it("caps model-directed read tools and hourly calls, and never auto-retries failed jobs", async () => {
  const s = setup();
  s.enable();
  s.add(s.event());
  const fake = model(() => ({ tool: "inspect_history" }));
  await createTaskHarness(
    s.db.agent,
    () => fake,
    () => processing,
    1000,
  ).tick();
  expect(fake.generate).toHaveBeenCalledTimes(3);
  expect(s.db.agent.view(processing).status).toBe("unavailable");
  for (let i = 0; i < 27; i++)
    s.db.db
      .prepare("INSERT INTO agent_calls(created) VALUES(?)")
      .run(s.db.agent.now());
  s.db.agent.action({ action: "retry" }, processing);
  s.advance();
  await createTaskHarness(
    s.db.agent,
    () => fake,
    () => processing,
    1000,
  ).tick();
  expect(fake.generate).toHaveBeenCalledTimes(3);
  expect(s.db.agent.view(processing).status).toBe("budget");
});

it("replays an accepted effect once and clear prevents delayed task resurrection", async () => {
  const s = setup();
  s.enable();
  const current = s.event();
  s.add(current);
  const fake = model((c) => proposal(c.current));
  await createTaskHarness(
    s.db.agent,
    () => fake,
    () => processing,
    1000,
    () => {
      throw new Error("simulated crash after commit");
    },
  ).tick();
  expect(s.db.agent.tasks()).toHaveLength(1);
  s.restart();
  s.add(current);
  s.advance();
  await createTaskHarness(
    s.db.agent,
    () => fake,
    () => processing,
    1000,
  ).tick();
  expect(s.db.agent.tasks()).toHaveLength(1);
  expect(fake.generate).toHaveBeenCalledTimes(1);
  s.add(s.event("Cedar backpack — later page"));
  await createTaskHarness(
    s.db.agent,
    () =>
      model((c) => {
        s.db.clear();
        return proposal(c.current);
      }),
    () => processing,
    1000,
  ).tick();
  expect(s.db.agent.tasks()).toHaveLength(0);
  expect(s.db.agent.pending()).toHaveLength(0);
});

it("resumes a persisted read-tool graph in a different process and reconciles an effect committed before process death", () => {
  const directory = mkdtempSync(path.join(tmpdir(), "reentry-task-process-"));
  clean.push(() => rmSync(directory, { recursive: true, force: true }));
  for (const [mode, status] of [
    ["read-crash", 75],
    ["effect-crash", 76],
  ] as const) {
    const file = path.join(directory, mode + ".sqlite");
    const args = [
      "--conditions=react-server",
      "--import",
      "tsx",
      "tests/fixtures/task-worker.ts",
    ];
    expect(
      spawnSync(process.execPath, [...args, mode, file], { encoding: "utf8" })
        .status,
    ).toBe(status);
    const recovered = JSON.parse(
      execFileSync(process.execPath, [...args, "recover", file], {
        encoding: "utf8",
      }),
    );
    expect(recovered).toEqual({
      tasks: 1,
      revision: 1,
      effects: 1,
      pending: 0,
    });
  }
}, 30000);
it("a nonresponsive model reaches its deadline and late output cannot commit", async () => {
  const s = setup();
  s.enable();
  s.add(s.event());
  const fake: StructuredModel = { generate: () => new Promise(() => {}) };
  const result = await createTaskHarness(
    s.db.agent,
    () => fake,
    () => processing,
    40,
  ).tick();
  expect(result?.state).toBe("failed");
  expect(s.db.agent.tasks()).toHaveLength(0);
});

it("reads bounded task revision history, preserves dismissal and rolls back failed effects", async () => {
  const s = setup();
  s.enable();
  s.add(s.event());
  await createTaskHarness(
    s.db.agent,
    () => model((c) => proposal(c.current)),
    () => processing,
    1000,
  ).tick();
  const task = s.db.agent.tasks()[0]!;
  s.db.agent.action(
    {
      action: "correct",
      id: task.id,
      expectedRevision: 1,
      goal: "Compare Cedar for later",
      finishCondition: "Choose a shortlist",
      intent: "research",
    },
    processing,
  );
  s.advance();
  s.add(s.event("Cedar backpack — updated details"));
  const reader = model((c) => {
    if (!c.toolResults.length) return { tool: "read_task", taskId: task.id };
    expect(c.toolResults[0]!.result).toMatchObject([
      { revision: 2 },
      { revision: 1 },
    ]);
    return proposal(c.current, task.id);
  });
  await createTaskHarness(
    s.db.agent,
    () => reader,
    () => processing,
    1000,
  ).tick();
  expect(s.db.agent.tasks()[0]!.revision).toBe(3);
  s.db.agent.action(
    { action: "dismiss", id: task.id, expectedRevision: 3 },
    processing,
  );
  s.advance();
  s.add(s.event("Cedar backpack — more details"));
  await createTaskHarness(
    s.db.agent,
    () => model((c) => proposal(c.current)),
    () => processing,
    1000,
  ).tick();
  expect(s.db.agent.view(processing).tasks).toHaveLength(0);
  s.advance();
  s.add(s.event("New unassigned application page", "d".repeat(64)));
  s.db.db.exec(
    "CREATE TRIGGER fail_task_effect BEFORE INSERT ON agent_effects BEGIN SELECT RAISE(FAIL,'fixture write failure'); END",
  );
  await createTaskHarness(
    s.db.agent,
    () => model((c) => proposal(c.current)),
    () => processing,
    1000,
  ).tick();
  expect(s.db.agent.tasks()).toHaveLength(1);
  expect(s.db.agent.view(processing).status).toBe("unavailable");
});
