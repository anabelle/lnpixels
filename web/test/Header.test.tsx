import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Header from '../src/components/Header';
import { ThemeProvider } from '../src/theme';

describe('Header', () => {
  const renderHeader = (props?: { urlState?: { x: number; y: number; z: number } }) => {
    return render(
      <ThemeProvider>
        <Header {...props} />
      </ThemeProvider>
    );
  };

  it('should render the header with brand name', () => {
    renderHeader();
    expect(screen.getByText('LNPixels')).toBeInTheDocument();
  });

  it('should render navigation buttons', () => {
    renderHeader();
    expect(screen.getByLabelText('Go to canvas')).toBeInTheDocument();
    expect(screen.getByLabelText('View activity feed')).toBeInTheDocument();
    expect(screen.getByLabelText('Get help')).toBeInTheDocument();
  });

  it('should render theme toggle button', () => {
    renderHeader();
    expect(screen.getByLabelText(/switch to/i)).toBeInTheDocument();
  });

  it('should display default coordinates when no viewport provided', () => {
    renderHeader();
    expect(screen.getByLabelText('Current coordinates')).toHaveTextContent('0, 0');
  });

  it('should display default zoom when no viewport provided', () => {
    renderHeader();
    expect(screen.getByLabelText('Current zoom level')).toHaveTextContent('100%');
  });

  it('should display actual coordinates when urlState provided', () => {
    renderHeader({ urlState: { x: 100, y: 200, z: 2 } });
    expect(screen.getByLabelText('Current coordinates')).toHaveTextContent('100, 200');
  });

  it('should display actual zoom level when urlState provided', () => {
    renderHeader({ urlState: { x: 0, y: 0, z: 2 } });
    expect(screen.getByLabelText('Current zoom level')).toHaveTextContent('200%');
  });

  it('should handle fractional coordinates correctly', () => {
    renderHeader({ urlState: { x: 100.7, y: 200.3, z: 1.5 } });
    expect(screen.getByLabelText('Current coordinates')).toHaveTextContent('101, 200');
  });

  it('should handle fractional zoom correctly', () => {
    renderHeader({ urlState: { x: 0, y: 0, z: 1.234 } });
    expect(screen.getByLabelText('Current zoom level')).toHaveTextContent('123%');
  });

  it('should handle negative coordinates', () => {
    renderHeader({ urlState: { x: -50, y: -25, z: 1 } });
    expect(screen.getByLabelText('Current coordinates')).toHaveTextContent('-50, -25');
  });

  it('should handle zoom less than 1', () => {
    renderHeader({ urlState: { x: 0, y: 0, z: 0.5 } });
    expect(screen.getByLabelText('Current zoom level')).toHaveTextContent('50%');
  });

  it('should have proper accessibility attributes', () => {
    renderHeader();
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByLabelText('Main navigation')).toBeInTheDocument();
    expect(screen.getByLabelText('Canvas information and controls')).toBeInTheDocument();
  });
});