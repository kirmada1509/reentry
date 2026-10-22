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
  ...(env.REENTRY_AI_PROVIDER === "nvidia"
    ? ([
        ["decrease", "Attach your transcript. No referees are required."],
        ["cosmetic", "Attach your transcript.  Supply one referee!"],
        ["missing-evidence", "Instructions unavailable"],
      ] as const)
    : []),
  ["increase", "Attach your transcript. Supply two referees."],
  ["unchanged", "Attach your transcript. Supply one referee."],
  [
    "contradiction",
    "Attach your transcript. Supply two referees. Do not supply any referees.",
  ],
] as const;
const requested = process.argv
  .find((value) => value.startsWith("--case="))
  ?.slice(7);
if (requested && !cases.some(([name]) => name === requested))
  throw new Error("Choose an existing evaluation case.");
const selectedCases = requested
  ? cases.filter(([name]) => name === requested)
  : cases;
const records = [];
let failures = 0;
for (const [name, text] of selectedCases) {
  const input = await recoveryFixture(text);
  if (name === "missing-evidence") {
    delete input.check.after;
    delete input.check.captureId;
    input.check.status = "failed";
    input.check.reason = "source-unavailable";
  }
  let called = false;
  let candidate: unknown;
  const observed = {
    async generate(...args: Parameters<typeof model.generate>) {
      called = true;
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
        : name === "unchanged" || name === "cosmetic"
          ? result.proposal.assessment === "unchanged"
          : name === "decrease"
            ? result.proposal.assessment === "changed" &&
              !/find.*referee/i.test(result.proposal.nextAction.instruction)
            : result.proposal.assessment === "uncertain" &&
              result.proposal.questions.length > 0;
    if (!appropriate) failures++;
    records.push({
      name,
      input,
      messages: input.check.after ? recoveryMessages(input) : null,
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
    const blockedMissingEvidence = name === "missing-evidence" && !called;
    if (!blockedMissingEvidence) failures++;
    records.push({
      name,
      input,
      candidate,
      messages: input.check.after ? recoveryMessages(input) : null,
      error: error instanceof Error ? error.message : "Failed",
      appropriate: blockedMissingEvidence,
    });
    console.log(
      `${name}: ${blockedMissingEvidence ? "blocked before provider call, as required" : "failed; inspect saved evidence"}.`,
    );
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
console.log(`Actual model evidence: ${output}`);
process.exitCode = failures ? 1 : 0;
