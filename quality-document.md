# LinguaAI · 质量快照

> 记录代码库各领域的当前健康度。会话结束后更新，用于跟踪项目是在变强还是变弱。
> 与 `evaluator-rubric.md` 的区别：rubric 评单次 agent 输出，quality-document 评代码库本身。

---

## 快照：2026-05-12

### 产品领域评级

| 领域 | 验证状态 | Agent 可读性 | 测试稳定性 | 关键缺口 | 综合 |
|------|----------|--------------|------------|----------|------|
| 认证（登录/注册） | ✅ 已验证 | 🟡 中（AuthForm 较大） | ✅ 稳定 | - | **B+** |
| 角色选择 | ✅ 已验证 | ✅ 清晰 | ✅ 稳定 | - | **A** |
| 聊天核心 | ✅ 已验证 | 🟡 中（ChatWorkspace.tsx 过大） | ✅ 83 tests passing | 单文件职责过多 | **B** |
| TTS 语音合成 | ✅ 已验证（人工） | ✅ 清晰 | 🟡 仅 fallback 有单测 | Fish Audio 错误路径缺测试 | **B** |
| ASR 语音识别 | 🔲 未本轮验证 | ✅ 清晰 | 🟡 仅 fallback 有单测 | 真实 Fish Audio ASR 未端到端测试 | **C+** |
| 学习笔记 | ✅ 已验证 | 🟡 中 | ✅ 稳定 | - | **B+** |
| 报告页 | 🔲 视觉升级未做 | 🟡 中 | ✅ 有测试 | TICKET-705 未完成 | **C+** |
| PWA | ✅ 已验证 | ✅ 清晰 | ✅ E2E 覆盖 | - | **A-** |
| 视觉系统（FluidBackground等） | ✅ 已验证 | ✅ 清晰 | ✅ 单测覆盖 | 性能监控无自动化 | **A-** |

---

### 架构层评级

| 层 | 边界执行 | Agent 可读性 | 备注 |
|----|----------|--------------|------|
| API Routes (`src/app/api/`) | ✅ 统一 auth + rate limit | ✅ 清晰 | 结构一致，易理解 |
| 服务层 (`src/lib/`) | ✅ 职责单一 | ✅ 清晰 | speech-service / chat-service 边界清晰 |
| 组件层 (`src/components/`) | 🟡 ChatWorkspace 过大 | 🟡 中 | ChatWorkspace.tsx 约 900 行，需要拆分 |
| UI 原语 (`src/components/ui/`) | ✅ 边界清晰 | ✅ 清晰 | Button/FluidBackground/MessageBubble 独立 |
| 数据层 (Prisma) | ✅ 类型安全 | ✅ 清晰 | schema 与 migration 对齐 |
| 测试覆盖 | 🟡 集成测试为主 | — | 缺少 Fish Audio 真实 API mock 测试 |

---

### 已知技术债

| 项目 | 严重度 | 说明 |
|------|--------|------|
| `ChatWorkspace.tsx` 过大 | 🟡 中 | 约 900 行，混合了状态管理、音频播放、录音、流式渲染。建议按职责拆分 hooks |
| Fish Audio 错误路径无测试 | 🟡 中 | `speech-service.ts` 的 Fish Audio 调用失败分支只靠 fallback 兜底，没有单测 |
| ASR 端到端未验证 | 🟡 中 | 语音输入功能本地可用，但 Fish Audio ASR 真实路径未在 CI 中覆盖 |
| E2E 未本轮跑 | 🟡 低 | 7 个 Playwright tests 历史 passing，但本轮未重跑确认 |
| `evaluator-rubric.md` 校准不足 | 🟡 低 | 只有 1 轮校准记录，需要 3-5 轮才能可信 |

---

### 历史趋势

| 日期 | 事件 | 质量变化 |
|------|------|----------|
| 2026-05-08 | M3 Beta 完成 | 核心功能全覆盖，基础质量稳定 |
| 2026-05-09 | Sprint 7 开始，视觉升级 | 新增 FluidBackground 组件，架构清晰度提升 |
| 2026-05-11 | Sprint 7 701-704/710/711 完成 | 视觉系统健全，ChatWorkspace 行数增加（↓） |
| 2026-05-12 | TTS 修复（TICKET-712） | Fish Audio 错误处理改善，聊天区域可观察性提升 |
| 2026-05-12 | 项目管理 harness 完善 | session-handoff / rubric / quality-doc 建立，交接能力大幅提升 |

---

## 如何使用本文件判断 harness 是否可简化

每个 harness 组件都基于"模型做不到这件事"的假设。要验证某个组件是否多余：

1. 拍一份本文件快照（截图或 git commit）
2. 移除该 harness 组件（如某个 hook 或检查规则）
3. 跑一轮正常的 feature 开发
4. 更新本文件，对比各领域评级
5. 评级没降 → 该组件是多余的，可以移除
6. 评级下降 → 恢复，并在"历史趋势"里记录此次实验

---

## 下次更新应关注

- [ ] TICKET-705 完成后：更新报告页领域评级
- [ ] TICKET-706 完成后：更新 UI 原语层评级
- [ ] 下次跑 E2E 后：更新 E2E 测试覆盖状态
- [ ] ChatWorkspace 拆分后：更新组件层评级

---

## Quality Update · 2026-05-12 · TICKET-705

Report page visual quality moved from unfinished/C+ baseline to a verified B+/A- implementation baseline:
- Data cards now use dark glass surfaces with subtle blur and elevated shadow.
- Four core metrics have distinct top accent lines for scanability.
- Metric values animate from 0 to the fetched value via Framer Motion.
- Low-intensity FluidBackground is present behind the report surface.

Evidence:
- Added component test coverage for the TICKET-705 visual contract.
- Full verification passed: typecheck, lint, 28 Jest suites / 84 tests, production build.

Residual risk:
- Local Playwright navigation to localhost timed out in this Codex session, so visual screenshot evidence should be refreshed by Codex2 or PM in a browser pass.
