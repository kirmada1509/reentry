import { test, expect } from "@playwright/test";

test("upstream shop retains an interrupted cart, validates checkout, completes and resets without remote requests", async ({
  page,
  context,
}) => {
  const remoteRequests: string[] = [];
  await context.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (url.hostname !== "127.0.0.1") {
      remoteRequests.push(url.hostname);
      await route.abort();
    } else await route.continue();
  });
  await page.goto("/");
  await page.getByTestId("username").fill("standard_user");
  await page.getByTestId("password").fill("secret_sauce");
  await page.getByTestId("login-button").click();
  await page
    .getByRole("button", { name: "Add to cart", exact: true })
    .first()
    .click();
  await page.getByTestId("shopping-cart-link").click();
  await page.reload();
  await expect(page.getByTestId("cart-list")).toContainText(
    "Sauce Labs Backpack",
  );
  await page.getByTestId("checkout").click();
  await page.getByTestId("continue").click();
  await expect(page.getByText("Error: First Name is required")).toBeVisible();
  await page.getByTestId("firstName").fill("Fictional");
  await page.getByTestId("lastName").fill("Tester");
  await page.getByTestId("postalCode").fill("00000");
  await page.getByTestId("continue").click();
  await page.getByTestId("finish").click();
  await expect(
    page.getByRole("heading", { name: "Thank you for your order!" }),
  ).toBeVisible();
  await page.getByTestId("back-to-products").click();
  await page
    .getByRole("button", { name: "Add to cart", exact: true })
    .first()
    .click();
  await page.getByRole("button", { name: "Open Menu", exact: true }).click();
  await page.getByText("Reset App State", { exact: true }).click();
  await expect(page.getByTestId("shopping-cart-badge")).toHaveCount(0);
  expect(remoteRequests).toEqual([]);
});
