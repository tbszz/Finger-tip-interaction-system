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

