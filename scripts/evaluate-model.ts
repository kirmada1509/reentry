import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import nextEnv from "@next/env";
import { recoveryFixture } from "../tests/fixtures/recovery";
import { configuredModel } from "../src/lib/ai/factory";
import { getEnvironment } from "../src/lib/env";
import { recoveryMessages } from "../src/features/recovery/prompt";
import { runRecovery } from "../src/features/recovery/harness";
nextEnv.loadEnvConfig(process.cwd());
const env = getEnvironment();
const model = configuredModel();
const cases = [
  ["increase", "Attach your transcript. Supply two referees."],
  ["unchanged", "Attach your transcript. Supply one referee."],
  [
    "contradiction",
    "Attach your transcript. Supply two referees. Do not supply any referees.",
  ],
] as const;
const records = [];
let failures = 0;
for (const [name, text] of cases) {
  const input = await recoveryFixture(text);
  let candidate: unknown;
  const observed = {
    async generate(...args: Parameters<typeof model.generate>) {
      const output = await model.generate(...args);
      candidate = output;
      return output;
    },
  };
  try {
    const result = await runRecovery(
      input,
      observed,
      AbortSignal.timeout(env.REENTRY_AI_TIMEOUT_MS),
    );
    const appropriate =
      name === "increase"
        ? result.proposal.assessment === "changed" &&
          /referee/i.test(result.proposal.nextAction.instruction) &&
          /first|1st/i.test(result.proposal.nextAction.instruction) &&
          !/one (?:still )?remains?|(?:one|1) referee (?:is )?(?:done|complete)/i.test(
            result.proposal.summary,
          ) &&
          !/upload.*transcript/i.test(result.proposal.nextAction.instruction)
        : name === "unchanged"
          ? result.proposal.assessment === "unchanged"
          : result.proposal.assessment === "uncertain" &&
            result.proposal.questions.length > 0;
    if (!appropriate) failures++;
    records.push({
      name,
      input,
      messages: recoveryMessages(input),
      result,
      appropriate,
    });
    console.log(
      JSON.stringify({
        name,
        appropriate,
        proposal: result.proposal,
        execution: result.execution,
      }),
    );
  } catch (error) {
    failures++;
    records.push({
      name,
      input,
      candidate,
      messages: recoveryMessages(input),
      error: error instanceof Error ? error.message : "Failed",
      appropriate: false,
    });
    console.log(`${name}: failed; inspect saved evidence.`);
  }
}
const directory = path.resolve(".runtime/model-evaluation");
await mkdir(directory, { recursive: true });
const output = path.join(
  directory,
  new Date().toISOString().replace(/[:.]/g, "-") + ".json",
);
await writeFile(
  output,
  JSON.stringify({ createdAt: new Date().toISOString(), records }, null, 2),
);
console.log(`Actual local-model evidence: ${output}`);
process.exitCode = failures ? 1 : 0;
