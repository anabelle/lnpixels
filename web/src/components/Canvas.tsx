import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Pixel, CanvasProps } from '../types/canvas';
import { useViewportContext } from '../contexts/ViewportContext';
import { useCanvasCoordinates } from '../hooks/useCanvasCoordinates';
import { useCanvasEvents } from '../hooks/useCanvasEvents';
import { validatePixelSelection } from '../lib/pixelValidation';
import {
  RectangleSelectionState,
  createRectangleSelection,
  updateRectangleSelection,
  completeRectangleSelection,
  cancelRectangleSelection,
  Rectangle
} from '../lib/rectangleSelection';

const Canvas: React.FC<CanvasProps> = ({
  pixels = [],
  onPixelSelect,
  selectedPixel,
  className = ''
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [isLayoutChanging, setIsLayoutChanging] = useState(false);
  const [rectangleSelection, setRectangleSelection] = useState<RectangleSelectionState>(
    createRectangleSelection()
  );
  const [lastSelectedPixel, setLastSelectedPixel] = useState<{ x: number; y: number } | null>(null);
  const [selectedRectangle, setSelectedRectangle] = useState<Rectangle | null>(null);

  // Use shared viewport context
  const { viewport, pan, zoom } = useViewportContext();
  const { screenToWorld, worldToScreen } = useCanvasCoordinates(canvasRef, viewport, dimensions);

  // Custom pixel selection handler with validation and rectangle selection
  const handlePixelInteraction = useCallback((screenX: number, screenY: number, isShiftPressed: boolean) => {
    const worldCoords = screenToWorld(screenX, screenY);
    const x = Math.round(worldCoords.x);
    const y = Math.round(worldCoords.y);

    const validation = validatePixelSelection(x, y, pixels);

    if (!validation.isValid) {
      return; // Invalid coordinates, ignore
    }

    if (isShiftPressed) {
      // Handle rectangle selection
      if (lastSelectedPixel) {
        // Start rectangle selection from last selected pixel
        let newSelectionState = updateRectangleSelection(rectangleSelection, lastSelectedPixel.x, lastSelectedPixel.y, true);
        newSelectionState = updateRectangleSelection(newSelectionState, x, y, true);
        setRectangleSelection(newSelectionState);

        // Complete the rectangle selection immediately
        const completed = completeRectangleSelection(newSelectionState);
        if (completed && onPixelSelect) {
          // Store the selected rectangle for visual feedback
          setSelectedRectangle(completed.rectangle);

          // For now, just select the first pixel of the rectangle
          // TODO: Implement bulk selection in purchase panel
          onPixelSelect(completed.rectangle.x1, completed.rectangle.y1);
          setRectangleSelection(createRectangleSelection());
        }
      } else {
        console.log('No previous pixel selected for rectangle');
        // No previous pixel selected, start from current position
        const newSelectionState = updateRectangleSelection(rectangleSelection, x, y, true);
        setRectangleSelection(newSelectionState);
      }
    } else {
      // Cancel any active rectangle selection
      if (rectangleSelection.isActive) {
        setRectangleSelection(cancelRectangleSelection(rectangleSelection));
      }

      // Clear selected rectangle when doing single pixel selection
      setSelectedRectangle(null);

      // Handle single pixel selection
      if (onPixelSelect) {
        onPixelSelect(x, y);
      }

      // Store this as the last selected pixel for future rectangle selections
      setLastSelectedPixel({ x, y });
    }
  }, [pixels, onPixelSelect, rectangleSelection, screenToWorld, lastSelectedPixel]);

  // Use original canvas events for panning/zooming
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
    onPixelSelect: (x, y) => {
      // Handle single pixel selection through the original system
      if (onPixelSelect) {
        onPixelSelect(x, y);
      }
      // Store this as the last selected pixel for future rectangle selections
      setLastSelectedPixel({ x, y });
      // Clear any selected rectangle when selecting a single pixel
      setSelectedRectangle(null);
    },
  });

  // Custom click handler that supports rectangle selection
  const handleClickCustom = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.shiftKey) {
      // Handle shift+click for rectangle selection
      e.preventDefault();
      handlePixelInteraction(e.clientX, e.clientY, true);
    } else {
      // Let the original click handler handle regular clicks
      handleClick(e);
    }
  }, [handlePixelInteraction, handleClick]);



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

    // Ensure canvas is properly sized
    if (canvas.width !== dimensions.width || canvas.height !== dimensions.height) {
      canvas.width = dimensions.width;
      canvas.height = dimensions.height;
    }

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

    // Draw selection highlight - prioritize rectangle over single pixel
    if (selectedRectangle) {
      // Draw selected rectangle highlight with same style as selected pixel
      const rect = selectedRectangle;

      // Convert world coordinates to screen coordinates
      const screenX1 = (rect.x1 - viewport.x) * viewport.zoom + dimensions.width / 2;
      const screenY1 = (rect.y1 - viewport.y) * viewport.zoom + dimensions.height / 2;
      const screenX2 = (rect.x2 - viewport.x) * viewport.zoom + dimensions.width / 2;
      const screenY2 = (rect.y2 - viewport.y) * viewport.zoom + dimensions.height / 2;

      const width = screenX2 - screenX1;
      const height = screenY2 - screenY1;

      // Ensure we have valid dimensions before drawing
      if (width > 0 && height > 0) {
        // Draw white border (outer) - same as selected pixel
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2 / viewport.zoom;
        ctx.strokeRect(screenX1, screenY1, width, height);

        // Draw black border (inner) - same as selected pixel
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1 / viewport.zoom;
        ctx.strokeRect(screenX1, screenY1, width, height);
      }
    } else if (selectedPixel) {
      // Draw selected pixel highlight only if no rectangle is selected
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2 / viewport.zoom;
      ctx.strokeRect(selectedPixel.x, selectedPixel.y, 1, 1);

      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1 / viewport.zoom;
      ctx.strokeRect(selectedPixel.x, selectedPixel.y, 1, 1);
    }

    ctx.restore();

    // Show layout changing indicator
    if (isLayoutChanging) {
      ctx.fillStyle = 'rgba(59, 130, 246, 0.8)';
      ctx.fillRect(10, 45, 80, 20);
      ctx.fillStyle = '#ffffff';
      ctx.font = '10px Arial';
      ctx.fillText('Resizing...', 15, 58);
    }

    // Note: Rectangle selection is now immediate, so no visual feedback needed
    // The selection completes instantly on shift+click
  }, [viewport, dimensions, pixels, selectedPixel, selectedRectangle, screenToWorld]);

  // Zoom is now user-controllable - no longer forced to fixed size

  // Re-render when dependencies change
  useEffect(() => {
    render();
  }, [render]);

  // Force re-render when selectedRectangle changes
  useEffect(() => {
    if (selectedRectangle) {
      // Use requestAnimationFrame to ensure proper timing
      requestAnimationFrame(() => {
        const canvas = canvasRef.current;
        if (canvas) {
          const ctx = canvas.getContext('2d');
          if (ctx) {
            render();
          }
        }
      });
    }
  }, [selectedRectangle, render]);







  return (
    <>
      <canvas
        ref={canvasRef}
        className={`pixel-canvas ${className}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={handleClickCustom}
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
          position: 'relative',
          zIndex: 1,
        }}
      />

      {/* Visual overlay for rectangle selection as fallback */}
      {selectedRectangle && (
        <div
          style={{
            position: 'absolute',
            left: `${((selectedRectangle.x1 - viewport.x) * viewport.zoom + dimensions.width / 2)}px`,
            top: `${((selectedRectangle.y1 - viewport.y) * viewport.zoom + dimensions.height / 2)}px`,
            width: `${(selectedRectangle.x2 - selectedRectangle.x1 + 1) * viewport.zoom}px`,
            height: `${(selectedRectangle.y2 - selectedRectangle.y1 + 1) * viewport.zoom}px`,
            border: '2px solid white',
            outline: '1px solid black',
            pointerEvents: 'none',
            zIndex: 10,
          }}
        />
      )}
    </>
  );
};

export default Canvas;