# LinguaAI · Claude Code 工作规范

## 开工流程（每次会话必读）

1. 读 `claude-progress.md` — 了解当前进展和最高优先级任务
2. 读 `feature_list.json` — 确认功能状态，找到 `in_progress` 或下一个 `not_started`
3. 跑 `.\start-dev.ps1 3000` 确认服务可以启动（会先清理 3000 端口占用）
4. **一次只做一个功能**，不要同时推进多个 ticket

## 工作规则

- 修改代码前，先读懂相关文件的现有实现
- 不要删除没有理解的代码
- TypeScript 严格模式，不允许 `any`，不允许忽略 lint 错误
- 样式优先用 Tailwind utility class，复杂动效用 Framer Motion
- 不要自行决定"顺手"修改范围外的东西——范围外的问题开 ticket

## 完成定义（这是最关键的部分）

一个功能只有满足以下全部条件才能标记为 `passing`：

- [ ] 功能行为符合 ticket 验收标准的每一条
- [ ] `npx tsc --noEmit --incremental false` 无报错
- [ ] `npm run lint` 无报错
- [ ] `npm test -- --runInBand` 全部通过
- [ ] `npm run build` 成功
- [ ] 在浏览器中人工验证了核心路径
- [ ] 更新了 `feature_list.json` 中该功能的 status 和 evidence
- [ ] 更新了 `claude-progress.md`

## 收尾检查

关闭会话前确认：
- 没有半成品代码留在仓库里
- `claude-progress.md` 的"下一步最佳动作"已更新
- `feature_list.json` 的状态真实反映了验证结果（没有假 passing）

## 项目基本信息

- **框架**：Next.js 14 + TypeScript + Tailwind CSS + Framer Motion
- **数据库**：Prisma + PostgreSQL
- **AI**：OpenAI-compatible Chat Completions API（当前 Base URL / 模型名走环境变量配置）SSE 流式
- **语音**：Fish Audio TTS/ASR
- **根目录**：`C:\Users\wang\Documents\talks`
- **启动**：`.\start-dev.ps1 3000`（先清理端口再启动；备用：`npm run dev -- -p 3000`）
- **测试**：`npm test -- --runInBand`
- **E2E**：`npm run test:e2e`
- **构建**：`npm run build`
