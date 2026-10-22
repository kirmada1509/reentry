import { randomUUID } from "node:crypto";
import { execFileSync, spawn } from "node:child_process";
import { createServer } from "node:net";
import {
  existsSync,
  mkdirSync,
  openSync,
  closeSync,
  readFileSync,
  writeFileSync,
  rmSync,
} from "node:fs";
import path from "node:path";
import nextEnvironment from "@next/env";
const { loadEnvConfig } = nextEnvironment;
import { root, run } from "./project.mjs";

const action = process.argv[2] || "status";
if (process.platform === "win32")
  throw new Error(
    "Managed background scripts support macOS/Linux. Use pnpm dev on Windows.",
  );
loadEnvConfig(root, !process.argv.includes("--production"));
const runtime = path.join(root, ".runtime");
const stateFile = path.join(runtime, "server.json");
const logFile = path.join(runtime, "server.log");
const supervisor = path.join(root, "scripts/serve.mjs");
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
function state() {
  if (!existsSync(stateFile)) return undefined;
  return JSON.parse(readFileSync(stateFile, "utf8"));
}
function ownsProcess(saved) {
  if (
    !saved ||
    saved.root !== root ||
    !Number.isSafeInteger(saved.pid) ||
    saved.pid < 2
  )
    return false;
  try {
    const command = execFileSync(
      "ps",
      ["-p", String(saved.pid), "-o", "args="],
      { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
    );
    return command.includes(supervisor) && command.includes(saved.runId);
  } catch {
    return false;
  }
}
async function stop(saved) {
  if (!ownsProcess(saved)) {
    rmSync(stateFile, { force: true });
    console.log("No owned server is running.");
    return;
  }
  process.kill(-saved.pid, "SIGTERM");
  for (let attempt = 0; attempt < 50 && ownsProcess(saved); attempt++)
    await pause(100);
  if (ownsProcess(saved)) process.kill(-saved.pid, "SIGKILL");
  rmSync(stateFile, { force: true });
  console.log("Stopped this project's server.");
}
async function portAvailable(port) {
  return new Promise((resolve) => {
    const server = createServer();
    server.once("error", () => resolve(false));
    server.listen(port, "127.0.0.1", () => server.close(() => resolve(true)));
  });
}
const saved = state();
if (action === "stop") {
  await stop(saved);
} else if (action === "status") {
  console.log(
    ownsProcess(saved)
      ? "Running at http://127.0.0.1:" + saved.port + " (" + saved.mode + ")"
      : "Stopped.",
  );
} else if (action === "logs") {
  if (!existsSync(logFile)) console.log("No local server log yet.");
  else if (process.argv.includes("--follow")) {
    const child = spawn("tail", ["-n", "80", "-f", logFile], {
      stdio: "inherit",
    });
    process.on("SIGINT", () => child.kill("SIGTERM"));
  } else {
    console.log(
      readFileSync(logFile, "utf8").split("\n").slice(-80).join("\n"),
    );
  }
} else if (action === "start") {
  if (ownsProcess(saved))
    throw new Error(
      "This project's server is already running. Use pnpm dev:status.",
    );
  if (existsSync(stateFile)) rmSync(stateFile);
  const port = Number(process.env.PORT || 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535)
    throw new Error("PORT must be between 1 and 65535.");
  if (!(await portAvailable(port)))
    throw new Error(
      "Port " +
        port +
        " is occupied. Choose another PORT; no process was terminated.",
    );
  const mode = process.argv.includes("--production") ? "start" : "dev";
  if (process.argv.includes("--build")) {
    if (mode !== "start")
      throw new Error(
        "Use --build with --production for a stable local build.",
      );
    // Preflight above refuses an active server/occupied port before touching
    // build output. Reuse the same owned-process lifecycle after building.
    run("pnpm", ["extension:build"]);
    run("pnpm", ["build"]);
  }
  if (mode === "start" && !existsSync(path.join(root, ".next/BUILD_ID")))
    throw new Error("Run pnpm build before starting production.");
  mkdirSync(runtime, { recursive: true, mode: 0o700 });
  const fd = openSync(logFile, "a", 0o600);
  const runId = randomUUID();
  const child = spawn(
    process.execPath,
    [supervisor, mode, String(port), "--run-id", runId],
    {
      cwd: root,
      detached: true,
      stdio: ["ignore", fd, fd],
      env: process.env,
    },
  );
  closeSync(fd);
  child.on("error", () => {
    console.error("Server launch failed.");
    process.exitCode = 1;
  });
  child.unref();
  const started = { pid: child.pid, root, port, mode, runId };
  writeFileSync(stateFile, JSON.stringify(started), { mode: 0o600 });
  let ready = false;
  for (let attempt = 0; attempt < 120; attempt++) {
    if (!ownsProcess(started)) break;
    try {
      const response = await fetch(
        "http://127.0.0.1:" + port + "/api/health/ready",
        { signal: AbortSignal.timeout(1000) },
      );
      if (response.ok) {
        ready = true;
        break;
      }
    } catch {}
    await pause(250);
  }
  if (!ready) {
    await stop(started);
    throw new Error("Server did not become ready. Inspect pnpm dev:logs.");
  }
  console.log(
    "Ready at http://127.0.0.1:" + port + ". Stop with pnpm dev:stop.",
  );
} else throw new Error("Use start, stop, status, or logs.");
