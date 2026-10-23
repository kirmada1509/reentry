// Synthetic subprocess fixture, never used by the product/model factory.
import { randomUUID } from "node:crypto";
import { ObservationStore } from "../../src/features/observation/store";
import { createTaskHarness } from "../../src/features/agent/harness";
import type { DecisionContext } from "../../src/features/agent/prompt";
const [mode, file] = process.argv.slice(2);
if (!file || !["read-crash", "effect-crash", "recover"].includes(mode!))
  throw new Error("Use a fixture mode and database.");
const processing = {
  provider: "fake",
  model: "fixture",
  hosted: false,
  available: true,
  consentId: "c".repeat(64),
};
const now = Date.now() + (mode === "recover" ? 220000 : 0);
const store = new ObservationStore(file, () => now);
if (mode !== "recover") {
  const device = store.pair(
    store.challenge(),
    "nabinfdlobegbkgehppcipkhbddjbdka",
  );
  const session = store.setSession(
    device.deviceId,
    {
      allSites: false,
      origins: ["https://fixture.example"],
      policy: "local-observation-v1",
    },
    false,
    "http://127.0.0.1:3000",
  ).session;
  store.agent.action(
    {
      action: "enable",
      consentId: processing.consentId,
      sessionId: session.id,
    },
    processing,
  );
  store.accept(
    device.deviceId,
    {
      version: 1,
      eventId: randomUUID(),
      deviceId: device.deviceId,
      sessionId: session.id,
      observedAt: new Date(now).toISOString(),
      reason: "navigation",
      page: {
        origin: "https://fixture.example",
        title: "Fixture grant application",
        content: "Application draft saved",
        pageKey: "a".repeat(64),
        fields: [],
      },
    },
    "http://127.0.0.1:3000",
  );
}
const harness = createTaskHarness(
  store.agent,
  () => ({
    generate: async (request) => {
      const context = JSON.parse(
        request.messages[1]!.content,
      ) as DecisionContext;
      if (mode === "read-crash" && context.toolResults.length) process.exit(75);
      const candidate =
        context.toolResults.length || mode === "effect-crash"
          ? {
              tool: "upsert_task",
              taskId: null,
              goal: "Apply for the fixture grant",
              intent: "application",
              stage: "ongoing",
              finishCondition: "A matching grant submission receipt is visible",
              nextAction: "Review remaining sections",
              evidenceRefs: ["current:1"],
            }
          : { tool: "inspect_history" };
      return {
        candidate,
        provider: "fake",
        model: "fixture",
        modelDigest: null,
        settings: {},
      };
    },
  }),
  () => processing,
  1000,
  mode === "effect-crash" ? () => process.exit(76) : undefined,
);
await harness.tick();
console.log(
  JSON.stringify({
    tasks: store.agent.tasks().length,
    revision: store.agent.tasks()[0]?.revision,
    effects: (
      store.db.prepare("SELECT COUNT(*) AS n FROM agent_effects").get() as {
        n: number;
      }
    ).n,
    pending: store.agent.pending().length,
  }),
);
store.close();
