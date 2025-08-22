import { describe, it, expect } from 'vitest';
import { validatePixelSelection, PixelValidationError } from './pixelValidation';
import { Pixel } from '../types/canvas';

describe('Pixel Validation', () => {
  const mockPixels: Pixel[] = [
    { x: 0, y: 0, color: '#ff0000' },
    { x: 1, y: 0, color: '#00ff00', letter: 'A' },
    { x: 0, y: 1, color: '#0000ff' },
  ];

  describe('validatePixelSelection', () => {
    it('should validate any integer coordinates (infinite canvas)', () => {
      const result = validatePixelSelection(2, 2, mockPixels);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should allow selecting already owned pixels (overwrites allowed)', () => {
      const result = validatePixelSelection(0, 0, mockPixels);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject pixel with non-integer coordinates', () => {
      const result = validatePixelSelection(1.5, 2, mockPixels);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe(PixelValidationError.INVALID_COORDINATES);
    });

    it('should allow negative coordinates (infinite canvas)', () => {
      const result = validatePixelSelection(-1, -1, mockPixels);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should allow very large coordinates (infinite canvas)', () => {
      const result = validatePixelSelection(1000000, -500000, mockPixels);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should handle edge case of zero coordinates', () => {
      const result = validatePixelSelection(0, 0, mockPixels);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should handle empty pixels array', () => {
      const result = validatePixelSelection(5, 5, []);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject float coordinates', () => {
      const result = validatePixelSelection(1.5, -2.7, mockPixels);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe(PixelValidationError.INVALID_COORDINATES);
    });
  });
});