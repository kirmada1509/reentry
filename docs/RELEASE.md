# ReEntry release preparation

This is a local, single-user Chrome extension plus web app. A public repository and demo communicate the working product; cloud hosting and extension-store publication are outside this release.

## Current automatic-agent preview

The automatic journey and current real-model video assets are documented in [AGENT_RELEASE.md](AGENT_RELEASE.md) and the [v0.2.0 preview](https://github.com/kirmada1509/reentry/releases/tag/v0.2.0). It has its own complete-agent evaluation, including failed and availability-interrupted trials. The manual capture/recovery instructions below remain available; historical manual evidence does not establish the new agent's accuracy. Start with `./start.sh` and http://127.0.0.1:3000/observe for automatic tasks.

## Reproduce the manual journey from a fresh checkout/profile

1. Install the pinned Node/pnpm versions from the README and run `pnpm bootstrap`.
2. Configure the exact local app address and stable unpacked extension ID using `.env.example`. Keep actual credentials in ignored `.env.local`. The standard address is http://127.0.0.1:3000; localhost and 127.0.0.1 have separate storage.
3. For local inference follow [Ollama setup](PHASE3.md). For hosted inference follow [NVIDIA setup](NVIDIA.md). No key is required for deterministic tests or manual checkpoint use. Supplied Gemini/DeepSeek/OpenRouter/Mistral keys are not implemented adapters.
4. Run `pnpm build`, `pnpm extension:build`, then `pnpm start:managed`. Open the exact configured app address. Load `extension/.output/chrome-mv3` unpacked in Chrome.
5. Run `pnpm sandbox:sites`; open its printed separate Northstar portal address. Prepare and save a fictional application draft, then select the requirements, invoke ReEntry, review the preview and save a confirmed checkpoint. Use the portal's application.html page as the work link. See [the presentation walkthrough](SANDBOX.md).
6. Close/reopen ReEntry. Switch the source with `pnpm sandbox:switch v2`, reload the source opened for this task, select the same section and recapture. Reset with `pnpm sandbox:switch v1`.
7. Inspect both snapshots; save the comparison; request recovery after reading the model-processing notice. Review/correct the action and Continue. The original external site owns its form state.
8. Open Edit checkpoint and history. Correct progress, save a revision, inspect history and restore earlier contents as a new revision. Delete the task to remove associated data; reconnect/retry pending extension cleanup if necessary.

## Verification commands

```sh
pnpm check
pnpm exec playwright install chromium
pnpm test:e2e
REENTRY_TEST_PRODUCTION=1 pnpm test:e2e
pnpm test:model:live
pnpm test:model:live --case=decrease
node scripts/publication-audit.mjs
pnpm smoke
```

Tests allocate their own ports/profiles and static fixtures. Production-mode acceptance builds the real web and extension surfaces. Run browser suites sequentially because they share build output. Keep live-model tests separate from deterministic CI. `pnpm dev:stop` stops only the project's managed server.

## Evidence and limitations

See [actual results](TEST_RESULTS.md), not checkboxes alone. Axe and narrow-layout checks do not establish complete accessibility conformance. Native Chrome/VoiceOver and real browser zoom/text-setting acceptance remain open when the Mac is locked. The native automation attempt reported that the Mac could not be automatically unlocked; no manual success is claimed.

Browser storage is local to one profile and origin. It is not an encrypted vault or backup. Deletion keeps minimal identifiers/timestamps to reject replay. Draft recovery requires a successful draft write; failed writes are visibly unsaved. A source capture covers the selected material only. AI validation verifies structural/evidence constraints, not every semantic claim. NVIDIA network timeouts remain possible and preserve the checkpoint for manual recovery or explicit retry.

## Submission package

The repository includes retrospective scope, PRD, specification, implementation mapping and app map. They disclose their creation order and pending learner reviews. The author must not claim completion of interviews, reviews, personal learning reflections or eligibility that did not occur.

Prepared event-specific drafts live under `submissions/`. Verify current forms/rules and supply actual registration, eligibility and personal answers before submitting. No contest submission or receipt is implied by repository/video preparation. Demo content is fictional and controlled; it does not show a real scholarship provider changing requirements.

## Video assets

The [v0.1.0 preview release](https://github.com/kirmada1509/reentry/releases/tag/v0.1.0) provides the 108-second MP4, SRT/VTT captions and screenshots. The video is a browser recording of actual NVIDIA inference using fictional content, with no fabricated narration or manual screen-reader result. AI Basics still requires an actual public YouTube/Vimeo upload.

To record again with the configured server-only credentials, set `REENTRY_TEST_PRODUCTION=1`, `REENTRY_TEST_LIVE=1` and `REENTRY_RECORD_DEMO=1`, then run `pnpm test:e2e --grep @demo` with the required environment loaded. Run `node scripts/package-demo.mjs` to package the raw browser capture; this optional packaging step requires FFmpeg on the recording machine. Files are written to ignored `.runtime/release/`.
