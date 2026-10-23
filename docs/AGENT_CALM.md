# Calm automatic tasks — Phase 5

Implemented October 24, 2026 (IST). This is the live `/observe` page and extension companion, backed by the existing SQLite task authority. The `/preview` route remains a labelled fictional design reference. [Verification](TEST_RESULTS.md), [build checklist](BUILD_CHECKLIST.md).

## Use it

Run `./start.sh`, reload the unpacked ReEntry extension in Chrome and refresh existing ReEntry tabs. Open http://127.0.0.1:3000/observe. Pair/choose sites if needed, then separately consent to the named AI provider. Existing connections, tasks and reminder settings are retained.

The home and companion put tasks before settings. Each task explains its goal, inferred or corrected finish condition, progress interpretation and next action. **Return to work** opens the saved work path. **Why this task?** contains the source quotes and checkpoint timeline; an observed quote is evidence for an interpretation, not proof that the interpretation is correct. **Task options** contains revision history, correction, human finish/reopen, dismissal and deletion. Browser setup, delivery diagnostics and recent observations are secondary disclosures. Pause remains visible in the companion.

**Revision history** reads up to ten actual saved revisions, newest first, with their evidence and correction labels. It is read-only; automatic task history does not add a restore operation. Manual saved checkpoints retain their existing restore flow. History requests require the current revision, use existing web-origin or paired-extension authorization, and cannot retrieve deleted or dismissed tasks. Correction and deletion conflicts preserve the dialog and input so a stale version cannot silently overwrite current work.

Fictional stored-state screenshots: [desktop home](evidence/agent-phase5-home.png), [narrow home](evidence/agent-phase5-home-narrow.png), [narrow companion](evidence/agent-phase5-companion-narrow.png). They show the actual production components; these seeded tasks are UI stress fixtures.

## Quiet updates and recovery

- Polling is coalesced. A successful user action invalidates older reads, so delayed responses cannot overwrite a correction or repopulate cleared tasks. Pairing revocation/clear removes cached task content.
- While an active, visible task or its dialog has focus, background task content, additions and order wait. A quiet **Review saved updates** control applies the latest snapshot. Moving focus outside tasks also releases it; background/hidden apps continue receiving updates. Deleted/dismissed records disappear immediately rather than keeping revoked data visible.
- Explicit user actions apply their acknowledged result immediately. Successful human finish focuses the surviving reopen action; deletion falls back to the task section if its trigger disappears. Background polling never calls focus or scroll, and minor updates create no toast.
- Errors remain useful: failed corrections retain typed input; clear failures stay inside the confirmation dialog; failed inference preserves tasks and exposes an explicit retry. A failed write is never acknowledged as saved. Connection loss does not erase the last displayed task.
- Task identities/order and existing limits are retained: 100 tasks, ten task revisions, twelve progress points, three model calls per job and thirty per hour. New inference at capacity fails without evicting saved work; correction remains usable. Raw observations/jobs expire after 24 hours, effect IDs after 48 hours. Saved tasks/evidence remain until deletion; this is not an encrypted vault or unlimited backup. Existing replay/deletion markers and permission/consent checks remain authoritative.

## Accessibility and visual bounds

Both surfaces compose the installed official registry components and sourced Stone/Emerald theme. No visual primitive, custom CSS, vendor hash or model prompt was changed. The [documented reduced-motion composition](UI.md) disables descendant animations and transitions, including portalled dialogs, when the OS requests reduced motion.

Automated production acceptance uses real web/extension bundles with fictional stored task records to stress several cards, maximum-length/unbroken text, revision history and dialogs. It checks axe, keyboard activation and focus restoration, inline field errors, zero automatic focus/scroll during a focused background update, delayed-response races, failed clear, narrow viewports, simulated 200% text, a 320px viewport equivalent to 400% reflow from 1280px, and actual computed reduced-motion dialog/overlay styles. Existing real capture/inference/progress/reminder journeys run separately in the same regression suite. These stored-state fixtures are not model-quality evaluations.

Native Chrome/VoiceOver speech/navigation, native side-panel placement, actual browser zoom/text preferences, optional permission dialogs and visible OS notification banners remain open manual gates. Native Chrome attachment timed out during this phase; no native result is inferred from headless axe or viewport emulation. This does not establish universal website understanding, clinical effectiveness or guaranteed reminder delivery. Inference prompts, provider adapters and completion validation are unchanged, so Phase 3 actual-NVIDIA results and retained failures remain the model evidence. Phase 6 evaluates the complete agent and prepares its new demonstration.
