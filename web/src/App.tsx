import React, { useState } from 'react';
import './App.css';
import { ThemeProvider } from './theme';
import Header from './components/Header';
import CanvasContainer from './components/CanvasContainer';
import PurchasePanel from './components/PurchasePanel';
import ActivityFeed from './components/ActivityFeed';
import MobileTabs from './components/MobileTabs';
import { Pixel } from './types/canvas';
import { ViewportProvider, useViewportContext } from './contexts/ViewportContext';
import { SelectionState } from './hooks/usePixelPurchase';











function AppContent() {
  const [isMobile, setIsMobile] = useState(false);
  const [activeTab, setActiveTab] = useState('canvas');
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false);
  const [selectedPixel, setSelectedPixel] = useState<{ x: number; y: number } | null>(null);
  const [selectionState, setSelectionState] = useState<SelectionState | undefined>(undefined);

  // Get viewport state from context
  const { viewport, urlState } = useViewportContext();

   // Sample pixels for demonstration (with last purchase price)
   const samplePixels = [
     { x: 0, y: 0, color: '#ff0000', letter: 'H', sats: 100 }, // Previously purchased for 100 sats
     { x: 1, y: 0, color: '#00ff00', letter: 'E', sats: 10 },  // Previously purchased for 10 sats
     { x: 2, y: 0, color: '#0000ff', letter: 'L', sats: 1 },   // Previously purchased for 1 sat
     { x: 3, y: 0, color: '#ffff00', letter: 'L', sats: 100 }, // Previously purchased for 100 sats
     { x: 4, y: 0, color: '#ff00ff', letter: 'O', sats: 10 },  // Previously purchased for 10 sats
     { x: 0, y: 1, color: '#00ffff', sats: 1 },                // Previously purchased for 1 sat
     { x: 1, y: 1, color: '#ff8000', sats: 10 },               // Previously purchased for 10 sats
     { x: 2, y: 1, color: '#8000ff', sats: 100 },              // Previously purchased for 100 sats
     { x: 3, y: 1, color: '#0080ff', sats: 1 },                // Previously purchased for 1 sat
     { x: 4, y: 1, color: '#ff0080', sats: 10 },               // Previously purchased for 10 sats
     { x: -2, y: -1, color: '#00ff80', letter: 'W', sats: 100 }, // Previously purchased for 100 sats
     { x: -1, y: -1, color: '#80ff00', letter: 'O', sats: 10 },  // Previously purchased for 10 sats
     { x: 0, y: -1, color: '#ff0080', letter: 'R', sats: 1 },    // Previously purchased for 1 sat
     { x: 1, y: -1, color: '#8000ff', letter: 'L', sats: 100 },  // Previously purchased for 100 sats
     { x: 2, y: -1, color: '#0080ff', letter: 'D', sats: 10 },   // Previously purchased for 10 sats
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
      <Header urlState={urlState} />

      <div className={`main-layout ${leftPanelCollapsed ? 'left-collapsed' : ''} ${rightPanelCollapsed ? 'right-collapsed' : ''}`}>
        {!isMobile && (
          <>
             <PurchasePanel
               collapsed={leftPanelCollapsed}
               onToggle={() => setLeftPanelCollapsed(!leftPanelCollapsed)}
               selectionState={selectionState}
               purchasedPixels={samplePixels}
             />
             <CanvasContainer
               pixels={samplePixels}
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
                 pixels={samplePixels}
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
                 purchasedPixels={samplePixels}
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