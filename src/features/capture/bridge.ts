import { extensionIdSchema } from "./config";
import { bridgeRequestSchema, bridgeResponseSchema } from "./protocol";
import type { BridgeRequest, BridgeResponse } from "./protocol";

export function requestCaptureBridge(
  extensionId: string,
  input: BridgeRequest,
): Promise<BridgeResponse> {
  extensionIdSchema.parse(extensionId);
  const message = bridgeRequestSchema.parse(input);
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () =>
        reject(
          new Error(
            "The extension did not respond. Your capture is still pending; open ReEntry again from its preview.",
          ),
        ),
      5000,
    );
    if (typeof chrome === "undefined" || !chrome.runtime?.sendMessage) {
      clearTimeout(timer);
      reject(
        new Error(
          "The ReEntry extension is not connected. Use Chrome and check the extension setup.",
        ),
      );
      return;
    }
    try {
      chrome.runtime.sendMessage(extensionId, message, (raw: unknown) => {
        clearTimeout(timer);
        if (chrome.runtime.lastError) {
          reject(
            new Error(
              "Could not reach the ReEntry extension. Check that it is enabled and this app address matches its setup.",
            ),
          );
          return;
        }
        const result = bridgeResponseSchema.safeParse(raw);
        if (!result.success) {
          reject(
            new Error(
              "The extension returned an invalid response. Nothing was saved.",
            ),
          );
          return;
        }
        resolve(result.data);
      });
    } catch {
      clearTimeout(timer);
      reject(
        new Error(
          "Could not connect to the ReEntry extension. Nothing was saved.",
        ),
      );
    }
  });
}
