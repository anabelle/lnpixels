import { useCallback } from 'react';
import { Viewport } from '../types/canvas';

export const useCanvasCoordinates = (
  canvasRef: React.RefObject<HTMLCanvasElement>,
  viewport: Viewport,
  dimensions: { width: number; height: number }
) => {
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
  }, [canvasRef, viewport, dimensions]);

  // Convert world coordinates to screen coordinates
  const worldToScreen = useCallback((worldX: number, worldY: number): { x: number; y: number } => {
    const screenX = dimensions.width / 2 + (worldX - viewport.x) * viewport.zoom;
    const screenY = dimensions.height / 2 + (worldY - viewport.y) * viewport.zoom;
    return { x: screenX, y: screenY };
  }, [viewport, dimensions]);

  return {
    screenToWorld,
    worldToScreen,
  };
};