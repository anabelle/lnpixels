import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchPixels, Pixel, Rectangle } from '../lib/api';
import { useViewportContext } from '../contexts/ViewportContext';

interface UsePixelsResult {
  pixels: Pixel[];
  loading: boolean;
  error: string | null;
  refetchPixels: () => void;
}

// Simple cache for pixel data
interface CacheEntry {
  pixels: Pixel[];
  timestamp: number;
  rect: Rectangle;
}

const pixelCache = new Map<string, CacheEntry>();
const CACHE_DURATION = 30000; // 30 seconds

/**
 * Custom hook to manage pixel data fetching based on viewport with throttling and caching
 */
export function usePixels(): UsePixelsResult {
  const [pixels, setPixels] = useState<Pixel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { viewport } = useViewportContext();

  // Throttling state
  const lastFetchTime = useRef<number>(0);
  const throttleTimeout = useRef<NodeJS.Timeout | null>(null);
  const pendingFetch = useRef<boolean>(false);

  const fetchPixelsData = useCallback(async (force: boolean = false) => {
    // Throttle API calls to prevent excessive requests
    const now = Date.now();
    const timeSinceLastFetch = now - lastFetchTime.current;
    const throttleDelay = 200; // 200ms minimum between requests

    if (!force && timeSinceLastFetch < throttleDelay) {
      // Schedule a fetch after the throttle delay
      if (throttleTimeout.current) {
        clearTimeout(throttleTimeout.current);
      }
      pendingFetch.current = true;
      throttleTimeout.current = setTimeout(() => {
        if (pendingFetch.current) {
          fetchPixelsData(true);
        }
      }, throttleDelay - timeSinceLastFetch);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      lastFetchTime.current = now;
      pendingFetch.current = false;

      // Calculate visible rectangle based on viewport
      // Add some padding to fetch pixels slightly outside the visible area
      const padding = 20; // Increased padding to reduce refetches
      const rect: Rectangle = {
        x1: Math.floor(viewport.x - (800 / viewport.zoom) / 2 - padding),
        y1: Math.floor(viewport.y - (600 / viewport.zoom) / 2 - padding),
        x2: Math.ceil(viewport.x + (800 / viewport.zoom) / 2 + padding),
        y2: Math.ceil(viewport.y + (600 / viewport.zoom) / 2 + padding),
      };

      // Create cache key from rectangle coordinates
      const cacheKey = `${rect.x1},${rect.y1},${rect.x2},${rect.y2}`;

      // Check cache first
      const cached = pixelCache.get(cacheKey);
      if (cached && (now - cached.timestamp) < CACHE_DURATION && !force) {
        console.log('Using cached pixels for:', cacheKey);
        setPixels(cached.pixels);
        setLoading(false);
        return;
      }

      console.log(`Fetching pixels for viewport: x=${viewport.x.toFixed(1)}, y=${viewport.y.toFixed(1)}, zoom=${viewport.zoom.toFixed(2)}`);
      const fetchedPixels = await fetchPixels(rect);

      // Cache the result
      pixelCache.set(cacheKey, {
        pixels: fetchedPixels,
        timestamp: now,
        rect: rect
      });

      // Clean up old cache entries (keep only last 10)
      if (pixelCache.size > 10) {
        const entries = Array.from(pixelCache.entries());
        entries.sort((a, b) => b[1].timestamp - a[1].timestamp);
        const toDelete = entries.slice(10);
        toDelete.forEach(([key]) => pixelCache.delete(key));
      }

      setPixels(fetchedPixels);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch pixels');
      console.error('Error fetching pixels:', err);
    } finally {
      setLoading(false);
    }
  }, [viewport]);

  // Fetch pixels when viewport changes, but with throttling
  useEffect(() => {
    fetchPixelsData();
  }, [fetchPixelsData]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (throttleTimeout.current) {
        clearTimeout(throttleTimeout.current);
      }
    };
  }, []);

  // Refetch function for manual refresh
  const refetchPixels = useCallback(() => {
    fetchPixelsData(true);
  }, [fetchPixelsData]);

  return {
    pixels,
    loading,
    error,
    refetchPixels,
  };
}

