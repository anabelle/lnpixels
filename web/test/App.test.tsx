import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from '../src/App';

describe('App', () => {
  it('should render the main layout components', () => {
    render(<App />);

    // Check for main brand
    expect(screen.getByText('LNPixels')).toBeInTheDocument();

    // Check for navigation buttons
    expect(screen.getByText('Canvas')).toBeInTheDocument();
    expect(screen.getByText('Activity')).toBeInTheDocument();
    expect(screen.getByText('Help')).toBeInTheDocument();

    // Check for purchase panel content
    expect(screen.getByText('Pixel Purchase')).toBeInTheDocument();
    expect(screen.getByText('Basic (1 sat)')).toBeInTheDocument();

    // Check for activity feed content
    expect(screen.getByText('Recent Activity')).toBeInTheDocument();
    expect(screen.getByText('Pixel (10, 20) purchased')).toBeInTheDocument();
  });

  it('should have proper accessibility attributes', () => {
    render(<App />);

    // Check for semantic HTML structure
    expect(screen.getByRole('banner')).toBeInTheDocument(); // header
    expect(screen.getByRole('main')).toBeInTheDocument(); // canvas area
    expect(screen.getAllByRole('complementary')).toHaveLength(2); // sidebars
  });

  it('should support panel toggling', () => {
    render(<App />);

    // Check that toggle buttons exist
    const toggleButtons = screen.getAllByLabelText(/toggle|collapse|expand/i);
    expect(toggleButtons.length).toBeGreaterThan(0);
  });

  it('should have theme toggle functionality', () => {
    render(<App />);

    // Check that theme toggle button exists
    const themeToggle = screen.getByLabelText(/toggle theme|switch theme|dark mode|light mode/i);
    expect(themeToggle).toBeInTheDocument();
  });

  it('should support theme switching', () => {
    render(<App />);

    // Check that theme classes are applied to root element
    const root = document.documentElement;
    expect(root).toHaveClass(/light|dark/);
  });
});