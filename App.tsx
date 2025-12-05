import React, { useEffect, useRef, useState } from 'react';
import { 
  detectOpenPalm, 
  detectPointing, 
  detectVictory, 
  isFingerExtended,
  lerp,
  getHandSize,
  getPinchRatio,
  getPinchMidpoint,
  distance,
  isInSafeZone
} from './utils/geometry';
import { DrawingPath, Point, ToolType, Particle, HandLandmark } from './types';
import Toolbar from './components/Toolbar';

// --- CONFIGURATION ---
const TARGET_FPS = 30;
const FRAME_INTERVAL = 1000 / TARGET_FPS;

// Stability Parameters
const PINCH_START_THRESHOLD = 0.09; // Ratio relative to hand size
const PINCH_END_THRESHOLD = 0.14;   // Hysteresis: Harder to exit pinch
const PINCH_DEBOUNCE_FRAMES = 3;    // Frames required to confirm state change
const MIN_DRAW_DIST_PX = 2;         // Minimum movement to record point
const DWELL_TIME_MS = 600;          // Time to trigger click in menu (reduced from 800)

// Application States
type AppMode = 'IDLE' | 'HOVER' | 'DRAWING' | 'MENU';

export default function App() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // --- MUTABLE STATE (Performance Critical) ---
  const state = useRef({
    paths: [] as DrawingPath[],
    currentPath: [] as Point[],
    particles: [] as Particle[],
    
    // Tools
    tool: ToolType.PEN,
    color: '#00FF00',
    size: 5,
    
    // State Machine
    mode: 'IDLE' as AppMode,
    consecutivePinchFrames: 0,
    consecutiveOpenFrames: 0,
    
    // Geometry & Smoothing
    cursorPos: { x: 0, y: 0 } as Point, // Screen coordinates
    smoothedPos: null as Point | null,  // Filtered coordinates
    handSize: 0,
    
    // Menu Interaction
    isMenuOpen: false, // React syncs to this occasionally
    selectionProgress: 0,
    hoveredId: null as string | null,
    lastGestureTime: 0,
    
    // System
    lastLandmarks: null as HandLandmark[] | null,
    cameraReady: false,
  });

  // --- REACT STATE (UI Updates only) ---
  const [uiVisible, setUiVisible] = useState(false);
  const [toolbarProps, setToolbarProps] = useState({
    activeTool: ToolType.PEN,
    activeColor: '#00FF00',
    activeSize: 5
  });

  useEffect(() => {
    if (!videoRef.current || !canvasRef.current) return;

    let hands: any = null;
    let cameraStream: MediaStream | null = null;
    let animationFrameId: number;
    let lastTime = 0;
    let isProcessing = false;

    // 1. Initialize MediaPipe with High Accuracy
    // @ts-ignore
    hands = new window.Hands({
      locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/${file}`
    });

    hands.setOptions({
      maxNumHands: 1,
      modelComplexity: 1, // Full model for better accuracy
      minDetectionConfidence: 0.75, // Strict confidence to reduce ghosting
      minTrackingConfidence: 0.75
    });

    hands.onResults((results: any) => {
      isProcessing = false;
      if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        state.current.lastLandmarks = results.multiHandLandmarks[0];
      } else {
        state.current.lastLandmarks = null;
      }
    });

    // 2. Camera Setup
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 }, // 4:3 Aspect ratio is standard for webcams
            facingMode: 'user'
          }
        });
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await new Promise((resolve) => {
            videoRef.current!.onloadedmetadata = () => {
              videoRef.current!.play();
              resolve(true);
            };
          });
          state.current.cameraReady = true;
          cameraStream = stream;
        }
      } catch (err) {
        console.error("Camera Error:", err);
      }
    };

    // 3. Logic Update (State Machine)
    const update = (width: number, height: number) => {
      const s = state.current;
      const now = Date.now();
      const landmarks = s.lastLandmarks;

      // Physics (Particles)
      if (s.particles.length > 0) {
        const alive: Particle[] = [];
        for (const p of s.particles) {
          p.x += p.vx + Math.sin(p.y * 0.05) * 0.5;
          p.y += p.vy;
          p.life -= 0.02;
          if (p.life > 0 && p.y < height) alive.push(p);
        }
        s.particles = alive;
      }

      // --- 1. DETECTION PHASE ---
      if (!landmarks) {
        if (s.mode === 'DRAWING') endStroke();
        s.mode = 'IDLE';
        s.smoothedPos = null;
        return;
      }

      // Calculate Basic Geometry
      s.handSize = getHandSize(landmarks);
      const pinchRatio = getPinchRatio(landmarks, s.handSize);
      
      // Determine Cursor Source based on Mode
      let rawPoint: Point;
      if (s.isMenuOpen) {
        // MENU MODE: Use Index Tip (Landmark 8) for direct pointing behavior.
        // This is crucial for alignment when not pinching.
        rawPoint = landmarks[8];
      } else {
        // DRAWING MODE: Use Midpoint of Index & Thumb for pinch stability
        rawPoint = getPinchMidpoint(landmarks);
      }
      
      const rawX = (1 - rawPoint.x); 
      const rawY = rawPoint.y;

      // Region of Interest Check
      if (!isInSafeZone({x: rawX, y: rawY})) {
        if (s.mode === 'DRAWING') endStroke();
        s.mode = 'IDLE';
        return;
      }

      // --- 2. SMOOTHING PHASE (Dynamic Speed-based) ---
      let currX = rawX * width;
      let currY = rawY * height;

      if (!s.smoothedPos) {
        s.smoothedPos = { x: currX, y: currY };
      } else {
        // Calculate speed (pixels per frame)
        const dist = Math.sqrt(
          Math.pow(currX - s.smoothedPos.x, 2) + 
          Math.pow(currY - s.smoothedPos.y, 2)
        );
        
        // Dynamic Alpha: 
        // Slow movement (dist < 5) -> alpha low (0.1) -> Smooth
        // Fast movement (dist > 50) -> alpha high (0.7) -> Responsive
        const minAlpha = 0.1;
        const maxAlpha = 0.8;
        const speedFactor = Math.min(1, dist / 80); // 80px movement is "max speed"
        const alpha = lerp(minAlpha, maxAlpha, speedFactor);

        s.smoothedPos.x = lerp(s.smoothedPos.x, currX, alpha);
        s.smoothedPos.y = lerp(s.smoothedPos.y, currY, alpha);
      }
      
      s.cursorPos = { ...s.smoothedPos };

      // --- 3. STATE MACHINE PHASE ---

      // GLOBAL GESTURES (Menu / Dissolve)
      if (s.mode !== 'DRAWING') {
        // Only check menu toggle if we haven't done it recently
        if (now - s.lastGestureTime > 1000) {
          if (detectOpenPalm(landmarks)) {
            s.consecutiveOpenFrames++;
            if (s.consecutiveOpenFrames > 5) {
               toggleMenu(now);
               s.consecutiveOpenFrames = 0;
            }
          } else {
            s.consecutiveOpenFrames = 0;
          }
        }

        if (detectVictory(landmarks) && !s.isMenuOpen) {
           triggerDissolve(width, height);
           return;
        }
      }

      // MODE SPECIFIC LOGIC
      if (s.isMenuOpen) {
         // Menu Interaction
         s.mode = 'MENU';
         
         // Relaxed Check: Just need index finger up.
         // We don't check for other fingers being curled, as that was too strict.
         const isIndexUp = isFingerExtended(landmarks, 8, 6);
         
         if (isIndexUp) {
            handleUIInteraction();
         } else {
            s.hoveredId = null;
            s.selectionProgress = 0;
         }

      } else {
         // Drawing Logic
         if (s.mode === 'DRAWING') {
            // Check for exit
            if (pinchRatio > PINCH_END_THRESHOLD) {
               s.consecutivePinchFrames--;
               if (s.consecutivePinchFrames < 0) {
                  endStroke();
                  s.mode = 'HOVER';
               }
            } else {
               // Reset debounce if we are still pinching hard
               s.consecutivePinchFrames = PINCH_DEBOUNCE_FRAMES;
               addPointToStroke(s.cursorPos);
            }
         } else {
            // IDLE / HOVER -> Check for entry
            if (pinchRatio < PINCH_START_THRESHOLD) {
               s.consecutivePinchFrames++;
               if (s.consecutivePinchFrames > PINCH_DEBOUNCE_FRAMES) {
                  startStroke(s.cursorPos);
                  s.mode = 'DRAWING';
               }
            } else {
               s.consecutivePinchFrames = 0;
               s.mode = 'HOVER';
            }
         }
      }
    };

    // --- HELPER FUNCTIONS ---

    const toggleMenu = (time: number) => {
      const s = state.current;
      s.isMenuOpen = !s.isMenuOpen;
      s.lastGestureTime = time;
      s.mode = s.isMenuOpen ? 'MENU' : 'HOVER';
      if (s.currentPath.length > 0) endStroke();
      setUiVisible(s.isMenuOpen);
    };

    const startStroke = (p: Point) => {
      const s = state.current;
      s.currentPath = [p];
    };

    const addPointToStroke = (p: Point) => {
      const s = state.current;
      if (s.currentPath.length === 0) return;
      
      const lastP = s.currentPath[s.currentPath.length - 1];
      const distSq = (lastP.x - p.x) ** 2 + (lastP.y - p.y) ** 2;
      
      // Filter micro-movements
      if (distSq > MIN_DRAW_DIST_PX * MIN_DRAW_DIST_PX) {
         s.currentPath.push(p);
      }
    };

    const endStroke = () => {
      const s = state.current;
      if (s.currentPath.length > 0) {
        s.paths.push({ 
          points: s.currentPath, 
          color: s.color, 
          width: s.size, 
          isEraser: s.tool === ToolType.ERASER 
        });
        s.currentPath = [];
      }
    };

    const triggerDissolve = (w: number, h: number) => {
       const s = state.current;
       if (s.paths.length === 0) return;
       
       s.paths.forEach(path => {
         for(let i=0; i<path.points.length; i+=4) {
            s.particles.push({
               x: path.points[i].x,
               y: path.points[i].y,
               vx: (Math.random() - 0.5) * 4,
               vy: Math.random() * 5 + 2,
               color: path.isEraser ? 'white' : path.color,
               size: Math.random() * 3 + 1,
               life: 1.0
            });
         }
       });
       s.paths = [];
       s.currentPath = [];
    };

    const handleUIInteraction = () => {
       const s = state.current;
       const { x, y } = s.cursorPos;
       
       const ids = ['btn-pen', 'btn-eraser', ...[0,1,2,3,4].map(i => `btn-color-${i}`), ...[0,1,2,3].map(i => `btn-size-${i}`)];
       let hit = null;
       
       // Simple collision detection against DOM rects
       for (const id of ids) {
         const el = document.getElementById(id);
         if (el) {
           const r = el.getBoundingClientRect();
           if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) {
             hit = id;
             break;
           }
         }
       }

       if (hit) {
         if (s.hoveredId !== hit) {
           s.hoveredId = hit;
           s.selectionProgress = 0;
         } else {
           s.selectionProgress += FRAME_INTERVAL;
           if (s.selectionProgress >= DWELL_TIME_MS) { // Use constant
             triggerClick(hit);
             s.selectionProgress = 0;
             s.hoveredId = null;
           }
         }
       } else {
         s.hoveredId = null;
         s.selectionProgress = 0;
       }
    };

    const triggerClick = (id: string) => {
       const s = state.current;
       if (id === 'btn-pen') s.tool = ToolType.PEN;
       else if (id === 'btn-eraser') s.tool = ToolType.ERASER;
       else if (id.startsWith('btn-color-')) {
          const colors = ['#FFFFFF', '#FF0000', '#00FF00', '#0000FF', '#FFFF00'];
          s.color = colors[parseInt(id.split('-')[2])];
       }
       else if (id.startsWith('btn-size-')) {
          const sizes = [2, 5, 10, 15];
          s.size = sizes[parseInt(id.split('-')[2])];
       }
       
       const el = document.getElementById(id);
       if(el) {
          el.style.transform = 'scale(0.9)';
          setTimeout(()=>el.style.transform='', 150);
       }

       setToolbarProps({
         activeTool: s.tool,
         activeColor: s.color,
         activeSize: s.size
       });
    };

    // 4. Rendering
    const draw = (width: number, height: number, ctx: CanvasRenderingContext2D) => {
      const s = state.current;

      // Clear & Video
      ctx.save();
      ctx.translate(width, 0);
      ctx.scale(-1, 1);
      if (videoRef.current && s.cameraReady) {
        ctx.drawImage(videoRef.current, 0, 0, width, height);
      }
      ctx.restore();

      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // Draw Paths
      const drawPath = (points: Point[], color: string, width: number) => {
        if (points.length < 2) return;
        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = width;
        
        ctx.moveTo(points[0].x, points[0].y);
        if (points.length === 2) {
          ctx.lineTo(points[1].x, points[1].y);
        } else {
          for (let i = 1; i < points.length - 1; i++) {
            const p1 = points[i];
            const p2 = points[i + 1];
            ctx.quadraticCurveTo(p1.x, p1.y, (p1.x + p2.x) / 2, (p1.y + p2.y) / 2);
          }
          const last = points[points.length - 1];
          ctx.lineTo(last.x, last.y);
        }
        ctx.stroke();
      };

      // Saved Paths
      for (const path of s.paths) {
        if (path.isEraser) {
           ctx.globalCompositeOperation = 'source-over';
           ctx.strokeStyle = 'rgba(255,255,255,0.4)';
           ctx.lineWidth = path.width * 2;
           drawPath(path.points, 'rgba(255,255,255,0.4)', path.width * 2);
        } else {
           ctx.globalCompositeOperation = 'source-over';
           drawPath(path.points, path.color, path.width);
        }
      }

      // Current Path
      if (s.currentPath.length > 0) {
        const color = s.tool === ToolType.ERASER ? 'rgba(255,255,255,0.4)' : s.color;
        const width = s.tool === ToolType.ERASER ? s.size * 2 : s.size;
        drawPath(s.currentPath, color, width);
      }

      // Particles
      if (s.particles.length > 0) {
        for (const p of s.particles) {
           ctx.fillStyle = p.color;
           ctx.globalAlpha = p.life;
           ctx.beginPath();
           ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
           ctx.fill();
        }
        ctx.globalAlpha = 1.0;
      }

      // --- CURSORS ---
      if (s.mode !== 'IDLE' && s.smoothedPos) {
        const { x, y } = s.smoothedPos;

        if (s.mode === 'MENU') {
           // Menu Cursor (Ring + Progress)
           ctx.beginPath();
           ctx.strokeStyle = '#ffffff';
           ctx.lineWidth = 2;
           ctx.arc(x, y, 15, 0, Math.PI * 2);
           ctx.stroke();
           
           if (s.selectionProgress > 0) {
             ctx.beginPath();
             ctx.strokeStyle = '#00FFFF';
             ctx.lineWidth = 4;
             // Calculate angle based on DWELL_TIME_MS
             const end = (s.selectionProgress / DWELL_TIME_MS) * Math.PI * 2;
             ctx.arc(x, y, 15, -Math.PI/2, -Math.PI/2 + end);
             ctx.stroke();
           }
        } 
        else if (s.mode === 'HOVER') {
           // Hover Cursor (Hollow Ring) - Shows system is ready
           ctx.beginPath();
           ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
           ctx.lineWidth = 2;
           ctx.arc(x, y, 10, 0, Math.PI * 2);
           ctx.stroke();
           
           // Small center dot
           ctx.beginPath();
           ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
           ctx.arc(x, y, 2, 0, Math.PI * 2);
           ctx.fill();
        } 
        else if (s.mode === 'DRAWING') {
           // Drawing Cursor (Solid Color)
           ctx.beginPath();
           ctx.fillStyle = s.tool === ToolType.ERASER ? '#FFF' : s.color;
           ctx.arc(x, y, s.size / 2, 0, Math.PI * 2);
           ctx.fill();
           
           // Active indicator ring
           ctx.beginPath();
           ctx.strokeStyle = 'rgba(255,255,255,0.5)';
           ctx.lineWidth = 1;
           ctx.arc(x, y, s.size / 2 + 5, 0, Math.PI * 2);
           ctx.stroke();
        }
      }
    };

    // 5. Loop
    const loop = (timestamp: number) => {
      const s = state.current;
      const elapsed = timestamp - lastTime;
      if (elapsed >= FRAME_INTERVAL) {
        lastTime = timestamp - (elapsed % FRAME_INTERVAL);
        const canvas = canvasRef.current;
        if (canvas) {
           const ctx = canvas.getContext('2d', { alpha: false });
           if (ctx) {
             // Resize handling inline to avoid layout thrashing
             if (canvas.width !== window.innerWidth || canvas.height !== window.innerHeight) {
                canvas.width = window.innerWidth;
                canvas.height = window.innerHeight;
             }
             
             // Inference
             if (videoRef.current && s.cameraReady && !isProcessing) {
               isProcessing = true;
               hands.send({ image: videoRef.current }).catch((e:any) => {
                 isProcessing = false;
                 console.warn("Frame dropped");
               });
             }
             
             update(canvas.width, canvas.height);
             draw(canvas.width, canvas.height, ctx);
           }
        }
      }
      animationFrameId = requestAnimationFrame(loop);
    };

    startCamera().then(() => {
      animationFrameId = requestAnimationFrame(loop);
    });

    return () => {
      cancelAnimationFrame(animationFrameId);
      if (cameraStream) cameraStream.getTracks().forEach(t => t.stop());
      if (hands) hands.close();
    };
  }, []);

  return (
    <div ref={containerRef} className="relative w-screen h-screen overflow-hidden bg-black cursor-none">
      <video ref={videoRef} className="hidden" playsInline muted />
      <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full z-10" />
      
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-20 flex items-center justify-center">
        <Toolbar 
            isOpen={uiVisible}
            activeTool={toolbarProps.activeTool}
            activeColor={toolbarProps.activeColor}
            activeSize={toolbarProps.activeSize}
            cursorPos={null}
            onSelectTool={()=>{}} 
            onSelectColor={()=>{}}
            onSelectSize={()=>{}}
        />
      </div>

      <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 text-white text-opacity-70 text-sm pointer-events-none z-0 text-center font-sans select-none bg-black bg-opacity-50 p-3 rounded-xl">
         <p className="font-bold mb-1">Gesture Controls</p>
         <div className="flex gap-6 text-xs">
           <span>✋ Open Palm: Menu</span>
           <span>👌 Pinch: Draw</span>
           <span>✌️ Victory: Clear</span>
         </div>
      </div>
    </div>
  );
}