import { spawnSync } from "node:child_process";
import {
  mkdtempSync,
  readFileSync,
  writeFileSync,
  existsSync,
  rmSync,
  mkdirSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { expect, it } from "vitest";
function capture(enabled: boolean, owner = process.cwd()) {
  const dir = mkdtempSync(path.join(tmpdir(), "reentry-capture-eval-")),
    out = path.join(dir, "out");
  mkdirSync(out);
  writeFileSync(path.join(dir, ".reentry-owned"), owner);
  const result = spawnSync(
    process.execPath,
    [
      "--input-type=module",
      "-e",
      `
    globalThis.fetch=async()=>Response.json({choices:[{message:{content:'{"tool":"ignore"}'}}]});
    await import('./scripts/capture-agent-evaluation.mjs');
    await fetch('https://example.com',{headers:{authorization:'sensitive-header-value'}});
    const r=await fetch('https://integrate.api.nvidia.com/v1/chat/completions',{headers:{authorization:'sensitive-header-value'},body:JSON.stringify({messages:[{role:'system',content:'private-prompt-sentinel'},{role:'user',content:JSON.stringify({current:{eventId:'12345678-1234-1234-1234-123456789abc'}})}]})});
    console.log((await r.json()).choices[0].message.content);
  `,
    ],
    {
      encoding: "utf8",
      env: {
        NODE_ENV: "test",
        REENTRY_AGENT_DEMO_DIR: out,
        REENTRY_TEST_FIXTURE_DIR: dir,
        ...(enabled
          ? { REENTRY_TEST_LIVE: "1", REENTRY_AGENT_DEMO_KIND: "application" }
          : {}),
      },
    },
  );
  const file = path.join(out, "model-responses.ndjson"),
    body = existsSync(file) ? readFileSync(file, "utf8") : null;
  rmSync(dir, { recursive: true, force: true });
  return { result, body };
}
it("diagnostic capture stays disabled normally and refuses a mismatched fixture owner", () => {
  const disabled = capture(false);
  expect(disabled.result.status).toBe(0);
  expect(disabled.body).toBeNull();
  const wrong = capture(true, "unrelated-project");
  expect(wrong.result.status).not.toBe(0);
  expect(wrong.body).toBeNull();
});
it("captures only the fixed provider's model content without credentials, prompts or other requests", () => {
  const { result, body } = capture(true);
  expect(result.status).toBe(0);
  expect(result.stdout.trim()).toBe('{"tool":"ignore"}');
  const rows = body!
    .trim()
    .split("\n")
    .map((x) => JSON.parse(x));
  expect(rows).toHaveLength(1);
  expect(rows[0]).toMatchObject({
    status: 200,
    observationId: "12345678-1234-1234-1234-123456789abc",
    content: '{"tool":"ignore"}',
  });
  expect(body).not.toMatch(
    /sensitive-header-value|private-prompt-sentinel|example.com/,
  );
});
