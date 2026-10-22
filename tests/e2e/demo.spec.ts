import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { expect } from "@playwright/test";
import {
  test,
  appUrl,
  captureSelection,
  confirmPreview,
  fillTask,
} from "./extension";
import { scenario, start, recapture } from "./source-journey";

test("@demo record the actual release journey with real NVIDIA inference", async ({
  extension,
}) => {
  test.skip(
    process.env.REENTRY_RECORD_DEMO !== "1",
    "Explicit recording only; never a synthetic demo.",
  );
  test.setTimeout(240000);
  await mkdir(path.resolve(".runtime/release"), { recursive: true });
  const { context } = extension;
  const fixture = await scenario();
  const { preview } = await captureSelection(context, true, fixture.url);
  const page = await confirmPreview(context, preview);
  await page.setViewportSize({ width: 1280, height: 900 });
  const started = Date.now();
  const captions: { start: number; end: number; text: string }[] = [];
  async function hold(text: string, seconds = 8) {
    const start = (Date.now() - started) / 1000;
    await page.waitForTimeout(seconds * 1000);
    captions.push({ start, end: (Date.now() - started) / 1000, text });
  }
  await hold(
    "ReEntry helps you return to unfinished work. These instructions are fictional test content.",
  );
  await fillTask(page, "Finish my scholarship application");
  await page
    .getByLabel("Work link", { exact: true })
    .fill(fixture.url + "#work");
  await hold(
    "Capture is explicit. Progress is confirmed by the user, never inferred from form fields.",
  );
  await page
    .getByRole("button", { name: "Save confirmed checkpoint", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Saved checkpoint", exact: true }),
  ).toBeVisible();
  await hold(
    "The checkpoint keeps the goal, confirmed progress, source evidence and next action together.",
  );
  await page.reload();
  await page
    .getByRole("button", { name: "Open saved checkpoint", exact: true })
    .click();
  await hold(
    "After an interruption, the same browser profile still has the confirmed checkpoint.",
  );
  await page
    .getByRole("link", { name: "Check instructions again", exact: true })
    .click();
  await fixture.version("v2");
  const source = await start(context, page, fixture.url);
  const { preview: second } = await recapture(context, source);
  const opened = context.waitForEvent("page");
  await second
    .getByRole("button", {
      name: "Confirm recapture for this task",
      exact: true,
    })
    .click();
  const received = await opened;
  await received.waitForURL(`${appUrl}/check?*`);
  const transfer = received.url();
  await received.close();
  await page.goto(transfer);
  await hold(
    "The controlled source now requires two referees. Recapture stays bound to this task.",
  );
  await page
    .getByRole("checkbox", {
      name: "I selected the same instruction section as the saved capture.",
      exact: true,
    })
    .check();
  await page
    .getByRole("button", { name: "Save source comparison", exact: true })
    .click();
  await hold(
    "Saved and current evidence remain inspectable. A text difference alone is not an AI conclusion.",
  );
  await page
    .getByRole("link", { name: "Review AI recovery", exact: true })
    .click();
  const consent = page.getByRole("checkbox", {
    name: /I agree to send this task context to NVIDIA/,
  });
  await expect(consent).toBeVisible();
  await hold(
    "NVIDIA processing is disclosed. Task context is sent only after explicit agreement.",
  );
  await consent.check();
  await page
    .getByRole("button", { name: "Generate recovery suggestion", exact: true })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Recovery suggestion · review required",
      exact: true,
    }),
  ).toBeVisible({ timeout: 35000 });
  await page
    .getByRole("heading", {
      name: "Recovery suggestion · review required",
      exact: true,
    })
    .scrollIntoViewIfNeeded();
  await hold(
    "This is a real NVIDIA model response. Exact quotes support the change; confirmed progress is preserved.",
    12,
  );
  await page.screenshot({
    path: path.resolve(".runtime/release/recovery.png"),
    fullPage: true,
  });
  await page
    .getByLabel("Reviewed next action", { exact: true })
    .fill("Ask Alex to be my first referee; then find the second.");
  await page
    .getByRole("button", { name: "Save reviewed recovery", exact: true })
    .click();
  await hold(
    "The user can correct the proposed action before continuing. AI suggestions remain separate from facts.",
  );
  const work = context.waitForEvent("page");
  await page
    .getByRole("button", { name: "Continue to saved work", exact: true })
    .click();
  await (await work).waitForURL(fixture.url + "#work");
  const id = new URL(page.url()).searchParams.get("task")!;
  await page.goto(`${appUrl}/task?task=${id}`);
  await page
    .getByLabel("What have you completed?", { exact: true })
    .fill("Transcript prepared, not uploaded.");
  await page.getByRole("checkbox").check();
  await page
    .getByRole("button", { name: "Save checkpoint revision", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("revision 2");
  await hold(
    "Correcting a checkpoint creates a new revision. Drafts and confirmed checkpoints have distinct states.",
  );
  await page
    .getByRole("button", { name: "Revision history (2)", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Restore revision 1", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("revision 3");
  await hold(
    "Restore creates revision three with the earlier contents. History is bounded to ten revisions.",
  );
  await page.screenshot({
    path: path.resolve(".runtime/release/history.png"),
    fullPage: true,
  });
  await hold(
    "ReEntry: explicit capture, evidenced changes, one reviewed next action. No autofill or application submission.",
    10,
  );
  const directory = path.resolve(".runtime/release");
  await mkdir(directory, { recursive: true });
  const video = page.video()!;
  await page.close();
  await video.saveAs(path.join(directory, "reentry-demo.webm"));
  await writeFile(
    path.join(directory, "captions.json"),
    JSON.stringify(captions, null, 2),
  );
});
