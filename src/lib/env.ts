import "server-only";
import { z } from "zod";
import {
  appOriginSchema,
  DEFAULT_APP_ORIGIN,
  DEFAULT_EXTENSION_ID,
  extensionIdSchema,
} from "@/features/capture/config";

const optionalString = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.string().min(1).optional(),
);

const schema = z
  .object({
    NODE_ENV: z
      .enum(["development", "production", "test"])
      .default("development"),
    APP_NAME: z
      .string()
      .regex(/^[a-z][a-z0-9-]*$/)
      .default("agent-starter"),
    APP_ENV: z
      .enum(["development", "preview", "production", "test"])
      .optional(),
    LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
    REENTRY_APP_ORIGIN: appOriginSchema.default(DEFAULT_APP_ORIGIN),
    REENTRY_EXTENSION_ID: extensionIdSchema.default(DEFAULT_EXTENSION_ID),
    AXIOM_TOKEN: optionalString,
    AXIOM_DATASET: optionalString,
    AXIOM_EDGE: z
      .string()
      .regex(/^[a-z0-9.-]+\.axiom\.co$/)
      .default("us-east-1.aws.edge.axiom.co"),
    OTEL_EXPORTER_OTLP_ENDPOINT: z.preprocess(
      (value) => (value === "" ? undefined : value),
      z.url().optional(),
    ),
  })
  .superRefine((value, context) => {
    if (Boolean(value.AXIOM_TOKEN) !== Boolean(value.AXIOM_DATASET)) {
      context.addIssue({
        code: "custom",
        path: ["AXIOM_TOKEN"],
        message:
          "Set AXIOM_TOKEN and AXIOM_DATASET together, or leave both empty.",
      });
    }
  });

export function parseEnvironment(source: Record<string, string | undefined>) {
  const result = schema.safeParse(source);
  if (!result.success) {
    // Report field names and rules, never the supplied environment values.
    throw new Error(
      "Invalid configuration: " +
        result.error.issues
          .map((issue) => issue.path.join(".") + ": " + issue.message)
          .join("; "),
    );
  }
  return {
    ...result.data,
    APP_ENV: result.data.APP_ENV ?? result.data.NODE_ENV,
  };
}

export function getEnvironment() {
  return parseEnvironment(process.env);
}
