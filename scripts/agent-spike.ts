import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { openFoundation } from "../src/features/agent/foundation";

const [
  command = "status",
  filename = ".runtime/agent-spike.sqlite",
  taskId = "synthetic-application",
] = process.argv.slice(2);
if (
  !["start", "resume", "reject", "recover", "status", "crash"].includes(command)
)
  throw new Error("Use start, resume, reject, recover, status or crash.");
mkdirSync(dirname(resolve(filename)), { recursive: true });
const foundation = openFoundation(
  resolve(filename),
  {
    // Deliberate fake model. This script tests runtime durability, not inference.
    decide: async (receipt) => ({
      action: receipt.confirmation ? "complete" : "wait",
      explanation: "Synthetic fixture decision; no model request was made.",
    }),
  },
  command === "crash" ? () => process.exit(75) : undefined,
);
const config = { configurable: { thread_id: taskId } };
try {
  if (command === "start" || command === "crash")
    await foundation.graph.invoke(
      { taskId, eventId: "7db09f5f-4826-4e63-96ca-53fb12890d6b" },
      config,
    );
  if (command === "recover") await foundation.graph.invoke(null, config);
  if (command === "resume" || command === "reject")
    await foundation.graph.invoke(
      foundation.resume({
        eventId: "93396f79-1853-4a95-87cc-1be64c7d0a7b",
        confirmation: command === "resume",
      }),
      config,
    );
  const snapshot = await foundation.graph.getState(config);
  console.log(
    JSON.stringify({
      fixture: true,
      ...foundation.inspect(taskId),
      pendingNodes: snapshot.next,
    }),
  );
} finally {
  foundation.close();
}
