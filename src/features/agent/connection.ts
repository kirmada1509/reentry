import { createHash, timingSafeEqual } from "node:crypto";
export { eventSchema as observationEnvelopeSchema } from "../observation/protocol";

/** Privileged Chrome fetch may omit Origin; the bound bearer remains mandatory. */
export function authorizeAgentRequest(
  request: Pick<Request, "headers">,
  pairing: { extensionId: string; tokenHash: string },
): boolean {
  if (!/^[a-p]{32}$/.test(pairing.extensionId)) return false;
  if (!/^[a-f0-9]{64}$/.test(pairing.tokenHash)) return false;
  const origin = request.headers.get("origin");
  if (
    (origin !== null &&
      origin !== `chrome-extension://${pairing.extensionId}`) ||
    (origin === null &&
      request.headers.get("x-reentry-extension") !== pairing.extensionId)
  )
    return false;
  const token = request.headers
    .get("authorization")
    ?.match(/^Bearer ([a-f0-9]{64})$/)?.[1];
  if (!token) return false;
  const actual = createHash("sha256").update(token).digest();
  return timingSafeEqual(actual, Buffer.from(pairing.tokenHash, "hex"));
}
