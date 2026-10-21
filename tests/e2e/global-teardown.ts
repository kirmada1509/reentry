import { readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

export default async function teardown() {
  const directory = process.env.REENTRY_TEST_FIXTURE_DIR;
  if (
    !directory ||
    !path.basename(directory).startsWith("reentry-sites-") ||
    path.dirname(directory) !== path.resolve(tmpdir())
  )
    return;
  if (
    (await readFile(path.join(directory, ".reentry-owned"), "utf8")) !==
    process.cwd()
  )
    throw new Error("Refusing to remove an unowned fixture directory.");
  await rm(directory, { recursive: true, force: true });
}
