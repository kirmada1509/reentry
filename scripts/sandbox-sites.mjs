import { copyFile, mkdir } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";
import { root } from "./project.mjs";

const directory = path.join(root, ".runtime", "sites");
const action = process.argv[2] || "start";
const version = action === "switch" ? process.argv[3] : "v1";
if (
  !["start", "switch"].includes(action) ||
  !["v1", "v2", "cosmetic"].includes(version)
)
  throw new Error("Use sandbox:sites, or sandbox:switch v1|v2|cosmetic.");
await mkdir(directory, { recursive: true });
await copyFile(
  path.join(root, "tests/fixtures/sites/versions", version + ".html"),
  path.join(directory, "instructions.html"),
);
console.log(
  "Fictional instructions set to " +
    version +
    ". Reload the source before recapturing.",
);
if (action === "start") {
  const port = process.argv[3] || "4173";
  if (!/^\d+$/.test(port) || Number(port) < 1 || Number(port) > 65535)
    throw new Error("Choose a valid local port.");
  const child = spawn(
    process.execPath,
    [
      path.join(root, "node_modules/http-server/bin/http-server"),
      directory,
      "-a",
      "127.0.0.1",
      "-p",
      port,
      "-c-1",
    ],
    { stdio: "inherit" },
  );
  for (const signal of ["SIGINT", "SIGTERM"])
    process.on(signal, () => child.kill(signal));
  child.on("error", () => {
    console.error("Could not start the fixture server.");
    process.exitCode = 1;
  });
  child.on("exit", (code) => {
    process.exitCode = code ?? 0;
  });
}
