# Sprint 4 QA 验收报告

Reviewer: Codex2 QA agent  
Date: 2026-05-09  
Workspace: `C:\Users\wang\Documents\talks`

## 执行命令

1. `git status --short`
   - 结果：初始检查工作区状态。
2. `npm test -- src/lib/api/rate-limit.test.ts src/app/api/auth/auth-routes.test.ts --runInBand`
   - 结果：2 suites / 10 tests passed。
3. `npm test -- src/app/api/auth/auth-routes.test.ts src/lib/api/rate-limit.test.ts --runInBand --verbose`
   - 结果：2 suites / 10 tests passed。
   - 覆盖点：
     - `POST /api/auth/login returns 429 after the configured local threshold`
     - `falls back to local buckets when Redis is unavailable`
     - `uses Redis counters when a distributed client is configured`
4. Lighthouse 报告解析
   - 检查 `docs/lighthouse/*.report.json` 与 `*.report.html`。
   - 结果：4 个页面报告均存在，分数全部达标。
5. `npm run audit:k6`
   - 结果：退出码 0，重新生成 `docs/perf/k6-report.txt`。
6. `Get-ChildItem e2e\fixtures\audio -Force`
   - 结果：路径不存在，未发现真实 ASR 音频样本集。
7. `Get-ChildItem docs\qa -Force`
   - 结果：路径不存在，未发现真机 Safari / BrowserStack 手工验收记录。

## 验收结果

| Ticket | 结论 | 证据 |
| --- | --- | --- |
| TICKET-404 分布式限流 | 通过 | 限流相关 Jest 测试 10 个通过，覆盖 429、Redis 正常路径、Redis 异常本地降级 |
| TICKET-401 Lighthouse | 通过 | `docs/lighthouse` 下 4 页面 JSON + HTML 均存在且分数达标 |
| TICKET-402 k6 压测 | 通过 | `npm run audit:k6` 退出码 0，`docs/perf/k6-report.txt` 已刷新 |
| TICKET-403 ASR 样本 | 阻塞 | 缺少 `e2e/fixtures/audio/` 真实 WAV/MP3 样本，缺少 `scripts/qa-asr-accuracy.mjs` |
| TICKET-405 真机 Safari | 阻塞 | 缺少 `docs/qa/mobile-safari-manual.md`，当前环境无 iOS/Android 真机或 BrowserStack/Sauce Labs 凭据 |

## TICKET-404 分布式限流

状态：通过

| 验收项 | 结果 | 证据 |
| --- | --- | --- |
| 重跑限流相关测试 | 通过 | `src/lib/api/rate-limit.test.ts`、`src/app/api/auth/auth-routes.test.ts`，10 tests passed |
| 连续登录触发 429 | 通过 | Jest verbose 输出包含 `POST /api/auth/login returns 429 after the configured local threshold` |
| Redis 异常时降级本地限流不崩溃 | 通过 | Jest verbose 输出包含 `falls back to local buckets when Redis is unavailable` |
| Redis 计数路径存在 | 通过 | Jest verbose 输出包含 `uses Redis counters when a distributed client is configured` |

说明：
- 本轮 QA 通过自动化测试验证了 Redis 正常路径、Redis 异常回退路径、本地阈值 429。
- 未连接真实 Upstash/Vercel KV 实例，当前验收范围为本地自动化回归。

## TICKET-401 Lighthouse

状态：通过

证据路径：
- `docs/lighthouse/home.report.json`
- `docs/lighthouse/home.report.html`
- `docs/lighthouse/login.report.json`
- `docs/lighthouse/login.report.html`
- `docs/lighthouse/characters.report.json`
- `docs/lighthouse/characters.report.html`
- `docs/lighthouse/chat.report.json`
- `docs/lighthouse/chat.report.html`
- `docs/lighthouse/summary.md`

| Page | Performance | Accessibility | Best Practices | SEO | 结果 |
| --- | ---: | ---: | ---: | ---: | --- |
| `/` | 100 | 100 | 96 | 100 | 通过 |
| `/login` | 100 | 100 | 96 | 100 | 通过 |
| `/characters` | 100 | 100 | 96 | 100 | 通过 |
| `/chat` | 100 | 100 | 96 | 100 | 通过 |

阈值要求：
- Performance >= 80
- Accessibility >= 90
- Best Practices >= 90
- SEO >= 90

## TICKET-402 k6 压测

状态：通过

执行命令：
- `npm run audit:k6`

证据路径：
- `docs/perf/k6-report.txt`

本次重新执行结果：
- `GET /api/characters` P95: `93.27ms`
- `GET /api/characters/:id` P95: `9.01ms`
- `POST /api/auth/login` P95: `71.10ms`
- 错误率：`0`

阈值要求：
- 错误率 < 1%
- 3 个接口 P95 < 500ms

结论：全部达标。

## TICKET-403 ASR 样本

状态：阻塞，未执行

阻塞原因：
- `e2e/fixtures/audio/` 不存在。
- 未发现覆盖 `en-US`、`fr-FR`、`ja-JP`、`es-MX` 的真实 WAV/MP3 样本。
- 未发现 `scripts/qa-asr-accuracy.mjs`。

需要补充：
- 至少 5 条真实语音样本，覆盖 en-US、fr-FR、ja-JP、es-MX 各至少 1 条。
- ASR 准确率脚本 `scripts/qa-asr-accuracy.mjs`。
- 关键词命中率 >= 80% 的执行报告。

QA 裁决：不能伪造通过，等待真实音频样本和脚本补齐。

## TICKET-405 真机 Safari

状态：阻塞，未执行

阻塞原因：
- 当前环境无法访问 iOS Safari / Android Chrome 真机。
- 未发现 BrowserStack / Sauce Labs 凭据或可用云真机环境。
- `docs/qa/mobile-safari-manual.md` 不存在。

需要补充：
- 设备型号、OS 版本、浏览器版本。
- 登录、角色选择、文字消息、AI 回复、Learning notes、麦克风权限、Drawer、横向溢出检查记录。
- 截图或录屏证据。

QA 裁决：不能伪造通过，等待真机或云真机环境。

## 最终裁决

Codex1 交付的 `TICKET-401`、`TICKET-402`、`TICKET-404` 通过 Sprint 4 QA。

Codex2 负责的 `TICKET-403`、`TICKET-405` 当前为阻塞状态，不计为通过。需要用户提供真实语音样本，以及 iOS/Android 真机或 BrowserStack/Sauce Labs 环境后继续验收。
