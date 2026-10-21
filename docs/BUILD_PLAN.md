# ReEntry build plan

Updated October 22, 2026: **reuse open-source components and online sandboxes first**. The browser extension plus web app now implements Phase 1 capture/saving and Phase 2 task-bound recapture, immutable snapshots and text comparison through jsdiff. Phase 3 implements the model-independent harness and local Ollama recovery; later resilience, accessibility and release gates remain pending. The subsequent [NVIDIA adapter](NVIDIA.md) adds explicitly approved hosted inference behind the same interface. See [AI setup](PHASE3.md) and actual model results before treating its gate as passed. See [working setup](PHASE1.md), [return-and-compare walkthrough](PHASE2.md) and [actual verification](TEST_RESULTS.md).

## What we are building ourselves

Our work is the recovery experience: save a goal and confirmed progress, connect supporting material, show evidenced instruction changes, offer one next action, and let the user correct or restore a checkpoint.

We will use existing libraries for extension scaffolding, readable-page extraction, storage, text differences, API mocking, and accessibility checks. We will use existing test websites before creating fixtures. The [reuse research](REUSE.md) lists alternatives, licenses, integration limits, and online links.

## Reuse instead of rebuilding

| Needed capability                      | Selected existing component                                                                                                   | Small ReEntry-specific work left                                       |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Extension build/dev setup              | [WXT](https://wxt.dev/)                                                                                                       | Capture action, permission configuration, preview UI                   |
| Capture instruction text               | Browser selection API; [Defuddle](https://github.com/kepano/defuddle) when readable-page extraction is needed                 | Source URL/section metadata, preview, capture limits; no custom parser |
| Extension messages and pending storage | [webext-core messaging](https://github.com/aklinker1/webext-core) and [WXT storage](https://wxt.dev/guide/essentials/storage) | Typed capture messages, delivery state, acknowledgement                |
| Web app storage                        | [Dexie](https://github.com/dexie/Dexie.js)                                                                                    | Task schema, immutable checkpoint revisions, correction/restore rules  |
| Visible old/new text                   | [jsdiff](https://github.com/kpdecker/jsdiff)                                                                                  | Present evidence; AI interprets material impact                        |
| Browser test runner                    | [Playwright](https://playwright.dev/docs/chrome-extensions)                                                                   | Real-extension fixtures and task-specific assertions                   |
| Repeatable API/model failures          | [MSW](https://github.com/mswjs/msw) and [Serve](https://mswjs.io/ecosystem/serve)                                             | Response definitions; no custom simulator engine                       |
| Local fixture serving                  | [http-server](https://github.com/http-party/http-server)                                                                      | A few before/after instruction files; no website backend               |
| Automated accessibility checks         | [axe with Playwright](https://playwright.dev/docs/accessibility-testing)                                                      | Resolve findings and manually test keyboard/VoiceOver                  |

These are library integrations, not a claim that installing packages creates a complete product. Use only components the current slice needs. Keep Next.js, React, TypeScript, Zod, pnpm, and official shadcn UI from the starter.

Selection capture remains the default. If a readable-page mode is included, it is a separate explicit action using Defuddle, with a preview and no remote extraction. It must not silently replace a failed/empty selection. Mozilla Readability is an alternative to evaluate in the spike, not a second required extractor. PDF.js and Mammoth are documented for future PDF/DOCX import; those formats remain outside this release.

## The complete demo

1. Open an external instruction page, select the relevant section, and invoke ReEntry with the toolbar or keyboard shortcut.
2. Preview the capture, then save the goal, application link, and user-confirmed progress in ReEntry. No automatic inspection of private form values.
3. Pause. The checkpoint survives closing and reopening ReEntry.
4. For the repeatable demonstration, switch a clearly labeled local instruction fixture at the same URL from one referee to two. This changes page text, not an AI answer.
5. Return, reopen the source, select the equivalent section, and explicitly capture it again for the saved task.
6. The actual open-weight model explains the change with old/new excerpts and proposes adding the first referee. The second remains visible as subsequent work.
7. Inspect or correct the card, then Continue reopens the saved work URL. Exact field restoration and external form persistence are not promised.

Use the existing Selenium form or a licensed local derivative as the work destination. No custom scholarship application is required. User-confirmed progress is a statement supplied by the user, not a claim that ReEntry verified an upload. Keep public-site smoke tests distinct from the controlled change demonstration.

## Required planning before implementation

Complete Learn `1-start` → `2-scope` → `3-prd` → `4-spec`, preserving actual generated scope/PRD/spec and review status. Carry forward the chosen extension/web-app scope and reuse decisions. This plan is an input, not a claim that those steps occurred. The author subsequently requested Phase 1 implementation on October 22; implementation proceeded with the formal Learn reviews still pending. Do not backfill approval claims.

After planning, first prove WXT capture → web app storage with the real extension. Resolve this before UI polish or adding optional extraction modes. Do not claim clipboard/manual import is an integrated extension if the connection is not working.

## Required testing sandboxes

The six coverage areas remain required, but **they are not six applications to build**. Reuse hosted pages, existing test runners, and response fixtures. Implement only the missing ReEntry-specific data and assertions.

| Coverage area                     | Reuse first                                                                                                                                                                             | Minimum additional fixture / acceptance gate                                                                                                                                                         |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| External work and capture         | [Selenium's hosted web form](https://www.selenium.dev/selenium/web/web-form.html) and its [open source](https://github.com/SeleniumHQ/selenium/blob/trunk/common/src/web/web-form.html) | Capture after explicit invocation; save/reopen work URL; confirmed checkpoint survives refresh. No real submissions.                                                                                 |
| Page shapes and permission limits | [The Internet](https://the-internet.herokuapp.com/): dynamic loading, frames, login, status-code examples                                                                               | Existing pages for manual smoke tests; deterministic local versions or routing for CI. Empty/unsupported pages cannot produce a successful check.                                                    |
| Delivery and persistence          | Playwright persistent browser profile, WXT storage, Dexie                                                                                                                               | App absent, popup closed, worker restart, browser restart, duplicate delivery, wrong task, quota failure, correction/restore, and task deletion. No silent loss or duplicate checkpoints.            |
| Changed-source verification       | Static before/after text files served by http-server; Playwright routing                                                                                                                | Same URL, V1 → V2; unchanged; cosmetic edits; contradiction; missing source; selected section mismatch. Failed/incomparable checks stay unverified.                                                  |
| Model behavior and failures       | MSW handlers, Serve when a separate HTTP endpoint is needed, plus real Ollama                                                                                                           | Invalid JSON, absent evidence, unsupported actions, invented completion, oversized/slow response, service unavailable; invalid output never overwrites facts. Separate live-model evidence required. |
| Accessibility                     | axe/Playwright plus manual VoiceOver in Chrome                                                                                                                                          | Full keyboard capture → save → recapture → evidence → correction/restore → Continue; labels, focus, announcements, zoom/reflow, and all failure paths.                                               |

### Online sandboxes we can use immediately

- [Selenium web form](https://www.selenium.dev/selenium/web/web-form.html): ordinary external form with different controls. It is generic test equipment, not a scholarship integration.
- [The Internet dynamic loading](https://the-internet.herokuapp.com/dynamic_loading): content appearing after interaction.
- [The Internet frames](https://the-internet.herokuapp.com/frames): frame-selection limits; add a second local origin for a genuine cross-origin boundary test if needed.
- [The Internet login](https://the-internet.herokuapp.com/login) and [status codes](https://the-internet.herokuapp.com/status_codes): unavailable/inappropriate source states.

Use synthetic data and low-volume manual interactions. Do not depend on live public sites for mandatory CI or a deadline-critical recording. Do not attempt to change their content. Keep the existing pages' accessibility problems separate from findings in ReEntry's own controls.

For repeatable/offline tests, reuse only needed upstream files at a recorded commit, preserve notices, and serve them locally. Check referenced assets: Selenium's form uses external CDNs, so cache required resources or remove decorative dependencies in the documented derivative. A downloaded HTML file alone is not necessarily offline-ready. Running the full Ruby/Docker version of The Internet is optional, not a required service.

### The small custom fixture that remains

The reviewed online sites do not supply our stable, resettable “one referee → two referees” scenario. Build only:

1. A short `instructions-v1.html` and `instructions-v2.html`, plus a few data variants for decrease, cosmetic change, deadline change, contradiction, and removed requirement.
2. A temporary per-run directory served on a different origin from ReEntry, for example port 4174 versus 3000. Reuse a licensed sample form as the work page where needed.
3. A test fixture that copies the chosen text version to one stable `instructions.html` path. Restore the baseline to reset. Disable server/browser caching for the scenario.

Use the existing http-server CLI, not a custom backend or admin/reset dashboard. Give each test run its own directory/port/profile, and clean up only resources it created. For a manual recording, a documented fixture-switch command changes the served file; reload and recapture normally. Label this as controlled test content, not a real scholarship provider updating its requirements.

Do not add scenario ids, hidden expected answers, or model outputs to captured material. Verify the model receives actual page text. If these tiny files prove insufficient, document the specific missing behavior before creating a more elaborate sandbox.

### Model/API testing without a custom simulator

Write a small set of [MSW response handlers](https://mswjs.io/docs/quick-start), not an HTTP mocking framework. Use MSW in the process under unit/integration test. For a separately running Next.js server that calls Ollama, expose those handlers using [`@msw/serve`](https://mswjs.io/ecosystem/serve/getting-started) on a distinct loopback model-test port. Match the adapter's full HTTP response envelope, not only the inner model JSON.

Use Playwright `route.fulfill` / `route.abort` for browser-page and browser-request cases. Those do not intercept server-to-Ollama traffic. Keep test-only model URLs in server configuration and exclude handlers from production. Older `@mswjs/http-middleware` examples are not the current package choice.

Real-model evaluation remains separate: requirement increase/decrease, unchanged, cosmetic edit, contradiction, and missing evidence. Record actual inputs/outputs, model digest/runtime, prompt version, validation result, latency, and failures. Mocked responses do not establish model quality, and the submission must include a real inference run.

Include source text that instructs the model to ignore the task or mark unfinished work complete. It must remain untrusted evidence and cannot change confirmed progress or trigger privileged actions.

### Real extension and accessibility gates

Use Playwright's bundled Chromium with a persistent context, plus manual unpacked-install checks in target Chrome. Mocked browser APIs or an extension popup opened as a normal test page do not prove a real user invocation grants page access. Manually verify permission/keyboard behavior when automation cannot reproduce the browser action.

Require explicit user capture on ordinary top-level HTTP(S) pages. No selection asks for a selection; no silent whole-page fallback. Restricted browser pages, PDFs, iframe selections, desktop apps, and login/error captures must give an honest unsupported/unverified state. Page text cannot execute commands or gain authority over confirmed progress.

Use axe for automated checks and VoiceOver/keyboard for the actual journey, including selection surviving popup focus, keyboard invocation, tab changes, dialog focus restoration, restrained announcements, 200% text size, 400% web-app zoom/reflow, narrow layouts, and reduced motion. Record OS/browser, issues/fixes, and limitations. An external test page passing/failing axe says nothing by itself about ReEntry.

## Connection and data boundaries

Use WXT entrypoints and storage rather than custom build/storage infrastructure. Use `@webext-core/messaging` for internal extension requests. For the Chrome-only initial bridge, prefer [native website-to-extension messaging](https://developer.chrome.com/docs/extensions/develop/concepts/messaging#send-messages-from-web-pages) with an [externally-connectable allowlist](https://developer.chrome.com/docs/extensions/reference/manifest/externally-connectable):

- Preview/confirm captured text, then save a pending item using WXT storage and open the local ReEntry import page with a capture id only.
- The app, configured with the installed extension id, requests that capture; the extension validates the exact app origin/port and request before replying. Restrict the manifest too; do not rely on a wildcard alone.
- The browser client writes through a Dexie transaction and acknowledges the capture only after commit. Retry by capture id, deduplicate, and clear pending data on acknowledgement or explicit deletion.
- Uninstalled extension, changed extension id, closed app, expired pending item, and worker restart have visible recovery paths. A reply alone is not proof of durable saving.

This replaces the earlier custom HTTP handoff queue. Built-in messaging still needs our small protocol, validation, and acknowledgement adapter. It is not an off-the-shelf ReEntry connector. Prove this path early, including localhost browser restrictions; if incompatible, evaluate an app-origin content-script relay before adding a server queue.

Store the goal, reviewed work/material URLs, confirmed facts, source snapshots (URL/section/raw text/digest/capture time), and up to ten immutable checkpoint revisions. Store AI suggestions separately. Dexie handles database mechanics; ReEntry defines restore/history/delete rules and rejects stale responses for older inputs.

Keep selection evidence unchanged. Extraction/normalization and jsdiff may assist presentation, but record extractor/version/mode and compare equivalent captures. Do not classify an extraction/mode/section mismatch as an authoritative requirement change. Equal text means unchanged **within the captured material**, not the whole website.

Keep Next.js server routes thin using `withRoute`, Zod boundaries, fixed safe logging, and server-only model configuration. Continue opens a user-reviewed HTTP(S) target; no invented model destinations, form autofill/submission, account credentials, or private form reads.

Keep the harness a fixed workflow: prepare context → call the configured model → validate → show a correctable proposal. No LangChain/LangGraph or autonomous agent loop is required. A server-only model interface isolates provider details from capture, storage, validation, and the UI; see [the harness design](HARNESS.md).

Implement local Ollama first, with Qwen3 4B as a candidate subject to feasibility testing. Configure provider/model rather than hardcoding them into recovery logic. Later OpenAI and DeepSeek adapters can reuse AI SDK Core and direct provider packages behind the same interface. They are optional follow-ups, not initial demo prerequisites or implemented support. Use the actual provider's output capabilities, the same application validators, an initial 30-second total deadline, no implicit retries, explicit retry, and no automatic cloud fallback. Validate source ids, exact quotes, action targets, and consistency with confirmed facts. Evidence checks do not prove semantic truth; keep correction/manual recovery available.

Disable Defuddle's optional remote/async extractors for this workflow and keep previews plain text; do not turn returned HTML into executable UI. Local privacy assumes browser, app server, extraction, and model stay on the user's machine. Future hosted inference requires a named-provider disclosure and explicit agreement before sending task context, with credentials kept server-side. Keep telemetry off and task text out of logs. Cloud hosting, Electron, and store publication remain deferred.

## Build order and planned commands

Follow [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) for the phase-by-phase execution order, automated tests, hands-on checks, evidence, and completion gates. Phase 0 preserves the genuine Learn process; Phases 1–3 deliver the first real external-capture/model recovery journey; Phases 4–6 complete resilience, accessibility, and release preparation. Do not maintain a competing step order here.

Future layout: `extension/` for WXT; `tests/fixtures/sites/` for minimal licensed HTML/instruction pairs; `tests/mocks/` for MSW handlers; `tests/e2e/` for browser fixtures/assertions. No custom sandbox platforms. Add `docs/TEST_RESULTS.md` only when actual runs exist.

Phase 1–3 extension/web builds, static and MSW model sandboxes, capture/source/recovery browser checks and explicit live-model evaluation are runnable. Resilience/accessibility commands remain planned; see the [command table](IMPLEMENTATION_PLAN.md#commands-and-when-they-become-available). Pin new dependencies only with their working implementation slice and retain upstream notices.

## Delivery targets and completion

IST targets: Oct 21 planning/reuse review; Oct 22 capture/storage and minimal fixtures; Oct 23 interpretation/failure checks; Oct 24 accessibility and recording. Task Forge submission buffer is Oct 24 evening, before Oct 25 at 02:30. DEV deadline is Oct 26 at 12:29; AI Basics is Oct 27 at 02:30. See [event checks](HACKATHONS.md). These are targets, not completion claims.

Before submission: starter `pnpm check`, production web build, WXT extension build, deterministic Playwright/MSW cases, manual keyboard/VoiceOver, and a recorded live-model run. Update the starter smoke test when replacing its homepage. Public websites are supplementary smoke tests; their downtime must not block deterministic CI.

The same roughly two-minute demo supports all three events: accessibility leads Task Forge; product clarity and genuine Learn documents lead AI Basics; substantive open-source interpretation and an observed improvement lead DEV. Disclose starter/library/fixture reuse. The participant writes their own submission copy under the Learn curriculum.

If time tightens, omit readable-page mode, extra page adapters, extra browsers, cloud hosting, and store publishing. Preserve actual extension integration, confirmed progress, source evidence, correction, honest uncertainty, and keyboard access.
