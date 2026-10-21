import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  rmSync,
  symlinkSync,
} from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { checkUi, hash } from "../scripts/check-ui.mjs";
import { findSecrets, scanRepository } from "../scripts/check-secrets.mjs";

const directories: string[] = [];
function temporary() {
  const directory = mkdtempSync(path.join(tmpdir(), "starter-guard-"));
  directories.push(directory);
  return directory;
}
afterEach(() => {
  for (const directory of directories.splice(0))
    rmSync(directory, { recursive: true, force: true });
});

describe("quality guards", () => {
  it("rejects private env files and high-confidence tokens without reporting values", () => {
    expect(findSecrets(".env.local", "HELLO=value")).toContain(
      "private environment file",
    );
    expect(findSecrets(".env.example", "AXIOM_TOKEN=")).toEqual([]);
    expect(findSecrets("file.ts", "ghp_" + "a".repeat(36))).toContain(
      "GitHub token",
    );
  });
  it("scans staged content rather than a cleaned working copy", () => {
    const directory = temporary();
    execFileSync("git", ["init", "-q"], { cwd: directory });
    const file = path.join(directory, "secret.txt");
    writeFileSync(file, "ghp_" + "b".repeat(36));
    execFileSync("git", ["add", "secret.txt"], { cwd: directory });
    writeFileSync(file, "clean working copy");
    expect(scanRepository(true, directory)).toContain(
      "secret.txt: GitHub token",
    );
    expect(readFileSync(file, "utf8")).toBe("clean working copy");
  });
  it("handles shared skill directory symlinks without following them", () => {
    const directory = temporary();
    execFileSync("git", ["init", "-q"], { cwd: directory });
    mkdirSync(path.join(directory, "skills"));
    symlinkSync("skills", path.join(directory, "shared-skills"), "dir");
    execFileSync("git", ["add", "shared-skills"], { cwd: directory });
    expect(scanRepository(false, directory)).toEqual([]);
  });
  it("allows registry UI and rejects both vendor drift and custom controls", () => {
    const directory = temporary();
    mkdirSync(path.join(directory, "docs"), { recursive: true });
    mkdirSync(path.join(directory, "src/components/ui"), { recursive: true });
    mkdirSync(path.join(directory, "src/app"), { recursive: true });
    const vendor = "export const Button = () => <button />;";
    writeFileSync(path.join(directory, "src/components/ui/button.tsx"), vendor);
    writeFileSync(
      path.join(directory, "docs/ui-provenance.json"),
      JSON.stringify({
        files: { "src/components/ui/button.tsx": hash(vendor) },
      }),
    );
    writeFileSync(
      path.join(directory, "src/app/page.tsx"),
      "export default function Page() { return <main />; }",
    );
    expect(checkUi(directory)).toEqual([]);
    writeFileSync(
      path.join(directory, "src/app/page.tsx"),
      "export default function Page() { return <button style={{color:'red'}}>Go</button>; }",
    );
    expect(checkUi(directory).join(" ")).toContain("use a registry component");
    mkdirSync(path.join(directory, "extension/entrypoints/capture"), {
      recursive: true,
    });
    writeFileSync(
      path.join(directory, "extension/entrypoints/capture/page.tsx"),
      "export default function Page() { return <button>Capture</button>; }",
    );
    expect(checkUi(directory).join(" ")).toContain(
      "extension/entrypoints/capture/page.tsx: use a registry component",
    );
    writeFileSync(
      path.join(directory, "src/components/ui/button.tsx"),
      vendor + "\n// changed",
    );
    expect(checkUi(directory).join(" ")).toContain("registry file changed");
  });
});
