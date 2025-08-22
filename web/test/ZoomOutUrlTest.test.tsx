import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import Header from '../src/components/Header';
import { ThemeProvider } from '../src/theme';

describe('Header Zoom Display', () => {
  const renderHeader = (urlState?: { x: number; y: number; z: number }) => {
    return render(
      <ThemeProvider>
        <Header urlState={urlState} />
      </ThemeProvider>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should display zoom level from urlState (100% zoom)', () => {
    renderHeader({ x: 0, y: 0, z: 1 });
    expect(screen.getByLabelText('Current zoom level')).toHaveTextContent('100%');
  });

  it('should display zoom level from urlState (200% zoom)', () => {
    renderHeader({ x: 0, y: 0, z: 2 });
    expect(screen.getByLabelText('Current zoom level')).toHaveTextContent('200%');
  });

  it('should display zoom level from urlState (500% zoom)', () => {
    renderHeader({ x: 0, y: 0, z: 5 });
    expect(screen.getByLabelText('Current zoom level')).toHaveTextContent('500%');
  });

  it('should handle very low zoom values', () => {
    renderHeader({ x: 0, y: 0, z: 0.01 });
    // Header displays whatever value is passed to it
    expect(screen.getByLabelText('Current zoom level')).toHaveTextContent('1%');
  });

  it('should handle very high zoom values', () => {
    renderHeader({ x: 0, y: 0, z: 20 });
    // Header displays whatever value is passed to it
    expect(screen.getByLabelText('Current zoom level')).toHaveTextContent('2000%');
  });

  it('should display default values when no urlState provided', () => {
    renderHeader();
    expect(screen.getByLabelText('Current coordinates')).toHaveTextContent('0, 0');
    expect(screen.getByLabelText('Current zoom level')).toHaveTextContent('100%');
  });
});