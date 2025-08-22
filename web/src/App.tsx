import React, { useState } from 'react';
import './App.css';
import { ThemeProvider } from './theme';
import Header from './components/Header';
import CanvasContainer from './components/CanvasContainer';
import PurchasePanel from './components/PurchasePanel';
import ActivityFeed from './components/ActivityFeed';
import MobileTabs from './components/MobileTabs';
import { Pixel } from './types/canvas';











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
            <CanvasContainer
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
              <CanvasContainer
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