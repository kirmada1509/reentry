import { defineExtensionMessaging } from "@webext-core/messaging";
import type { PendingCapture } from "../../src/features/capture/protocol";
import type {
  CompanionStatus,
  ObservationEvent,
  ObservationScope,
} from "../../src/features/observation/protocol";

import type {
  AgentAction,
  AgentView,
  AgentHistory,
} from "../../src/features/agent/schema";
interface Protocol {
  agentTasks(): AgentView;
  agentTaskHistory(data: {
    id: string;
    expectedRevision: number;
  }): AgentHistory;
  agentTaskChange(data: AgentAction): AgentView;
  pending(): PendingCapture[];
  confirm(data: { id: string }): void;
  discard(data: { id: string }): void;
  agentStatus(): CompanionStatus;
  agentPair(): CompanionStatus;
  agentConfigure(data: {
    scope: ObservationScope;
    paused: boolean;
  }): CompanionStatus;
  agentContext(): { deviceId: string; sessionId: string } | null;
  agentObserve(data: ObservationEvent): boolean;
  agentReaderFailed(): void;
}
export const { sendMessage, onMessage } = defineExtensionMessaging<Protocol>();
