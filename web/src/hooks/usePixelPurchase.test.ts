import { renderHook, act } from '@testing-library/react';
import { usePixelPurchase } from './usePixelPurchase';
import { SelectionState } from './usePixelPurchase';

describe('usePixelPurchase', () => {
  describe('pricing calculation', () => {
    it('should calculate correct price for new pixels', () => {
      const { result } = renderHook(() => usePixelPurchase());

      // Set up selection state with 2 new pixels
      const selectionState: SelectionState = {
        selectedPixel: null,
        selectedRectangle: { x1: 0, y1: 0, x2: 1, y2: 0 },
        selectedPixels: [{ x: 0, y: 0 }, { x: 1, y: 0 }],
        pixelCount: 2,
      };

      act(() => {
        result.current.setSelection(selectionState);
        result.current.setPixelType('basic');
      });

      const estimatedValue = result.current.getEstimatedValue([]);
      expect(estimatedValue.selectedCount).toBe(2);
      expect(estimatedValue.purchasedCount).toBe(0);
      expect(estimatedValue.availableCount).toBe(2);
      expect(estimatedValue.totalPrice).toBe(2); // 2 pixels × 1 sat each
    });

    it('should calculate 2x last sold price for existing pixels', () => {
      const { result } = renderHook(() => usePixelPurchase());

      // Set up selection state with 2 existing pixels
      const selectionState: SelectionState = {
        selectedPixel: null,
        selectedRectangle: { x1: 0, y1: 0, x2: 1, y2: 0 },
        selectedPixels: [{ x: 0, y: 0 }, { x: 1, y: 0 }],
        pixelCount: 2,
      };

      const purchasedPixels = [
        { x: 0, y: 0, sats: 10 }, // Previously sold for 10 sats
        { x: 1, y: 0, sats: 100 }, // Previously sold for 100 sats
      ];

      act(() => {
        result.current.setSelection(selectionState);
        result.current.setPixelType('basic');
      });

      const estimatedValue = result.current.getEstimatedValue(purchasedPixels);
      expect(estimatedValue.selectedCount).toBe(2);
      expect(estimatedValue.purchasedCount).toBe(2);
      expect(estimatedValue.availableCount).toBe(0);
      expect(estimatedValue.totalPrice).toBe(220); // (10 × 2) + (100 × 2) = 20 + 200 = 220
    });

    it('should handle mixed new and existing pixels', () => {
      const { result } = renderHook(() => usePixelPurchase());

      // Set up selection state with 3 pixels: 1 new, 2 existing
      const selectionState: SelectionState = {
        selectedPixel: null,
        selectedRectangle: { x1: 0, y1: 0, x2: 2, y2: 0 },
        selectedPixels: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }],
        pixelCount: 3,
      };

      const purchasedPixels = [
        { x: 1, y: 0, sats: 50 }, // Previously sold for 50 sats
        { x: 2, y: 0, sats: 25 }, // Previously sold for 25 sats
      ];

      act(() => {
        result.current.setSelection(selectionState);
        result.current.setPixelType('color');
      });

      const estimatedValue = result.current.getEstimatedValue(purchasedPixels);
      expect(estimatedValue.selectedCount).toBe(3);
      expect(estimatedValue.purchasedCount).toBe(2);
      expect(estimatedValue.availableCount).toBe(1);
      // New pixel (x: 0, y: 0): 10 sats (base price for color)
      // Existing pixel (x: 1, y: 0): 50 × 2 = 100 sats
      // Existing pixel (x: 2, y: 0): 25 × 2 = 50 sats
      expect(estimatedValue.totalPrice).toBe(160); // 10 + 100 + 50
    });

    it('should use correct base prices for different pixel types', () => {
      const { result } = renderHook(() => usePixelPurchase());

      const selectionState: SelectionState = {
        selectedPixel: null,
        selectedRectangle: { x1: 0, y1: 0, x2: 0, y2: 0 },
        selectedPixels: [{ x: 0, y: 0 }],
        pixelCount: 1,
      };

      act(() => {
        result.current.setSelection(selectionState);
      });

      // Test basic pixel
      act(() => {
        result.current.setPixelType('basic');
      });
      expect(result.current.getEstimatedValue([]).totalPrice).toBe(1);

      // Test color pixel
      act(() => {
        result.current.setPixelType('color');
      });
      expect(result.current.getEstimatedValue([]).totalPrice).toBe(10);

      // Test letter pixel
      act(() => {
        result.current.setPixelType('letter');
      });
      expect(result.current.getEstimatedValue([]).totalPrice).toBe(100);
    });
  });
});