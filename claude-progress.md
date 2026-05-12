# LinguaAI · 进度日志

## 当前已验证状态

- **里程碑**：M0→M1→M2→M3 全部完成，Beta 准备就绪
- **仓库根目录**：`C:\Users\wang\Documents\talks`
- **标准启动路径**：`.\start-dev.ps1 3000`（先清理 3000 端口进程，再启动 dev server）
- **标准验证路径**：`npm test -- --runInBand`（27 suites, 83 tests passing，2026-05-12 已验证）
- **Lint / Build**：`npm run lint` ✅，`npm run build` ✅（2026-05-12 已验证）
- **E2E**：`npm run test:e2e`（历史记录：7 Playwright tests passing；本轮未重跑）
- **当前最高优先级未完成功能**：PF-01（AudioWaveform rAF 泄漏修复）、PF-02（聊天区鼠标移动避免重渲染）、PF-03（SSE 批量 setState）
- **当前 blocker**：无

---

## Sprint 历史

### Sprint 1–4（M0→M3）✅ 完成
- 核心功能：注册/登录、角色选择、聊天、TTS/ASR、学习笔记
- QA 报告：`docs/m3-prelaunch-quality-report.md`、`docs/qa-ticket-307-mobile-e2e-report.md`

### Sprint 5（UX 改进）✅ 完成
- TICKET-501：全局 Nav Bar ✅
- TICKET-502：Learning notes real API 修复 ✅
- TICKET-503：消息自动滚动 ✅
- TICKET-504：已登录用户自动跳转 ✅
- TICKET-505：单击角色直接进聊天 ✅
- TICKET-506：Typing indicator ✅
- TICKET-507：登录页细节 ✅
- TICKET-508：Tooltips / 快捷键 ✅
- TICKET-509：聊天历史加载 ✅

### Sprint 6（PWA）✅ 完成
- TICKET-601：PWA manifest + visualViewport + iOS meta tags ✅

### Sprint 7（Visual Polish）🔄 进行中
- TICKET-701：FluidBackground 全局组件 ✅
- TICKET-702：登录/注册页深色毛玻璃 ✅
- TICKET-703：角色选择页视觉升级 ✅
- TICKET-704：聊天页视觉升级（气泡+背景）✅
- TICKET-705：报告页数据卡片 ✅
- TICKET-706：全局按钮微交互 ✅
- TICKET-710：AI 消息长文折叠（Show more）✅
- TICKET-711：聊天固定窗口 + 滚动锚定 ✅
- 自定义滚动条样式（globals.css）✅
- FluidBackground 性能优化（blur 130px→72px）✅

---

## 会话记录

### 2026-05-12
- **本轮目标**：校准 AI Agent 项目管理文件，更新真实验证数据
- **已完成**：
  - 确认 `CLAUDE.md` / `claude-progress.md` / `feature_list.json` / `init.sh` 已就位
  - 确认 `feature_list.json` 是合法 JSON
  - 将标准测试结果更新为 27 suites / 83 tests passing
  - 确认当前最高优先级为 TICKET-712（TTS 读音修复）
  - 修复 Fish Audio TTS 请求：`model` 从 HTTP header 移入 JSON body
  - 默认 Fish Audio model 改为 `s1`，并同步 `.env.local.example`
  - 本机 `.env.local` 的 `FISH_AUDIO_MODEL` 已从 `s2-pro` 调整为 `s1`
  - `playAssistantAudio()` 失败时现在会 `console.error("Failed to play assistant audio", error)`，不再静默失败
  - 清理 `npx tsc --noEmit --incremental false` 暴露的测试类型问题
  - 用户已人工确认点击 Volume2 能听到声音，TICKET-712 标记为 passing
- **运行过的验证**：`npx tsc --noEmit --incremental false`、`npm test -- --runInBand`、`npm run lint`、`npm run build`
- **下一步最佳动作**：TICKET-705（报告页数据卡片升级）或 TICKET-706（全局按钮微交互）

