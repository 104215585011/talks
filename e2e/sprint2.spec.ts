import { expect, test, type Page } from "@playwright/test";

const password = "password123";

function uniqueEmail(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
}

async function registerThroughUi(page: Page) {
  const email = uniqueEmail("e2e");

  await page.goto("/register");
  await page.getByLabel("Name").fill("E2E Learner");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { exact: true, name: "Create account" }).click();

  await expect(page).toHaveURL(/\/characters$/);
  await expect(
    page.getByRole("heading", { name: "Pick the voice you want to practise with." })
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Emma Clarke" })).toBeVisible();

  return email;
}

async function mockChatStream(page: Page) {
  await page.route("**/api/chat/message", async (route) => {
    await route.fulfill({
      body: [
        'event: delta\ndata: {"text":"Absolutely, "}\n\n',
        'event: delta\ndata: {"text":"let us practise this together."}\n\n',
        'event: done\ndata: {"sessionId":"e2e-session","corrections":["Use \\"practise\\" as a verb in British English."],"newWords":["nuance: a subtle difference in meaning"]}\n\n'
      ].join(""),
      contentType: "text/event-stream",
      headers: {
        "cache-control": "no-cache"
      },
      status: 200
    });
  });
}

test.describe("Sprint 2 frontend E2E", () => {
  test("redirects unauthenticated chat access to login", async ({ page }) => {
    await page.goto("/chat");

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole("heading", { name: "Sign in to LinguaAI" })).toBeVisible();
  });

  test("validates register and login forms", async ({ page }) => {
    await page.goto("/register");
    await page.getByRole("button", { exact: true, name: "Create account" }).click();
    await expect(page.getByText("Enter a valid email address.")).toBeVisible();

    await page.getByLabel("Email").fill("learner@example.com");
    await page.getByLabel("Password").fill("short");
    await page.getByRole("button", { exact: true, name: "Create account" }).click();
    await expect(page.getByText("Password must be at least 8 characters.")).toBeVisible();

    await page.goto("/login");
    await page.getByRole("button", { exact: true, name: "Sign in" }).click();
    await expect(page.getByText("Enter a valid email address.")).toBeVisible();
  });

  test("registers a user, logs in, chooses a character, and receives streamed learning notes", async ({
    page
  }) => {
    const email = await registerThroughUi(page);

    await page.evaluate(() => window.localStorage.clear());
    await page.goto("/login");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { exact: true, name: "Sign in" }).click();

    await expect(page).toHaveURL(/\/characters$/);
    await page.getByRole("button", { exact: true, name: "Start chat" }).click();

    await expect(page).toHaveURL(/\/chat$/);
    await expect(page.getByText("Start with one sentence.")).toBeVisible();

    await mockChatStream(page);
    await page.getByPlaceholder("Message Emma Clarke").fill("I want practice conversation.");
    await page.getByRole("button", { exact: true, name: "Send" }).click();

    await expect(page.getByText("I want practice conversation.")).toBeVisible();
    await expect(page.getByText("Absolutely, let us practise this together.")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Learning notes" })).toBeVisible();
    await expect(page.getByText('Use "practise" as a verb in British English.')).toBeVisible();
    await expect(page.getByText("nuance: a subtle difference in meaning")).toBeVisible();
  });
});
