import "server-only";
import { getEnvironment } from "@/lib/env";
import { AppError } from "@/lib/http/errors";
import { readJson } from "@/lib/http/read-json";
import { deviceRequestSchema, webActionSchema } from "./protocol";
import { observationStore as store } from "./repository";
import { agentProcessing } from "../agent/processing";
import { agentActionSchema, historyRequestSchema } from "../agent/schema";

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
export async function devicePost(request: Request, requestId?: string) {
  checkExtension(request);
  const input = await readJson(request, deviceRequestSchema, 48 * 1024);
  const db = store();
  let result: unknown;
  if (input.action === "pair")
    result = db.pair(input.challenge, getEnvironment().REENTRY_EXTENSION_ID);
  else {
    const id = db.authenticate(request);
    if (input.action === "recovery_tick")
      result = db.agent.recovery.tick(
        id,
        input.tick,
        db.agent.view(agentProcessing()).enabled,
      );
    else if (input.action === "notification_check")
      result = {
        allowed: db.agent.recovery.mayDeliver(
          input.id,
          id,
          input.sessionId,
          db.agent.view(agentProcessing()).enabled,
        ),
      };
    else if (input.action === "notification_result") {
      db.agent.recovery.acknowledge(input.delivery.id, input.delivery.result);
      result = { acknowledged: true };
    } else if (input.action === "task_change") {
      const change = agentActionSchema.safeParse(input.change);
      if (!change.success)
        throw new AppError(
          "VALIDATION_ERROR",
          "Review this task action and retry.",
          400,
        );
      db.agent.action(change.data, agentProcessing(), requestId);
      result = db.agent.view(agentProcessing());
    } else if (input.action === "task_history") {
      const parsed = historyRequestSchema.safeParse(input.request);
      if (!parsed.success)
        throw new AppError(
          "VALIDATION_ERROR",
          "Review this history request.",
          400,
        );
      result = db.agent.history(parsed.data.id, parsed.data.expectedRevision);
    } else if (input.action === "tasks")
      result = db.agent.view(agentProcessing());
    else if (input.action === "status") result = db.deviceStatus(id);
    else if (input.action === "session")
      result = db.setSession(
        id,
        input.scope,
        input.paused,
        getEnvironment().REENTRY_APP_ORIGIN,
      );
    else
      result = db.accept(
        id,
        input.event,
        getEnvironment().REENTRY_APP_ORIGIN,
        requestId,
      );
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

export function taskGet(request: Request) {
  checkWeb(request);
  const params = new URL(request.url).searchParams;
  if (params.size) {
    const parsed = historyRequestSchema.safeParse({
      id: params.get("id"),
      expectedRevision: Number(params.get("revision")),
    });
    if (
      !parsed.success ||
      params.size !== 2 ||
      params.getAll("id").length !== 1 ||
      params.getAll("revision").length !== 1
    )
      throw new AppError(
        "VALIDATION_ERROR",
        "Review this history request.",
        400,
      );
    return Response.json(
      store().agent.history(parsed.data.id, parsed.data.expectedRevision),
    );
  }
  return Response.json(store().agent.view(agentProcessing()));
}
export async function taskPost(request: Request, requestId?: string) {
  checkWeb(request);
  const input = await readJson(request, agentActionSchema, 4096);
  const processing = agentProcessing();
  store().agent.action(input, processing, requestId);
  return Response.json(store().agent.view(processing));
}
