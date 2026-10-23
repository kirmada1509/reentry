import { expect } from "@playwright/test";
import type { BrowserContext, Page } from "@playwright/test";
import { appUrl, sourceUrl } from "./extension";
import { DEFAULT_EXTENSION_ID } from "../../src/features/capture/config";
const site = new URL(sourceUrl).origin;
const companionUrl = `chrome-extension://${DEFAULT_EXTENSION_ID}/companion.html`;

export async function pair(context: BrowserContext) {
  const app = await context.newPage();
  await app.goto(`${appUrl}/observe`);
  // Each browser fixture explicitly replaces any previous profile's pairing.
  await app.evaluate(async () => {
    await fetch("/api/agent/web", {
      method: "POST",
      headers: { "content-type": "application/json", "x-reentry-web": "1" },
      body: JSON.stringify({ action: "clear" }),
    });
  });
  await app.reload();
  const opened = context.waitForEvent("page");
  await app
    .getByRole("button", { name: "Connect browser", exact: true })
    .click();
  const companion = await opened;
  await companion.waitForURL(companionUrl);
  await companion
    .getByRole("button", { name: "Connect to local app", exact: true })
    .click();
  await expect(
    companion.getByRole("button", { name: "Enable observation", exact: true }),
  ).toBeVisible();
  await companion.getByLabel("Site address", { exact: true }).fill(site);
  await companion
    .getByRole("checkbox", { name: "Allow local observation" })
    .check();
  await companion
    .getByRole("button", { name: "Enable observation", exact: true })
    .click();
  await expect(
    companion.getByRole("button", { name: "Pause observation", exact: true }),
  ).toBeVisible();
  return { app, companion };
}
export async function dashboard(page: Page) {
  const response = await page.request.get(`${appUrl}/api/agent/web`, {
    headers: { "x-reentry-web": "1", origin: appUrl },
  });
  return response.json() as Promise<{
    observations: Array<{
      eventId: string;
      reason: string;
      page: {
        title: string;
        content: string;
        fields: Array<{ label: string; present: boolean }>;
      };
    }>;
  }>;
}

export async function openDisclosure(page: Page, name: string) {
  const trigger = page.getByRole("button", { name, exact: true });
  if ((await trigger.getAttribute("aria-expanded")) === "false")
    await trigger.click();
}
