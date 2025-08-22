import { useEffect, useCallback } from 'react';
import { Viewport } from '../types/canvas';
import { useViewport } from './useViewport';
import { useUrlState, UrlState } from './useUrlState';

export const useViewportWithUrl = () => {
  const { urlState, updateUrlState } = useUrlState();

  // Convert URL state to viewport state
  const urlToViewport = useCallback((url: UrlState): Partial<Viewport> => {
    return {
      x: url.x,
      y: url.y,
      zoom: url.z * 20, // Convert URL zoom (1-10) to pixel zoom (20-200)
    };
  }, []);

  // Convert viewport state to URL state
  const viewportToUrl = useCallback((viewport: Viewport): Partial<UrlState> => {
    return {
      x: viewport.x,
      y: viewport.y,
      z: viewport.zoom / 20, // Convert pixel zoom to URL zoom (1-10) - allow smooth transitions
    };
  }, []);

  const { viewport, pan, zoom, setZoom, centerOn } = useViewport(urlToViewport(urlState));

  // Sync viewport changes back to URL
  const handlePan = useCallback((deltaX: number, deltaY: number) => {
    try {
      pan(deltaX, deltaY);
      const newUrlState = viewportToUrl({
        ...viewport,
        x: viewport.x - deltaX / viewport.zoom,
        y: viewport.y - deltaY / viewport.zoom,
      });
      updateUrlState(newUrlState);
    } catch (error) {
      console.error('Error during pan operation:', error);
    }
  }, [pan, viewport, viewportToUrl, updateUrlState]);

  const handleZoom = useCallback((zoomFactor: number) => {
    try {
      zoom(zoomFactor);
      const newZoom = Math.max(5, Math.min(100, viewport.zoom * zoomFactor));
      const newUrlState = viewportToUrl({
        ...viewport,
        zoom: newZoom,
      });
      updateUrlState(newUrlState);
    } catch (error) {
      console.error('Error during zoom operation:', error);
    }
  }, [zoom, viewport, viewportToUrl, updateUrlState]);

  const handleSetZoom = useCallback((newZoom: number) => {
    try {
      setZoom(newZoom);
      const newUrlState = viewportToUrl({
        ...viewport,
        zoom: newZoom,
      });
      updateUrlState(newUrlState);
    } catch (error) {
      console.error('Error during setZoom operation:', error);
    }
  }, [setZoom, viewport, viewportToUrl, updateUrlState]);

  const handleCenterOn = useCallback((x: number, y: number) => {
    try {
      centerOn(x, y);
      const newUrlState = viewportToUrl({
        ...viewport,
        x,
        y,
      });
      updateUrlState(newUrlState);
    } catch (error) {
      console.error('Error during centerOn operation:', error);
    }
  }, [centerOn, viewport, viewportToUrl, updateUrlState]);

  return {
    viewport,
    pan: handlePan,
    zoom: handleZoom,
    setZoom: handleSetZoom,
    centerOn: handleCenterOn,
    urlState,
  };
};