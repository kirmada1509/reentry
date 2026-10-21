# Try Phase 1: capture and save your place

Phase 1 saves your selected instructions, goal, reviewed work link, confirmed progress, supporting links and one next action. It runs locally with a Chrome extension and web app. It does not yet compare instructions or call an AI model.

## Start and install

From the project directory:

```sh
pnpm bootstrap
pnpm extension:build
pnpm dev
```

Open **http://127.0.0.1:3000** in Chrome. In `chrome://extensions`, enable Developer mode, click **Load unpacked**, and select `extension/.output/chrome-mv3` inside the repository. Reload the extension after rebuilding it.

The manifest contains a public development key to keep the unpacked extension id stable: `nabinfdlobegbkgehppcipkhbddjbdka`. This is a public identifier, not an API credential or private signing key. The app expects that id by default. No account, cloud key, or model installation is needed.

## The working journey

1. Open a page containing instructions. For a local example, run `pnpm sandbox:sites` in another terminal and open http://127.0.0.1:4173/instructions.html. If that port is busy, run `pnpm sandbox:sites start 4176` and use port 4176 instead. This is fictional test content, not a scholarship application.
2. Select the text. Invoke **Capture selection with ReEntry** through the toolbar, or **Command+Shift+Y** on Mac / **Ctrl+Shift+Y** elsewhere. Check `chrome://extensions/shortcuts` if another extension uses that shortcut. ReEntry captures before opening its review tab, preserving the selection when focus moves.
3. Review the exact text, source URL and capture time. Choose **Discard capture** to decline, or **Confirm capture and open ReEntry**. Opening a preview alone does not create a task.
4. Enter a goal, complete work URL, completed progress (or “Nothing yet”), and one next action. Confirm that the progress is your own record. Add up to five supporting links if useful. ReEntry has not inspected private form values.
5. Choose **Save confirmed checkpoint**. Wait for the saved message. Refresh and choose **Open saved checkpoint**. Your goal, progress, next action and instructions should still be there.
6. Choose **Open work link** or **Open instruction source**. The external site controls its own form persistence; ReEntry does not restore an exact field.

The existing [Selenium web form](https://www.selenium.dev/selenium/web/web-form.html) is an optional external-page smoke test. Select ordinary page text and use synthetic task data. Public sites are not dependencies of the automated suite.

## When something fails

- No selection, unsupported browser/PDF page, editable-field selection, or oversized capture: the preview explains the problem. The limit is 20,000 characters; nothing is silently truncated.
- App unavailable: confirmed captures remain in the extension. Start ReEntry and choose **Open ReEntry again** from the preview. **Refresh pending captures** checks delivery state.
- Cancel task save: the capture remains pending. Discard it in the extension if no longer needed.
- Browser write fails: the form stays available and the extension is not acknowledged. Fix storage availability and retry.
- Save succeeds but acknowledgement fails: the app says the task is saved and delivery is pending. Refresh that import page; it finds the existing task and retries acknowledgement without duplicating it.

Up to ten captures wait for up to 24 hours from capture time. Finish or discard old ones before taking more. Saved tasks live in IndexedDB on the app's exact origin and browser profile. Clearing site data removes them; this is not encrypted backup storage. Correction/history/deletion and broader interruption resilience remain Phase 4 work.

## Change the app address

The extension permits the configured local hostname and checks the **exact origin including port**. `localhost` and `127.0.0.1` have different browser storage.

To change the port, set `PORT` and `REENTRY_APP_ORIGIN` in the ignored root `.env.local`, rebuild with the same explicit origin, and restart the app. For example:

```sh
REENTRY_APP_ORIGIN=http://127.0.0.1:3001 pnpm extension:build
```

Use `PORT=3001` and `REENTRY_APP_ORIGIN=http://127.0.0.1:3001` for the app too. WXT reads the process environment; do not assume it reads the root Next.js `.env.local`. Reload the extension after rebuilding. Change `REENTRY_EXTENSION_ID` server configuration only if intentionally using another extension identity. These are public connection settings; real credentials stay server-side.

## Verify

```sh
pnpm check
pnpm build
pnpm extension:build
pnpm exec playwright install chromium
pnpm test:e2e --grep @capture
```

Stop the regular Next.js dev server before browser tests, since Next.js uses one development build directory. Tests choose available app/source ports, compile a separate `chrome-mv3-e2e` extension, use temporary profiles and clean up their own browser/server processes. They do not change the normal unpacked build. Traces and screenshots are ignored under `test-results/`; use synthetic data only.

The automated journey triggers Chrome's actual extension action through its browser-level DevTools protocol, including the `activeTab` grant. It does not fake capture output or add broad website permissions. Keyboard invocation and screen-reader behavior require separate hands-on checks; see [recorded results](TEST_RESULTS.md).

For task-bound recapture and switching the fixture at a stable URL, follow the [Phase 2 walkthrough](PHASE2.md).
