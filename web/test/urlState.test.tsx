import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useUrlState } from '../src/hooks/useUrlState';

describe('useUrlState', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset location mock
    Object.defineProperty(window, 'location', {
      value: { search: '' },
      writable: true,
    });
    // Reset history mock
    Object.defineProperty(window, 'history', {
      value: { replaceState: vi.fn() },
      writable: true,
    });
  });

  it('should return default values initially', () => {
    const { result } = renderHook(() => useUrlState());

    expect(result.current.urlState).toEqual({
      x: 0,
      y: 0,
      z: 1,
    });
  });

  it('should read initial values from URL parameters', () => {
    // Mock URL with parameters
    Object.defineProperty(window, 'location', {
      value: { search: '?x=100&y=200&z=5' },
      writable: true,
    });

    const { result } = renderHook(() => useUrlState());

    expect(result.current.urlState).toEqual({
      x: 100,
      y: 200,
      z: 5,
    });
  });

  it('should handle invalid numeric parameters gracefully', () => {
    Object.defineProperty(window, 'location', {
      value: { search: '?x=invalid&y=200&z=5' },
      writable: true,
    });

    const { result } = renderHook(() => useUrlState());

    expect(result.current.urlState).toEqual({
      x: 0, // fallback to default
      y: 200,
      z: 5,
    });
  });

  it('should clamp zoom values to valid range', () => {
    Object.defineProperty(window, 'location', {
      value: { search: '?x=100&y=200&z=50' },
      writable: true,
    });

    const { result } = renderHook(() => useUrlState());

    expect(result.current.urlState).toEqual({
      x: 100,
      y: 200,
      z: 10, // clamped to max
    });
  });

  it('should update URL when state changes', () => {
    const mockReplaceState = vi.fn();
    Object.defineProperty(window, 'history', {
      value: { replaceState: mockReplaceState },
      writable: true,
    });

    const { result } = renderHook(() => useUrlState());

    act(() => {
      result.current.updateUrlState({ x: 150, y: 250, z: 3 });
    });

    expect(mockReplaceState).toHaveBeenCalledWith(
      null,
      '',
      '/?x=150&y=250&z=3'
    );
  });

  it('should not update URL if values haven\'t changed', () => {
    const mockReplaceState = vi.fn();
    Object.defineProperty(window, 'history', {
      value: { replaceState: mockReplaceState },
      writable: true,
    });

    const { result } = renderHook(() => useUrlState());

    act(() => {
      result.current.updateUrlState({ x: 0, y: 0, z: 1 });
    });

    expect(mockReplaceState).not.toHaveBeenCalled();
  });

  it('should handle partial updates correctly', () => {
    const mockReplaceState = vi.fn();
    Object.defineProperty(window, 'history', {
      value: { replaceState: mockReplaceState },
      writable: true,
    });

    const { result } = renderHook(() => useUrlState());

    act(() => {
      result.current.updateUrlState({ x: 150 });
    });

    expect(mockReplaceState).toHaveBeenCalledWith(
      null,
      '',
      '/?x=150&y=0&z=1'
    );
  });

  it('should round coordinates to integers', () => {
    const mockReplaceState = vi.fn();
    Object.defineProperty(window, 'history', {
      value: { replaceState: mockReplaceState },
      writable: true,
    });

    const { result } = renderHook(() => useUrlState());

    act(() => {
      result.current.updateUrlState({ x: 100.7, y: 200.3 });
    });

    expect(mockReplaceState).toHaveBeenCalledWith(
      null,
      '',
      '/?x=101&y=200&z=1'
    );
  });
});