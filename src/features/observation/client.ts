import { z } from "zod";
import { readConnectionConfiguration } from "@/features/capture/config";
import { agentBridgeSchema, dashboardSchema } from "./protocol";
import type { AgentBridgeRequest } from "./protocol";

export async function observationWeb(action?: "challenge" | "pause" | "clear") {
  const response = await fetch("/api/agent/web", {
    method: action ? "POST" : "GET",
    cache: "no-store",
    signal: AbortSignal.timeout(10000),
    headers: {
      "x-reentry-web": "1",
      ...(action ? { "content-type": "application/json" } : {}),
    },
    ...(action ? { body: JSON.stringify({ action }) } : {}),
  });
  if (!response.ok)
    throw new Error("The local app could not save this change. Try again.");
  const value: unknown = await response.json();
  return value;
}
export async function loadObservationDashboard() {
  return dashboardSchema.parse(await observationWeb());
}
export async function createObservationChallenge() {
  return z
    .strictObject({ challenge: z.string().regex(/^[a-f0-9]{64}$/) })
    .parse(await observationWeb("challenge")).challenge;
}
export function agentBridge(input: AgentBridgeRequest): Promise<void> {
  const message = agentBridgeSchema.parse(input);
  const { extensionId } = readConnectionConfiguration();
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () =>
        reject(
          new Error(
            "The extension did not respond. Check that the latest build is loaded in Chrome.",
          ),
        ),
      7000,
    );
    if (typeof chrome === "undefined" || !chrome.runtime?.sendMessage) {
      clearTimeout(timer);
      reject(new Error("Open ReEntry in Chrome with its extension enabled."));
      return;
    }
    chrome.runtime.sendMessage(extensionId, message, (raw: unknown) => {
      clearTimeout(timer);
      if (
        chrome.runtime.lastError ||
        !z.strictObject({ status: z.literal("agent-ready") }).safeParse(raw)
          .success
      )
        reject(
          new Error(
            "Could not connect. Reload the latest ReEntry extension and check its app address.",
          ),
        );
      else resolve();
    });
  });
}
