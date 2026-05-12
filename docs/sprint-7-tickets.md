# Sprint 7 · Visual Polish Tickets

PM: Claude1  
Art Director: Claude2  
Assignee: Codex1  
Date: 2026-05-09  
依据: Claude2 全站视觉审查报告（mmguo.dev 学习成果落地）

---

## TICKET-701 · FluidBackground 全局背景组件 【P0】

**背景**  
当前各页面背景风格不统一：登录页是粒子星空、角色页是静态深色、聊天页又是另一种处理。需要建立一个统一的动态背景组件，作为整个产品的视觉基础。

**目标**  
新建 `src/components/ui/FluidBackground.tsx`，封装流体光晕 + 噪声纹理 + 暗角三层背景，供所有页面复用。

**技术规格**

```tsx
// Props 接口
type FluidBackgroundProps = {
  orbs?: Array<{
    color: 'blue' | 'purple' | 'cyan' | 'warning' | 'success';
    intensity?: number; // 0-1，默认 0.65
  }>;
  noise?: boolean;    // 默认 true
  vignette?: boolean; // 默认 true
  className?: string;
};
```

光晕颜色映射（使用 oklch）：
- `blue`   → `oklch(0.60 0.18 256)`
- `purple` → `oklch(0.55 0.22 300)`
- `cyan`   → `oklch(0.72 0.18 195)`
- `warning`→ `oklch(0.78 0.18 75)`
- `success`→ `oklch(0.75 0.18 155)`

动画参数：
- 三个光球速度互质：28s / 38s / 44s
- easing: `cubic-bezier(0.45, 0.05, 0.55, 0.95)`
- `filter: blur(130px) saturate(1.15)`
- `mix-blend-mode: screen`
- `will-change: transform`
- 支持 `prefers-reduced-motion`：触发时 animation-duration 改为 180s

噪声纹理：SVG inline feTurbulence，`baseFrequency='0.9'`，`opacity: 0.055`，`mix-blend-mode: overlay`

舞台背景：`radial-gradient(rgb(14,15,26) 0%, rgb(8,9,16) 65%, rgb(5,5,11) 100%)`

**参考实现**  
`C:\Users\wang\Documents\talks\demo-fluid-bg.html`（Claude2 已生成可运行 demo）

**验收标准**
- [ ] 组件存在且可独立 import
- [ ] 三种颜色组合在 `/characters` 页渲染正常
- [ ] 动画在 Chrome / Safari 无掉帧（DevTools Performance 面板 FPS ≥ 55）
- [ ] `prefers-reduced-motion` 模式下动画极度减慢而非停止
- [ ] TypeScript 无报错，ESLint 通过

---

## TICKET-702 · 登录 / 注册页表单卡深色化 【P0】

**背景**  
当前登录/注册页的星空粒子背景视觉很强，但表单卡是纯白底（`bg-white`），两者风格完全割裂，像把浏览器窗口截图贴在了宇宙里。

**目标**  
将表单卡改为深色毛玻璃风格，与粒子背景融合；同时将粒子颜色调整为蓝紫色调统一品牌感。

**技术规格**

表单卡样式替换：
```css
/* 替换掉现有的 bg-white / bg-slate-xxx */
background: rgba(12, 13, 22, 0.78);
backdrop-filter: blur(24px) saturate(1.2);
-webkit-backdrop-filter: blur(24px) saturate(1.2);
border: 1px solid rgba(255, 255, 255, 0.08);
box-shadow:
  rgba(0,0,0,0.5) 0px 32px 64px -16px,
  rgba(0,0,0,0.28) 0px 8px 20px -6px,
  rgba(255,255,255,0.06) 0px 0px 0px 1px inset;
border-radius: 20px;
```

输入框样式：
```css
background: rgba(255, 255, 255, 0.05);
border: 1px solid rgba(255, 255, 255, 0.10);
color: #fff;
/* focus 态 */
box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.45);
border-color: rgba(99, 102, 241, 0.6);
```

