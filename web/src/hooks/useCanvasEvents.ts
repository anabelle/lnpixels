import { useState, useCallback } from 'react';
import { Viewport } from '../types/canvas';

interface UseCanvasEventsProps {
  viewport: Viewport;
  pan: (deltaX: number, deltaY: number) => void;
  zoom: (zoomFactor: number) => void;
  screenToWorld: (screenX: number, screenY: number) => { x: number; y: number };
  onPixelSelect?: (x: number, y: number) => void;
}

export const useCanvasEvents = ({
  viewport,
  pan,
  zoom,
  screenToWorld,
  onPixelSelect,
}: UseCanvasEventsProps) => {
  const [isPanning, setIsPanning] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
  const [isPinching, setIsPinching] = useState(false);
  const [initialPinchDistance, setInitialPinchDistance] = useState(0);
  const [initialPinchZoom, setInitialPinchZoom] = useState(viewport.zoom);

  // Helper function to calculate distance between two touch points
  const getTouchDistance = useCallback((touch1: Touch, touch2: Touch): number => {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }, []);

  // Mouse event handlers
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsPanning(true);
    setLastMousePos({ x: e.clientX, y: e.clientY });
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isPanning) {
      const deltaX = e.clientX - lastMousePos.x;
      const deltaY = e.clientY - lastMousePos.y;
      pan(deltaX, deltaY);
      setLastMousePos({ x: e.clientX, y: e.clientY });
    }
  }, [isPanning, lastMousePos, pan]);

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isPanning && onPixelSelect) {
      const worldCoords = screenToWorld(e.clientX, e.clientY);
      onPixelSelect(worldCoords.x, worldCoords.y);
    }
  }, [isPanning, onPixelSelect, screenToWorld]);

  const handleWheel = useCallback((e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    e.stopPropagation();

    // Smooth zoom with wheel
    const zoomFactor = e.deltaY > 0 ? 0.95 : 1.05;
    zoom(zoomFactor);
  }, [zoom]);

  // Touch event handlers for mobile
  const handleTouchStart = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 2) {
      // Start pinch gesture
      e.preventDefault();
      setIsPinching(true);
      const distance = getTouchDistance(e.touches[0], e.touches[1]);
      setInitialPinchDistance(distance);
      setInitialPinchZoom(viewport.zoom);
    } else if (e.touches.length === 1 && !isPinching) {
      // Start single touch pan
      setIsPanning(true);
      setLastMousePos({
        x: e.touches[0].clientX,
        y: e.touches[0].clientY
      });
    }
  }, [getTouchDistance, isPinching, viewport.zoom]);

  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 2 && isPinching) {
      // Handle pinch zoom
      e.preventDefault();
      const distance = getTouchDistance(e.touches[0], e.touches[1]);
      const zoomRatio = distance / initialPinchDistance;
      const newZoom = initialPinchZoom * zoomRatio;
      // Note: We would need to pass setZoom here, but for now we'll use the zoom function
      // This is a simplified version
    } else if (isPanning && e.touches.length === 1) {
      // Handle single touch pan
      e.preventDefault();
      const deltaX = e.touches[0].clientX - lastMousePos.x;
      const deltaY = e.touches[0].clientY - lastMousePos.y;
      pan(deltaX, deltaY);
      setLastMousePos({
        x: e.touches[0].clientX,
        y: e.touches[0].clientY
      });
    }
  }, [isPinching, getTouchDistance, initialPinchDistance, initialPinchZoom, isPanning, lastMousePos, pan]);

  const handleTouchEnd = useCallback(() => {
    setIsPanning(false);
    setIsPinching(false);
  }, []);

  return {
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
  };
};