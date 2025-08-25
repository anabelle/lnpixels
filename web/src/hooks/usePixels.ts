import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchPixels, Pixel, Rectangle } from '../lib/api';
import { useViewportContext } from '../contexts/ViewportContext';
import { io, Socket } from 'socket.io-client';

interface UsePixelsResult {
  pixels: Pixel[];
  loading: boolean;
  error: string | null;
  refetchPixels: () => void;
  emitTestPixelUpdate?: () => void;
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

  console.log('🔧 usePixels hook initialized');

  // Throttling state
  const lastFetchTime = useRef<number>(0);
  const throttleTimeout = useRef<NodeJS.Timeout | null>(null);
  const pendingFetch = useRef<boolean>(false);

  // WebSocket connection
  const socketRef = useRef<Socket | null>(null);

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

  // Setup WebSocket connection for real-time updates
  useEffect(() => {
    console.log('🔌 Setting up WebSocket connection...');
    // Connect to the backend WebSocket server
    // Vite proxy handles the connection in development
    socketRef.current = io('/api', {
      transports: ['websocket', 'polling']
    });

    const socket = socketRef.current;

    socket.on('connect', () => {
      console.log('✅ Connected to WebSocket server');
      console.log('Socket ID:', socket.id);
      console.log('Socket connected:', socket.connected);
    });

    socket.on('connect_error', (error) => {
      console.error('❌ WebSocket connection error:', error);
    });

    socket.on('disconnect', (reason) => {
      console.log('🔌 Disconnected from WebSocket server:', reason);
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from WebSocket server');
    });

    // Listen for pixel updates from webhook payments
    socket.on('pixel.update', (updatedPixel: Pixel) => {
      console.log('Received pixel update via WebSocket:', updatedPixel);

      try {
        setPixels(currentPixels => {
          const existingIndex = currentPixels.findIndex(p => p.x === updatedPixel.x && p.y === updatedPixel.y);

          if (existingIndex >= 0) {
            // Update existing pixel
            const newPixels = [...currentPixels];
            newPixels[existingIndex] = updatedPixel;
            return newPixels;
          } else {
            // Add new pixel
            return [...currentPixels, updatedPixel];
          }
        });
      } catch (error) {
        console.error('Error updating pixels:', error);
      }
    });

    socket.on('activity.append', (activity) => {
      console.log('🔥 RECEIVED activity.append via WebSocket:', activity);
      console.log('Activity data type check:', typeof activity, activity);
      try {
        // Validate activity data before dispatching
        if (!activity || typeof activity.created_at !== 'number' || isNaN(activity.created_at)) {
          console.error('Invalid activity data from WebSocket:', activity);
          return;
        }

        // Emit custom event for activity updates that can be listened to by other components
        window.dispatchEvent(new CustomEvent('activityUpdate', { detail: activity }));
        console.log('Successfully dispatched activity update event');
      } catch (error) {
        console.error('Error dispatching activity update:', error);
      }
    });

    socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
    });

    // Cleanup on unmount
    return () => {
      socket.disconnect();
    };
  }, []);

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

  // Function to emit test pixel update (for development)
  const emitTestPixelUpdate = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.emit('test-update');
    }
  }, []);

  return {
    pixels,
    loading,
    error,
    refetchPixels,
    emitTestPixelUpdate,
  };
}

