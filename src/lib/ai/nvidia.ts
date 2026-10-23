import "server-only";
import { z } from "zod";
import { AppError } from "@/lib/http/errors";
import { readJson } from "@/lib/http/read-json";
import { outputFormat, recoveryMessages } from "@/features/recovery/prompt";
import type { RecoveryModel, StructuredModel } from "./model";

// Keep the credential destination fixed; task text cannot choose an endpoint.
export const NVIDIA_CHAT_URL =
  "https://integrate.api.nvidia.com/v1/chat/completions";
const completionSchema = z.object({
  model: z.string().min(1).max(200),
  choices: z
    .array(
      z.object({
        finish_reason: z.literal("stop"),
        message: z.object({
          role: z.literal("assistant"),
          content: z.string().min(1).max(24000),
          refusal: z.null().optional(),
          tool_calls: z.array(z.unknown()).max(0).optional(),
          function_call: z.null().optional(),
        }),
      }),
    )
    .length(1),
});
export interface NvidiaConfiguration {
  model: string;
  apiKey: string;
  outputMode: "text" | "json_object" | "json_schema";
  thinking: "omit" | "on" | "off";
}
export function nvidiaStructuredModel(
  config: NvidiaConfiguration,
  transport: typeof fetch = (input, init) => fetch(input, init),
): StructuredModel {
  return {
    async generate(input, signal) {
      const { messages } = input;
      if (
        new TextEncoder().encode(JSON.stringify(messages)).length >
        input.maxInputBytes
      )
        throw new AppError(
          "MODEL_INPUT_TOO_LARGE",
          "These instructions exceed the recovery input budget. Use shorter sections or recover manually; your captures are saved.",
          413,
        );
      try {
        const response = await transport(NVIDIA_CHAT_URL, {
          method: "POST",
          signal,
          cache: "no-store",
          redirect: "error",
          headers: {
            authorization: `Bearer ${config.apiKey}`,
            "content-type": "application/json",
            accept: "application/json",
          },
          body: JSON.stringify({
            model: config.model,
            messages,
            stream: false,
            max_tokens: 2000,
            temperature: 0,
            ...(config.outputMode === "text"
              ? {}
              : {
                  response_format:
                    config.outputMode === "json_object"
                      ? { type: "json_object" }
                      : {
                          type: "json_schema",
                          json_schema: {
                            name: input.name,
                            strict: true,
                            schema: input.schema,
                          },
                        },
                }),
            ...(config.thinking === "omit"
              ? {}
              : {
                  chat_template_kwargs: {
                    enable_thinking: config.thinking === "on",
                  },
                  ...(config.thinking === "on"
                    ? { reasoning_budget: 512 }
                    : {}),
                }),
          }),
        });
        if (response.status === 401 || response.status === 403)
          throw new AppError(
            "MODEL_AUTH_FAILED",
            "NVIDIA rejected the API key or model access. Check the server's NVIDIA configuration; your saved context is intact.",
            503,
          );
        if (response.status === 429)
          throw new AppError(
            "MODEL_RATE_LIMITED",
            "NVIDIA's rate or usage limit was reached. Wait and retry explicitly, or continue manually.",
            503,
          );
        if (response.status === 404)
          throw new AppError(
            "MODEL_NOT_AVAILABLE",
            "This NVIDIA model is not available for the configured account. Choose an accessible model in server settings.",
            503,
          );
        if (response.status === 400 || response.status === 422)
          throw new AppError(
            "MODEL_CONFIGURATION_UNSUPPORTED",
            "NVIDIA rejected the model or output options. Check the selected model's supported settings; no automatic fallback was used.",
            503,
          );
        if (response.status !== 200)
          throw new Error("Unsuccessful NVIDIA response.");
        const reply = await readJson(response, completionSchema, 64 * 1024);
        if (reply.model !== config.model)
          throw new Error("Unexpected served model.");
        return {
          candidate: JSON.parse(reply.choices[0]!.message.content),
          provider: "nvidia",
          model: reply.model,
          modelDigest: null,
          settings: {
            outputMode: config.outputMode,
            thinking: config.thinking,
            temperature: 0,
            maxOutputTokens: 2000,
            ...(config.thinking === "on" ? { reasoningBudget: 512 } : {}),
          },
        };
      } catch (error) {
        if (
          signal.aborted ||
          (error instanceof AppError &&
            [
              "MODEL_AUTH_FAILED",
              "MODEL_RATE_LIMITED",
              "MODEL_NOT_AVAILABLE",
              "MODEL_CONFIGURATION_UNSUPPORTED",
            ].includes(error.code))
        )
          throw error;
        // Never expose provider error bodies, prompts, authorization or API keys.
        throw new AppError(
          "MODEL_UNAVAILABLE",
          "NVIDIA is unavailable or returned an incomplete response. Your saved context is intact; retry or continue manually.",
          503,
        );
      }
    },
  };
}

export function nvidiaModel(
  config: NvidiaConfiguration,
  transport?: typeof fetch,
): RecoveryModel {
  const adapter = nvidiaStructuredModel(config, transport);
  return {
    generate: (input, signal) =>
      adapter.generate(
        {
          messages: recoveryMessages(input),
          schema: outputFormat,
          name: "reentry_recovery",
          maxInputBytes: 12000,
        },
        signal,
      ),
  };
}
