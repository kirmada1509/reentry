import { execFileSync } from "node:child_process";
import { readFileSync, lstatSync, readlinkSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { root } from "./project.mjs";

const patterns = [
  ["private key", /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/],
  [
    "GitHub token",
    /(?:gh[pousr]_[A-Za-z0-9]{36,}|github_pat_[A-Za-z0-9_]{50,})/,
  ],
  ["NVIDIA API key", /nvapi-[A-Za-z0-9_-]{20,}/],
  ["AWS access key", /(?:AKIA|ASIA)[A-Z0-9]{16}/],
  ["Slack token", /xox[baprs]-[A-Za-z0-9-]{20,}/],
  ["Stripe live secret", /sk_live_[A-Za-z0-9]{20,}/],
  ["Axiom API token", /xaat-[A-Za-z0-9_-]{30,}/],
];

export function findSecrets(name, content) {
  const issues = [];
  if (
    /(^|\/)\.env(?:\.|$)/.test(name) &&
    path.basename(name) !== ".env.example"
  ) {
    issues.push("private environment file");
  }
  if (/\.(?:pem|p12|pfx|key)$/.test(name))
    issues.push("private credential file");
  for (const [label, pattern] of patterns) {
    if (pattern.test(content)) issues.push(label);
  }
  return issues;
}

export function scanRepository(staged = false, directory = root) {
  const args = staged
    ? ["diff", "--cached", "--name-only", "--diff-filter=ACMR", "-z"]
    : ["ls-files", "-z"];
  const names = execFileSync("git", args, { cwd: directory, encoding: "utf8" })
    .split("\0")
    .filter(Boolean);
  const issues = [];
  for (const name of names) {
    let content;
    try {
      content = staged
        ? execFileSync("git", ["show", ":" + name], {
            cwd: directory,
            maxBuffer: 10 * 1024 * 1024,
          }).toString("utf8")
        : lstatSync(path.join(directory, name)).isSymbolicLink()
          ? readlinkSync(path.join(directory, name))
          : readFileSync(path.join(directory, name), "utf8");
    } catch (error) {
      if (!staged && error.code === "ENOENT") continue;
      throw error;
    }
    for (const label of findSecrets(name, content))
      issues.push(name + ": " + label);
  }
  return issues;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const issues = scanRepository(process.argv.includes("--staged"));
  if (issues.length) {
    console.error(
      "Commit blocked. Remove sensitive data:\n" + issues.join("\n"),
    );
    process.exitCode = 1;
  } else
    console.log(
      "Secret-pattern check passed. This is a focused guard, not a complete secret detector.",
    );
}
