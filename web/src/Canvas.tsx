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
  const [viewport, setViewport] = useState<Viewport>({
    x: 0,
    y: 0,
    zoom: 20, // 20 pixels per world unit (good for pixel art)
  });
  const [isPanning, setIsPanning] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  // Constants for zoom limits
  const MIN_ZOOM = 5;
  const MAX_ZOOM = 100;

  // Handle canvas resize
  useEffect(() => {
    const updateDimensions = () => {
      if (canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        setDimensions({ width: rect.width, height: rect.height });
        canvasRef.current.width = rect.width;
        canvasRef.current.height = rect.height;
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

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
    ctx.fillRect(10, 10, 120, 40);
    ctx.fillStyle = '#ffffff';
    ctx.font = '12px Arial';
    ctx.fillText(`X: ${Math.floor(viewport.x)}, Y: ${Math.floor(viewport.y)}`, 15, 25);
    ctx.fillText(`Zoom: ${viewport.zoom.toFixed(1)}x`, 15, 40);
  }, [viewport, dimensions, pixels, selectedPixel]);

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

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();

    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, viewport.zoom * zoomFactor));

    setViewport(prev => ({
      ...prev,
      zoom: newZoom,
    }));
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