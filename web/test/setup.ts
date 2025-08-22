import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';

expect.extend(matchers);

afterEach(() => {
  cleanup();
});

// Mock nuqs for testing
vi.mock('nuqs', () => ({
  useQueryState: vi.fn((key: string, options: any) => {
    const state = { current: options.defaultValue };
    const setValue = (newValue: any) => {
      if (typeof newValue === 'function') {
        state.current = newValue(state.current);
      } else {
        state.current = newValue;
      }
    };
    return [state.current, setValue];
  }),
}));