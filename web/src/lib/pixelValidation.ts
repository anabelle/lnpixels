import { Pixel } from '../types/canvas';

export enum PixelValidationError {
  INVALID_COORDINATES = 'Invalid pixel coordinates'
}

export interface PixelValidationResult {
  isValid: boolean;
  error?: PixelValidationError;
}

export function validatePixelSelection(
  x: number,
  y: number,
  existingPixels: Pixel[]
): PixelValidationResult {
  // Check if coordinates are integers (infinite canvas allows any integer coordinates)
  if (!Number.isInteger(x) || !Number.isInteger(y)) {
    return { isValid: false, error: PixelValidationError.INVALID_COORDINATES };
  }

  // Note: According to design doc, pixels can be selected even if already owned
  // The pricing logic (2x for overwrites) is handled in the purchase panel
  // Canvas is infinite - no bounds checking needed

  return { isValid: true };
}