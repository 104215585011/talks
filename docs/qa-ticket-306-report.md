# TICKET-306 上线前质量报告

- 项目：LinguaAI
- Sprint：Sprint 3
- Ticket：TICKET-306 整体回归测试 + 上线前检查
- QA 角色：Codex2
- 执行日期：2026-05-08
- 仓库路径：`C:\Users\wang\Documents\talks`
- 验收 commit：`77a207b Add prelaunch security checks`
- 测试环境：Windows PowerShell，本地 Docker PostgreSQL `linguaai-postgres` healthy，本地 `.env.local` 已配置模型、Fish Audio、JWT、DATABASE_URL

## 最终裁决

不通过。当前代码不能进入 Beta/上线前冻结。

虽然全量单元测试、类型检查、lint、生产 build 和 Playwright E2E 均通过，但 production server (`next start`) 下多个 API 路由稳定返回 500，影响角色、聊天、语音和报告页核心链路。该问题属于 P0 阻塞。

## 执行命令与结果

| 检查项 | 命令 | 结果 | 备注 |
| --- | --- | --- | --- |
| 单元测试 + 覆盖率 | `npm test -- --runInBand` | 通过 | 21 suites / 57 tests 全部通过；Statements 90.58%，Lines 90.36% |
| TypeScript | `npx tsc --noEmit --incremental false` | 通过 | exit 0 |
| Lint | `npm run lint` | 通过 | `eslint . --max-warnings=0` exit 0 |
| Production build | `npm run build` | 通过 | Next.js 14.2.28 build 成功 |
| E2E | `npm run test:e2e` | 通过 | Chromium 3/3 通过 |
| Docker/Postgres | `docker ps` | 通过 | `linguaai-postgres` healthy |
| Production smoke | `next start` on port 3008 | 失败 | 多个 API/页面 runtime 500 |

## P0 回归结果

通过项：

- Jest 全量回归通过。
- TypeScript 严格检查通过。
- ESLint 通过。
- Next production build 通过。
- Playwright 核心路径通过：未登录重定向、表单校验、注册登录、角色选择、流式学习反馈。

失败项：

- `GET /api/characters` 在 `next start` 下返回 500。
- `GET /api/characters/emma` 在 `next start` 下返回 500。
- `POST /api/chat/message` 无 JWT 和无效 JWT 均返回 500，预期应为 401。
- `POST /api/speech/synthesize` 全部用例返回 500。
- `POST /api/speech/recognize` 全部用例返回 500。
- `GET /report` 在 `next start` 下返回 500。

定位证据：

- production route bundle 依赖 chunk `948`。
- `.next/server/webpack-runtime.js` 运行时按 `require("./" + chunkId + ".js")` 查找 `./948.js`。
- 实际构建产物存在于 `.next/server/chunks/948.js`。
- 直接执行 `node -e "require('./.next/server/app/api/characters/route.js')"` 报错：`Cannot find module './948.js'`。

该问题解释了为什么 build 和 Jest 可以通过，但 production API runtime 失败。

## 安全检查

| 检查项 | 结果 | 证据/备注 |
| --- | --- | --- |
| 基础安全响应头 | 通过 | `/` 返回 200；`X-Frame-Options=DENY`、`Strict-Transport-Security` 存在、`Content-Security-Policy` 存在、`X-Content-Type-Options=nosniff` |
| JWT 未授权 | 失败 | `POST /api/chat/message` 无 Authorization 返回 500，预期 401 |
| JWT 无效 token | 失败 | `POST /api/chat/message` with `Bearer invalid.jwt.token` 返回 500，预期 401 |
| 限流 429 | 通过 | 连续 25 次登录请求：`422:19`、`429:6` |
| XSS/输入校验 | 条件通过 | 登录接口传入 `<script>alert(1)</script>` 邮箱返回 422，说明 Zod schema 生效；未做浏览器端持久化 XSS 扫描 |

## 性能检查

非 AI API：

- `GET /api/characters` 100 并发 / 500 请求复测失败。
- QA 脚本结果：`successes=0`、`failures=500`、`failureRate=1`。
- 因 API runtime 500，不能认可 P95/P99 性能指标。

页面导航 smoke：

| 页面 | 状态 | 本地响应时间 |
| --- | --- | --- |
| `/` | 200 | 118ms |
| `/login` | 200 | 17ms |
| `/register` | 200 | 16ms |
| `/characters` | 200 | 36ms |
| `/chat` | 200 | 48ms |
| `/report` | 500 | 6ms |

Lighthouse：

- 未完成。
- 本机未安装 `lighthouse`，`node_modules/.bin/lighthouse.cmd` 不存在。
- 可复测命令：安装 Lighthouse 后运行 `lighthouse http://127.0.0.1:3008 --only-categories=performance,accessibility,best-practices,seo`。

k6：

- 未完成。
- 本机未发现 `k6` 命令。
- 当前 `GET /api/characters` 已 100% 失败，不具备压测放行意义。

## TICKET-305 遗留风险复核

复测命令：

