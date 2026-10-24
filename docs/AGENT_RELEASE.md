# Automatic-agent evaluation and demonstration

This records the published v0.2.0 / agent-3.4 snapshot. Current main adds [automatic entry points and assignments](AGENT_ASSIGNMENTS.md), with separate agent-3.7 evidence in [TEST_RESULTS.md](TEST_RESULTS.md). The historical 25-step release results below are not a new 3.7 evaluation.

Phase 6 technical record, October 24, 2026 (IST). ReEntry is a local single-user Chrome extension plus web app. It observes enabled pages and proposes tasks/progress; it does not click, submit forms or purchase. This record supplements the historical manual release in [RELEASE.md](RELEASE.md). Native acceptance, Learn reviews and contest submissions are separate gates.

## Reproduce the automatic journey

1. From a fresh checkout, run `pnpm bootstrap`. Set up server-only NVIDIA credentials using [NVIDIA.md](NVIDIA.md), or configure the optional local Ollama adapter. No other supplied provider keys are used.
2. Run `./start.sh`. Load `extension/.output/chrome-mv3` unpacked in Chrome and open http://127.0.0.1:3000/observe. Pair the extension, choose a site, then separately agree to automatic model processing. Reload the extension and refresh app tabs after rebuilding.
3. Run `pnpm sandbox:sites` for Northstar and use its printed address. Save a fictional draft, put the task aside, switch with `pnpm sandbox:switch v2` and return to the application. Add the second referee, review and submit the fictional form. The saved draft and changed requirements should inform the next action. The external site owns the form state.
4. For shopping, run `pnpm sandbox:commerce` and use its published demo credentials. Product research is tentative; cart activity establishes purchase intent. Validation failure and final review stay unfinished. A fresh matching sample-shop receipt can finish the task. No real order or payment occurs.
5. Use **Why this task?** for source quotes, **Task options** for correction/history/finish, and **AI and reminder settings** for processing and opt-in reminders. Automatic history is read-only. The original manual checkpoint editor/restore flow now stays under **Manual tools → Manual checkpoints**. See the [entry-point and assignment update](AGENT_ASSIGNMENTS.md).

## Evaluation protocol

`tests/fixtures/agent-release-v1.json` was committed in `dd95b6a` before the first release-cohort inference. It contains five independent fictional traces and 25 steps: ten regression steps and fifteen development-held-out steps. One step is an explicit scripted correction; 24 are model jobs. The first held-out cohort was new to these development tests, not necessarily to the pretrained model. Subsequent runs reuse an exposed cohort and are **not additional blind hold-outs**. No expected labels, role bindings, assertions or pass counts enter model inputs.

Run with a fresh output filename:

```sh
pnpm test:agent:release .runtime/release-evaluation-new.json
pnpm test:agent:model .runtime/reader-regression-new.json
pnpm test:agent:progress .runtime/progress-regression-new.json
```

These explicit commands incur provider requests and use fresh temporary SQLite stores; they do not touch saved user tasks. Reports preserve the corpus hash, product commit, model alias, prompt version where available, actual decisions, timing, call attempts, task snapshots and failed jobs. The runner writes partial results after each step and refuses an existing filename. Requests are paced ten seconds apart by default; an optional second argument sets 0–60000 milliseconds. A provider rate limit stops the cohort immediately with a preserved partial report instead of issuing the remaining requests. CI uses deterministic providers; it never spends a user's NVIDIA allowance.

Metrics have narrow denominators. Discovery checks required task creation/intent and no-new-task cases; merging checks whether a second distinct same-site application reused the first task ID. False completion counts forbidden completed states per negative task check, with missing tasks reported separately as unverifiable. Latency covers each job's model/tool/validation work, excludes scripted correction from percentiles, and includes failures. Reported quantiles use the lower middle value for the empirical median and nearest-rank p95. Call counts include failed attempts and the summary repair. The single scripted correction is not evidence of a natural human correction rate; required human correction frequency was not measured. Browser recordings separately report actual operator corrections/retry actions and durable model-call reservations.