### 2026-05-11
- **本轮目标**：Claude2 视觉审查 mmguo.dev → 全站视觉升级
- **已完成**：
  - Claude2 用 Playwright 分析 mmguo.dev 设计语言
  - 生成 demo-fluid-bg.html 效果预览
  - 开立 Sprint 7 全套工单（701-706）
  - 审查 Codex1 实施结果，确认 701-704/710/711 通过
  - 修复 FluidBackground 性能问题（blur 减小、去 saturate、加 contain）
  - 自定义滚动条样式写入 globals.css
  - 安装 prompts-chat MCP
- **运行过的验证**：Playwright screenshots on localhost:3000
- **下一步最佳动作**：TICKET-705（报告页）或 TICKET-706（按钮微交互）

### 2026-05-12 · TICKET-705
- **Goal**: Sprint 7 TICKET-705 report page metric card visual upgrade.
- **Completed**:
  - `/report` mounts low-intensity `FluidBackground`.
  - Metric cards use dark glass surfaces, metric-specific top accent lines, and Framer Motion count-up values.
  - Added `src/components/report/LearningReport.test.tsx` to lock the TICKET-705 acceptance points.
- **Verification**:
  - `npm test -- src/components/report/LearningReport.test.tsx --runInBand` passed.
  - `npx tsc --noEmit --incremental false` passed.
  - `npm run lint` passed.
  - `npm test -- --runInBand` passed: 28 suites / 84 tests.
  - `npm run build` passed.
  - Local dev `/report` returned HTTP 200 after clearing stale `.next` cache and restarting port 3000.
- **Note**: Playwright browser probe timed out while navigating to localhost in this Codex session, so visual evidence is covered by component test + HTTP route check rather than screenshot.
- **Next best action**: TICKET-706 global button micro-interaction.

### 2026-05-12 · TICKET-705 P0 Follow-up
- **Issue**: `/report` could make the Next dev server enter a bad state: port 3000 listened, but `/report`, `/api/user/stats`, and static chunks timed out or returned 500. Codex2 reproduced this as a P0 blocker.
- **Root cause direction**: `/report` initial client module included Chart.js/react-chartjs-2 directly. In Next dev this produced unstable chunk state (`Cannot find module './948.js'`, `clientModules` undefined) and then request hangs.
- **Fix**:
  - Moved Chart.js/react-chartjs-2 code into `src/components/report/ReportCharts.tsx`.
  - `LearningReport.tsx` now loads `ReportCharts` through `next/dynamic` with `ssr: false` and a lightweight loading skeleton.
  - Added `src/components/report/ReportCharts.test.tsx`.
- **Verification**:
  - `/report` HTTP 200.
  - `/_next/static/chunks/main-app.js` HTTP 200.
  - Unauthenticated `/api/user/stats` HTTP 401, no timeout.
  - In-app browser new tab renders the report DOM.
  - `npx tsc --noEmit --incremental false` passed.
  - `npm run lint` passed.
  - `npm test -- --runInBand` passed: 29 suites / 85 tests.
  - `npm run build` passed; `/report` initial route size is 8.86 kB.
- **Next best action**: TICKET-706 global button micro-interaction.

### 2026-05-12 · TICKET-706
- **Goal**: Standardize button micro-interactions in the shared `Button` primitive.
- **Completed**:
  - Moved scale feedback into `src/components/ui/Button.tsx` so motion is controlled centrally instead of per-callsite.
  - Regular buttons now use `hover:scale-[1.04]` + `active:scale-[0.96]`.
  - Icon buttons now use `hover:scale-[1.08]` + `active:scale-[0.92]`.
  - Disabled and loading states stay static and do not receive motion classes.
  - Added assertions in `src/components/ui/ui.test.tsx` to lock these rules.
- **Verification**:
  - `npm test -- src/components/ui/ui.test.tsx --runInBand` passed.
  - `npx tsc --noEmit --incremental false` passed.
  - `npm run lint` passed.
  - `npm test -- --runInBand` passed: 29 suites / 85 tests.
  - `npm run build` passed.
- **Next best action**: PF-01 AudioWaveform rAF leak fix, then PF-02 chat mouse-move render optimization.
