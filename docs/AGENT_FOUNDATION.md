# Browser-agent Phase 0

Implemented October 23, 2026 (IST). This is a verified foundation and fictional interface prototype. Automatic task discovery, continuous observation, live agent inference and reminders are subsequent phases. The working manual release and its browser data remain separate.

## Try the interface

Start ReEntry normally with `./start.sh`, then open http://127.0.0.1:3000/preview. The current home also links to it. The preview needs no model key.

- Home presents one useful return point, with quieter Waiting and Finished examples.
- Companion preview narrows the experience to the current task. It is a web preview of the future side panel; no native side panel has been installed yet.
- Task detail shows a short timeline and expandable evidence, with observed/inferred/corrected interpretations distinguished.
- Correct the goal or choose “I’m only researching.” Corrections persist under a separate fictional-preview storage key and survive reload.
- Pause/resume, dismiss, reset and simulated snooze work on example state. The settings disclosure exposes empty, observing, candidate, active, interrupted, changed, completed, unavailable, disconnected, denied and snoozed states. No real permission or notification changes occur.
- If preview storage fails, the interface explains that changes remain only in that tab.

The scoped theme uses official shadcn Stone tokens and the installed Tailwind Emerald-800 token, adopted by `pnpm ui:theme`. Cached source, generated output and source digests are recorded in UI provenance. Official Item and typography examples were installed through `pnpm ui:add`; the example elements receive product text without editing their vendor styles. Existing application/sandbox theme files remain intact. Manual native VoiceOver/zoom acceptance stays open.

Saved visual evidence: [home](evidence/agent-preview-home.png) and [360px companion](evidence/agent-preview-companion.png). The compact default state keeps its return action in view before evidence is expanded.

## Reused shopping sandbox

```sh
pnpm sandbox:commerce
```

The first run downloads and verifies the pinned Sauce Labs sample shop, installs its committed npm lockfile with lifecycle scripts disabled, and builds it with isolated Node 24.9.0/npm 11.6.0. It does not change ReEntry's Node 22.23.2 pin. Downloads and build output stay under ignored `.runtime/commerce`. Setup can also run separately with `pnpm sandbox:commerce:setup`.

Open http://127.0.0.1:4177/. Another port can be selected with `pnpm sandbox:commerce start 4180`. An occupied port is refused; other services are not stopped. Ctrl+C stops the shop. ReEntry's start/stop scripts manage the main app separately.

Use the shop's published synthetic login `standard_user` / `secret_sauce`. Browse, add a backpack, open the cart, try checkout with empty details, enter fictional details, review and finish. This is simulated shopping with no payment integration. Refresh preserves the cart. Open Menu → Reset App State clears the shopping state; clear that sandbox's browser site data for a completely fresh profile.

