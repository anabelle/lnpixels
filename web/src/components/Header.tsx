import React from 'react';
import { useTheme } from '../theme';

const Header = () => {
  const { actualTheme, toggleTheme } = useTheme();

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
          <span className="coordinates" aria-label="Current coordinates">0, 0</span>
          <span className="zoom" aria-label="Current zoom level">100%</span>
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