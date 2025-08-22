import { useState, useCallback } from 'react';
import { Rectangle, getSelectedPixelsInRectangle } from '../lib/rectangleSelection';

export interface SelectionState {
  selectedPixel: { x: number; y: number } | null;
  selectedRectangle: Rectangle | null;
  selectedPixels: { x: number; y: number }[];
  pixelCount: number;
}

export const useSelectionState = () => {
  const [selectionState, setSelectionState] = useState<SelectionState>({
    selectedPixel: null,
    selectedRectangle: null,
    selectedPixels: [],
    pixelCount: 0,
  });

  const selectSinglePixel = useCallback((x: number, y: number) => {
    setSelectionState({
      selectedPixel: { x, y },
      selectedRectangle: null,
      selectedPixels: [{ x, y }],
      pixelCount: 1,
    });
  }, []);

  const selectRectangle = useCallback((rectangle: Rectangle) => {
    const selectedPixels = getSelectedPixelsInRectangle(rectangle);
    setSelectionState({
      selectedPixel: null,
      selectedRectangle: rectangle,
      selectedPixels,
      pixelCount: selectedPixels.length,
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectionState({
      selectedPixel: null,
      selectedRectangle: null,
      selectedPixels: [],
      pixelCount: 0,
    });
  }, []);

  return {
    selectionState,
    selectSinglePixel,
    selectRectangle,
    clearSelection,
  };
};