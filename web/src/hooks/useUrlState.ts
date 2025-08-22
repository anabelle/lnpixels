import { useState, useEffect, useCallback } from 'react';

export interface UrlState {
  x: number;
  y: number;
  z: number; // zoom level
}

const MIN_ZOOM = 1;
const MAX_ZOOM = 10;

export const useUrlState = () => {
  const [urlState, setUrlState] = useState<UrlState>({
    x: 0,
    y: 0,
    z: 1,
  });

  // Parse URL parameters on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    const parseNumber = (value: string | null, defaultValue: number): number => {
      if (!value) return defaultValue;
      const parsed = parseFloat(value);
      return isNaN(parsed) ? defaultValue : parsed;
    };

    const x = parseNumber(params.get('x'), 0);
    const y = parseNumber(params.get('y'), 0);
    let z = parseNumber(params.get('z'), 1);

    // Clamp zoom to valid range
    z = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z));

    setUrlState({ x, y, z });
  }, []);

  const updateUrlState = useCallback((newState: Partial<UrlState>) => {
    const currentState = { ...urlState, ...newState };

    // Round coordinates to integers, keep zoom as float for smooth transitions
    const roundedState = {
      x: Math.round(currentState.x),
      y: Math.round(currentState.y),
      z: currentState.z, // Don't round zoom to allow smooth transitions
    };

    // Only update if something actually changed
    if (
      roundedState.x !== urlState.x ||
      roundedState.y !== urlState.y ||
      roundedState.z !== urlState.z
    ) {
      setUrlState(roundedState);

      // Update URL
      const params = new URLSearchParams();
      params.set('x', roundedState.x.toString());
      params.set('y', roundedState.y.toString());
      params.set('z', roundedState.z.toString());

      const newUrl = `/?${params.toString()}`;
      window.history.replaceState(null, '', newUrl);
    }
  }, [urlState]);

  return {
    urlState,
    updateUrlState,
  };
};