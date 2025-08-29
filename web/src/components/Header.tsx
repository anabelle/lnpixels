import React from 'react';
import { useTheme } from '../theme';
import SocialLinks from './SocialLinks';

interface HeaderProps {
  urlState?: {
    x: number;
    y: number;
    z: number;
  };
}

const Header: React.FC<HeaderProps> = ({ urlState }) => {
  const { actualTheme, toggleTheme } = useTheme();

  // Format coordinates and zoom for display
  const formatCoordinates = (x: number, y: number): string => {
    return `${Math.round(x)}, ${Math.round(y)}`;
  };

  const formatZoom = (zoom: number): string => {
    // URL zoom (1-10) directly converts to percentage
    return `${Math.round(zoom * 100)}%`;
  };

  // Use actual URL state values or defaults
  const displayX = urlState?.x ?? 0;
  const displayY = urlState?.y ?? 0;
  const displayZoom = urlState?.z ?? 1;

  return (
    <header className="header" role="banner">
      <div className="header-content">
        <h1 className="brand">LNPixels</h1>
        <nav className="nav" aria-label="Main navigation">
          <SocialLinks size="sm" />
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