## Current provider result

The final paced `agent-3.4` replay completed all 25 steps without provider unavailability: **23/25 passed**, including **10/10 regression steps**. Discovery errors were **0/12**, wrong merges **0/1**, and accepted false completions **0/26**, with **zero unverifiable negative checks**. There were 24 calls for 24 model jobs and one separate scripted correction. Empirical median job latency was 2,507 ms, p95 5,215 ms; summed step work was 66,105 ms excluding request pacing. Requests were paced 60 seconds apart; these are not throughput measurements.

Two model proposals still failed: completing a cancelled checkout and completing from a previously seen receipt. The host rejected both and preserved the unfinished task. The strict evaluator therefore exits **1**; this is **not an all-passing model-quality result**. This controlled safety gate passed without establishing universal accuracy. No further replay was used to replace these failures.

| Trial | Prompt    | Attempted / planned | Passed | Calls / jobs | False completions / negative checks | Missing negatives |
| ----- | --------- | ------------------- | ------ | ------------ | ----------------------------------- | ----------------- |
| 1     | agent-3   | 25/25               | 21     | 25/24        | 0/26                                | 0                 |
| 2     | agent-3.1 | 25/25               | 22     | 24/24        | 0/26                                | 0                 |
| 3     | agent-3.2 | 25/25               | 18     | 24/24        | 0/26                                | 4                 |
| 4     | agent-3.4 | 25/25               | 9      | 24/24        | 0/26                                | 12                |
| 5     | agent-3.4 | 5/25                | 4      | 5/5          | 0/4                                 | 1                 |
| 6     | agent-3.4 | 4/25                | 3      | 4/4          | 0/3                                 | 0                 |
| 7     | agent-3.4 | 25/25               | 23     | 24/24        | 0/26                                | 0                 |

Trial 4 attempted the full batch despite provider throttling; sixteen jobs failed with HTTP 429 and twelve negative checks were missing. The runner was then changed to stop on the first rate limit. Trials 5/6 stopped after five/four attempted steps. Trial 7 demonstrates a completed paced evaluation, not a confirmed provider quota/reset rule. The earlier reader/progress regression attempts were also affected by throttling and remain failed evidence. [Compact summary](evidence/agent-phase6-summary.json) and [complete release-cohort records](evidence/agent-phase6-nvidia.json).

## What the live trials uncovered

The baseline cohort had 21/25 passing steps, 0/12 discovery errors, 0/1 wrong merges and **0/26 accepted false completions**, with no missing negative checks. Three unsafe completion proposals were rejected by the host; one changed-requirement update had the correct next action but the wrong checkpoint category. The `agent-3.1` replay had 22/25 passing steps and the same zero accepted false completions. Its three rejected proposals remain failures, not successes or provider outages. The `agent-3.2` replay regressed to 18/25, including four unverifiable negative checks; it is retained rather than hidden or pooled into an accuracy percentage.

Full-browser application trials exposed a separate output-compatibility problem. A real diagnostic response listed 24 citations; another actual response used a progress summary longer than 240 characters. Both were rejected safely. Reducing the requested citation count alone was insufficient. The current host:

- Requests one to three useful citations, accepts at most 80 and validates **every** reference before retaining three. A fabricated extra reference still rejects the entire proposal; over-citation never silently discards an unchecked tail.
- Allows one narrowly scoped summary-shortening request when that is the only repairable problem. All other fields and citations must validate first. Only the summary is replaced; task identity, intent, stage, finish condition, next action, subject and evidence stay fixed. The result passes the ordinary validator again.
- Charges that request to the existing three-call job budget, checks consent again and uses the existing timeout. Invalid tools, forged evidence, unsafe completion, provider errors and exhausted budgets do not receive an automatic retry. A crash cannot bypass the durable call ledger or duplicate an accepted effect.

