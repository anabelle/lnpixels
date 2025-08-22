import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Header from '../src/components/Header';
import { ThemeProvider } from '../src/theme';

describe('Header Integration', () => {
  const renderHeader = (viewport?: { x: number; y: number; zoom: number }) => {
    return render(
      <ThemeProvider>
        <Header viewport={viewport} />
      </ThemeProvider>
    );
  };

  it('should update coordinates when viewport changes', () => {
    const { rerender } = renderHeader({ x: 0, y: 0, zoom: 1 });

    expect(screen.getByLabelText('Current coordinates')).toHaveTextContent('0, 0');
    expect(screen.getByLabelText('Current zoom level')).toHaveTextContent('100%');

    // Update viewport
    rerender(
      <ThemeProvider>
        <Header viewport={{ x: 100, y: 200, zoom: 2 }} />
      </ThemeProvider>
    );

    expect(screen.getByLabelText('Current coordinates')).toHaveTextContent('100, 200');
    expect(screen.getByLabelText('Current zoom level')).toHaveTextContent('200%');
  });

  it('should handle viewport state transitions correctly', () => {
    const { rerender } = renderHeader();

    // Start with default
    expect(screen.getByLabelText('Current coordinates')).toHaveTextContent('0, 0');

    // Change to specific coordinates
    rerender(
      <ThemeProvider>
        <Header viewport={{ x: -50, y: 75, zoom: 0.5 }} />
      </ThemeProvider>
    );

    expect(screen.getByLabelText('Current coordinates')).toHaveTextContent('-50, 75');
    expect(screen.getByLabelText('Current zoom level')).toHaveTextContent('50%');

    // Change back to center
    rerender(
      <ThemeProvider>
        <Header viewport={{ x: 0, y: 0, zoom: 1 }} />
      </ThemeProvider>
    );

    expect(screen.getByLabelText('Current coordinates')).toHaveTextContent('0, 0');
    expect(screen.getByLabelText('Current zoom level')).toHaveTextContent('100%');
  });
});