# Phase 2 — Return and compare instructions

Phase 2 adds source checking to an existing saved task. It preserves both captures and shows text differences. AI interpretation arrives in Phase 3; a changed word is not yet a conclusion that a requirement changed.

## Try the working journey

Use the [Phase 1 setup](PHASE1.md), rebuild with `pnpm extension:build`, and reload the unpacked extension in Chrome. Keep the same browser profile and exact ReEntry address so your saved tasks remain available.

1. Run `pnpm sandbox:sites` in another terminal. Open http://127.0.0.1:4173/instructions.html. If the port is busy, use `pnpm sandbox:sites start 4176` and use port 4176 throughout.
2. Select the instruction paragraph, invoke ReEntry, confirm the preview, and save a task with your goal, progress and next action. The initial version asks for one referee.
3. Close ReEntry. In another terminal run `pnpm sandbox:switch v2`. This replaces only the fictional HTML file served at the same URL; no expected answer is sent to ReEntry.
4. Return to ReEntry, open the saved checkpoint, and choose **Check instructions again**. Choose **Open source and check again**. This opens a source tab bound to that task and check.
5. Select the same paragraph in that tab and invoke the extension. Its preview names the intended task. Choose **Confirm recapture for this task**.
6. Inspect the saved and new text, URLs, section labels and capture times. Confirm that you selected the same instruction section, then choose **Save source comparison**.
7. The result shows one → two referees as labelled removed/added fragments. Refresh: both snapshots, confirmed progress and the saved next action remain available. The action is explicitly marked **not reassessed**.

Each start of `sandbox:sites` resets the fixture to V1. While it runs, `sandbox:switch v1`, `v2`, or `cosmetic` replaces that file. Reload an already-open source tab after switching. `cosmetic` changes punctuation only and still counts as a text edit. The server is the existing http-server package with caching disabled; this is fictional instruction content, not a scholarship backend or a model simulator.

## What the states mean

| Result                                | Meaning                                                                                                                              |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Awaiting a fresh capture              | The task has an open check; select instructions in its bound source tab and confirm the preview.                                     |
| Unchanged within the captured section | The explicitly confirmed section has exactly the same captured text. Other page content and the saved next action were not verified. |
| Text changed                          | The comparable selections differ, including punctuation or spacing. Raw evidence is retained; semantic interpretation has not run.   |
| Captures cannot be compared           | URL, section, extraction metadata, or same-section confirmation differs. No changed/unchanged conclusion is made.                    |
| Could not check / cancelled           | The source remains unverified. Your original checkpoint is intact. Start another check to retry.                                     |

Use **I cannot read the source** for an inaccessible page, login wall, error page or missing instructions, and **Cancel check** to abandon it. Selecting text does not reveal the HTTP status or establish that a page is authoritative; ReEntry cannot automatically identify every error/login page. Missing selection and a source tab closed before capture are detected. Closing the source after capture preserves the pending preview. Repeated invocation in that tab reopens the same pending capture.

## Evidence and boundaries

- Comparisons always use the original saved checkpoint source as their baseline. Each check stores immutable before/after snapshots; it does not replace the task's progress or action.
- Page id/heading metadata helps flag different sections. It is a locator hint, not proof of equivalent selections; explicit user confirmation is still required. Old Phase 1 records without section metadata remain readable after the Dexie v2 upgrade; no metadata is invented.
- Full URLs, including query and fragment, must match. Different URL/section captures can be saved as incomparable evidence. Unsupported wire extraction modes/versions are rejected; domain tests also verify they cannot become comparable.
- Capture timestamps describe when ReEntry captured text, not when the website changed. Raw text is preserved; jsdiff only prepares bounded display fragments, with full snapshots available if the display budget is exceeded.
- The extension binds task/check/baseline identifiers to the tab it opens. Confirmation previews that association. Another task cannot import or acknowledge the capture. Only a successful durable comparison save acknowledges it.
- Pending captures remain bounded to ten and 24 hours. Up to twenty check sessions use browser-session storage and expire after 24 hours. A browser restart loses tab associations and leaves an unfinished check unverified; it does not erase saved tasks/comparisons. Full interruption, history and deletion work remains Phase 4.
- Status polling reads only local extension state. There is no automatic website monitoring, AI call, remote upload, or form submission.

## Verification

Run `pnpm test:e2e` for capture plus source checks, or `pnpm test:e2e --grep @sources` for this phase. The runner serves isolated temporary copies of these real HTML versions through http-server, changes the file at a stable URL, invokes the real extension action, and removes only its own fixture directory. It does not inject a fabricated capture or comparison answer. Read [TEST_RESULTS.md](TEST_RESULTS.md) for observed results and remaining acceptance work.
