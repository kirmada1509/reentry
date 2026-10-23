import { randomUUID } from "node:crypto";
import { expect, it } from "vitest";
import {
  SurfaceRequests,
  TaskPresentation,
} from "@/features/agent/surface-state";
import { agentViewSchema, taskSchema } from "@/features/agent/schema";
import { defaultReminderPolicy } from "@/features/agent/recovery-schema";
function view() {
  return agentViewSchema.parse({
    enabled: true,
    status: "ready",
    callsRemaining: 25,
    processing: {
      provider: "fixture",
      model: "test",
      hosted: false,
      available: true,
      consentId: "c".repeat(64),
    },
    recovery: {
      version: 0,
      policy: defaultReminderPolicy,
      items: [],
      deliveryFailed: false,
    },
    tasks: ["First application", "Second application"].map((goal) =>
      taskSchema.parse({
        id: randomUUID(),
        revision: 1,
        goal,
        origin: "https://example.com",
        stage: "ongoing",
        intent: "application",
        finishCondition: "Matching application receipt",
        nextAction: "Add one referee",
        evidence: [{ eventId: randomUUID(), quote: "Application draft saved" }],
        corrected: false,
        dismissed: false,
        updatedAt: new Date().toISOString(),
      }),
    ),
  });
}
it("coalesces overlapping polls and rejects a late read after a correction or clear", () => {
  const gate = new SurfaceRequests(),
    old = gate.read()!;
  expect(gate.read()).toBeNull();
  const save = gate.change()!;
  expect(gate.change()).toBeNull();
  expect(gate.read()).toBeNull();
  expect(gate.current(save)).toBe(true);
  gate.finishChange(save);
  expect(gate.finishRead(old)).toBe(false);
  const fresh = gate.read()!;
  expect(gate.finishRead(fresh)).toBe(true);
});
it("ignores closed-page responses and an old cleanup cannot complete a newer read", () => {
  const gate = new SurfaceRequests(),
    old = gate.read()!;
  gate.close();
  expect(gate.finishRead(old)).toBe(false);
  expect(gate.change()).toBeNull();
  gate.open();
  const fresh = gate.read()!;
  expect(gate.finishRead(old)).toBe(false);
  expect(gate.read()).toBeNull();
  expect(gate.finishRead(fresh)).toBe(true);
});
it("keeps every visible card's content/order while a task has focus, then releases the latest snapshot", () => {
  const p = new TaskPresentation(),
    before = view();
  p.receive(before, false);
  const incoming = structuredClone(before);
  incoming.tasks.reverse();
  incoming.tasks[0]!.revision = 2;
  incoming.tasks[0]!.goal = "A much longer updated goal";
  incoming.status = "thinking";
  const held = p.receive(incoming, true);
  expect(held.pending).toBe(true);
  expect(held.view.tasks).toEqual(before.tasks);
  expect(held.view.status).toBe("thinking");
  expect(p.release()).toEqual({ view: incoming, pending: false });
});
it("defers a newly discovered card during focus but immediately removes a deleted one", () => {
  const p = new TaskPresentation(),
    before = view();
  p.receive(before, false);
  const extra = view().tasks[0]!,
    incoming = { ...before, tasks: [before.tasks[1]!, extra] };
  const held = p.receive(incoming, true);
  expect(held.view.tasks).toEqual([before.tasks[1]]);
  expect(held.pending).toBe(true);
  expect(p.release().view!.tasks).toEqual(incoming.tasks);
});
it("explicit actions apply immediately, and clearing cannot release cached deleted text", () => {
  const p = new TaskPresentation(),
    before = view();
  p.receive(before, false);
  const incoming = structuredClone(before);
  incoming.tasks[0]!.revision = 2;
  expect(p.receive(incoming, true, true)).toEqual({
    view: incoming,
    pending: false,
  });
  p.clear();
  expect(p.release()).toEqual({ view: null, pending: false });
});
it("unchanged polling has no pending-update announcement", () => {
  const p = new TaskPresentation(),
    before = view();
  p.receive(before, false);
  expect(p.receive(structuredClone(before), true).pending).toBe(false);
});
