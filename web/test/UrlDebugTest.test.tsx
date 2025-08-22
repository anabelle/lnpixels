import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useUrlState } from '../src/hooks/useUrlState';

// Mock window.location
const mockLocation = {
  search: '',
  pathname: '/',
};

Object.defineProperty(window, 'location', {
  value: mockLocation,
  writable: true,
});

describe('URL State Debug', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocation.search = '';
  });

  it('should load URL state correctly for zoom out values', () => {
    // Set URL with zoom out value
    mockLocation.search = '?x=0&y=0&z=0.25';

    const { result } = renderHook(() => useUrlState());

    console.log('URL State result:', result.current.urlState);
    expect(result.current.urlState.z).toBe(0.25);
  });

  it('should load URL state correctly for zoom in values', () => {
    // Set URL with zoom in value
    mockLocation.search = '?x=0&y=0&z=2.5';

    const { result } = renderHook(() => useUrlState());

    console.log('URL State result for zoom in:', result.current.urlState);
    expect(result.current.urlState.z).toBe(2.5);
  });

  it('should clamp extreme values', () => {
    // Set URL with extreme zoom out value
    mockLocation.search = '?x=0&y=0&z=0.01';

    const { result } = renderHook(() => useUrlState());

    console.log('URL State result for extreme zoom out:', result.current.urlState);
    expect(result.current.urlState.z).toBe(0.1); // Should be clamped to minimum (0.1)
  });
});