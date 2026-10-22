import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import httpServer from "http-server";
import { root, run } from "./project.mjs";

const directory = path.join(root, ".runtime", "sites");
const action = process.argv[2] || "start";
const version = action === "switch" ? process.argv[3] : "v1";
if (
  !["start", "switch"].includes(action) ||
  !["v1", "v2", "cosmetic"].includes(version)
)
  throw new Error("Use sandbox:sites, or sandbox:switch v1|v2|cosmetic.");
async function main() {
  if (action === "switch") {
    await mkdir(directory, { recursive: true });
    await writeFile(
      path.join(directory, "scenario.json"),
      JSON.stringify({ version }) + "\n",
    );
    console.log(
      `Fictional requirements set to ${version}. Reload your sandbox page before recapturing. Application drafts are kept.`,
    );
    return;
  }
  const requested = process.argv[3];
  const port = requested ?? "4176";
  if (!/^\d+$/.test(port) || Number(port) < 1 || Number(port) > 65535)
    throw new Error("Choose a local port between 1 and 65535.");
  // Reuse http-server for static hosting; no portal backend or accounts.
  for (
    let candidate = Number(port);
    candidate <= Math.min(Number(port) + (requested ? 0 : 10), 65535);
    candidate++
  ) {
    const server = httpServer.createServer({
      root: directory,
      cache: -1,
      showDir: "false",
      autoIndex: "false",
    });
    try {
      await new Promise((resolve, reject) => {
        const onError = (error) => reject(error);
        server.server.once("error", onError);
        server.listen(candidate, "127.0.0.1", () => {
          server.server.removeListener("error", onError);
          resolve();
        });
      });
    } catch (error) {
      if (
        error.code === "EADDRINUSE" &&
        !requested &&
        candidate < Math.min(Number(port) + 10, 65535)
      )
        continue;
      if (error.code === "EADDRINUSE")
        throw new Error(
          `Port ${candidate} is occupied. Try pnpm sandbox:sites start ${candidate < 65535 ? candidate + 1 : 4176}. No other service was stopped.`,
        );
      throw new Error("Could not start the demo portal.");
    }
    try {
      run("pnpm", ["sandbox:build"]);
    } catch (error) {
      server.close();
      throw error;
    }
    server.server.on("error", () => {
      console.error("The demo portal encountered a server error.");
      process.exitCode = 1;
      server.close();
    });
    console.log(
      `\nNorthstar demo portal: http://127.0.0.1:${candidate}/instructions.html`,
    );
    console.log(
      `Application draft: http://127.0.0.1:${candidate}/application.html`,
    );
    console.log(
      "Fictional requirements reset to v1. Ctrl+C stops this sandbox.",
    );
    if (candidate !== Number(port))
      console.log(
        `Port ${port} was occupied. Use the printed address for this session.`,
      );
    for (const signal of ["SIGINT", "SIGTERM"])
      process.on(signal, () => server.close());
    return;
  }
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
