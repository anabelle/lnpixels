import React from 'react';
import { useTheme } from '../theme';

interface HeaderProps {
  viewport?: {
    x: number;
    y: number;
    zoom: number;
  };
}

const Header: React.FC<HeaderProps> = ({ viewport }) => {
  const { actualTheme, toggleTheme } = useTheme();

  // Format coordinates and zoom for display
  const formatCoordinates = (x: number, y: number): string => {
    return `${Math.round(x)}, ${Math.round(y)}`;
  };

  const formatZoom = (zoom: number): string => {
    return `${Math.round(zoom * 100)}%`;
  };

  // Use actual viewport values or defaults
  const displayX = viewport?.x ?? 0;
  const displayY = viewport?.y ?? 0;
  const displayZoom = viewport?.zoom ?? 1;

  return (
    <header className="header" role="banner">
      <div className="header-content">
        <h1 className="brand">LNPixels</h1>
        <nav className="nav" aria-label="Main navigation">
          <button className="nav-button" aria-label="Go to canvas">Canvas</button>
          <button className="nav-button" aria-label="View activity feed">Activity</button>
          <button className="nav-button" aria-label="Get help">Help</button>
        </nav>
        <div className="header-controls" aria-label="Canvas information and controls">
          <span className="coordinates" aria-label="Current coordinates">
            {formatCoordinates(displayX, displayY)}
          </span>
          <span className="zoom" aria-label="Current zoom level">
            {formatZoom(displayZoom)}
          </span>
          <button
            className="theme-toggle"
            onClick={toggleTheme}
            aria-label={`Switch to ${actualTheme === 'light' ? 'dark' : 'light'} mode`}
          >
            {actualTheme === 'light' ? '🌙' : '☀️'}
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;