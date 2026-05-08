import { expect, test, type Locator, type Page } from "@playwright/test";

const mobileViewport = { width: 390, height: 844 };
const tabletViewport = { width: 820, height: 1180 };

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth
  );

  expect(overflow).toBeLessThanOrEqual(1);
}

async function expectDarkInputs(page: Page) {
  const inputs = page.locator("input, textarea");
  const count = await inputs.count();

  expect(count).toBeGreaterThan(0);

  for (let index = 0; index < count; index += 1) {
    const backgroundColor = await inputs.nth(index).evaluate((element) => {
      return window.getComputedStyle(element).backgroundColor;
    });

    expect(backgroundColor).not.toBe("rgb(255, 255, 255)");
  }
}

async function expectAuthStarfield(page: Page) {
  const starfield = page.locator('[aria-hidden="true"].bg-cosmic-grid').first();

  await expect(starfield).toBeVisible();
  await expect(starfield.locator("canvas")).toHaveCount(1);

  const box = await starfield.boundingBox();
  expect(box?.width ?? 0).toBeGreaterThanOrEqual(mobileViewport.width - 1);
  expect(box?.height ?? 0).toBeGreaterThanOrEqual(mobileViewport.height - 1);
}

async function seedAuthSession(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      "linguaai.auth",
      JSON.stringify({
        accessToken: "mobile-e2e-token",
        refreshToken: "mobile-e2e-refresh",
        user: {
          email: "mobile-e2e@example.com",
          id: "mobile-e2e-user",
          name: "Mobile E2E"
        }
      })
    );
    window.localStorage.setItem("linguaai.characterId", "emma");
  });
}

async function mockChatStream(page: Page) {
  await page.route("**/api/chat/message", async (route) => {
    await route.fulfill({
      body: [
        'event: delta\ndata: {"text":"Nice one, "}\n\n',
        'event: delta\ndata: {"text":"let us keep the conversation moving."}\n\n',
        'event: done\ndata: {"sessionId":"mobile-e2e-session","corrections":["Say \\"I want to practise\\", not \\"I want practise\\"."],"newWords":["momentum: steady forward progress"]}\n\n'
      ].join(""),
      contentType: "text/event-stream",
      headers: {
        "cache-control": "no-cache"
      },
      status: 200
    });
  });
}

async function expectOrderedWithoutOverlap(elements: Locator[]) {
  const boxes = [];

  for (const element of elements) {
    const box = await element.boundingBox();
    expect(box).not.toBeNull();
    boxes.push(box!);
  }

  for (let index = 0; index < boxes.length - 1; index += 1) {
    expect(boxes[index].x + boxes[index].width).toBeLessThanOrEqual(boxes[index + 1].x + 1);
  }
}

test.describe("TICKET-307 mobile responsive E2E", () => {
  test("auth pages keep starfield, dark inputs, and no horizontal overflow on mobile", async ({
    page
  }) => {
    await page.setViewportSize(mobileViewport);

    await page.goto("/login");
    await expect(page.getByRole("heading", { name: "Sign in to LinguaAI" })).toBeVisible();
    await expectAuthStarfield(page);
    await expectDarkInputs(page);
    await page.getByLabel("Email").fill("mobile-login@example.com");
    await page.getByLabel("Password").fill("password123");
    await expect(page.getByLabel("Email")).toHaveValue("mobile-login@example.com");
    await expectNoHorizontalOverflow(page);

    await page.goto("/register");
    await expect(page.getByRole("heading", { name: "Start your language cockpit" })).toBeVisible();
    await expectAuthStarfield(page);
    await expectDarkInputs(page);
    await page.getByLabel("Name").fill("Mobile Learner");
    await page.getByLabel("Email").fill("mobile-register@example.com");
    await page.getByLabel("Password").fill("password123");
    await expect(page.getByLabel("Name")).toHaveValue("Mobile Learner");
    await expectNoHorizontalOverflow(page);
  });

  test("unauthenticated mobile chat access redirects to login", async ({ page }) => {
    await page.setViewportSize(mobileViewport);
    await page.goto("/chat");

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole("heading", { name: "Sign in to LinguaAI" })).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test("mobile chat uses mentor drawer and streams a reply without control overlap", async ({
    page
  }) => {
    await page.setViewportSize(mobileViewport);
    await seedAuthSession(page);
    await mockChatStream(page);

    await page.goto("/chat");
    await expect(page).toHaveURL(/\/chat$/);
    await expect(page.locator("aside").first()).toBeHidden();
    await expect(page.getByRole("button", { name: "Choose mentor" })).toBeVisible();
    await expect(page.getByText("Start with one sentence.")).toBeVisible();
    await expectNoHorizontalOverflow(page);

    await page.getByRole("button", { name: "Choose mentor" }).click();
    await expect(page.getByRole("dialog", { name: "Choose mentor" })).toBeVisible();
    await page.getByRole("button", { name: /Jake Wilson/ }).click();
    await expect(page.getByRole("dialog", { name: "Choose mentor" })).toBeHidden();
    await expect(page.locator("header").getByText("Jake Wilson")).toBeVisible();

    await page.getByRole("button", { name: "Choose mentor" }).click();
    await expect(page.getByRole("dialog", { name: "Choose mentor" })).toBeVisible();
    await page.getByRole("button", { name: /Carlos Méndez/ }).click();
    await expect(page.getByRole("dialog", { name: "Choose mentor" })).toBeHidden();
    await expect(page.locator("header").getByText("Carlos Méndez")).toBeVisible();
    await expect(page.getByPlaceholder("Message Carlos Méndez")).toBeVisible();

    const composer = page.locator("form").last();
    await expectOrderedWithoutOverlap([
      composer.locator("textarea"),
      composer.getByRole("button", { name: /record voice input/i }),
      composer.getByRole("button", { name: "Send" })
    ]);

    await page.getByPlaceholder("Message Carlos Méndez").fill("I want practise conversation.");
    await page.getByRole("button", { exact: true, name: "Send" }).click();

    await expect(page.getByText("I want practise conversation.")).toBeVisible();
    await expect(page.getByText("Nice one, let us keep the conversation moving.")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Learning notes" })).toBeVisible();
    await expect(page.getByText('Say "I want to practise", not "I want practise".')).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test("tablet chat keeps drawer mode below the desktop breakpoint", async ({ page }) => {
    await page.setViewportSize(tabletViewport);
    await seedAuthSession(page);

    await page.goto("/chat");

    await expect(page.locator("aside").first()).toBeHidden();
    await expect(page.getByRole("button", { name: "Choose mentor" })).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
});
