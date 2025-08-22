import { describe, it, expect, beforeEach } from 'vitest';
import {
  RectangleSelectionState,
  createRectangleSelection,
  updateRectangleSelection,
  completeRectangleSelection,
  cancelRectangleSelection,
  getSelectedPixelsInRectangle
} from './rectangleSelection';

describe('Rectangle Selection', () => {
  let selectionState: RectangleSelectionState;

  beforeEach(() => {
    selectionState = createRectangleSelection();
  });

  describe('createRectangleSelection', () => {
    it('should create initial selection state', () => {
      expect(selectionState.isActive).toBe(false);
      expect(selectionState.startPoint).toBeNull();
      expect(selectionState.endPoint).toBeNull();
      expect(selectionState.rectangle).toBeNull();
    });
  });

  describe('updateRectangleSelection', () => {
    it('should start selection on first shift+click', () => {
      const result = updateRectangleSelection(selectionState, 5, 10, true);
      expect(result.isActive).toBe(true);
      expect(result.startPoint).toEqual({ x: 5, y: 10 });
      expect(result.endPoint).toEqual({ x: 5, y: 10 });
      expect(result.rectangle).toEqual({ x1: 5, y1: 10, x2: 5, y2: 10 });
    });

    it('should not start selection without shift key', () => {
      const result = updateRectangleSelection(selectionState, 5, 10, false);
      expect(result.isActive).toBe(false);
      expect(result.startPoint).toBeNull();
    });

    it('should update end point during active selection', () => {
      let result = updateRectangleSelection(selectionState, 5, 10, true);
      result = updateRectangleSelection(result, 15, 20, true);

      expect(result.isActive).toBe(true);
      expect(result.startPoint).toEqual({ x: 5, y: 10 });
      expect(result.endPoint).toEqual({ x: 15, y: 20 });
      expect(result.rectangle).toEqual({ x1: 5, y1: 10, x2: 15, y2: 20 });
    });

    it('should handle negative coordinates', () => {
      let result = updateRectangleSelection(selectionState, -5, -10, true);
      result = updateRectangleSelection(result, -15, -20, true);

      expect(result.rectangle).toEqual({ x1: -15, y1: -20, x2: -5, y2: -10 });
    });

    it('should normalize rectangle coordinates (x1 <= x2, y1 <= y2)', () => {
      let result = updateRectangleSelection(selectionState, 15, 20, true);
      result = updateRectangleSelection(result, 5, 10, true);

      expect(result.rectangle).toEqual({ x1: 5, y1: 10, x2: 15, y2: 20 });
    });
  });

  describe('completeRectangleSelection', () => {
    it('should complete active selection and return rectangle', () => {
      let result = updateRectangleSelection(selectionState, 5, 10, true);
      result = updateRectangleSelection(result, 15, 20, true);

      const completed = completeRectangleSelection(result);
      expect(completed?.rectangle).toEqual({ x1: 5, y1: 10, x2: 15, y2: 20 });
      expect(completed?.resetState.isActive).toBe(false);
    });

    it('should return null for inactive selection', () => {
      const completed = completeRectangleSelection(selectionState);
      expect(completed).toBeNull();
    });
  });

  describe('cancelRectangleSelection', () => {
    it('should cancel active selection', () => {
      let result = updateRectangleSelection(selectionState, 5, 10, true);
      result = updateRectangleSelection(result, 15, 20, true);

      const cancelled = cancelRectangleSelection(result);
      expect(cancelled.isActive).toBe(false);
      expect(cancelled.startPoint).toBeNull();
      expect(cancelled.endPoint).toBeNull();
      expect(cancelled.rectangle).toBeNull();
    });

    it('should handle cancelling inactive selection', () => {
      const cancelled = cancelRectangleSelection(selectionState);
      expect(cancelled.isActive).toBe(false);
    });
  });

  describe('getSelectedPixelsInRectangle', () => {
    it('should return all pixels within rectangle', () => {
      const rectangle = { x1: 0, y1: 0, x2: 2, y2: 2 };
      const selectedPixels = getSelectedPixelsInRectangle(rectangle);

      expect(selectedPixels).toEqual([
        { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 },
        { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 },
        { x: 0, y: 2 }, { x: 1, y: 2 }, { x: 2, y: 2 }
      ]);
    });

    it('should handle single pixel rectangle', () => {
      const rectangle = { x1: 5, y1: 10, x2: 5, y2: 10 };
      const selectedPixels = getSelectedPixelsInRectangle(rectangle);

      expect(selectedPixels).toEqual([{ x: 5, y: 10 }]);
    });

    it('should handle negative coordinates', () => {
      const rectangle = { x1: -2, y1: -2, x2: -1, y2: -1 };
      const selectedPixels = getSelectedPixelsInRectangle(rectangle);

      expect(selectedPixels).toEqual([
        { x: -2, y: -2 }, { x: -1, y: -2 },
        { x: -2, y: -1 }, { x: -1, y: -1 }
      ]);
    });

    it('should handle large rectangles efficiently', () => {
      const rectangle = { x1: 0, y1: 0, x2: 10, y2: 10 };
      const selectedPixels = getSelectedPixelsInRectangle(rectangle);

      expect(selectedPixels.length).toBe(121); // 11x11 grid
      expect(selectedPixels[0]).toEqual({ x: 0, y: 0 });
      expect(selectedPixels[120]).toEqual({ x: 10, y: 10 });
    });
  });
});