import React, { useState } from 'react';
import './App.css';
import { ThemeProvider, useTheme } from './theme';
import Canvas from './Canvas';

// Placeholder components for the layout
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

const CanvasComponent = ({
  pixels,
  selectedPixel,
  onPixelSelect
}: {
  pixels: typeof samplePixels;
  selectedPixel: { x: number; y: number } | null;
  onPixelSelect: (x: number, y: number) => void;
}) => (
  <main className="canvas-container" role="main" aria-label="Pixel canvas">
    <Canvas
      pixels={pixels}
      onPixelSelect={onPixelSelect}
      selectedPixel={selectedPixel}
      className="pixel-canvas"
    />
    <div className="canvas-overlay" aria-live="polite">
      <div className="selection-tool">
        <div className="selection-info" role="status">
          {selectedPixel
            ? `Selected: (${selectedPixel.x}, ${selectedPixel.y})`
            : 'Click to select a pixel'
          }
        </div>
      </div>
    </div>
  </main>
);

const PurchasePanel = ({ collapsed, onToggle }: { collapsed?: boolean; onToggle?: () => void }) => (
  <aside
    className={`purchase-panel ${collapsed ? 'collapsed' : ''}`}
    role="complementary"
    aria-label="Purchase panel"
    onClick={collapsed ? onToggle : undefined}
  >
    <div className="panel-header" onClick={collapsed ? onToggle : undefined}>
      <h3>Pixel Purchase</h3>
      {onToggle && !collapsed && (
        <button
          className="toggle-button"
          onClick={onToggle}
          aria-label={collapsed ? 'Expand purchase panel' : 'Collapse purchase panel'}
        >
          {collapsed ? '→' : '←'}
        </button>
      )}
    </div>

    {!collapsed && (
      <>
        <div className="panel-section">
          <div className="pixel-type-selector" role="radiogroup" aria-label="Pixel type selection">
            <button className="type-button active" role="radio" aria-checked="true" aria-label="Basic pixel for 1 satoshi">
              Basic (1 sat)
            </button>
            <button className="type-button" role="radio" aria-checked="false" aria-label="Color pixel for 10 satoshis">
              Color (10 sats)
            </button>
            <button className="type-button" role="radio" aria-checked="false" aria-label="Color plus letter pixel for 100 satoshis">
              Color + Letter (100 sats)
            </button>
          </div>
        </div>

        <div className="panel-section">
          <h4>Selected Pixels</h4>
          <div className="selection-summary" role="region" aria-label="Selection summary">
            <div className="summary-item">
              <span>Count:</span>
              <span aria-label="Selected pixel count">0</span>
            </div>
            <div className="summary-item">
              <span>Total:</span>
              <span aria-label="Total cost in satoshis">0 sats</span>
            </div>
          </div>
        </div>

        <div className="panel-section">
          <button className="purchase-button" disabled aria-describedby="purchase-status">
            Generate Invoice
          </button>
          <div id="purchase-status" className="sr-only">
            No pixels selected. Please select pixels to generate an invoice.
          </div>
        </div>
      </>
    )}
  </aside>
);

const ActivityFeed = ({ collapsed, onToggle }: { collapsed?: boolean; onToggle?: () => void }) => (
  <aside
    className={`activity-feed ${collapsed ? 'collapsed' : ''}`}
    role="complementary"
    aria-label="Activity feed"
    onClick={collapsed ? onToggle : undefined}
  >
    <div className="panel-header" onClick={collapsed ? onToggle : undefined}>
      <h3>Recent Activity</h3>
      {onToggle && !collapsed && (
        <button
          className="toggle-button"
          onClick={onToggle}
          aria-label={collapsed ? 'Expand activity feed' : 'Collapse activity feed'}
        >
          {collapsed ? '←' : '→'}
        </button>
      )}
    </div>

    {!collapsed && (
      <div className="panel-section">
        <div className="activity-list" role="log" aria-label="Recent pixel purchases" aria-live="polite">
          <div className="activity-item" role="article">
            <div className="activity-content">
              <span className="activity-text">Pixel (10, 20) purchased</span>
              <time className="activity-time" dateTime="2024-01-01T12:00:00Z">2 min ago</time>
            </div>
          </div>
          <div className="activity-item" role="article">
            <div className="activity-content">
              <span className="activity-text">Rectangle 5×3 purchased</span>
              <time className="activity-time" dateTime="2024-01-01T11:55:00Z">5 min ago</time>
            </div>
          </div>
          <div className="activity-item" role="article">
            <div className="activity-content">
              <span className="activity-text">Pixel (0, 0) updated</span>
              <time className="activity-time" dateTime="2024-01-01T11:52:00Z">8 min ago</time>
            </div>
          </div>
        </div>
      </div>
    )}
  </aside>
);