Source: [Sauce Labs sample app](https://github.com/saucelabs/sample-app-web/tree/3f05b93c488c48c94721c95be3037c3d2d476d80), MIT. The commit and archive checksum live in `sandboxes/commerce-source.json`. Local modifications alias all Backtrace imports to inert local functions, remove the remote font stylesheet, label the title as simulated, and supply an isolated Vite config. Upstream styles/assets and checkout behavior are reused. System sans-serif is the font fallback. The MIT notice remains in the downloaded copy and [license record](licenses/saucelabs-sample-app-MIT.txt).

Repeatable acceptance: `pnpm test:commerce`. It verifies cart retention, validation failure, simulated completion and reset, while rejecting any external browser request. CI runs this alongside the existing production suite. This adds an initial network/download requirement to CI; public demo availability remains outside CI.

Northstar remains available with `pnpm sandbox:sites`; use the printed address. Its missing submission/receipt simulation will be added in Phase 3.

## Browser reader adaptation

The locked `@page-agent/page-controller` 1.12.4 dependency is reused through `extension/lib/page-reader.ts`. The package's existing DOM engine needed a small pnpm patch, retained in `patches/` with its [MIT notice](licenses/page-agent-MIT.txt):

- Added observation-only `passive` configuration, leaving the normal upstream mode unchanged except disabling arbitrary JavaScript execution in this derivative.
- Disabled page highlighting, React-root annotations and annotation cleanup in passive mode.
- Filtered extracted attributes to semantic/status attributes and excluded private/editor/hidden/payment/password/frame subtrees before serialization.
- Removed the arbitrary JavaScript implementation; ReEntry exposes no browser action tools from this reader.

The wrapper restricts this experimental reader to local test hosts, caps DOM size and returned content, and removes echoes of entered form answers from output. It returns only origin, title and bounded content. No raw URL query/hash, model call, delivery or persistence is involved. It is not a claim of perfect redaction across arbitrary sites, frames, shadow DOM or websites that reproduce personal data in unexpected places.

`reader-spike.js` is an unlisted integration-test entry. It has no automatic content-script registration or broad website permission. The browser test invokes it with the real Chrome activeTab grant and verifies meaningful text, seeded private data exclusion, unchanged input values/focus and zero page mutations. Continuous observation, debounce, queueing and site consent remain Phase 1 work.

## Durable graph spike

```sh
pnpm agent:spike start
pnpm agent:spike status
pnpm agent:spike resume
```

The default fixture database is ignored `.runtime/agent-spike.sqlite`. Use a new database path/thread name for a new trial, for example `pnpm agent:spike start .runtime/another-trial.sqlite example-2`. `reject` supplies an unverified receipt; `recover` continues pending work after a crash. `crash` intentionally exits with status 75 immediately after the task/effect transaction commits.

This uses actual LangGraph 1.5.2, its official SQLite checkpointer 1.1.0 and better-sqlite3 12.10.0. The injected decision model is deliberately fake. It exercises branching and persistence without sending browsing data or consuming model credits; it does not evaluate NVIDIA or establish completion accuracy.

The test runs separate Node processes: commit an effect → terminate before graph acknowledgement → restart → reach the evidence interrupt → resume → verify one task and two unique effects. Replaying the initial committed effect does not increment its revision. A separate fake-model branch ends unverified. Product tasks/evidence/effects will use the same single-authority principle, with real version, deletion and reconciliation rules added in subsequent phases. The fixture tables are not a new production task database.

## Settled connection contract, pending Phase 1 integration

The strict event envelope and server authorization helper are in `src/features/agent/connection.ts`, with tests for invalid credentials/origins and oversized/malformed envelopes. No pairing or observation HTTP endpoint is exposed in Phase 0.

Phase 1 will implement this protocol:

1. An explicit Enable action on the exact configured web origin requests a short-lived, one-use pairing challenge. The server stores its hash and expiry.
2. The existing validated web-to-extension bridge delivers that challenge to the configured extension. A website cannot select a different app origin or silently enable assistance.
3. The extension exchanges the challenge directly with the loopback server. The server consumes it, binds a device ID and extension ID, returns a random 32-byte device token only to the extension, and retains its SHA-256 hash. Provider credentials remain unrelated and server-only.
4. Each delivery uses the bound extension origin and bearer token. The server verifies exact configured host/origin, token hash, device/session identity, bounded strict schema and processing/site consent. Event IDs are durably deduplicated; acknowledgement follows a successful transaction. The same event ID with different content is rejected.
5. Reconnect repeats pending event IDs safely; revoke/delete rejects old tokens/events. SQLite is authoritative. The extension queue remains a bounded buffer, and the web dashboard reads accepted server state while its own tab can be closed.

These handshake and delivery behaviors are specified, not yet exercised as a live paired connection. Implement them through the existing route/request/error/logging boundaries and test real browser header/CORS behavior in Phase 1. Native Chrome access controls still apply.

## Verification and next phase

Observed locally: 88 unit/integration tests passed; production web/extension builds and 48 deterministic production browser cases passed with two explicit live/demo skips; commerce checkout/reset/no-external-request acceptance passed separately. The three new browser cases cover preview correction/reload, companion-width axe/focus/reflow and the real activeTab reader. No new live NVIDIA call was needed because no inference input or existing provider behavior changed.

Next is Phase 1: real enabled-site observations and authenticated delivery, replacing preview connection states with honest live state while retaining the bounded reader and existing manual release. Phase 2 is the first automatic task-inference milestone.
