# LinguaAI · 性能优化 Sprint

PM: Claude1
Assignee: Codex1
Date: 2026-05-12
背景: 用户反馈界面卡顿，经 PM 代码审查定位出三类根本原因。

---

## 问题诊断

### P0 · AudioWaveform rAF 泄漏

**位置**：`src/components/chat/AudioWaveform.tsx`

```
每条 AI 消息底部都挂载一个 AudioWaveform。
useEffect 里的 requestAnimationFrame 循环无论 isPlaying 是 true 还是 false 都一直在跑。
聊天记录里有 10 条 AI 消息 = 10 个 rAF 循环同时画 Canvas。
每帧 ~16ms，10 个循环就占满了整帧。
```

### P0 · 鼠标移动触发整页 React 重渲

**位置**：`src/components/chat/ChatWorkspace.tsx:377–383` + `:679`

```
onMouseMove={handleAtmosphereMove} 绑在聊天区域根 div 上。
handleAtmosphereMove 每次调用 setAtmosphere({x, y})。
这是 React setState → 整个 ChatWorkspace 重渲 → 所有子组件（包括全部消息气泡）重渲。
鼠标移动时约 60fps，意味着每秒 60 次全量重渲。
```

**同类问题**：`src/components/characters/CharacterSelection.tsx:39`
`setTiltByCharacter` 在 `onPointerMove` 里，角色选择页同样的模式。

### P1 · SSE 流式回复逐字触发 setState

**位置**：`src/components/chat/ChatWorkspace.tsx:277`

```
SSE 每个 delta 片段都调用 updateCharacterSession → setSessions。
快速流式时约 10-20 次/秒 setState。
每次 setState 触发 ChatWorkspace 重渲 + 所有消息的 ReactMarkdown 重解析。
同时 MessageBubble 的 overflows 检测（scrollHeight）也在每次内容变更时触发。
```

---

## TICKET-PF01 · 修复 AudioWaveform 静止时持续运行 rAF【P0】

**目标**：`isPlaying=false` 时不运行动画循环，仅画一次静止波形。

**改法**：

```tsx
// AudioWaveform.tsx
useEffect(() => {
  const canvas = canvasRef.current;
  const context = canvas?.getContext("2d");
  if (!canvas || !context) return;

  // 静止态：画一次就够了，不需要 rAF 循环
  if (!isPlaying) {
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.strokeStyle = "rgba(148, 163, 184, 0.45)";
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(0, canvas.height / 2);
    context.lineTo(canvas.width, canvas.height / 2);
    context.stroke();
    return; // 不启动 rAF
  }

  // 播放态：才启动 rAF 循环（原有逻辑不变）
  let frame = 0;
  let animationFrame = 0;
  function draw() { /* ... 原有逻辑 ... */ }
  draw();
  return () => cancelAnimationFrame(animationFrame);
}, [isPlaying]);
```

**预期效果**：从 N 个并发 rAF 降到最多 1 个（正在播放时）。

**验收标准**：
- [ ] 静止状态的 AudioWaveform 不再在 Chrome DevTools Performance 面板产生持续 Canvas 绘制记录
- [ ] 播放时波形动画正常
- [ ] 现有测试全部通过

---

## TICKET-PF02 · 修复鼠标移动触发 ChatWorkspace 重渲【P0】

**目标**：鼠标移动时只更新 CSS 变量，不触发 React 重渲染。

**改法**：把 `atmosphere` state 改成 ref + 直接操作 DOM style：

