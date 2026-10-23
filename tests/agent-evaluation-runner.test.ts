import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import path from "node:path";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";
import { expect, it } from "vitest";

it("a throttled evaluation stops after one attempt and retains an explicitly incomplete report", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "reentry-eval-throttle-"));
  try {
    const mock = path.join(dir, "provider.mjs"),
      out = path.join(dir, "result.json");
    writeFileSync(
      mock,
      `globalThis.fetch=async(input)=>{if(String(input)!=='https://integrate.api.nvidia.com/v1/chat/completions')throw new Error('Unexpected fixture transport');return new Response('{}',{status:429})};`,
    );
    const result = spawnSync(
      process.execPath,
      [
        "--conditions=react-server",
        "--import",
        "tsx",
        "--import",
        pathToFileURL(mock).href,
        "scripts/evaluate-agent-release.ts",
        out,
        "0",
      ],
      {
        encoding: "utf8",
        timeout: 30000,
        env: {
          NODE_ENV: "test",
          PATH: process.env.PATH,
          REENTRY_AI_PROVIDER: "nvidia",
          REENTRY_AI_MODEL: "fixture",
          NVIDIA_API_KEY: "placeholder-evaluation-credential",
        },
      },
    );
    expect(result.status).toBe(1);
    const report = JSON.parse(readFileSync(out, "utf8"));
    expect(report).toMatchObject({
      complete: false,
      plannedSteps: 25,
      interruptedBy: "MODEL_RATE_LIMITED",
      operatorRetries: 0,
      summary: { steps: 1, model: { calls: 1, failedJobs: 1 } },
    });
    expect(report.results).toHaveLength(1);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}, 30000);