```powershell
$env:QA_BASE_URL='http://127.0.0.1:3008'
node scripts\qa-ticket-305.mjs
```

结果：

- TTS streaming firstByte 不能判定通过。所有 `/api/speech/synthesize` 用例返回 500，`speechProvider=null`，返回体为 `Internal Server Error`。
- 真实语音 ASR 不能判定通过。所有 `/api/speech/recognize` 用例返回 500，`speechProvider=null`，返回体为 `Internal Server Error`。
- `/api/characters` 性能基线失败：500/500 failures。

结论：

- RISK-01 TTS 延迟：重新打开，原因是当前 production 语音接口不可用。
- RISK-02 ASR 准确率：重新打开，原因是当前 production ASR 接口不可用，无法跑真实样本。

## Bug 清单

### P0-306-01 Production API routes return 500 due missing chunk resolution

- 严重级别：P0 Blocker
- 影响范围：`/api/characters`、`/api/characters/:id`、`/api/chat/message`、`/api/speech/synthesize`、`/api/speech/recognize`，以及 `/report`
- 复现环境：`npm run build` 后 `next start`，port 3008
- 复现步骤：
  1. `npm run build`
  2. `PORT=3008 npm start`
  3. 请求 `GET http://127.0.0.1:3008/api/characters`
- 实际结果：500 `Internal Server Error`
- 期望结果：200 角色列表
- 技术证据：compiled route 依赖 chunk `948`，runtime 查找 `.next/server/948.js`，实际产物在 `.next/server/chunks/948.js`
- 上线影响：核心 API 不可用，语音和聊天无法验收；TICKET-306 不可放行

### P0-306-02 Auth failure path masked by production 500

- 严重级别：P0 Blocker
- 影响范围：`POST /api/chat/message`
- 实际结果：无 JWT / 无效 JWT 均返回 500
- 期望结果：401
- 上线影响：安全验收失败，客户端无法获得正确鉴权错误

### P1-306-03 Lighthouse and k6 tooling unavailable in local QA environment

- 严重级别：P1
- 影响范围：性能与页面质量正式分数
- 说明：本地未安装 `lighthouse` / `k6`，且当前 API 500 已阻塞性能放行

## 遗留风险

- Production runtime 与测试环境存在差异：Jest/E2E 绿灯不能代表 `next start` API 可用。
- TICKET-305 语音接口在当前 production server 下全量 500，需要修复后重跑。
- Lighthouse 正式分数未生成。
- k6 正式压测未生成。
- `/report` 页面 production 500，学习报告页无法上线验收。

## QA 建议

1. Codex1 先修复 production chunk resolution/API runtime 500。
2. 修复后必须重新执行本报告中的全部命令，尤其是 `next start` 下的 HTTP smoke。
3. 重新跑 `scripts/qa-ticket-305.mjs`，确认 Fish Audio TTS/ASR 在 production server 下恢复。
4. 安装或接入 CI 版 Lighthouse/k6 后补齐正式性能报告。

---

# Retest 记录：commit `9db4a2d`

- Retest 日期：2026-05-08
- QA 角色：Codex2
- Retest commit：`9db4a2d Fix production Next runtime build mode`
- 当前分支：`master`
- 测试原则：只做 QA 验收和报告更新，未修改业务代码。

## Retest 最终裁决

条件通过，可进入 Beta。

原 P0 production runtime 问题已修复；`next start` 下此前 500 的核心 API 与 `/report` 已恢复，JWT 未授权/无效 token 也恢复为 401。全量单元测试、类型检查、lint、build、E2E 均通过。

剩余风险不阻断 Beta，但正式上线前仍需补齐：

- Lighthouse CLI 本机不可用，正式 Lighthouse 分数未生成。
- k6 本机不可用；本次使用内置 QA 脚本完成 `/api/characters` 100 并发 / 500 请求替代验证。
- ASR 已通过一条 TTS 生成的真实语音样本，但仍建议补充人工录制、多语言样本集。
- Playwright E2E 后 `.next/BUILD_ID` 会消失；production smoke 或语音 QA 脚本必须在 E2E 后重新执行 `npm run build`。

## Retest 执行命令与结果

| 检查项 | 命令 | 结果 | 备注 |
| --- | --- | --- | --- |
| 当前 commit | `git log -1 --oneline` | 通过 | `9db4a2d Fix production Next runtime build mode` |
| 清理旧进程和构建缓存 | Stop ports 3008/3009/3010 + remove `.next` | 通过 | `.next` 清理后为 `False` |
| 干净生产构建 | `npm run build` | 通过 | `node scripts/next-build.mjs`；`.next/BUILD_ID` 存在 |
| 单元测试 + 覆盖率 | `npm test -- --runInBand` | 通过 | 21 suites / 57 tests 全部通过；Statements 90.58%，Lines 90.36% |
| TypeScript | `npx tsc --noEmit --incremental false` | 通过 | exit 0 |
| Lint | `npm run lint` | 通过 | `eslint . --max-warnings=0` exit 0 |
| Production build | `npm run build` | 通过 | Next.js 14.2.28 build 成功 |
| E2E | `npm run test:e2e` | 通过 | Chromium 3/3 通过 |
| TICKET-305 QA script | `QA_BASE_URL=http://127.0.0.1:3010 node scripts\qa-ticket-305.mjs` | 通过 | TTS/ASR/API perf 恢复 |

