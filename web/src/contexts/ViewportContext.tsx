import React, { createContext, useContext, ReactNode } from 'react';
import { Viewport } from '../types/canvas';
import { useViewportWithUrl } from '../hooks/useViewportWithUrl';

interface ViewportContextType {
  viewport: Viewport;
  pan: (deltaX: number, deltaY: number) => void;
  zoom: (zoomFactor: number) => void;
  setZoom: (newZoom: number) => void;
  centerOn: (x: number, y: number) => void;
  urlState: { x: number; y: number; z: number };
}

const ViewportContext = createContext<ViewportContextType | undefined>(undefined);

interface ViewportProviderProps {
  children: ReactNode;
}

export const ViewportProvider: React.FC<ViewportProviderProps> = ({ children }) => {
  const viewportData = useViewportWithUrl();

  return (
    <ViewportContext.Provider value={viewportData}>
      {children}
    </ViewportContext.Provider>
  );
};

export const useViewportContext = (): ViewportContextType => {
  const context = useContext(ViewportContext);
  if (context === undefined) {
    throw new Error('useViewportContext must be used within a ViewportProvider');
  }
  return context;
};