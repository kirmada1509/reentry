import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { root } from "./project.mjs";
import { checkUi, hash } from "./check-ui.mjs";

// Explicit theme adoption: upstream tokens, scoped to the new prototype.
// No component styles or existing vendor files are changed.
const issues = checkUi();
if (issues.length) throw new Error(issues.join("\n"));
const source = "https://ui.shadcn.com/r/colors/stone.json";
const sourcePath = path.join(root, "docs/ui-sources/stone.json");
mkdirSync(path.dirname(sourcePath), { recursive: true });
let raw;
try {
  raw = readFileSync(sourcePath, "utf8");
} catch (error) {
  if (error.code !== "ENOENT") throw error;
  const response = await fetch(source, { signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error("Official theme source unavailable.");
  raw = await response.text();
}
const stone = JSON.parse(raw).inlineColors.light;
const tailwind = readFileSync(
  path.join(root, "node_modules/tailwindcss/theme.css"),
  "utf8",
);
const green = tailwind.match(/--color-emerald-800:\s*([^;]+);/)?.[1];
if (!stone?.background || !green)
  throw new Error("Unexpected upstream theme format.");
const tokens = {
  ...stone,
  background: stone.sidebar,
  primary: green,
  "primary-foreground": stone["primary-foreground"],
};
if (
  Object.entries(tokens).some(
    ([key, value]) =>
      !/^[a-z0-9-]+$/.test(key) ||
      !/^(oklch\([0-9. %/]+\)|[0-9.]+rem)$/.test(value),
  )
)
  throw new Error("Unexpected theme token.");
const filename = "src/app/preview/registry-theme.css";
mkdirSync(path.join(root, "src/app/preview"), { recursive: true });
const css = `[data-reentry-preview] {\n${Object.entries(tokens)
  .map(([key, value]) => `  --${key}: ${value};`)
  .join(
    "\n",
  )}\n  background-color: var(--background);\n  color: var(--foreground);\n}\n`;
writeFileSync(sourcePath, raw);
writeFileSync(path.join(root, filename), css);
const manifestPath = path.join(root, "docs/ui-provenance.json");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
manifest.files[filename] = hash(css);
manifest.files["docs/ui-sources/stone.json"] = hash(raw);
manifest.acquisitions.push({
  items: ["scoped-stone-emerald-theme"],
  source,
  tokenSourceSha256: hash(raw),
  accentSource: "tailwindcss/theme.css (MIT), emerald-800",
  accentSourceSha256: hash(tailwind),
  date: new Date().toISOString().slice(0, 10),
});
writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
console.log(
  "Adopted scoped official Stone tokens and Tailwind Emerald accent.",
);