## 原 P0 复测

| 原问题 | Retest 结果 | 证据 |
| --- | --- | --- |
| `GET /api/characters` production 500 | 通过 | 200，88ms，7132 bytes |
| `GET /api/characters/emma` production 500 | 通过 | 200，16ms，1406 bytes |
| `GET /report` production 500 | 通过 | 200，46ms，5010 bytes |
| `POST /api/chat/message` 无 JWT 返回 500 | 通过 | 401 Unauthorized |
| `POST /api/chat/message` 无效 JWT 返回 500 | 通过 | 401 Unauthorized |
| `POST /api/speech/synthesize` production 500 | 通过 | 5 角色均 200，provider=`fish-audio` |
| `POST /api/speech/recognize` production 500 | 通过 | 5 语言均 200，provider=`fish-audio` |

## 安全 Retest

| 检查项 | 结果 | 证据 |
| --- | --- | --- |
| 基础安全响应头 | 通过 | `/` 返回 `X-Frame-Options=DENY`，HSTS 存在，CSP 存在，`X-Content-Type-Options=nosniff` |
| JWT 未授权 | 通过 | `/api/chat/message` 无 Authorization 返回 401 |
| JWT 无效 token | 通过 | `/api/chat/message` with `Bearer invalid.jwt.token` 返回 401 |
| 输入校验 / XSS 基础检查 | 通过 | 登录邮箱传入 `<script>alert(1)</script>` 返回 422 |
| 限流 | 通过 | 连续 25 次登录请求：`422:19`、`429:6` |

## 性能 Retest

`scripts/qa-ticket-305.mjs` 内置 `/api/characters` 并发检查结果：

| 指标 | 结果 |
| --- | --- |
| endpoint | `GET /api/characters` |
| concurrency | 100 |
| total | 500 |
| successes | 500 |
| failures | 0 |
| failureRate | 0 |
| p50 | 51ms |
| p95 | 99ms |
| p99 | 104ms |

页面/API smoke：

| 路径 | 状态 | 耗时 |
| --- | --- | --- |
| `/api/characters` | 200 | 88ms |
| `/api/characters/emma` | 200 | 16ms |
| `/report` | 200 | 46ms |

Lighthouse：

- 未完成。
- `lighthouse` 命令不可用，`node_modules/.bin/lighthouse.cmd` 不存在。
- 正式上线前仍需在 CI 或装有 Lighthouse 的本地环境补测。

k6：

- 未完成。
- `k6` 命令不可用。
- 本次由 QA 脚本完成 100 并发 / 500 请求替代检查，不能等同于正式 k6 报告。

## TICKET-305 风险复核

TTS streaming firstByte：

| 角色 | status | provider | firstByte | total |
| --- | --- | --- | --- | --- |
| Emma | 200 | fish-audio | 1698ms | 2522ms |
| Jake | 200 | fish-audio | 755ms | 1911ms |
| Sophie | 200 | fish-audio | 1198ms | 2019ms |
| Kenji | 200 | fish-audio | 779ms | 2099ms |
| Carlos | 200 | fish-audio | 773ms | 1669ms |

结论：5 个角色 streaming firstByte 均 < 2s，RISK-01 可关闭；total duration 仍有部分超过 2s，但当前实现以 streaming firstByte 作为用户感知延迟指标。

ASR：

- 静音 WAV 链路：5 语言均 200，provider=`fish-audio`。
- 真实语音样本：通过。
- 样本方式：调用 `/api/speech/synthesize` 生成英文语音，再将音频 base64 提交 `/api/speech/recognize`。
- 结果：TTS 200，provider=`fish-audio`，音频 75231 bytes；ASR 200，transcript=`Hello. This is a real speech recognition test.`

结论：RISK-02 可降级为数据集覆盖风险；Beta 不阻塞，正式上线前建议补人工录制样本。

## Retest Bug 清单

P0：无。

P1：无新的阻塞问题。

剩余风险：

| ID | 级别 | 内容 | 建议 |
| --- | --- | --- | --- |
| RISK-306-01 | P2 | Lighthouse 未生成正式分数 | CI 增加 Lighthouse 或本地安装后补测 |
| RISK-306-02 | P2 | k6 不可用，缺正式压测报告 | 安装 k6 后补跑 100 并发非 AI 接口 |
| RISK-306-03 | P2 | ASR 样本集不足 | 增加人工录制、多语言、多口音样本 |
| RISK-306-04 | P2 | E2E 后 `.next/BUILD_ID` 会消失 | QA 流程中规定 production smoke 前必须重新 build |

## Retest 结论

TICKET-306 Retest 通过。当前可放行 Beta。

正式上线前建议补齐 Lighthouse/k6 工具链报告，并扩展 ASR 真实样本集；这些是上线质量增强项，不再阻塞当前 Beta。
