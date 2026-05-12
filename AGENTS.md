# LinguaAI · Codex（开发）工作规范

## 开工流程（每次会话必读）

1. 读 `progress/status.md` — 找到状态为 `待开发` 且没有其他 agent 占用的任务
2. 读 `tasks/backlog.md` — 了解任务详情和验收标准
3. 读 `session-handoff.md` — 了解禁止动的区域和已知风险
4. 将你要做的任务状态改为 `开发中`（在 `progress/status.md` 中更新），防止抢任务
5. **一次只做一个任务**

详细开发规范见 `agents/developer.md`。

---

## 完成定义

标记 `passing` 前必须全部通过：

- [ ] 功能行为符合 `tasks/backlog.md` 中该任务的验收标准
- [ ] `npx tsc --noEmit --incremental false` 无报错
- [ ] `npm run lint` 无报错
- [ ] `npm test -- --runInBand` 全部通过（记录 suites 和 tests 数量）
- [ ] `npm run build` 成功
- [ ] 更新 `feature_list.json`（status + evidence，evidence 必须有日期和命令输出）
- [ ] 更新 `progress/status.md`（任务状态改为 `待测试` 或 `完成`）
- [ ] 更新 `session-handoff.md`（本轮改动、验证证据、不要动的区域）

---

## 项目基本信息

- **框架**：Next.js 14 + TypeScript + Tailwind CSS + Framer Motion
- **数据库**：Prisma + PostgreSQL
- **根目录**：`C:\Users\wang\Documents\talks`
- **启动**：`.\start-dev.ps1 3000`（备用：`npm run dev -- -p 3000`）
- **测试**：`npm test -- --runInBand`
- **构建**：`npm run build`
