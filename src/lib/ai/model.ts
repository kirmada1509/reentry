import type { RecoveryInput } from "@/features/recovery/schema";
// The harness accepts any adapter implementing this contract. No provider SDK
// objects enter product state, UI, or the shared proposal validator.
export interface RecoveryModel {
  generate(
    input: RecoveryInput,
    signal: AbortSignal,
  ): Promise<{
    candidate: unknown;
    provider: string;
    model: string;
    modelDigest: string | null;
    settings: Record<string, string | number | boolean>;
  }>;
}

/** Provider-neutral structured generation, shared by recovery and the task graph. */
export interface StructuredRequest {
  messages: Array<{ role: string; content: string }>;
  schema: Record<string, unknown>;
  name: string;
  maxInputBytes: number;
}
export interface StructuredModel {
  generate(
    request: StructuredRequest,
    signal: AbortSignal,
  ): ReturnType<RecoveryModel["generate"]>;
}
