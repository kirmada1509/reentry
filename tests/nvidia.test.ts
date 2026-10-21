import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw/http";
import { nvidiaModel, NVIDIA_CHAT_URL } from "@/lib/ai/nvidia";
import { outputFormat } from "@/features/recovery/prompt";
import { runRecovery } from "@/features/recovery/harness";
import { recoveryFixture } from "./fixtures/recovery";
import { parseEnvironment } from "@/lib/env";
import { processingStatus } from "@/lib/ai/processing";
const modelName = "nvidia/nemotron-3.5-lightning-30b-a3b";
const key = "synthetic-nvidia-credential";
const config = {
  model: modelName,
  apiKey: key,
  outputMode: "text" as const,
  thinking: "off" as const,
};
const server = setupServer();
beforeAll(() => server.listen({ onUnhandledFrame: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
function envelope(source: Awaited<ReturnType<typeof recoveryFixture>>) {
  return {
    model: modelName,
    choices: [
      {
        finish_reason: "stop",
        message: {
          role: "assistant",
          content: JSON.stringify({
            assessment: "changed",
            summary: "Two referees are now required.",
            confirmedProgress: source.task.progress,
            changes: [
              {
                description: "Referee count",
                before: {
                  sourceId: source.check.before.id,
                  quote: "Supply one referee.",
                },
                after: {
                  sourceId: source.check.after!.id,
                  quote: "Supply two referees.",
                },
              },
            ],
            questions: [],
            nextAction: { instruction: "Find first referee", target: "work" },
          }),
        },
      },
    ],
  };
}
describe("NVIDIA adapter contract", () => {
  for (const mode of ["text", "json_object", "json_schema"] as const)
    it(`validates the same harness proposal in ${mode} mode and keeps authentication out of context`, async () => {
      const input = await recoveryFixture();
      let requests = 0;
      server.use(
        http.post(NVIDIA_CHAT_URL, async ({ request }) => {
          requests++;
          expect(request.headers.get("authorization")).toBe(`Bearer ${key}`);
          const body = (await request.json()) as Record<string, unknown>;
          expect(JSON.stringify(body)).not.toContain(key);
          expect(body.stream).toBe(false);
          expect(body.tools).toBeUndefined();
          expect(body.max_tokens).toBe(2000);
          expect(body.chat_template_kwargs).toEqual({ enable_thinking: false });
          if (mode === "text") expect(body.response_format).toBeUndefined();
          else {
            expect(body.response_format).toMatchObject({ type: mode });
            if (mode === "json_schema")
              expect(body.response_format).toMatchObject({
                json_schema: {
                  name: "reentry_recovery",
                  strict: true,
                  schema: outputFormat,
                },
              });
          }
          return HttpResponse.json(envelope(input));
        }),
      );
      const result = await runRecovery(
        input,
        nvidiaModel({ ...config, outputMode: mode }),
        AbortSignal.timeout(1000),
      );
      expect(result.execution.provider).toBe("nvidia");
      expect(result.execution.modelDigest).toBeNull();
      expect(result.proposal.confirmedProgress).toBe(input.task.progress);
      expect(JSON.stringify(result)).not.toContain(key);
      expect(requests).toBe(1);
    });
  for (const thinking of ["on", "omit"] as const)
    it(`supports explicit ${thinking} thinking options without assuming them for every model`, async () => {
      const input = await recoveryFixture();
      server.use(
        http.post(NVIDIA_CHAT_URL, async ({ request }) => {
          const body = (await request.json()) as Record<string, unknown>;
          if (thinking === "on") {
            expect(body.chat_template_kwargs).toEqual({
              enable_thinking: true,
            });
            expect(body.reasoning_budget).toBe(512);
          } else {
            expect(body.chat_template_kwargs).toBeUndefined();
            expect(body.reasoning_budget).toBeUndefined();
          }
          return HttpResponse.json(envelope(input));
        }),
      );
      const result = await runRecovery(
        input,
        nvidiaModel({ ...config, thinking }),
        AbortSignal.timeout(1000),
      );
      expect(result.execution.settings.thinking).toBe(thinking);
    });
  for (const mode of [
    "length",
    "refused",
    "tool",
    "empty",
    "malformed",
    "wrong-model",
    "bad-quote",
    "progress",
    "destination",
  ])
    it(`rejects ${mode} without changing facts or retrying`, async () => {
      const input = await recoveryFixture();
      const before = structuredClone(input);
      let requests = 0;
      server.use(
        http.post(NVIDIA_CHAT_URL, () => {
          requests++;
          const output = envelope(input);
          const choice = output.choices[0]!;
          if (mode === "length") choice.finish_reason = "length";
          if (mode === "refused")
            Object.assign(choice.message, { refusal: "refused" });
          if (mode === "tool")
            Object.assign(choice.message, {
              tool_calls: [{ id: "unexpected" }],
            });
          if (mode === "empty") choice.message.content = "";
          if (mode === "malformed") choice.message.content = "{broken";
          if (mode === "wrong-model") output.model = "different-model";
          if (["bad-quote", "progress", "destination"].includes(mode)) {
            const proposal = JSON.parse(choice.message.content);
            if (mode === "bad-quote")
              proposal.changes[0].after.quote = "Invented quote";
            if (mode === "progress")
              proposal.confirmedProgress = "Everything submitted";
            if (mode === "destination")
              proposal.nextAction.target = "https://unknown.example";
            choice.message.content = JSON.stringify(proposal);
          }
          return HttpResponse.json(output);
        }),
      );
      await expect(
        runRecovery(input, nvidiaModel(config), AbortSignal.timeout(1000)),
      ).rejects.toThrow();
      expect(input).toEqual(before);
      expect(requests).toBe(1);
    });
  for (const status of [202, 400, 401, 403, 404, 422, 429, 500])
    it(`handles HTTP ${status} safely with no fallback or implicit retry`, async () => {
      let requests = 0;
      server.use(
        http.post(NVIDIA_CHAT_URL, () => {
          requests++;
          return HttpResponse.json({ detail: key }, { status });
        }),
      );
      const input = await recoveryFixture();
      try {
        await runRecovery(
          input,
          nvidiaModel(config),
          AbortSignal.timeout(1000),
        );
        throw new Error("expected rejection");
      } catch (error) {
        expect(String(error)).not.toContain(key);
        expect(String(error)).not.toContain("expected rejection");
      }
      expect(requests).toBe(1);
    });
  it("passes cancellation to fetch and does not follow credential redirects", async () => {
    const input = await recoveryFixture();
    const abort = new AbortController();
    const adapter = nvidiaModel(config, async (_url, init) => {
      expect(init?.signal).toBe(abort.signal);
      expect(init?.redirect).toBe("error");
      abort.abort();
      throw new DOMException("Cancelled", "AbortError");
    });
    await expect(runRecovery(input, adapter, abort.signal)).rejects.toThrow(
      "cancelled",
    );
  });
  it("requires valid NVIDIA configuration and binds consent to public provider/model/settings", () => {
    expect(() =>
      parseEnvironment({
        REENTRY_AI_PROVIDER: "nvidia",
        REENTRY_AI_MODEL: modelName,
      }),
    ).toThrow("NVIDIA_API_KEY");
    const env = parseEnvironment({
      REENTRY_AI_PROVIDER: "nvidia",
      REENTRY_AI_MODEL: modelName,
      NVIDIA_API_KEY: key,
    });
    const status = processingStatus(env);
    expect(status.processing).toBe("hosted");
    expect(JSON.stringify(status)).not.toContain(key);
    expect(
      processingStatus({ ...env, NVIDIA_API_KEY: "different-key" }).consentId,
    ).toBe(status.consentId);
    expect(
      processingStatus({ ...env, REENTRY_AI_MODEL: "another-model" }).consentId,
    ).not.toBe(status.consentId);
    expect(
      processingStatus({ ...env, NVIDIA_OUTPUT_MODE: "json_schema" }).consentId,
    ).not.toBe(status.consentId);
  });
});
