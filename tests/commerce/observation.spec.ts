import { expect } from "@playwright/test";
import { test } from "../e2e/extension";
import { pair, dashboard } from "../e2e/observation-journey";

test("automatic companion notices the upstream React shop through cart and receipt without capturing entered details", async ({
  extension,
}) => {
  const { app } = await pair(extension.context);
  const page = await extension.context.newPage();
  await page.goto("http://127.0.0.1:4177");
  await page.getByTestId("username").fill("standard_user");
  await page.getByTestId("password").fill("secret_sauce");
  await page.getByTestId("login-button").click();
  await expect
    .poll(async () =>
      (await dashboard(app)).observations.some((e) =>
        e.page.content.includes("Sauce Labs Backpack"),
      ),
    )
    .toBe(true);
  await page
    .getByRole("button", { name: "Add to cart", exact: true })
    .first()
    .click();
  await expect(
    page.getByRole("button", { name: "Remove", exact: true }).first(),
  ).toBeVisible();
  await expect
    .poll(async () =>
      (await dashboard(app)).observations.some((e) =>
        e.page.content.includes("Remove"),
      ),
    )
    .toBe(true);
  await page.getByTestId("shopping-cart-link").click();
  await page.getByTestId("checkout").click();
  await page.getByTestId("firstName").fill("SyntheticPrivateFirst");
  await page.getByTestId("lastName").fill("SyntheticPrivateLast");
  await page.getByTestId("postalCode").fill("580001");
  await page.getByTestId("continue").click();
  await page.getByTestId("finish").click();
  await expect
    .poll(async () =>
      (await dashboard(app)).observations.some((e) =>
        e.page.content.toLowerCase().includes("thank you for your order"),
      ),
    )
    .toBe(true);
  const evidence = JSON.stringify((await dashboard(app)).observations);
  expect(evidence).not.toMatch(
    /SyntheticPrivateFirst|SyntheticPrivateLast|580001|secret_sauce/,
  );
  expect(evidence).not.toContain('"completed"');
});
