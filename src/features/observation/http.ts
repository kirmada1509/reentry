import "server-only";
import { getEnvironment } from "@/lib/env";
import { AppError } from "@/lib/http/errors";
import { readJson } from "@/lib/http/read-json";
import { deviceRequestSchema, webActionSchema } from "./protocol";
import { ObservationStore } from "./store";

let current: { filename: string; store: ObservationStore } | undefined;
function store() {
  const filename = getEnvironment().REENTRY_AGENT_DB;
  if (current?.filename !== filename) {
    current?.store.close();
    current = { filename, store: new ObservationStore(filename) };
  }
  return current.store;
}
function checkHost(request: Request) {
  const expected = new URL(getEnvironment().REENTRY_APP_ORIGIN);
  // Next reconstructs Request.url using its internal listener address. The
  // incoming Host is the browser's authority; do not trust forwarded headers.
  if (request.headers.get("host") !== expected.host)
    throw new AppError(
      "ORIGIN_DENIED",
      "Use the configured local ReEntry address.",
      403,
    );
}
function checkWeb(request: Request) {
  checkHost(request);
  const origin = request.headers.get("origin");
  if (
    request.headers.get("x-reentry-web") !== "1" ||
    (origin
      ? origin !== getEnvironment().REENTRY_APP_ORIGIN
      : request.headers.get("sec-fetch-site") !== "same-origin")
  )
    throw new AppError(
      "ORIGIN_DENIED",
      "Open controls in the local ReEntry app.",
      403,
    );
}
function checkExtension(request: Request) {
  checkHost(request);
  const id = getEnvironment().REENTRY_EXTENSION_ID;
  const origin = request.headers.get("origin");
  // Chrome privileged worker fetches can omit Origin. The bound secret is
  // still required after pairing; websites cannot supply these custom headers
  // without a preflight, which requires the actual extension Origin.
  if (
    request.headers.get("x-reentry-extension") !== id ||
    (origin !== null && origin !== `chrome-extension://${id}`)
  )
    throw new AppError(
      "ORIGIN_DENIED",
      "Use the configured ReEntry extension.",
      403,
    );
}
export function deviceOptions(request: Request) {
  checkHost(request);
  const origin = `chrome-extension://${getEnvironment().REENTRY_EXTENSION_ID}`;
  if (
    request.headers.get("origin") !== origin ||
    request.headers.get("access-control-request-method") !== "POST"
  )
    throw new AppError("ORIGIN_DENIED", "Extension origin required.", 403);
  return new Response(null, {
    status: 204,
    headers: {
      "access-control-allow-origin": origin,
      "access-control-allow-methods": "POST",
      "access-control-allow-headers":
        "content-type,authorization,x-reentry-extension,x-reentry-device",
      vary: "Origin",
    },
  });
}
export async function devicePost(request: Request) {
  checkExtension(request);
  const input = await readJson(request, deviceRequestSchema, 48 * 1024);
  const db = store();
  let result: unknown;
  if (input.action === "pair")
    result = db.pair(input.challenge, getEnvironment().REENTRY_EXTENSION_ID);
  else {
    const id = db.authenticate(request);
    if (input.action === "status") result = db.deviceStatus(id);
    else if (input.action === "session")
      result = db.setSession(
        id,
        input.scope,
        input.paused,
        getEnvironment().REENTRY_APP_ORIGIN,
      );
    else
      result = db.accept(id, input.event, getEnvironment().REENTRY_APP_ORIGIN);
  }
  return Response.json(result, {
    headers: {
      "access-control-allow-origin": `chrome-extension://${getEnvironment().REENTRY_EXTENSION_ID}`,
      vary: "Origin",
    },
  });
}
export function webGet(request: Request) {
  checkWeb(request);
  return Response.json(store().dashboard());
}
export async function webPost(request: Request) {
  checkWeb(request);
  const input = await readJson(request, webActionSchema);
  const db = store();
  if (input.action === "challenge")
    return Response.json({ challenge: db.challenge() });
  if (input.action === "pause") db.pause();
  else db.clear();
  return Response.json(db.dashboard());
}
