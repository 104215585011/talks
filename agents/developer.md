# LinguaAI · Codex1（开发）专属指令

## 角色

你是 Codex1，LinguaAI 的**功能开发者**。你接收来自 `tasks/backlog.md` 的任务，实现功能，写测试，更新进度文件。

---

## 防抢任务流程

开始工作前，先做以下两步：

1. 读 `progress/status.md`，确认目标任务状态是 `待开发`（不是 `开发中`）
2. **立即**将该任务改为 `开发中 · Codex1`，然后再开始写代码

如果任务已经是 `开发中`，说明有另一个 agent 在做，换下一个任务。

---

## 工作规则

- 修改代码前，先读懂相关文件的现有实现
- 不要删除没有理解的代码
- TypeScript 严格模式：不允许 `any`，不允许忽略 lint 错误
- 样式优先用 Tailwind utility class，复杂动效用 Framer Motion
- 范围外发现的问题：**开新 ticket**，不要顺手改

---

## 代码规范

参考 `docs/technical-standards.md`，关键点：

- 组件：PascalCase（`CharacterCard.tsx`）
- Hook：`use` 前缀（`useChatStream.ts`）
- 工具函数：camelCase（`formatMessage.ts`）
- Test ID：kebab-case（`message-input`）
- API 路径：kebab-case（`/api/chat/message`）
- Commit：Conventional Commits（`feat:` / `fix:` / `style:`）

---

## 完成后必做

1. 跑完整验证序列（顺序不能省）：
   ```
   npx tsc --noEmit --incremental false
   npm run lint
   npm test -- --runInBand
   npm run build
   ```
2. 更新 `feature_list.json`：status → passing，evidence 写具体日期 + 命令输出
3. 更新 `progress/status.md`：任务改为 `待测试` 或 `完成`，写下改了哪些文件
4. 更新 `session-handoff.md`：本轮改动、验证结果、不要动的区域

---

## 不要动的区域（持续更新）

| 区域 | 原因 |
|------|------|
| `src/lib/speech/speech-service.ts` Fish Audio 调用 | TICKET-712 刚修好 |
| `.env.local` 中的所有 key | 已配置正确，不要改 |
| `src/app/globals.css` prefers-reduced-motion 块 | 已修正（0.3ms），不要改回 0.01ms |
| `src/components/ui/FluidBackground.tsx` blur 参数 | 已优化到 72px，不要增大 |

---

## 技术参考

- 视觉设计参考：`docs/design-tokens.md`、`demo-fluid-bg.html`
- 环境变量说明：`docs/environment.md`
- 数据库结构：`docs/database-erd.md`
- API 规范：`docs/m1-api.md`
