import { execFileSync } from "node:child_process";
import { readFileSync, existsSync, lstatSync, readlinkSync } from "node:fs";
import path from "node:path";
import nextEnv from "@next/env";
import { findSecrets, scanRepository } from "./check-secrets.mjs";
import { filesUnder, root } from "./project.mjs";

nextEnv.loadEnvConfig(root);
const extraDirectories = process.argv
  .slice(2)
  .map((directory) => path.resolve(root, directory));
for (const directory of extraDirectories)
  if (!existsSync(directory) || !lstatSync(directory).isDirectory())
    throw new Error(
      "An explicit publication asset directory is missing or invalid.",
    );
const issues = [...scanRepository()];
const objects = execFileSync("git", ["rev-list", "--objects", "--all"], {
  cwd: root,
  encoding: "utf8",
})
  .trim()
  .split("\n");
const actualSecrets = Object.entries(process.env).filter(
  ([key, value]) =>
    /(?:API_KEY|^MISTRAL$|AXIOM_TOKEN$)/.test(key) &&
    value &&
    value.length > 12,
);
let blobs = 0;
for (const entry of objects) {
  const [oid, ...parts] = entry.split(" ");
  const name = parts.join(" ");
  const kind = execFileSync("git", ["cat-file", "-t", oid], {
    cwd: root,
    encoding: "utf8",
  }).trim();
  if (kind !== "blob") continue;
  blobs++;
  const body = execFileSync("git", ["cat-file", "blob", oid], {
    cwd: root,
    maxBuffer: 20 * 1024 * 1024,
  }).toString("utf8");
  for (const label of findSecrets(name, body))
    issues.push(`history ${oid.slice(0, 8)} ${name}: ${label}`);
  if (name === "devpost/learner-profile.md")
    issues.push("Personal learner profile exists in history.");
  for (const [key, value] of actualSecrets)
    if (body.includes(value))
      issues.push(`history ${oid.slice(0, 8)}: contains configured ${key}`);
}
const names = execFileSync("git", ["ls-files", "-z"], {
  cwd: root,
  encoding: "utf8",
})
  .split("\0")
  .filter(Boolean);
for (const name of names) {
  if (name === "devpost/learner-profile.md")
    issues.push("Personal learner profile is tracked.");
  if (!existsSync(path.join(root, name))) continue;
  const fullPath = path.join(root, name);
  const body = lstatSync(fullPath).isSymbolicLink()
    ? readlinkSync(fullPath)
    : readFileSync(fullPath, "utf8");
  for (const [key, value] of actualSecrets)
    if (body.includes(value))
      issues.push(`${name}: contains configured ${key}`);
}
for (const directory of [
  ".next/static",
  "extension/.output/chrome-mv3",
  ".runtime/sites",
  ...extraDirectories,
]) {
  for (const file of filesUnder(path.resolve(root, directory))) {
    const body = readFileSync(file, "utf8");
    if (extraDirectories.includes(path.resolve(root, directory)))
      for (const label of findSecrets(path.relative(root, file), body))
        issues.push(`${path.relative(root, file)}: ${label}`);
    for (const [key, value] of actualSecrets)
      if (body.includes(value))
        issues.push(`${path.relative(root, file)}: contains configured ${key}`);
  }
}
if (issues.length) {
  console.error([...new Set(issues)].join("\n"));
  process.exitCode = 1;
} else
  console.log(
    `Publication audit passed: ${blobs} history blobs, tracked files and built browser assets checked. Focused patterns and configured credential comparisons are not a complete secret audit.`,
  );
