import "server-only";
import { getEnvironment } from "@/lib/env";
import { ObservationStore } from "./store";

// Each Next bundle owns its connection/classes. The SQLite file is the shared
// authority; sharing class instances across instrumentation/route bundles can
// break AppError instanceof checks and turn a revoked-device 401 into a 500.
let current: { filename: string; store: ObservationStore } | undefined;
export function observationStore() {
  const filename = getEnvironment().REENTRY_AGENT_DB;
  if (current?.filename !== filename) {
    current?.store.close();
    current = { filename, store: new ObservationStore(filename) };
  }
  return current.store;
}
