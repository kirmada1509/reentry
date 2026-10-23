import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { expect, it } from "vitest";

it("audits an explicitly supplied external asset directory without printing its credential", () => {
  const directory = mkdtempSync(path.join(tmpdir(), "reentry-audit-"));
  const credential = ["nvapi", "a".repeat(25)].join("-");
  try {
    writeFileSync(path.join(directory, "unsafe.txt"), credential);
    const result = spawnSync(
      process.execPath,
      ["scripts/publication-audit.mjs", directory],
      { encoding: "utf8", timeout: 45000 },
    );
    expect(result.error).toBeUndefined();
    expect(result.status).toBe(1);
    const output = result.stdout + result.stderr;
    expect(output).toContain("unsafe.txt: NVIDIA API key");
    expect(output).not.toContain(credential);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}, 50000);

it("refuses a missing explicit asset directory instead of reporting a successful empty scan", () => {
  const directory = mkdtempSync(path.join(tmpdir(), "reentry-audit-missing-"));
  rmSync(directory, { recursive: true });
  const result = spawnSync(
    process.execPath,
    ["scripts/publication-audit.mjs", directory],
    { encoding: "utf8", timeout: 5000 },
  );
  expect(result.error).toBeUndefined();
  expect(result.status).toBe(1);
  expect(result.stderr).toContain("asset directory is missing or invalid");
  expect(result.stdout).not.toContain("Publication audit passed");
});
