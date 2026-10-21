import type { z } from "zod";
import { AppError } from "./errors";

export async function readJson<T>(
  request: Pick<Request, "headers" | "body">,
  schema: z.ZodType<T>,
  limit = 64 * 1024,
): Promise<T> {
  if (
    !request.headers
      .get("content-type")
      ?.toLowerCase()
      .startsWith("application/json")
  ) {
    throw new AppError("UNSUPPORTED_MEDIA_TYPE", "Send application/json.", 415);
  }
  const reader = request.body?.getReader();
  if (!reader)
    throw new AppError("INVALID_JSON", "A JSON body is required.", 400);
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > limit) {
        await reader.cancel();
        throw new AppError(
          "PAYLOAD_TOO_LARGE",
          "The request is too large.",
          413,
        );
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  let payload: unknown;
  try {
    payload = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new AppError(
      "INVALID_JSON",
      "The request must contain valid JSON.",
      400,
    );
  }
  const result = schema.safeParse(payload);
  if (!result.success) {
    throw new AppError("VALIDATION_ERROR", "Check the supplied fields.", 400);
  }
  return result.data;
}
