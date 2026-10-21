import { createServer } from "@msw/serve";
import { modelHandlers } from "../tests/mocks/model-handlers";
const port = Number(
  process.env.REENTRY_TEST_MODEL_PORT ?? process.argv[2] ?? 4190,
);
if (!Number.isInteger(port) || port < 1 || port > 65535)
  throw new Error("Choose a valid sandbox port.");
const server = createServer(...modelHandlers);
server.listen(port, "127.0.0.1", () =>
  console.log(
    `Synthetic MSW model sandbox at http://127.0.0.1:${port}; not live AI.`,
  ),
);
for (const signal of ["SIGINT", "SIGTERM"] as const)
  process.on(signal, () => server.close());
