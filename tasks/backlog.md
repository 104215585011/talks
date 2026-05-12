# LinguaAI · 任务 Backlog

> PM（Claude1）写任务，Codex1/Claude2 来读。
> 任务状态流转：`待开发` → `开发中` → `待测试` → `完成`

---

## 活跃任务

### TICKET-PF01 · 修复 AudioWaveform 静止时持续运行 rAF【P0】
**状态**：`完成`
**指派**：Codex1
**顺序**：第 1 个做（独立，不与其他 ticket 冲突）

`isPlaying=false` 时改为只画一次静止波形，不启动 rAF 循环。
**文件**：`src/components/chat/AudioWaveform.tsx`
**详细规格**：`docs/perf-sprint-tickets.md TICKET-PF01`

---

### TICKET-PF02 · 修复鼠标移动触发 ChatWorkspace 重渲【P0】
**状态**：`待开发`
**指派**：Codex1
**顺序**：第 2 个做（PF01 完成后开始）

`atmosphere` state 改为 ref + 直接写 CSS 变量，`CharacterSelection` tilt 同步处理。
**文件**：`src/components/chat/ChatWorkspace.tsx`、`src/components/characters/CharacterSelection.tsx`
**详细规格**：`docs/perf-sprint-tickets.md TICKET-PF02`

---

### TICKET-PF03 · 批量 SSE delta 更新【P1】
**状态**：`待开发`
**指派**：Codex1
**顺序**：第 3 个做（PF02 完成后开始，同文件有冲突）

用 rAF 把每帧的 delta 合并成一次 setState，顺带给 overflows 检测加 isStreaming 守卫。
**文件**：`src/components/chat/ChatWorkspace.tsx`、`src/components/chat/MessageBubble.tsx`
**详细规格**：`docs/perf-sprint-tickets.md TICKET-PF03`

---

### TICKET-706 · 全局按钮微交互 【P2】
**状态**：`完成`
**指派**：Codex1

**目标**：在 `src/components/ui/Button.tsx` 组件层统一所有按钮的 hover/tap 微交互，一次改动全站生效。

**验收标准**：
- [ ] Primary 按钮 hover 时 scale(1.04)，tap 时 scale(0.96)
- [ ] icon-only 按钮（`size="icon"`）hover 时 scale(1.08)，tap 时 scale(0.92)
- [ ] disabled 状态无动画
- [ ] 现有测试全部通过（28 suites / 84 tests）

**技术要点**：
- Button 根元素改为 `motion.button`（Framer Motion）
- 转发所有原 props（`onClick`、`disabled`、`type`）
- disabled 时跳过动画：`whileHover={disabled ? {} : { scale: 1.04 }}`
- 详细规格见 `docs/sprint-7-tickets.md TICKET-706`

**不要动**：
- TTS/Fish Audio 相关代码
- `.env.local`
- `FluidBackground.tsx` 的 blur 参数

---

## 已完成任务（归档）

| Ticket | 标题 | 完成时间 | 负责人 |
|--------|------|----------|--------|
| TICKET-701 | FluidBackground 全局背景组件 | 2026-05-11 | Codex1 |
| TICKET-702 | 登录/注册页深色毛玻璃 | 2026-05-11 | Codex1 |
| TICKET-703 | 角色选择页视觉升级 | 2026-05-11 | Codex1 |
| TICKET-704 | 聊天页视觉升级 | 2026-05-11 | Codex1 |
| TICKET-710 | AI 消息长文折叠 | 2026-05-11 | Codex1 |
| TICKET-711 | 聊天固定窗口 + 滚动锚定 | 2026-05-11 | Codex1 |
| TICKET-712 | TTS 读音功能修复 | 2026-05-12 | Codex1 |
| TICKET-705 | 报告页数据卡片升级 | 2026-05-12 | Codex1 |
| TICKET-706 | 全局按钮微交互 | 2026-05-12 | Codex1 |
| TICKET-PF01 | AudioWaveform rAF 泄漏修复 | 2026-05-12 | Codex1 |