粒子颜色：将现有粒子系统的粒子颜色改为 `rgba(139, 120, 255, 0.6)` 和 `rgba(96, 165, 250, 0.5)` 混合，放弃纯白。

Logo / 标题入场动画：
```tsx
// Framer Motion
initial={{ opacity: 0, y: -10 }}
animate={{ opacity: 1, y: 0 }}
transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
```

文字颜色：所有标签、说明文字改为 `text-slate-300` / `text-slate-400`，不要纯白。

**验收标准**
- [ ] 登录页：表单卡深色毛玻璃，粒子蓝紫色
- [ ] 注册页：同上，风格一致
- [ ] 输入框 focus 状态有紫色 glow
- [ ] Logo 有入场动画
- [ ] 移动端 390px 宽度下表单卡不超出屏幕

---

## TICKET-703 · 角色选择页视觉全面升级 【P0】

**背景**  
角色选择页是用户进入产品后的第一个核心页面，视觉质量直接决定第一印象。Claude2 审查评分当前为 6.5/10，目标升级到 8.5+。

**目标**  
接入 TICKET-701 的 `FluidBackground` 组件，同时升级卡片阴影、选中 glow、按钮微交互。

**技术规格**

1. 接入 FluidBackground：
```tsx
// app/characters/page.tsx 或 layout
<FluidBackground orbs={[
  { color: 'blue',   intensity: 0.65 },
  { color: 'purple', intensity: 0.55 },
  { color: 'cyan',   intensity: 0.40 },
]} />
```

2. 卡片阴影升级（`CharacterSelection.tsx`）：
```css
/* glass-panel 或 motion.article 上替换/追加 */
box-shadow:
  rgba(0,0,0,0.50) 0px 36px 72px -18px,
  rgba(0,0,0,0.28) 0px 10px 24px -8px,
  rgba(255,255,255,0.06) 0px 0px 0px 1px inset;
```

3. 选中 glow 增强（`themeByCharacter` 已有，增强 shadow 数值）：
```ts
carlos: { glow: 'shadow-[0_0_44px_rgba(255,200,60,0.35)]', ... }
emma:   { glow: 'shadow-[0_0_44px_rgba(34,211,238,0.32)]', ... }
jake:   { glow: 'shadow-[0_0_44px_rgba(99,102,241,0.38)]', ... }
kenji:  { glow: 'shadow-[0_0_44px_rgba(69,245,165,0.30)]', ... }
sophie: { glow: 'shadow-[0_0_44px_rgba(167,139,250,0.35)]', ... }
```

4. 卡片入场动画调整：
```tsx
transition={{ 
  delay: index * 0.08,  // 稍微加快 stagger
  type: 'spring', 
  stiffness: 120,        // 从 80 → 120，更弹
  damping: 18 
}}
```

5. 按钮微交互（所有 Button 组件）：
```tsx
whileHover={{ scale: 1.04 }}
whileTap={{ scale: 0.96 }}
transition={{ duration: 0.12, type: 'tween' }}
```

**验收标准**
- [ ] 流体背景在角色页渲染，不遮挡卡片内容
- [ ] 选中卡片有对应颜色 glow，未选中卡片 glow 消失
- [ ] 卡片入场 stagger 动画流畅
- [ ] 所有按钮 hover/tap 有 scale 微交互
- [ ] 5 张卡片在 1440px 宽度下排成一行（xl:grid-cols-5 已有）

---

## TICKET-704 · 聊天页视觉升级 【P1】

**背景**  
聊天页使用频率最高，但当前视觉粗糙：消息气泡是纯色块，输入区无毛玻璃处理，与升级后的角色页风格差距明显。

**目标**  
升级消息气泡、输入区、侧边栏三个区域的视觉质量。

**技术规格**

1. 聊天页背景：接入 `FluidBackground`，强度降低（不能抢内容注意力）：
```tsx
<FluidBackground orbs={[
  { color: 'blue',   intensity: 0.30 },
  { color: 'purple', intensity: 0.25 },
]} noise={true} />
```

