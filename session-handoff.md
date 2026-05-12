# LinguaAI · 会话交接摘要

> 每轮会话结束时更新此文件。下一轮开始时先读它，再读 `claude-progress.md` 和 `feature_list.json`。

---

## 当前已验证状态（2026-05-12）

| 验证项 | 结果 |
|--------|------|
| `npm test -- --runInBand` | ✅ 27 suites / 83 tests passing |
| `npx tsc --noEmit --incremental false` | ✅ 无报错 |
| `npm run lint` | ✅ 无报错 |
| `npm run build` | ✅ 成功 |
| `npm run test:e2e` | ⚠️ 历史记录 7 passing，本轮未重跑 |
| 浏览器人工验证：TTS 读音 | ✅ Volume2 按钮能听到声音 |
| 浏览器人工验证：Show more 折叠 | ✅ 长消息底部出现 Show more |
| 浏览器人工验证：聊天固定窗口 | ✅ 窗口不随消息增多撑高 |

---

## 本轮改动

### 代码改动
- **`src/lib/speech/speech-service.ts`**：Fish Audio 请求的 `model` 参数从 HTTP header 移入 JSON body；默认 model 从 `s2-pro` 改为 `s1`
- **`src/components/chat/ChatWorkspace.tsx`**：`playAssistantAudio()` 的 catch block 加了 `console.error("Failed to play assistant audio", error)`，不再静默失败

### 基础设施改动
- **`.claude/settings.local.json`**：加了 `SessionStart` hook，每次会话启动自动将 `claude-progress.md` 和 `feature_list.json` 注入为上下文
- **`docs/sprint-7-tickets.md`**：新增 TICKET-712（TTS 读音修复）完整规格
- **`feature_list.json`**：新增 s7-712 条目（status: passing）
- **`claude-progress.md`**：更新最高优先级和会话记录

---

## 仍损坏或未验证

| 项目 | 状态 | 备注 |
|------|------|------|
| TICKET-705 报告页数据卡片 | ⬜ not_started | 低优先级，不影响核心功能 |
| TICKET-706 全局按钮微交互 | ⬜ not_started | 低优先级，不影响核心功能 |
| E2E Playwright 测试 | ⚠️ 未本轮验证 | 上次 7 passing；TTS 相关改动理论上不影响 E2E |
| Fish Audio ASR（语音输入） | 🔲 未验证 | API key 已配置，但本轮未测试麦克风路径 |

---

## 下一步最佳动作

**首选**：TICKET-705（报告页数据卡片升级）
- 访问 `/report` 页，把数据卡片改成 glass 风格
- 分数加 Framer Motion 计数入场动画
- 参考 `docs/sprint-7-tickets.md TICKET-705`

**备选**：TICKET-706（全局按钮微交互）
- 在 `src/components/ui/Button.tsx` 统一 hover/tap scale 动画
- 参考 `docs/sprint-7-tickets.md TICKET-706`

**不要动**：
- `src/lib/speech/speech-service.ts` 中的 Fish Audio 调用（刚修好，别碰）
- `.env.local` 中的任何 key（已配置正确）
- `src/app/globals.css` 的 prefers-reduced-motion 块（已修正，0.3ms 不是 0.01ms）

---

## 命令参考

```bash
# 启动开发服务器（会先清理 3000 端口）
.\start-dev.ps1 3000

# 备用启动
npm run dev -- -p 3000

# 全量测试
npm test -- --runInBand

# 类型检查
npx tsc --noEmit --incremental false

# Lint
npm run lint

# 构建
npm run build

# E2E（需要服务器已启动）
npm run test:e2e
```

---

## Update · 2026-05-12 · TICKET-705

Completed Sprint 7 TICKET-705 report page data-card upgrade.

Changed files:
- `src/components/report/LearningReport.tsx`
- `src/components/report/LearningReport.test.tsx`
- `feature_list.json`
- `claude-progress.md`

Verification evidence:
- `npm test -- src/components/report/LearningReport.test.tsx --runInBand` passed.
- `npx tsc --noEmit --incremental false` passed.
- `npm run lint` passed.
- `npm test -- --runInBand` passed: 28 suites / 84 tests.
- `npm run build` passed.
- `/report` returned HTTP 200 on local dev server after clearing stale `.next` cache.

Remaining next ticket:
- TICKET-706 global button micro-interaction.

Do not touch:
- TTS/Fish Audio path unless a new audio bug is reported.
- `.env.local` secrets.
- PM-owned visual files already dirty before this ticket: `src/app/globals.css`, `src/components/ui/FluidBackground.tsx`.

---

## Update · 2026-05-12 · TICKET-705 P0 Follow-up

Codex2 reproduced `/report` as a P0 blocker: dev server could listen on 3000 while `/report`, `/api/user/stats`, and static chunks timed out or returned 500. Root-cause direction was the report page initial bundle pulling Chart.js/react-chartjs-2 directly.

Fix:
- `src/components/report/ReportCharts.tsx` now owns Chart.js/react-chartjs-2 and chart sections.
- `src/components/report/LearningReport.tsx` dynamically loads `ReportCharts` with `ssr: false` and a lightweight loading skeleton.
- Added `src/components/report/ReportCharts.test.tsx`.

Verification evidence:
- `/report` HTTP 200.
- `/_next/static/chunks/main-app.js` HTTP 200.
- Unauthenticated `/api/user/stats` HTTP 401, no timeout.
- In-app browser new tab renders report DOM.
- `npx tsc --noEmit --incremental false` passed.
- `npm run lint` passed.
- `npm test -- --runInBand` passed: 29 suites / 85 tests.
- `npm run build` passed; `/report` initial route size is 8.86 kB.

Next ticket:
- PF-02 chat mouse-move render optimization.

---

## Update · 2026-05-12 · PF-01 + Report QA Retest

Codex2 retested `/report` and reproduced a P0 runtime blocker: Next dev returned 500 with `Cannot find module './948.js'`, and Playwright saw an empty Server Error page.

Fix:
- `src/components/chat/AudioWaveform.tsx` now draws a single static line when idle and does not start an rAF loop.
- `src/components/chat/AudioWaveform.test.tsx` covers idle and playing waveform behavior.
- `next.config.mjs` aligns dev server chunk output on Windows so server runtime chunk lookup resolves correctly.

Verification evidence:
- `npm test -- src/components/chat/AudioWaveform.test.tsx --runInBand` passed.
- `npx tsc --noEmit --incremental false` passed.
- `npm run lint` passed.
- `npm test -- --runInBand` passed: 30 suites / 87 tests.
- `npm run build` passed after clearing stale `.next`.
- Local dev `/report` HTTP 200.
- Local Playwright probe for `/report`: status 200, `Learning report` text present, no Server Error, no stuck Loading.

Next ticket:
- PF-02 chat mouse-move render optimization.