```tsx
// ChatWorkspace.tsx
// 删掉：const [atmosphere, setAtmosphere] = useState({ x: 48, y: 38 });
const atmosphereRef = useRef<HTMLDivElement>(null); // 绑在 atmosphere div 上

function handleAtmosphereMove(event: MouseEvent<HTMLDivElement>) {
  if (!atmosphereRef.current) return;
  const rect = event.currentTarget.getBoundingClientRect();
  const x = Math.round(((event.clientX - rect.left) / rect.width) * 100);
  const y = Math.round(((event.clientY - rect.top) / rect.height) * 100);
  // 直接写 DOM，绕开 React 渲染
  atmosphereRef.current.style.setProperty("--chat-glow-x", `${x}%`);
  atmosphereRef.current.style.setProperty("--chat-glow-y", `${y}%`);
}

// atmosphere div 上：删掉 style={{ "--chat-glow-x": ..., "--chat-glow-y": ... }}
// 改为：ref={atmosphereRef}，初始值用内联 style 或 className 设默认值
```

**同步处理** `CharacterSelection.tsx`：
`setTiltByCharacter` 改为 ref + 直接写 `element.style.transform`，避免角色选择页每次 pointer move 都触发 setState。

**预期效果**：鼠标移动时 React DevTools Profiler 的重渲次数从 60/s 降到 0/s。

**验收标准**：
- [ ] 鼠标在聊天区移动时，React DevTools Profiler 无 ChatWorkspace re-render
- [ ] atmosphere 光晕效果视觉上不变
- [ ] 角色选择页 3D tilt 效果视觉上不变
- [ ] 现有测试全部通过

---

## TICKET-PF03 · 批量 SSE delta 更新，减少流式重渲频率【P1】

**目标**：SSE 流式期间每帧最多触发一次 setState，而不是每个 chunk 触发一次。

**改法**：用 ref 累积 delta，用 rAF 批量提交：

```tsx
// ChatWorkspace.tsx - sendMessage 函数内的 delta 处理部分
const pendingDeltaRef = useRef("");
const rafRef = useRef<number>(0);

// 在 delta 事件处：
const delta = "text" in eventPayload.data ? String(eventPayload.data.text) : "";
pendingDeltaRef.current += delta;

if (!rafRef.current) {
  rafRef.current = requestAnimationFrame(() => {
    const accumulated = pendingDeltaRef.current;
    pendingDeltaRef.current = "";
    rafRef.current = 0;
    if (accumulated) {
      updateCharacterSession(characterId, (session) => ({
        ...session,
        messages: session.messages.map((msg) =>
          msg.id === assistantMessage.id
            ? { ...msg, content: msg.content + accumulated }
            : msg
        )
      }));
    }
  });
}
```

**额外优化**：`MessageBubble` 的 `overflows` 检测加 `isStreaming` 守卫：
```tsx
useEffect(() => {
  if (isUser || isStreaming || !contentRef.current) { // 流式中不检测
    setOverflows(false);
    setExpanded(false);
    return;
  }
  setOverflows(contentRef.current.scrollHeight > MAX_ASSISTANT_CONTENT_HEIGHT);
  setExpanded(false);
}, [isUser, isStreaming, message.content]);
```

**预期效果**：流式期间 setState 从 ~15次/秒 降到 ~60fps（16ms 合并一次）。

**验收标准**：
- [ ] 流式回复时消息仍实时显示，视觉上感受不到延迟
- [ ] ReactMarkdown 不在 DevTools 里产生每帧重解析
- [ ] `Show more / Show less` 展开折叠功能流式结束后仍正常工作
- [ ] 现有测试全部通过

---

## 实施顺序

```
PF01（30min）→ PF02（45min）→ PF03（60min）
先做无依赖的最小改动，每个 ticket 独立可验证
```

## 不要动

- TTS / Fish Audio 调用链
- SSE `done` 事件处理（sessionId / learningFeedback）
- Starfield（Three.js，仅在登录页，不影响聊天卡顿）
- FluidBackground blur 参数（已优化）
- 消息气泡的视觉样式

## 预期收益

| 场景 | 修复前 | 修复后（预估） |
|------|--------|----------------|
| 鼠标在聊天区移动 | 60 次/秒全量重渲 | 0 次重渲 |
| 10 条 AI 消息 + 静止 | 10 个 rAF 循环 | 0 个 rAF 循环 |
| AI 流式回复中 | ~15 次/秒 setState | ~60fps 合并 |
