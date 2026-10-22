import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { checkUi, hash } from "./check-ui.mjs";
import { root, filesUnder, run } from "./project.mjs";

const items = process.argv.slice(2);
if (!items.length || items.some((item) => !/^[a-z0-9-]+$/.test(item))) {
  throw new Error(
    "Usage: pnpm ui:add button dialog dashboard-01 (official registry names only)",
  );
}
const issues = checkUi();
if (issues.length)
  throw new Error(
    "Fix existing UI drift before installing:\n" + issues.join("\n"),
  );
const snapshot = () =>
  Object.fromEntries(
    filesUnder(path.join(root, "src")).map((file) => [
      path.relative(root, file).split(path.sep).join("/"),
      hash(readFileSync(file)),
    ]),
  );
const before = snapshot();
run("pnpm", ["exec", "shadcn", "add", ...items, "--yes", "--overwrite"]);
// Font registry items wire the framework layout. Keep that application file
// editable and formatted; only vendored assets belong in the hash manifest.
if (items.some((item) => item.startsWith("font-")))
  run("pnpm", ["exec", "prettier", "--write", "src/app/layout.tsx"]);
const after = snapshot();
const manifestPath = path.join(root, "docs/ui-provenance.json");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
for (const [name, digest] of Object.entries(after)) {
  const framework = /(?:^|\/)(?:page|layout)\.[jt]sx?$/.test(name);
  if (framework) delete manifest.files[name];
  else if (digest !== before[name]) manifest.files[name] = digest;
}
manifest.acquisitions.push({
  items,
  source: "https://ui.shadcn.com/r",
  date: new Date().toISOString().slice(0, 10),
});
writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
const remaining = checkUi();
if (remaining.length) throw new Error(remaining.join("\n"));
console.log(
  "Installed registry assets and recorded their provenance. Review and commit the diff.",
);
