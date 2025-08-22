import { useQueryState } from 'nuqs';

export interface UrlState {
  x: number;
  y: number;
  z: number; // zoom level
}

const MIN_ZOOM = 1;
const MAX_ZOOM = 10;

export const useUrlState = () => {
  const [x, setX] = useQueryState('x', {
    defaultValue: 0,
    parse: (value) => {
      const parsed = parseFloat(value);
      return isNaN(parsed) ? 0 : Math.round(parsed);
    },
  });

  const [y, setY] = useQueryState('y', {
    defaultValue: 0,
    parse: (value) => {
      const parsed = parseFloat(value);
      return isNaN(parsed) ? 0 : Math.round(parsed);
    },
  });

  const [z, setZ] = useQueryState('z', {
    defaultValue: 1,
    parse: (value) => {
      const parsed = parseFloat(value);
      return isNaN(parsed) ? 1 : Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, Math.round(parsed)));
    },
  });

  const urlState: UrlState = { x, y, z };

  const updateUrlState = (newState: Partial<UrlState>) => {
    if (newState.x !== undefined) setX(newState.x);
    if (newState.y !== undefined) setY(newState.y);
    if (newState.z !== undefined) setZ(newState.z);
  };

  return {
    urlState,
    updateUrlState,
  };
};