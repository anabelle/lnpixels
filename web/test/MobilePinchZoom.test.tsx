import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import Canvas from '../src/components/Canvas';
import { ViewportProvider, useViewportContext } from '../src/contexts/ViewportContext';
import { useEffect } from 'react';

// Mock touch events to simulate pinch gestures
const createTouchEvent = (type: string, touches: Array<{ clientX: number; clientY: number }>) => {
  const event = new TouchEvent(type, {
    touches: touches as any,
    bubbles: true,
    cancelable: true,
  });
  return event;
};

// Test component to capture zoom changes
const ZoomCapture = ({ onZoomChange }: { onZoomChange: (zoom: number) => void }) => {
  const { viewport } = useViewportContext();
  
  useEffect(() => {
    onZoomChange(viewport.zoom);
  }, [viewport.zoom, onZoomChange]);
  
  return null;
};

describe('Mobile Pinch Zoom', () => {
  it('should zoom in when pinching outward', () => {
    const mockOnSelectionChange = vi.fn();
    let currentZoom = 20; // Initial zoom from viewport
    const mockZoomChange = vi.fn((zoom: number) => {
      currentZoom = zoom;
    });
    
    const { container } = render(
      <ViewportProvider>
        <ZoomCapture onZoomChange={mockZoomChange} />
        <Canvas
          pixels={[]}
          onSelectionChange={mockOnSelectionChange}
        />
      </ViewportProvider>
    );

    const canvas = container.querySelector('canvas');
    expect(canvas).toBeTruthy();
    
    const initialZoom = currentZoom;

    // Start pinch gesture with two fingers close together
    const touchStart = createTouchEvent('touchstart', [
      { clientX: 100, clientY: 100 },
      { clientX: 110, clientY: 110 }
    ]);
    fireEvent(canvas!, touchStart);

    // Move fingers apart to zoom in (distance increases from ~14 to ~71)
    const touchMove = createTouchEvent('touchmove', [
      { clientX: 80, clientY: 80 },
      { clientX: 130, clientY: 130 }
    ]);
    fireEvent(canvas!, touchMove);

    // End the gesture
    const touchEnd = createTouchEvent('touchend', []);
    fireEvent(canvas!, touchEnd);

    // The zoom should have increased significantly
    expect(currentZoom).toBeGreaterThan(initialZoom);
    expect(currentZoom).toBeGreaterThan(initialZoom * 2); // Should be at least 2x zoom
  });

  it('should zoom out when pinching inward', () => {
    const mockOnSelectionChange = vi.fn();
    let currentZoom = 20; // Initial zoom from viewport
    const mockZoomChange = vi.fn((zoom: number) => {
      currentZoom = zoom;
    });
    
    const { container } = render(
      <ViewportProvider>
        <ZoomCapture onZoomChange={mockZoomChange} />
        <Canvas
          pixels={[]}
          onSelectionChange={mockOnSelectionChange}
        />
      </ViewportProvider>
    );

    const canvas = container.querySelector('canvas');
    expect(canvas).toBeTruthy();
    
    const initialZoom = currentZoom;

    // Start pinch gesture with two fingers far apart
    const touchStart = createTouchEvent('touchstart', [
      { clientX: 50, clientY: 50 },
      { clientX: 150, clientY: 150 }
    ]);
    fireEvent(canvas!, touchStart);

    // Move fingers closer together to zoom out (distance decreases from ~141 to ~28)
    const touchMove = createTouchEvent('touchmove', [
      { clientX: 90, clientY: 90 },
      { clientX: 110, clientY: 110 }
    ]);
    fireEvent(canvas!, touchMove);

    // End the gesture
    const touchEnd = createTouchEvent('touchend', []);
    fireEvent(canvas!, touchEnd);

    // The zoom should have decreased significantly
    expect(currentZoom).toBeLessThan(initialZoom);
    expect(currentZoom).toBeLessThan(initialZoom * 0.5); // Should be less than half
  });
});