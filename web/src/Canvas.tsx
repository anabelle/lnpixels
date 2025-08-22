import React, { useRef, useEffect, useState, useCallback } from 'react';

interface Pixel {
  x: number;
  y: number;
  color: string;
  letter?: string;
}

interface Viewport {
  x: number; // World X coordinate at center
  y: number; // World Y coordinate at center
  zoom: number; // Zoom level (pixels per world unit)
}

interface CanvasProps {
  pixels?: Pixel[];
  onPixelSelect?: (x: number, y: number) => void;
  selectedPixel?: { x: number; y: number } | null;
  className?: string;
}

const Canvas: React.FC<CanvasProps> = ({
  pixels = [],
  onPixelSelect,
  selectedPixel,
  className = ''
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Fixed pixel size - this should never change
  const PIXEL_SIZE = 20; // pixels per world unit

  const [viewport, setViewport] = useState<Viewport>({
    x: 0,
    y: 0,
    zoom: PIXEL_SIZE, // Always maintain fixed pixel size
  });
  const [isPanning, setIsPanning] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [isLayoutChanging, setIsLayoutChanging] = useState(false);

  // No zoom limits needed - pixel size is fixed

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

  // Convert screen coordinates to world coordinates
  const screenToWorld = useCallback((screenX: number, screenY: number): { x: number; y: number } => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const canvasX = screenX - rect.left;
    const canvasY = screenY - rect.top;

    // Convert to world coordinates
    const worldX = viewport.x + (canvasX - dimensions.width / 2) / viewport.zoom;
    const worldY = viewport.y + (canvasY - dimensions.height / 2) / viewport.zoom;

    return { x: Math.floor(worldX), y: Math.floor(worldY) };
  }, [viewport, dimensions]);

  // Convert world coordinates to screen coordinates
  const worldToScreen = useCallback((worldX: number, worldY: number): { x: number; y: number } => {
    const screenX = dimensions.width / 2 + (worldX - viewport.x) * viewport.zoom;
    const screenY = dimensions.height / 2 + (worldY - viewport.y) * viewport.zoom;
    return { x: screenX, y: screenY };
  }, [viewport, dimensions]);

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
    ctx.fillRect(10, 10, 100, 30);
    ctx.fillStyle = '#ffffff';
    ctx.font = '12px Arial';
    ctx.fillText(`X: ${Math.floor(viewport.x)}, Y: ${Math.floor(viewport.y)}`, 15, 25);
    ctx.fillText(`Pixel Size: ${PIXEL_SIZE}px`, 15, 40);

    // Show layout changing indicator
    if (isLayoutChanging) {
      ctx.fillStyle = 'rgba(59, 130, 246, 0.8)';
      ctx.fillRect(10, 45, 80, 20);
      ctx.fillStyle = '#ffffff';
      ctx.font = '10px Arial';
      ctx.fillText('Resizing...', 15, 58);
    }
  }, [viewport, dimensions, pixels, selectedPixel]);

  // Ensure zoom is always fixed to pixel size
  useEffect(() => {
    if (viewport.zoom !== PIXEL_SIZE) {
      setViewport(prev => ({ ...prev, zoom: PIXEL_SIZE }));
    }
  }, [viewport.zoom]);

  // Re-render when dependencies change
  useEffect(() => {
    render();
  }, [render]);

  // Mouse event handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsPanning(true);
    setLastMousePos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isPanning) {
      const deltaX = e.clientX - lastMousePos.x;
      const deltaY = e.clientY - lastMousePos.y;

      setViewport(prev => ({
        ...prev,
        x: prev.x - deltaX / prev.zoom,
        y: prev.y - deltaY / prev.zoom,
      }));

      setLastMousePos({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isPanning && onPixelSelect) {
      const worldCoords = screenToWorld(e.clientX, e.clientY);
      onPixelSelect(worldCoords.x, worldCoords.y);
    }
  };

  // No double-click needed - pixel size is always fixed

  // No wheel zoom - pixel size is fixed
  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    e.stopPropagation();
    // Pixel size remains fixed - no zooming allowed
  };

  // Touch event handlers for mobile
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 1) {
      setIsPanning(true);
      setLastMousePos({
        x: e.touches[0].clientX,
        y: e.touches[0].clientY
      });
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (isPanning && e.touches.length === 1) {
      e.preventDefault();
      const deltaX = e.touches[0].clientX - lastMousePos.x;
      const deltaY = e.touches[0].clientY - lastMousePos.y;

      setViewport(prev => ({
        ...prev,
        x: prev.x - deltaX / prev.zoom,
        y: prev.y - deltaY / prev.zoom,
      }));

      setLastMousePos({
        x: e.touches[0].clientX,
        y: e.touches[0].clientY
      });
    }
  };

  const handleTouchEnd = () => {
    setIsPanning(false);
  };

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