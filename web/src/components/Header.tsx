import React from 'react';
import { useTheme } from '../theme';
import SocialLinks from './SocialLinks';

interface HeaderProps {
  urlState?: {
    x: number;
    y: number;
    z: number;
  };
  onShowWelcome?: () => void;
}

const Header: React.FC<HeaderProps> = ({ urlState, onShowWelcome }) => {
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
        <div className="brand-container">
          <div className="pixel-logo">
            <div className="pixel-character">
              <div className="pixel-face">
                <div className="pixel-eye"></div>
                <div className="pixel-eye"></div>
                <div className="pixel-mouth"></div>
              </div>
            </div>
          </div>
          <h1 className="brand">LNPixels</h1>
        </div>
        <nav className="nav" aria-label="Main navigation">
          <SocialLinks size="sm" />
        </nav>
        <div className="header-controls" aria-label="Canvas information and controls">
          <div className="position-display" aria-label="Current position and zoom">
            <span className="coordinates">
              {formatCoordinates(displayX, displayY)}
            </span>
            <span className="zoom">
              {formatZoom(displayZoom)}
            </span>
          </div>
          {onShowWelcome && (
            <button
              className="help-button"
              onClick={onShowWelcome}
              aria-label="Show welcome tutorial"
              title="How does this work?"
            >
              ?
            </button>
          )}
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