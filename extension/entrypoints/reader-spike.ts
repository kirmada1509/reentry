import { defineUnlistedScript } from "wxt/utils/define-unlisted-script";
import { readPageFoundation } from "../lib/page-reader";

export default defineUnlistedScript(async () => {
  // Invoked only by the integration test with Chrome's activeTab permission.
  // No automatic content script or production observation permission yet.
  const result = await readPageFoundation();
  Object.assign(globalThis, { __reentryReaderFoundation: result });
});