2. AI 消息气泡：
```css
background: rgba(255, 255, 255, 0.04);
border: 1px solid rgba(255, 255, 255, 0.07);
border-radius: 4px 16px 16px 16px;
/* 左侧角色主题色线条 */
border-left: 2px solid var(--character-color); /* 各角色主题色 */
```

3. 用户消息气泡：
```css
background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
border-radius: 16px 4px 16px 16px;
box-shadow: rgba(99,102,241,0.25) 0px 4px 12px -4px;
```

4. 输入区底座：
```css
background: rgba(12, 13, 22, 0.75);
backdrop-filter: blur(20px);
border-top: 1px solid rgba(255, 255, 255, 0.07);
```

5. 发送按钮 focus/active glow：
```css
/* focus 态 */
box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.4);
```

6. 语音录音中状态：红色呼吸光环
```tsx
// 录音中，在麦克风按钮外层加：
animate={{ boxShadow: ['0 0 0 0px rgba(239,68,68,0)', '0 0 0 8px rgba(239,68,68,0.3)', '0 0 0 0px rgba(239,68,68,0)'] }}
transition={{ duration: 1.4, repeat: Infinity }}
```

7. AI 生成中（typing indicator）：气泡内三个点呼吸动画（TICKET-506 已做，确认样式统一）

**验收标准**
- [ ] AI 气泡半透明，左侧有角色主题色线条
- [ ] 用户气泡紫色渐变
- [ ] 输入区有毛玻璃效果，视觉上浮于背景
- [ ] 发送按钮 focus 状态有紫色 glow
- [ ] 语音录音中红色光环动画
- [ ] 背景流体光晕不干扰消息阅读

---

## TICKET-705 · 报告页数据卡片升级 【P2】

**背景**  
报告页是用户学习成果的展示窗口，当前样式过于平淡，缺乏"成就感"的视觉反馈。

**目标**  
数据卡片 glass 化，分数加入场计数动画，提升成就感与仪式感。

**技术规格**

1. 数据指标卡：
```css
background: rgba(15, 16, 28, 0.75);
backdrop-filter: blur(20px);
border: 1px solid rgba(255, 255, 255, 0.07);
border-radius: 16px;
/* 顶部彩色线条区分指标类型 */
border-top: 2px solid var(--metric-color);
box-shadow: rgba(0,0,0,0.35) 0px 16px 40px -12px;
```

2. 分数数字计数动画（Framer Motion）：
```tsx
import { useSpring, animated } from 'framer-motion'; // 或用 useMotionValue
// 卡片进入视口时，数字从 0 动画到实际值
// duration: 800ms, ease: easeOut
```

3. 整体页面背景接入 `FluidBackground`（低强度）：
```tsx
<FluidBackground orbs={[{ color: 'blue', intensity: 0.25 }]} />
```

**验收标准**
- [ ] 数据卡片深色毛玻璃风格
- [ ] 分数数字有 0→实际值的计数入场动画
- [ ] 背景有轻微流体效果
- [ ] 不同指标卡顶部颜色线条有区分

---

## TICKET-706 · 全局按钮微交互规范化 【P2】

**背景**  
当前 Button 组件的 hover/active 状态不一致，部分页面有微交互，部分没有。需要在组件层统一。

**目标**  
在 `src/components/ui/Button.tsx` 组件层统一所有按钮的微交互规范，一次修改全站生效。

**技术规格**

在 Button 组件的根元素（建议换成 `motion.button`）加：
```tsx
whileHover={{ scale: 1.04 }}
whileTap={{ scale: 0.96 }}
transition={{ duration: 0.12, type: 'tween', ease: 'easeOut' }}
```

icon-only 按钮（`size="icon"`）微交互略有不同：
```tsx
whileHover={{ scale: 1.08 }}
whileTap={{ scale: 0.92 }}
```

注意：`motion.button` 需要 forward 所有原 button 的 props（`onClick`, `disabled`, `type` 等），disabled 状态跳过动画：
```tsx
whileHover={disabled ? {} : { scale: 1.04 }}
whileTap={disabled ? {} : { scale: 0.96 }}
```

