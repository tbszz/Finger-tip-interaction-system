![Uploading Gemini_Generated_Image_6b3lsr6b3lsr6b3l.png…]()
<div align="center">
  <h1>指尖交互系统（GestureCanvas）</h1>
  <p>通过摄像头识别手势，在画布上自然绘制与交互</p>
</div>

## 简介

指尖交互系统是一个基于 React + Vite + TypeScript 的手势驱动绘图应用。
使用 MediaPipe Hands 从摄像头检测手部关键点，实现无鼠标的自然绘制与菜单选择。

## 特性

- 手势绘图：食指与拇指捏合即可开始/结束绘制
- 菜单手势：张开手掌呼出/关闭工具菜单
- 清屏手势：胜利手势（✌️）触发路径溶解为粒子并清屏
- 工具选择：笔/橡皮、5 种颜色、4 档笔宽
- 动态平滑：基于移动速度的平滑算法，兼顾稳定与响应
- 即时预览：摄像头画面反转叠加绘制路径，所见即所得

## 技术栈

- `React 19`、`Vite 6`、`TypeScript 5`
- `TailwindCSS`（通过 CDN 注入）
- `MediaPipe Hands`（通过 CDN 加载，稳定版本）

## 本地运行

前置条件：
- `Node.js >= 18`
- 浏览器需允许摄像头访问

步骤：
1. 安装依赖：`npm install`
2. 启动开发服务器：`npm run dev`
3. 在浏览器中打开提示的本地地址，授权摄像头

构建与预览：
- 生产构建：`npm run build`
- 本地预览构建产物：`npm run preview`

## 环境变量（可选）

项目内置了 `GEMINI_API_KEY` 的环境注入（见 `vite.config.ts`），用于后续扩展 AI 能力。
当前手势绘图功能不依赖该变量。如需配置，请在项目根目录创建 `.env.local` 并加入：

```
GEMINI_API_KEY=你的密钥
```

## 手势与交互

- 打开菜单：张开手掌（所有手指伸直，拇指外展）
- 绘制：食指与拇指捏合进入绘制，松开退出
- 清屏：做出胜利手势（食指与中指伸直，其余收拢）
- 菜单选择：食指悬停到按钮区域，停留约 600ms 自动选择

提示文字会显示在页面底部，帮助快速上手。

## 目录结构

- `index.html`：Tailwind 与 MediaPipe CDN 注入、根节点
- `index.tsx`：应用入口与挂载
- `App.tsx`：手势推理、状态机、绘制与粒子效果
- `components/Toolbar.tsx`：工具菜单（笔/橡皮、颜色、笔宽）
- `utils/geometry.ts`：几何与手势判定工具（捏合比、手掌识别等）
- `types.ts`：类型定义（路径、粒子、关键点等）
- `vite.config.ts`：开发服务器、别名与环境变量注入
- `tsconfig.json`：TypeScript 编译配置
- `package.json`：脚本与依赖

## 浏览器与权限

- 请在支持 `getUserMedia` 的现代浏览器中运行（Chrome/Edge/Firefox 最新版）
- 首次进入需允许摄像头访问；如拒绝会导致无法检测手势

## 常见问题

- 无法检测到手：确保环境光充足、手部位于画面中央并保持一定距离
- 菜单不响应悬停：将食指伸直，光标环出现后再缓慢靠近按钮中心
- 延迟或抖动明显：在充足光线下使用，避免过快移动；算法已根据速度自适应平滑

## 许可

  本项目未声明许可证，如需二次分发或商用请先与作者沟通。

  ## 致谢

  - [MediaPipe Hands](https://developers.google.com/mediapipe) 提供高质量的手部关键点识别
  - [TailwindCSS](https://tailwindcss.com/) 提供便捷的样式开发

---

<div align="center">
  <h1>GestureCanvas</h1>
  <p>Draw and interact naturally on a canvas using hand gestures</p>
</div>

## Overview

GestureCanvas is a gesture-driven drawing app built with React, Vite, and TypeScript.
It uses MediaPipe Hands to detect hand landmarks from your webcam, enabling mouse-free drawing and menu selection.

## Features

- Gesture drawing: pinch index finger and thumb to start/stop drawing
- Menu gesture: open palm to toggle the tool menu
- Clear gesture: victory sign (✌️) dissolves paths into particles and clears the canvas
- Tool selection: pen/eraser, 5 colors, 4 brush sizes
- Dynamic smoothing: speed-based smoothing for stability and responsiveness
- Live preview: mirrored webcam feed overlaid with strokes for WYSIWYG control

## Tech Stack

- `React 19`, `Vite 6`, `TypeScript 5`
- `TailwindCSS` via CDN
- `MediaPipe Hands` via CDN (pinned stable version)

## Run Locally

Prerequisites:
- `Node.js >= 18`
- Browser camera permission enabled

Steps:
1. Install dependencies: `npm install`
2. Start dev server: `npm run dev`
3. Open the shown local URL and grant camera access

Build and preview:
- Production build: `npm run build`
- Preview built assets locally: `npm run preview`

## Environment Variables (optional)

The project includes `GEMINI_API_KEY` injection (see `vite.config.ts`) for potential AI features.
Gesture drawing itself does not require this key. To configure, create `.env.local` at project root:

```
GEMINI_API_KEY=your_key_here
```

## Gestures & Interaction

- Open menu: open palm (all fingers extended, thumb abducted)
- Draw: pinch index and thumb to enter drawing; release to exit
- Clear: victory sign (index and middle extended, others curled)
- Menu selection: hover index finger over a button; dwell ~600ms to select

A hint banner at the bottom of the page summarizes the controls.

## Project Structure

- `index.html`: Tailwind and MediaPipe CDNs, root container
- `index.tsx`: app entry and mount
- `App.tsx`: gesture inference, state machine, drawing and particle effects
- `components/Toolbar.tsx`: tool menu (pen/eraser, colors, sizes)
- `utils/geometry.ts`: geometry and gesture helpers (pinch ratio, open palm, etc.)
- `types.ts`: types for paths, particles, landmarks, etc.
- `vite.config.ts`: dev server, aliases, env variable injection
- `tsconfig.json`: TypeScript compiler options
- `package.json`: scripts and dependencies

## Browser & Permissions

- Use a modern browser supporting `getUserMedia` (latest Chrome/Edge/Firefox)
- Grant camera access on first run; otherwise gestures cannot be detected

## Troubleshooting

- Hands not detected: ensure good lighting, keep the hand centered at a moderate distance
- Menu not selecting: fully extend index finger; wait for the ring cursor, then approach button center slowly
- Noticeable lag or jitter: use in well-lit conditions and avoid excessive speed; the algorithm adapts smoothing to motion

## License

No license declared. Contact the author before redistribution or commercial use.

## Acknowledgements

- [MediaPipe Hands](https://developers.google.com/mediapipe) for high-quality hand landmark detection
- [TailwindCSS](https://tailwindcss.com/) for rapid styling
