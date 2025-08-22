import React from 'react';
import Canvas from './Canvas';
import { Pixel } from '../types/canvas';

interface CanvasContainerProps {
  pixels: Pixel[];
  selectedPixel: { x: number; y: number } | null;
  onPixelSelect: (x: number, y: number) => void;
  onSelectionChange?: (selectionState: any) => void;
}

const CanvasContainer: React.FC<CanvasContainerProps> = ({
  pixels,
  selectedPixel,
  onPixelSelect,
  onSelectionChange
}) => (
  <main
    className="canvas-container"
    role="main"
    aria-label="Pixel canvas"
    onWheel={(e) => {
      e.preventDefault();
      e.stopPropagation();
    }}
  >
    <Canvas
      pixels={pixels}
      onPixelSelect={onPixelSelect}
      selectedPixel={selectedPixel}
      onSelectionChange={onSelectionChange}
      className="pixel-canvas"
    />
    <div className="canvas-overlay" aria-live="polite">
      <div className="selection-tool">
        <div className="selection-info" role="status">
          {selectedPixel
            ? `Selected: (${selectedPixel.x}, ${selectedPixel.y})`
            : 'Click to select a pixel'
          }
        </div>
      </div>
    </div>
  </main>
);

export default CanvasContainer;