import "server-only";
import { z } from "zod";
import { AppError } from "@/lib/http/errors";
import { readJson } from "@/lib/http/read-json";
import { outputFormat, recoveryMessages } from "@/features/recovery/prompt";
import type { RecoveryModel } from "./model";

const envelope = z.object({
  model: z.string(),
  done: z.literal(true),
  done_reason: z.literal("stop"),
  message: z.object({
    role: z.literal("assistant"),
    content: z.string().min(1).max(24000),
    tool_calls: z.array(z.unknown()).max(0).optional(),
  }),
});
const tags = z.object({
  models: z.array(z.object({ name: z.string(), digest: z.string() })).max(200),
});
export function ollamaModel(
  config: { model: string; endpoint: string; think: boolean },
  transport: typeof fetch = (input, init) => fetch(input, init),
): RecoveryModel {
  return {
    async generate(input, signal) {
      const messages = recoveryMessages(input);
      // Conservative byte budget leaves room in the 16K context for the JSON
      // schema, chat framing and bounded output; never silently truncate evidence.
      if (new TextEncoder().encode(JSON.stringify(messages)).length > 12000)
        throw new AppError(
          "MODEL_INPUT_TOO_LARGE",
          "These instructions exceed the local model's input budget. Use shorter sections or recover manually; the full captures are still saved.",
          413,
        );
      try {
        const listing = await transport(new URL("/api/tags", config.endpoint), {
          signal,
          cache: "no-store",
        });
        if (!listing.ok) throw new Error("Unavailable model list.");
        const known = (await readJson(listing, tags, 128 * 1024)).models.find(
          (entry) => entry.name === config.model,
        );
        if (!known) throw new Error("Configured local model is not installed.");
        const reply = await transport(new URL("/api/chat", config.endpoint), {
          method: "POST",
          signal,
          cache: "no-store",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            model: config.model,
            messages,
            stream: false,
            format: outputFormat,
            think: config.think,
            options: { temperature: 0, num_predict: 2000, num_ctx: 16384 },
          }),
        });
        if (!reply.ok) throw new Error("Local model request failed.");
        const body = await readJson(reply, envelope, 64 * 1024);
        if (body.model !== config.model) throw new Error("Unexpected model.");
        return {
          candidate: JSON.parse(body.message.content),
          provider: "ollama",
          model: body.model,
          modelDigest: known.digest,
          settings: {
            outputMode: "json-schema",
            thinking: config.think,
            temperature: 0,
            contextTokens: 16384,
            maxOutputTokens: 2000,
          },
        };
      } catch (error) {
        if (signal.aborted) throw error;
        // Provider bodies and prompts are never included in public errors or logs.
        throw new AppError(
          "MODEL_UNAVAILABLE",
          "The local model is unavailable or returned an incomplete response. Your saved context is intact; retry or continue manually.",
          503,
        );
      }
    },
  };
}
