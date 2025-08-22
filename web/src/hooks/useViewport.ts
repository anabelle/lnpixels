import { useState, useCallback, useEffect } from 'react';
import { Viewport } from '../types/canvas';

const PIXEL_SIZE = 20; // pixels per world unit
const MIN_ZOOM = 5;
const MAX_ZOOM = 100;

export const useViewport = (initialZoomOrState?: number | Partial<Viewport>) => {
  // Handle both old API (number) and new API (object)
  const initialState: Partial<Viewport> = typeof initialZoomOrState === 'number'
    ? { zoom: initialZoomOrState }
    : initialZoomOrState || {};

  const [viewport, setViewport] = useState<Viewport>({
    x: initialState.x ?? 0,
    y: initialState.y ?? 0,
    zoom: initialState.zoom ?? PIXEL_SIZE,
  });

  // Update viewport when initial state changes (e.g., from URL)
  useEffect(() => {
    if (initialState && Object.keys(initialState).length > 0) {
      setViewport(prev => ({
        ...prev,
        ...initialState,
      }));
    }
  }, [initialState.x, initialState.y, initialState.zoom]);

  const pan = useCallback((deltaX: number, deltaY: number) => {
    setViewport(prev => ({
      ...prev,
      x: prev.x - deltaX / prev.zoom,
      y: prev.y - deltaY / prev.zoom,
    }));
  }, []);

  const zoom = useCallback((zoomFactor: number) => {
    const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, viewport.zoom * zoomFactor));
    setViewport(prev => ({
      ...prev,
      zoom: newZoom,
    }));
  }, [viewport.zoom]);

  const setZoom = useCallback((newZoom: number) => {
    const clampedZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newZoom));
    setViewport(prev => ({
      ...prev,
      zoom: clampedZoom,
    }));
  }, []);

  const centerOn = useCallback((x: number, y: number) => {
    setViewport(prev => ({
      ...prev,
      x,
      y,
    }));
  }, []);

  return {
    viewport,
    setViewport,
    pan,
    zoom,
    setZoom,
    centerOn,
    MIN_ZOOM,
    MAX_ZOOM,
  };
};