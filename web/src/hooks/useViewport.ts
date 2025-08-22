import { useState, useCallback } from 'react';
import { Viewport } from '../types/canvas';

const PIXEL_SIZE = 20; // pixels per world unit
const MIN_ZOOM = 5;
const MAX_ZOOM = 100;

export const useViewport = (initialZoom: number = PIXEL_SIZE) => {
  const [viewport, setViewport] = useState<Viewport>({
    x: 0,
    y: 0,
    zoom: initialZoom,
  });

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