import { createHash, timingSafeEqual } from "node:crypto";
import { z } from "zod";

export const observationEnvelopeSchema = z.strictObject({
  version: z.literal(1),
  eventId: z.uuid(),
  sessionId: z.uuid(),
  deviceId: z.uuid(),
  observedAt: z.iso.datetime(),
  page: z.strictObject({
    origin: z.url().refine((url) => /^https?:\/\//.test(url)),
    title: z.string().max(240),
    content: z.string().max(8000),
  }),
});

/** Phase-0 contract. Pairing/rotation and delivery are implemented in Phase 1. */
export function authorizeAgentRequest(
  request: Pick<Request, "headers">,
  pairing: { extensionId: string; tokenHash: string },
): boolean {
  if (!/^[a-p]{32}$/.test(pairing.extensionId)) return false;
  if (!/^[a-f0-9]{64}$/.test(pairing.tokenHash)) return false;
  if (
    request.headers.get("origin") !==
    `chrome-extension://${pairing.extensionId}`
  )
    return false;
  const token = request.headers
    .get("authorization")
    ?.match(/^Bearer ([a-f0-9]{64})$/)?.[1];
  if (!token) return false;
  const actual = createHash("sha256").update(token).digest();
  return timingSafeEqual(actual, Buffer.from(pairing.tokenHash, "hex"));
}