**验收标准**
- [ ] 所有 `variant="primary"` 按钮有 hover scale(1.04) / tap scale(0.96)
- [ ] 所有 `size="icon"` 按钮有 hover scale(1.08) / tap scale(0.92)
- [ ] disabled 状态无动画
- [ ] 现有 E2E 测试（7 个 Playwright tests）全部通过

---

## TICKET-712 · 修复 TTS 读音功能无音频输出 【P1】

**背景**  
点击聊天气泡底部的 Volume2（读音）按钮后无任何声音，且无任何错误提示。Fish Audio API key 及全部角色 reference ID 已在 `.env.local` 配置，理论上应走 Fish Audio 路径，但实际静默失败。

**调用链**  
`MessageBubble` → `onSpeak` → `playAssistantAudio()` (ChatWorkspace.tsx:471) → `POST /api/speech/synthesize` → `speech-service.ts:createSpeechSynthesizer` → Fish Audio API → `playAudioResponse()` (browser-audio.ts)

**已知问题**

1. **Fish Audio `model` 参数位置错误**（`speech-service.ts:162`）  
   当前把 `model` 放在 HTTP header 里，但 Fish Audio v1 API 不支持此 header，model 应放在 request body：
   ```ts
   // 错误（当前）
   headers: { ..., model: env.FISH_AUDIO_MODEL ?? "s2-pro" }
   
   // 正确
   body: JSON.stringify({ ..., model: env.FISH_AUDIO_MODEL ?? "s1" }),
   headers: { authorization: `Bearer ${env.FISH_AUDIO_API_KEY}`, "content-type": "application/json" }
   ```
   同时确认 model 名称：`s2-pro` 是否为有效值，可先改为 `s1` 或不传（走默认）。

2. **错误静默吞没**（`ChatWorkspace.tsx:499`）  
   catch block 无任何日志，导致失败完全不可见：
   ```ts
   } catch {
     setSpeakingMessageId(null); // 应加 console.error
   }
   ```

3. **MediaSource + audio/mpeg 兼容性**（`browser-audio.ts`）  
   Chrome 桌面版通常不支持 `MediaSource` 播放 `audio/mpeg`，`canUseMediaSource` 可能返回 false 后走 blob 路径，若 blob 为空同样无声。

**修改范围**

- `src/lib/speech/speech-service.ts`：将 `model` 移至 request body，去掉 model header
- `src/components/chat/ChatWorkspace.tsx`：catch block 加 `console.error`，可选加用户提示
- `src/lib/speech/browser-audio.ts`：确认 blob fallback 路径能正常播放 mp3

**验收标准**
- [ ] 点击 Volume2 按钮，Emma / Jake 任意角色能播出声音
- [ ] Fish Audio 请求失败时，控制台输出明确错误信息（不能静默失败）
- [ ] `npx tsc --noEmit` 无报错
- [ ] `npm run lint` 无报错
- [ ] `npm test -- --runInBand` 全部通过
- [ ] 更新 `feature_list.json`（s7-712 status → passing，填写 evidence）
- [ ] 更新 `claude-progress.md`

---

## 依赖关系

```
TICKET-701 (FluidBackground 组件)
    ├── TICKET-703 (角色页) — 依赖 701
    ├── TICKET-704 (聊天页) — 依赖 701
    └── TICKET-705 (报告页) — 依赖 701

TICKET-702 (登录/注册) — 独立，可并行
TICKET-706 (Button 微交互) — 独立，可并行
```

**推荐实施顺序：**
1. 701 → 703（核心路径，第一印象）
2. 702 + 706（并行，独立模块）
3. 704（依赖 701）
4. 705（最后收尾）

---

## Demo 参考

Claude2 已生成可运行的 HTML 效果预览：
`C:\Users\wang\Documents\talks\demo-fluid-bg.html`

用浏览器打开即可看到动态效果（流体背景 + 升级卡片 + glow 选中态）。
