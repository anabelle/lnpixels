import React, { useState } from 'react';
import './App.css';
import 'nakapay-react/dist/styles.css';
import { ThemeProvider } from './theme';
import Header from './components/Header';
import CanvasContainer from './components/CanvasContainer';
import PurchasePanel from './components/PurchasePanel';
import ActivityFeed from './components/ActivityFeed';
import MobileTabs from './components/MobileTabs';
import WelcomeModal from './components/WelcomeModal';
import { ViewportProvider, useViewportContext } from './contexts/ViewportContext';
import { SelectionState } from './hooks/usePixelPurchase';
import { usePixels } from './hooks/usePixels';





function AppContent() {
  const [isMobile, setIsMobile] = useState(false);
  const [activeTab, setActiveTab] = useState('canvas');
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false);
  const [selectedPixel, setSelectedPixel] = useState<{ x: number; y: number } | null>(null);
  const [selectionState, setSelectionState] = useState<SelectionState | undefined>(undefined);

  // Welcome modal state
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);

  // Get viewport state from context
  const { viewport, urlState } = useViewportContext();

  // Fetch pixels from API
  const { pixels, loading: pixelsLoading, error: pixelsError, refetchPixels } = usePixels();

  // Check if this is user's first visit
  React.useEffect(() => {
    const hasVisited = localStorage.getItem('lnpixels-visited');
    if (!hasVisited) {
      setShowWelcomeModal(true);
    }
  }, []);

  const handleWelcomeClose = () => {
    setShowWelcomeModal(false);
  };

  const handleGetStarted = () => {
    localStorage.setItem('lnpixels-visited', 'true');
    setShowWelcomeModal(false);
    // Optionally scroll to canvas or highlight the first step
  };

  // Simple mobile detection (in real app, use proper media queries)
  React.useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleShowWelcome = () => {
    setShowWelcomeModal(true);
  };

  const handleResetWelcome = () => {
    localStorage.removeItem('lnpixels-visited');
    window.location.reload();
  };

  return (
    <div className="app">
      <Header urlState={urlState} onShowWelcome={handleShowWelcome} />

      {/* Welcome Modal */}
      <WelcomeModal
        isOpen={showWelcomeModal}
        onClose={handleWelcomeClose}
        onGetStarted={handleGetStarted}
      />

      {pixelsError && (
        <div style={{
          position: 'fixed',
          top: '60px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: '#ff4444',
          color: 'white',
          padding: '10px 20px',
          borderRadius: '5px',
          zIndex: 1000,
          fontSize: '14px',
          maxWidth: '80%',
          textAlign: 'center'
        }}>
          <div style={{ marginBottom: '5px', fontWeight: 'bold' }}>
            Connection Error
          </div>
          <div style={{ fontSize: '12px', marginBottom: '8px' }}>
            {pixelsError}
          </div>
          <button
            onClick={refetchPixels}
            style={{
              marginLeft: '10px',
              padding: '4px 12px',
              fontSize: '12px',
              background: 'white',
              color: '#ff4444',
              border: 'none',
              borderRadius: '3px',
              cursor: 'pointer'
            }}
          >
            Retry
          </button>
        </div>
      )}

      <div className={`main-layout ${leftPanelCollapsed ? 'left-collapsed' : ''} ${rightPanelCollapsed ? 'right-collapsed' : ''}`}>
        {!isMobile && (
          <>
            <PurchasePanel
              collapsed={leftPanelCollapsed}
              onToggle={() => setLeftPanelCollapsed(!leftPanelCollapsed)}
              selectionState={selectionState}
              purchasedPixels={pixels}
              allPixels={pixels}
            />
            <CanvasContainer
              pixels={pixels}
              selectedPixel={selectedPixel}
              onPixelSelect={(x, y) => {
                setSelectedPixel({ x, y });
                console.log(`Selected pixel at (${x}, ${y})`);
              }}
              onSelectionChange={(newSelectionState) => {
                setSelectionState(newSelectionState);
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
                pixels={pixels}
                selectedPixel={selectedPixel}
                onPixelSelect={(x, y) => {
                  setSelectedPixel({ x, y });
                  console.log(`Selected pixel at (${x}, ${y})`);
                }}
                onSelectionChange={(newSelectionState) => {
                  setSelectionState(newSelectionState);
                }}
              />
            )}
            {activeTab === 'purchase' && (
              <PurchasePanel
                selectionState={selectionState}
                purchasedPixels={pixels}
                allPixels={pixels}
              />
            )}
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
      <ViewportProvider>
        <AppContent />
      </ViewportProvider>
    </ThemeProvider>
  );
}

export default App;