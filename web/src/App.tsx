import React, { useState } from 'react';
import './App.css';

// Placeholder components for the layout
const Header = () => (
  <header className="header" role="banner">
    <div className="header-content">
      <h1 className="brand">LNPixels</h1>
      <nav className="nav" aria-label="Main navigation">
        <button className="nav-button" aria-label="Go to canvas">Canvas</button>
        <button className="nav-button" aria-label="View activity feed">Activity</button>
        <button className="nav-button" aria-label="Get help">Help</button>
      </nav>
      <div className="header-controls" aria-label="Canvas information">
        <span className="coordinates" aria-label="Current coordinates">0, 0</span>
        <span className="zoom" aria-label="Current zoom level">100%</span>
      </div>
    </div>
  </header>
);

const Canvas = () => (
  <main className="canvas-container" role="main" aria-label="Pixel canvas">
    <div className="canvas">
      <div className="canvas-placeholder">
        <div className="pixel-grid" role="grid" aria-label="Pixel grid">
          {/* Placeholder pixel grid - will be replaced with actual canvas */}
          {Array.from({ length: 100 }, (_, i) => (
            <div
              key={i}
              className="pixel"
              role="gridcell"
              aria-label={`Pixel at position ${i % 10}, ${Math.floor(i / 10)}`}
              style={{
                backgroundColor: i % 20 === 0 ? '#ff0000' : 'transparent',
                border: '1px solid #eee'
              }}
              tabIndex={0}
            />
          ))}
        </div>
        <div className="canvas-overlay" aria-live="polite">
          <div className="selection-tool">
            <div className="selection-info" role="status">
              Select pixels to purchase
            </div>
          </div>
        </div>
      </div>
    </div>
  </main>
);

const PurchasePanel = ({ collapsed, onToggle }: { collapsed?: boolean; onToggle?: () => void }) => (
  <aside className={`purchase-panel ${collapsed ? 'collapsed' : ''}`} role="complementary" aria-label="Purchase panel">
    <div className="panel-header">
      <h3>Pixel Purchase</h3>
      {onToggle && (
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
  <aside className={`activity-feed ${collapsed ? 'collapsed' : ''}`} role="complementary" aria-label="Activity feed">
    <div className="panel-header">
      <h3>Recent Activity</h3>
      {onToggle && (
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

const MobileTabs = () => (
  <nav className="mobile-tabs" role="tablist" aria-label="Mobile navigation">
    <button className="tab-button active" role="tab" aria-selected="true" aria-controls="canvas-panel">
      <span>Canvas</span>
    </button>
    <button className="tab-button" role="tab" aria-selected="false" aria-controls="purchase-panel">
      <span>Purchase</span>
    </button>
    <button className="tab-button" role="tab" aria-selected="false" aria-controls="activity-panel">
      <span>Activity</span>
    </button>
  </nav>
);

function App() {
  const [isMobile, setIsMobile] = useState(false);
  const [activeTab, setActiveTab] = useState('canvas');
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false);

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
            <Canvas />
            <ActivityFeed
              collapsed={rightPanelCollapsed}
              onToggle={() => setRightPanelCollapsed(!rightPanelCollapsed)}
            />
          </>
        )}

        {isMobile && (
          <>
            {activeTab === 'canvas' && <Canvas />}
            {activeTab === 'purchase' && <PurchasePanel />}
            {activeTab === 'activity' && <ActivityFeed />}
            <MobileTabs />
          </>
        )}
      </div>
    </div>
  );
}

export default App;