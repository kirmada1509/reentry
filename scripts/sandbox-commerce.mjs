import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile, access, rm } from "node:fs/promises";
import path from "node:path";
import { root, run } from "./project.mjs";

const source = JSON.parse(
  await readFile(path.join(root, "sandboxes/commerce-source.json"), "utf8"),
);
const directory = path.join(root, ".runtime/commerce/site");
const localRevision = `${source.commit}:reentry-2`;
const action = process.argv[2] ?? "start";
const port = process.argv[3] ?? "4177";
if (
  !["setup", "start"].includes(action) ||
  !/^\d+$/.test(port) ||
  Number(port) < 1 ||
  Number(port) > 65535
)
  throw new Error("Use sandbox:commerce [start|setup] [port].");
const isolated = [
  `--package=node@${source.node}`,
  `--package=npm@${source.npm}`,
  "dlx",
  "npm",
];
await mkdir(directory, { recursive: true });
let ready = false;
try {
  ready =
    (await readFile(path.join(directory, ".reentry-source"), "utf8")) ===
    localRevision;
  await access(path.join(directory, "build/index.html"));
} catch {
  ready = false;
}
if (!ready) {
  const response = await fetch(
    `https://codeload.github.com/saucelabs/sample-app-web/tar.gz/${source.commit}`,
    { signal: AbortSignal.timeout(30000) },
  );
  if (!response.ok)
    throw new Error("Could not download the pinned sample shop.");
  const archive = Buffer.from(await response.arrayBuffer());
  if (
    createHash("sha256").update(archive).digest("hex") !== source.archiveSha256
  )
    throw new Error("Sample shop archive does not match its pinned checksum.");
  const filename = path.join(root, ".runtime/commerce/source.tar.gz");
  await writeFile(filename, archive);
  run("tar", ["-xzf", filename, "--strip-components", "1", "-C", directory]);
  // Alias all upstream reporting imports to a local inert implementation.
  await writeFile(
    path.join(directory, "reentry-reporting.js"),
    "export const BacktraceClient = { initialize() {}, instance: { send() {} } };\nexport const ErrorBoundary = ({ children }) => children;\n",
  );
  await writeFile(
    path.join(directory, "vite.config.mjs"),
    `import { defineConfig } from 'vite';\nimport react from '@vitejs/plugin-react';\nimport { fileURLToPath } from 'node:url';\nexport default defineConfig({ envDir: false, plugins: [react()], resolve: { alias: { '@backtrace/react': fileURLToPath(new URL('./reentry-reporting.js', import.meta.url)) } }, build: { outDir: 'build' } });\n`,
  );
  await rm(path.join(directory, "vite.config.js"));
  const htmlPath = path.join(directory, "index.html");
  const html = await readFile(htmlPath, "utf8");
  await writeFile(
    htmlPath,
    html
      .replace(
        /<link[^>]+href="https:\/\/fonts\.googleapis\.com[^"\n]+"[^>]*>/g,
        "",
      )
      .replace(
        "<title>Swag Labs</title>",
        "<title>Swag Labs · ReEntry simulated shop</title>",
      ),
  );
  run(
    "pnpm",
    [...isolated, "ci", "--ignore-scripts", "--no-audit", "--no-fund"],
    { cwd: directory },
  );
  run("pnpm", [...isolated, "run", "build"], { cwd: directory });
  await writeFile(path.join(directory, ".reentry-source"), localRevision);
}
console.log(
  `Pinned MIT Sauce Labs shop: ${source.commit}. Synthetic checkout; external reporting disabled.`,
);
if (action === "start") {
  console.log(
    `Shopping sandbox: http://127.0.0.1:${port}/ (Ctrl+C stops this sandbox).`,
  );
  run(
    "pnpm",
    [
      ...isolated,
      "run",
      "preview",
      "--",
      "--host",
      "127.0.0.1",
      "--port",
      port,
      "--strictPort",
    ],
    { cwd: directory },
  );
}