const MobileTabs = ({ activeTab, onTabChange }: { activeTab: string; onTabChange: (tab: string) => void }) => (
  <nav className="mobile-tabs" role="tablist" aria-label="Mobile navigation">
    <button
      className={`tab-button ${activeTab === 'canvas' ? 'active' : ''}`}
      role="tab"
      aria-selected={activeTab === 'canvas'}
      aria-controls="canvas-panel"
      onClick={() => onTabChange('canvas')}
    >
      <span>Canvas</span>
    </button>
    <button
      className={`tab-button ${activeTab === 'purchase' ? 'active' : ''}`}
      role="tab"
      aria-selected={activeTab === 'purchase'}
      aria-controls="purchase-panel"
      onClick={() => onTabChange('purchase')}
    >
      <span>Purchase</span>
    </button>
    <button
      className={`tab-button ${activeTab === 'activity' ? 'active' : ''}`}
      role="tab"
      aria-selected={activeTab === 'activity'}
      aria-controls="activity-panel"
      onClick={() => onTabChange('activity')}
    >
      <span>Activity</span>
    </button>
  </nav>
);

function AppContent() {
  const [isMobile, setIsMobile] = useState(false);
  const [activeTab, setActiveTab] = useState('canvas');
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false);
  const [selectedPixel, setSelectedPixel] = useState<{ x: number; y: number } | null>(null);

  // Sample pixels for demonstration
  const samplePixels = [
    { x: 0, y: 0, color: '#ff0000', letter: 'H' },
    { x: 1, y: 0, color: '#00ff00', letter: 'E' },
    { x: 2, y: 0, color: '#0000ff', letter: 'L' },
    { x: 3, y: 0, color: '#ffff00', letter: 'L' },
    { x: 4, y: 0, color: '#ff00ff', letter: 'O' },
    { x: 0, y: 1, color: '#00ffff' },
    { x: 1, y: 1, color: '#ff8000' },
    { x: 2, y: 1, color: '#8000ff' },
    { x: 3, y: 1, color: '#0080ff' },
    { x: 4, y: 1, color: '#ff0080' },
    { x: -2, y: -1, color: '#00ff80', letter: 'W' },
    { x: -1, y: -1, color: '#80ff00', letter: 'O' },
    { x: 0, y: -1, color: '#ff0080', letter: 'R' },
    { x: 1, y: -1, color: '#8000ff', letter: 'L' },
    { x: 2, y: -1, color: '#0080ff', letter: 'D' },
  ];

  // Simple mobile detection (in real app, use proper media queries)
  React.useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <div className="app">
      <Header />

      <div className={`main-layout ${leftPanelCollapsed ? 'left-collapsed' : ''} ${rightPanelCollapsed ? 'right-collapsed' : ''}`}>
        {!isMobile && (
          <>
            <PurchasePanel
              collapsed={leftPanelCollapsed}
              onToggle={() => setLeftPanelCollapsed(!leftPanelCollapsed)}
            />
            <CanvasComponent
              pixels={samplePixels}
              selectedPixel={selectedPixel}
              onPixelSelect={(x, y) => {
                setSelectedPixel({ x, y });
                console.log(`Selected pixel at (${x}, ${y})`);
              }}
            />
            <ActivityFeed
              collapsed={rightPanelCollapsed}
              onToggle={() => setRightPanelCollapsed(!rightPanelCollapsed)}
            />
          </>
        )}

        {isMobile && (
          <>
            {activeTab === 'canvas' && (
              <CanvasComponent
                pixels={samplePixels}
                selectedPixel={selectedPixel}
                onPixelSelect={(x, y) => {
                  setSelectedPixel({ x, y });
                  console.log(`Selected pixel at (${x}, ${y})`);
                }}
              />
            )}
            {activeTab === 'purchase' && <PurchasePanel />}
            {activeTab === 'activity' && <ActivityFeed />}
            <MobileTabs activeTab={activeTab} onTabChange={setActiveTab} />
          </>
        )}
      </div>
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

export default App;