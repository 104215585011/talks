# LinguaAI · 收尾检查清单

> 关闭会话前逐项过一遍。全部通过才算干净收尾。
> agent 的收尾流程也应包含这些检查。

---

## 启动与验证

- [ ] `.\start-dev.ps1 3000` 能正常启动，localhost:3000 可访问
- [ ] `npm test -- --runInBand` 全部通过（记录 suites 和 tests 数量）
- [ ] `npx tsc --noEmit --incremental false` 无报错
- [ ] `npm run lint` 无报错
- [ ] `npm run build` 成功

## 进度文档

- [ ] `feature_list.json` 中本轮改动的功能 status 已更新，evidence 字段填写了真实验证记录（不是空的）
- [ ] `feature_list.json` 中没有假 passing——每个 passing 都有对应的 evidence
- [ ] `claude-progress.md` 当天会话记录已填写：目标、已完成、运行过的验证、下一步动作
- [ ] `session-handoff.md` 已更新：当前验证状态、本轮改动、已知问题、下一步动作

## 代码状态

- [ ] 没有注释掉的调试代码（`console.log`、临时断点）残留在非测试文件中
- [ ] 没有半成品代码——功能要么完整可用，要么完全回滚
- [ ] 没有硬编码的本地路径或临时凭证提交到代码里
- [ ] `.env.local` 未被 git 追踪（`git status` 里不出现它）

## 交接准备

- [ ] 下一轮 agent 只靠 `session-handoff.md` + `claude-progress.md` + `feature_list.json` 就能了解现状，不需要额外口头说明
- [ ] `docs/sprint-7-tickets.md` 中，本轮涉及的 ticket 验收标准已核对，状态一致
- [ ] 如果有新开的 ticket，已写入 `docs/sprint-7-tickets.md` 并在 `feature_list.json` 中有对应条目

## 快速决策

**如果有一项未通过：**
- 测试失败 → 修复后再收尾，不允许带着红测试关会话
- 文档未更新 → 补填，5 分钟内能完成的事不留到下轮
- 半成品代码 → 要么完成，要么 revert，记录到 session-handoff.md 的"仍损坏"区

**允许留到下轮的：**
- not_started 的功能（正常待办）
- E2E 未跑（标注在 session-handoff.md 中即可）
- 已知的低优先级 bug（在 feature_list.json 中有记录）