The original failed takes, diagnostic replays and subsequent outcomes are recorded in [TEST_RESULTS.md](TEST_RESULTS.md) and [output diagnostics](evidence/agent-phase6-output-diagnostics.json). In the successful application take, a 252-character summary became 102 characters through the bounded repair; all five jobs were accepted using six calls. This is an observed format-compatibility improvement, not proof of semantic equivalence. No universal website accuracy or statistically established latency improvement is claimed. The synthetic cohort alone does not establish safe completion on adversarial real websites.

## Verification and selected recordings

Current-prompt selected takes use five accepted jobs each: **application-9** takes 83.88 seconds and six model calls (one summary repair), while **shopping-2** takes 73.88 seconds and five calls. Both have zero operator retries/corrections and a separate browser-restart check. Each uncut 1280×900 video has eight SRT/VTT caption intervals. Captions describe multi-second scenes, aligned from scene timestamps and video duration; they are not frame-accurate narration. A brief background-tab recording can show unused gray viewport space. [Actual task-home video frame](evidence/agent-phase6-task-home.png). Earlier failed takes remain in the [browser ledger](evidence/agent-phase6-browser-trials.json); selected successes are not a general accuracy estimate.

`pnpm check` passes 185 tests/25 files and project guards. The complete production browser regression passes 65 root cases (three explicit skips) and two commerce cases (two explicit skips). Both selected live recordings pass separately. A fresh credential-free local checkout of `7b7b326` passes bootstrap, all then-current 183 tests, extension build and web build. The subsequent audit-path regression adds two tests without changing application behavior. [Full test record](TEST_RESULTS.md).

The [v0.2.0 technical preview](https://github.com/kirmada1509/reentry/releases/tag/v0.2.0) supplies the two MP4s, captions, selected screenshots and media hashes. The earlier manual preview remains at v0.1.0. GitHub asset delivery does not satisfy AI Basics' separate public YouTube/Vimeo requirement.

## Recording and publication

Use fresh directories and run browser builds sequentially with the normal managed app stopped:

```sh
pnpm local:stop
pnpm test:agent:demo application .runtime/agent-release/application-new
pnpm demo:package .runtime/agent-release/application-new
pnpm test:agent:demo shopping .runtime/agent-release/shopping-new
pnpm demo:package .runtime/agent-release/shopping-new
pnpm local:start
pnpm smoke
```

The recorder uses the existing production Playwright web/extension fixtures, native patched page reader, fresh browser profiles, real configured NVIDIA and actual local sites. Task records and model results are not seeded. A brief real tab switch and explicit waiting/resume demonstrate putting work aside; the 45-minute reminder threshold is not accelerated or claimed in the video. A separate full browser restart verifies saved task identity/revision.

Packaging requires FFmpeg/FFprobe only on the recording machine. It transcodes the complete raw WebM to MP4 without cuts or speed changes, verifies duration, and supplies SRT/VTT sidecars. Failed runs or failed restart checks cannot be packaged as completed demonstrations. Raw traces/recordings stay in ignored runtime folders. The optional evaluation-only fetch preload records model content from the fixed NVIDIA endpoint inside owned disposable fixtures; it never records request headers, credentials, provider error bodies or prompts and is absent from ordinary startup.

NVIDIA Ultra uses hosted inference. Its [official model card](https://build.nvidia.com/nvidia/nemotron-3-ultra-550b-a55b/modelcard) identifies OpenMDW-1.1 for the weights and separate trial-service terms. We do not redistribute weights or NIM or claim this hosted demonstration runs offline. Page Agent, LangGraph/SQLite and the sample shop are credited in [provenance](PROVENANCE.md) and [third-party notices](../THIRD_PARTY_NOTICES.md).

Native VoiceOver speech/navigation, native side-panel placement, actual browser zoom/text settings, permission prompts and OS notification banners remain manual gates. The final native inventory reported a locked Mac and failed automatic unlock, with no accessible native browser session; the in-app browser had no tabs. No existing authenticated video-upload session was accessible, so public YouTube/Vimeo delivery remains outstanding. Genuine Learn review/reflection, participant eligibility/registration and final submissions also remain outstanding. No submission receipt, personal reflection or user-study outcome is invented.
