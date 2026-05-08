/**
 * LinguaAI 视觉审查截图脚本
 * 用法: node scripts/visual-review.mjs
 * 截图输出到: scripts/screenshots/
 */

import { chromium } from "@playwright/test";
import { writeFileSync, mkdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE_URL = "http://localhost:3000";
const OUT_DIR = join(__dirname, "screenshots");
const VIEWPORT = { width: 1440, height: 900 };

// 测试账户（需要提前注册，或由脚本自动注册）
const TEST_USER = { email: "review@linguaai.test", password: "Review1234!" };

if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

function log(msg) {
  console.log(`[visual-review] ${msg}`);
}

async function shot(page, name, { waitFor } = {}) {
  if (waitFor) await page.waitForTimeout(waitFor);
  const path = join(OUT_DIR, `${name}.png`);
  await page.screenshot({ path, fullPage: false });
  log(`✓ ${name}.png`);
  return path;
}

async function registerOrLogin(page) {
  // 先尝试注册
  const res = await page.request.post(`${BASE_URL}/api/auth/register`, {
    data: { email: TEST_USER.email, password: TEST_USER.password, name: "Review Bot" }
  });
  if (res.ok() || res.status() === 409) {
    // 注册成功或已存在，再登录拿 token
    const loginRes = await page.request.post(`${BASE_URL}/api/auth/login`, {
      data: { email: TEST_USER.email, password: TEST_USER.password }
    });
    if (loginRes.ok()) {
      const { accessToken } = await loginRes.json();
      await page.evaluate((token) => {
        localStorage.setItem("accessToken", token);
      }, accessToken);
      log("Auth token set");
      return accessToken;
    }
  }
  throw new Error("Failed to authenticate test user");
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: VIEWPORT });
  const page = await context.newPage();

  // 屏蔽 Google Translate 提示
  await context.addInitScript(() => {
    Object.defineProperty(navigator, "language", { get: () => "en-US" });
  });

  try {
    // ─── 1. 登录页 ──────────────────────────────────────────────────────────
    log("--- 登录页 ---");
    await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle" });
    await shot(page, "01-login-default", { waitFor: 800 });

    // 聚焦 email 输入框，查看 focus 状态
    await page.focus('input[type="email"], input[name="email"], input[placeholder*="example"]');
    await shot(page, "02-login-input-focus", { waitFor: 300 });

    // hover Sign in 按钮
    await page.hover('button[type="submit"], button:has-text("Sign in")');
    await shot(page, "03-login-button-hover", { waitFor: 300 });

    // ─── 2. 注册页 ──────────────────────────────────────────────────────────
    log("--- 注册页 ---");
    await page.goto(`${BASE_URL}/register`, { waitUntil: "networkidle" });
    await shot(page, "04-register", { waitFor: 500 });

    // ─── 3. 注册/登录，拿 token ─────────────────────────────────────────────
    log("--- 认证 ---");
    await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle" });
    await registerOrLogin(page);

    // ─── 4. 角色选择页 ──────────────────────────────────────────────────────
    log("--- 角色选择页 ---");
    await page.goto(`${BASE_URL}/characters`, { waitUntil: "networkidle" });
    await shot(page, "05-characters-default", { waitFor: 800 });

    // hover 第二张卡片（Jake），查看 3D 倾斜 hover 效果
    const cards = page.locator('[class*="card"], [class*="Card"], [data-character]');
    const cardCount = await cards.count();
    log(`Found ${cardCount} character cards`);

    if (cardCount > 1) {
      await cards.nth(1).hover();
      await shot(page, "06-characters-card-hover", { waitFor: 400 });
    }

    // 点击 Carlos（最后一张），查看选中状态
    if (cardCount >= 5) {
      await cards.nth(4).click();
      await shot(page, "07-characters-card-selected", { waitFor: 500 });
    }

    // ─── 5. 对话页（空状态）─────────────────────────────────────────────────
    log("--- 对话页（空状态）---");
    await page.goto(`${BASE_URL}/chat`, { waitUntil: "networkidle" });
    await shot(page, "08-chat-empty", { waitFor: 800 });

    // 输入框 focus 状态
    const msgInput = page.locator(
      'textarea, input[placeholder*="Message"], input[placeholder*="message"]'
    );
    if ((await msgInput.count()) > 0) {
      await msgInput.first().focus();
      await shot(page, "09-chat-input-focus", { waitFor: 300 });

      // 输入消息，查看发送按钮状态变化
      await msgInput.first().fill("Hello, how are you today?");
      await shot(page, "10-chat-input-filled", { waitFor: 300 });
    }

    // ─── 6. 切换角色（侧边栏）──────────────────────────────────────────────
    log("--- 侧边栏角色切换 ---");
    const sidebarItems = page.locator(
      '[class*="sidebar"] [class*="item"], [class*="mentor"] li, nav li'
    );
    const sidebarCount = await sidebarItems.count();
    log(`Found ${sidebarCount} sidebar items`);

    if (sidebarCount > 1) {
      await sidebarItems.nth(1).hover();
      await shot(page, "11-chat-sidebar-hover", { waitFor: 300 });

      await sidebarItems.nth(2).click();
      await shot(page, "12-chat-character-switched", { waitFor: 600 });
    }

    // ─── 7. 发送消息，查看气泡 ──────────────────────────────────────────────
    log("--- 发送消息流程 ---");
    const inputAfterSwitch = page.locator(
      'textarea, input[placeholder*="Message"], input[placeholder*="message"]'
    );
    if ((await inputAfterSwitch.count()) > 0) {
      await inputAfterSwitch.first().fill("你好");
      const sendBtn = page.locator(
        'button[type="submit"], button:has-text("Send"), button[aria-label*="send"]'
      );
      if ((await sendBtn.count()) > 0) {
        await sendBtn.first().click();
        await shot(page, "13-chat-message-sending", { waitFor: 500 });
        await page.waitForTimeout(3000); // 等待 AI 回复流式输出
        await shot(page, "14-chat-message-replied", { waitFor: 500 });
      }
    }

    // ─── 8. 移动端响应式（768px）────────────────────────────────────────────
    log("--- 响应式 768px ---");
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto(`${BASE_URL}/characters`, { waitUntil: "networkidle" });
    await shot(page, "15-characters-tablet", { waitFor: 600 });

    await page.goto(`${BASE_URL}/chat`, { waitUntil: "networkidle" });
    await shot(page, "16-chat-tablet", { waitFor: 600 });

    log(`\n✅ 全部截图完成，共 ${existsSync(OUT_DIR) ? "多" : "0"} 张`);
    log(`📁 输出目录: ${OUT_DIR}`);
  } catch (err) {
    log(`❌ 错误: ${err.message}`);
    await shot(page, "error-state").catch(() => {});
    throw err;
  } finally {
    await browser.close();
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
