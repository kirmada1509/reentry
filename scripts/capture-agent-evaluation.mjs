// Explicit disposable-fixture diagnostic only. Never enable for normal browsing.
// Capture model content, never request headers, keys, provider error bodies or prompts.
import { appendFileSync, readFileSync } from "node:fs";
import path from "node:path";
const output = process.env.REENTRY_AGENT_DEMO_DIR;
const fixture = process.env.REENTRY_TEST_FIXTURE_DIR;
if (
  output &&
  fixture &&
  process.env.REENTRY_TEST_LIVE === "1" &&
  ["application", "shopping"].includes(process.env.REENTRY_AGENT_DEMO_KIND)
) {
  const owner = readFileSync(path.join(fixture, ".reentry-owned"), "utf8");
  if (owner !== process.cwd())
    throw new Error("Evaluation fixture ownership mismatch.");
  const transport = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    const response = await transport(input, init);
    if (
      String(input) !== "https://integrate.api.nvidia.com/v1/chat/completions"
    )
      return response;
    try {
      let observationId = null;
      const request = JSON.parse(String(init?.body ?? "{}"));
      const user = request.messages?.find((m) => m.role === "user");
      const id = user ? JSON.parse(user.content).current?.eventId : null;
      if (typeof id === "string" && /^[a-f0-9-]{36}$/.test(id))
        observationId = id;
      const row = {
        at: new Date().toISOString(),
        status: response.status,
        observationId,
      };
      if (response.ok) {
        const body = await response.clone().json();
        const content = body.choices?.[0]?.message?.content;
        if (typeof content === "string" && content.length <= 24000)
          row.content = content;
      }
      appendFileSync(
        path.join(output, "model-responses.ndjson"),
        JSON.stringify(row) + "\n",
      );
    } catch {
      process.stderr.write(
        "Evaluation response capture could not be persisted.\n",
      );
    }
    return response;
  };
}
