import React, { forwardRef } from 'react';
import { ToolType } from '../types';

interface ToolbarProps {
  isOpen: boolean;
  activeTool: ToolType;
  activeColor: string;
  activeSize: number;
  cursorPos: { x: number; y: number } | null;
  onSelectTool: (tool: ToolType) => void;
  onSelectColor: (color: string) => void;
  onSelectSize: (size: number) => void;
}

// Colors to choose from
const COLORS = ['#FFFFFF', '#FF0000', '#00FF00', '#0000FF', '#FFFF00'];
const SIZES = [2, 5, 10, 15];

const Toolbar = forwardRef<HTMLDivElement, ToolbarProps>(({
  isOpen, activeTool, activeColor, activeSize, cursorPos, onSelectTool, onSelectColor, onSelectSize
}, ref) => {
  if (!isOpen) return null;

  const isHovered = (id: string) => {
    if (!cursorPos) return false;
    const el = document.getElementById(id);
    if (!el) return false;
    const rect = el.getBoundingClientRect();
    return (
      cursorPos.x >= rect.left &&
      cursorPos.x <= rect.right &&
      cursorPos.y >= rect.top &&
      cursorPos.y <= rect.bottom
    );
  };

  return (
    <div 
      ref={ref}
      className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-gray-900 bg-opacity-90 p-6 rounded-2xl shadow-2xl border border-gray-700 flex flex-col gap-6 w-80 animate-fade-in z-50 pointer-events-auto"
    >
      <h2 className="text-xl font-bold text-center mb-2 text-white">Gesture Menu</h2>
      
      {/* Tools */}
      <div className="flex justify-center gap-4">
        <div
          id="btn-pen"
          className={`p-4 rounded-lg flex-1 font-bold text-center transition-all cursor-pointer select-none ${activeTool === ToolType.PEN ? 'bg-blue-600 ring-2 ring-white text-white' : 'bg-gray-700 text-gray-300'}`}
          style={{ transform: isHovered('btn-pen') ? 'scale(1.1)' : 'scale(1)' }}
        >
          PEN
        </div>
        <div
          id="btn-eraser"
          className={`p-4 rounded-lg flex-1 font-bold text-center transition-all cursor-pointer select-none ${activeTool === ToolType.ERASER ? 'bg-red-600 ring-2 ring-white text-white' : 'bg-gray-700 text-gray-300'}`}
          style={{ transform: isHovered('btn-eraser') ? 'scale(1.1)' : 'scale(1)' }}
        >
          ERASER
        </div>
      </div>

      {/* Colors */}
      <div className="flex justify-between items-center bg-gray-800 p-3 rounded-lg">
        {COLORS.map((color, idx) => (
          <div
            key={color}
            id={`btn-color-${idx}`}
            className={`w-8 h-8 rounded-full border-2 transition-transform cursor-pointer ${activeColor === color ? 'border-white' : 'border-transparent'}`}
            style={{ 
              backgroundColor: color,
              transform: isHovered(`btn-color-${idx}`) ? 'scale(1.4)' : (activeColor === color ? 'scale(1.25)' : 'scale(1)')
            }}
          />
        ))}
      </div>

      {/* Sizes */}
      <div className="flex justify-between items-center bg-gray-800 p-3 rounded-lg">
        {SIZES.map((size, idx) => (
          <div
            key={size}
            id={`btn-size-${idx}`}
            className={`rounded-full bg-white transition-all cursor-pointer ${activeSize === size ? 'bg-blue-400' : 'bg-gray-400'}`}
            style={{ 
              width: size * 2 + 4, 
              height: size * 2 + 4,
              transform: isHovered(`btn-size-${idx}`) ? 'scale(1.3)' : 'scale(1)'
            }}
          />
        ))}
      </div>

      <div className="text-center text-xs text-gray-400 mt-2">
        Hover with index finger to select.
        <br/>
        Show open palm to close.
      </div>
    </div>
  );
});

export default Toolbar;
