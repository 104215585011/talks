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

