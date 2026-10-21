import { z } from "zod";

export const DEFAULT_APP_ORIGIN = "http://127.0.0.1:3000";
export const DEFAULT_EXTENSION_ID = "nabinfdlobegbkgehppcipkhbddjbdka";
export const extensionIdSchema = z.string().regex(/^[a-p]{32}$/);

export const appOriginSchema = z.string().superRefine((value, context) => {
  try {
    const url = new URL(value);
    if (
      url.origin !== value ||
      url.protocol !== "http:" ||
      !["localhost", "127.0.0.1"].includes(url.hostname)
    ) {
      throw new Error("invalid origin");
    }
  } catch {
    context.addIssue({
      code: "custom",
      message:
        "Use an exact local HTTP origin, for example http://127.0.0.1:3000.",
    });
  }
});

// Only public connection settings are emitted by the server layout. Read them
// when a browser operation starts, never during server rendering.
export function readConnectionConfiguration() {
  return {
    appOrigin: appOriginSchema.parse(
      document.documentElement.dataset.reentryOrigin,
    ),
    extensionId: extensionIdSchema.parse(
      document.documentElement.dataset.reentryExtensionId,
    ),
  };
}
