import { defineExtensionMessaging } from "@webext-core/messaging";
import type { PendingCapture } from "../../src/features/capture/protocol";

interface Protocol {
  pending(): PendingCapture[];
  confirm(data: { id: string }): void;
  discard(data: { id: string }): void;
}
export const { sendMessage, onMessage } = defineExtensionMessaging<Protocol>();
