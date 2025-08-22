import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Pixel, CanvasProps } from '../types/canvas';
import { useViewport } from '../hooks/useViewport';
import { useCanvasCoordinates } from '../hooks/useCanvasCoordinates';
import { useCanvasEvents } from '../hooks/useCanvasEvents';

const Canvas: React.FC<CanvasProps> = ({
  pixels = [],
  onPixelSelect,
  selectedPixel,
  className = ''
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [isLayoutChanging, setIsLayoutChanging] = useState(false);

  // Use custom hooks for modular logic
  const { viewport, pan, zoom } = useViewport();
  const { screenToWorld, worldToScreen } = useCanvasCoordinates(canvasRef, viewport, dimensions);
  const {
    isPanning,
    isPinching,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleClick,
    handleWheel,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  } = useCanvasEvents({
    viewport,
    pan,
    zoom,
    screenToWorld,
    onPixelSelect,
  });



  // Handle canvas resize with stable pixel size
  useEffect(() => {
    const updateDimensions = () => {
      if (canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        const newDimensions = {
          width: Math.round(rect.width),
          height: Math.round(rect.height)
        };

        // Always update canvas size to match container
        canvasRef.current.width = newDimensions.width;
        canvasRef.current.height = newDimensions.height;
        setDimensions(newDimensions);
      }
    };

    // Initial setup
    updateDimensions();

    // Listen to window resize
    window.addEventListener('resize', updateDimensions);

    // Also listen to layout changes (sidebar toggles, etc.)
    const resizeObserver = new ResizeObserver(() => {
      updateDimensions();
    });

    if (canvasRef.current?.parentElement) {
      resizeObserver.observe(canvasRef.current.parentElement);
    }

    return () => {
      window.removeEventListener('resize', updateDimensions);
      resizeObserver.disconnect();
    };
  }, []); // Simple, direct updates without complex debouncing



  // Render the canvas
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, dimensions.width, dimensions.height);

    // Set up coordinate system
    ctx.save();
    ctx.translate(dimensions.width / 2, dimensions.height / 2);
    ctx.scale(viewport.zoom, viewport.zoom);
    ctx.translate(-viewport.x, -viewport.y);

    // Draw grid (subtle background grid)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1 / viewport.zoom;

    const gridSize = 1; // 1 world unit grid
    const startX = Math.floor(viewport.x - dimensions.width / (2 * viewport.zoom)) - 1;
    const endX = Math.ceil(viewport.x + dimensions.width / (2 * viewport.zoom)) + 1;
    const startY = Math.floor(viewport.y - dimensions.height / (2 * viewport.zoom)) - 1;
    const endY = Math.ceil(viewport.y + dimensions.height / (2 * viewport.zoom)) + 1;

    for (let x = startX; x <= endX; x++) {
      ctx.beginPath();
      ctx.moveTo(x, startY);
      ctx.lineTo(x, endY);
      ctx.stroke();
    }

    for (let y = startY; y <= endY; y++) {
      ctx.beginPath();
      ctx.moveTo(startX, y);
      ctx.lineTo(endX, y);
      ctx.stroke();
    }

    // Draw pixels
    pixels.forEach(pixel => {
      ctx.fillStyle = pixel.color;
      ctx.fillRect(pixel.x, pixel.y, 1, 1);

      // Draw letter if present
      if (pixel.letter) {
        ctx.fillStyle = '#ffffff';
        ctx.font = `${0.8 / viewport.zoom}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(pixel.letter, pixel.x + 0.5, pixel.y + 0.5);
      }
    });

    // Draw selected pixel highlight
    if (selectedPixel) {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2 / viewport.zoom;
      ctx.strokeRect(selectedPixel.x, selectedPixel.y, 1, 1);

      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1 / viewport.zoom;
      ctx.strokeRect(selectedPixel.x, selectedPixel.y, 1, 1);
    }

    ctx.restore();

    // Draw coordinates in corner
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(10, 10, 120, 40);
    ctx.fillStyle = '#ffffff';
    ctx.font = '12px Arial';
    ctx.fillText(`X: ${Math.floor(viewport.x)}, Y: ${Math.floor(viewport.y)}`, 15, 25);
    ctx.fillText(`Zoom: ${viewport.zoom.toFixed(1)}x`, 15, 40);

    // Show layout changing indicator
    if (isLayoutChanging) {
      ctx.fillStyle = 'rgba(59, 130, 246, 0.8)';
      ctx.fillRect(10, 45, 80, 20);
      ctx.fillStyle = '#ffffff';
      ctx.font = '10px Arial';
      ctx.fillText('Resizing...', 15, 58);
    }
  }, [viewport, dimensions, pixels, selectedPixel]);

  // Zoom is now user-controllable - no longer forced to fixed size

  // Re-render when dependencies change
  useEffect(() => {
    render();
  }, [render]);







  return (
    <canvas
      ref={canvasRef}
      className={`pixel-canvas ${className}`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onClick={handleClick}
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onContextMenu={(e) => e.preventDefault()}
      role="img"
      aria-label="Pixel canvas"
      style={{
        cursor: isPanning ? 'grabbing' : 'grab',
        touchAction: 'none',
      }}
    />
  );
};

export default Canvas;