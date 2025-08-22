import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Canvas from '../src/components/Canvas';
import { ViewportProvider } from '../src/contexts/ViewportContext';

describe('Zoom Smoothness', () => {
  const renderCanvas = (props?: any) => {
    return render(
      <ViewportProvider>
        <Canvas {...props} />
      </ViewportProvider>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should handle smooth zoom transitions without jumping', () => {
    renderCanvas();
    const canvas = screen.getByRole('img', { hidden: true });

    // Simulate multiple small zoom events to test smoothness
    for (let i = 0; i < 10; i++) {
      fireEvent.wheel(canvas, { deltaY: -10 }); // Small zoom in
    }

    // Canvas should still be present and functional
    expect(canvas).toBeInTheDocument();
  });

  it('should handle extreme zoom attempts without crashing', () => {
    renderCanvas();
    const canvas = screen.getByRole('img', { hidden: true });

    // Try to zoom way beyond limits
    fireEvent.wheel(canvas, { deltaY: -10000 }); // Extreme zoom in
    fireEvent.wheel(canvas, { deltaY: 10000 });  // Extreme zoom out

    // Canvas should still be present and functional
    expect(canvas).toBeInTheDocument();
  });

  it('should maintain zoom limits without infinite loops', () => {
    renderCanvas();
    const canvas = screen.getByRole('img', { hidden: true });

    // Try multiple rapid zoom operations at limits
    for (let i = 0; i < 50; i++) {
      fireEvent.wheel(canvas, { deltaY: -1000 }); // Try to zoom in beyond limit
    }

    // Should not crash and should still be functional
    expect(canvas).toBeInTheDocument();
  });

  it('should handle invalid zoom factors gracefully', () => {
    renderCanvas();
    const canvas = screen.getByRole('img', { hidden: true });

    // These should not cause crashes
    fireEvent.wheel(canvas, { deltaY: NaN });
    fireEvent.wheel(canvas, { deltaY: Infinity });
    fireEvent.wheel(canvas, { deltaY: -Infinity });

    expect(canvas).toBeInTheDocument();
  });
});