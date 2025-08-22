import { useState, useCallback } from 'react';

export type PixelType = 'basic' | 'color' | 'letter';

export interface PixelPurchaseState {
  type: PixelType;
  color: string;
  letter: string;
  price: number;
}

const PRICING = {
  basic: 1,
  color: 10,
  letter: 100,
};

export const usePixelPurchase = () => {
  const [state, setState] = useState<PixelPurchaseState>({
    type: 'basic',
    color: '#ff0000',
    letter: '',
    price: PRICING.basic,
  });

  const setPixelType = useCallback((type: PixelType) => {
    setState(prev => ({
      ...prev,
      type,
      price: PRICING[type],
    }));
  }, []);

  const setColor = useCallback((color: string) => {
    setState(prev => ({
      ...prev,
      color,
    }));
  }, []);

  const setLetter = useCallback((letter: string) => {
    const validLetter = letter.slice(0, 1).toUpperCase();
    setState(prev => ({
      ...prev,
      letter: validLetter,
    }));
  }, []);

  const isValid = useCallback(() => {
    if (state.type === 'letter') {
      return state.letter.length === 1 && /^[#][0-9a-f]{6}$/i.test(state.color);
    }
    if (state.type === 'color') {
      return /^[#][0-9a-f]{6}$/i.test(state.color);
    }
    return true; // basic type is always valid
  }, [state]);

  const getDisplayPrice = useCallback(() => {
    return `${state.price} sat${state.price !== 1 ? 's' : ''}`;
  }, [state.price]);

  return {
    state,
    setPixelType,
    setColor,
    setLetter,
    isValid,
    getDisplayPrice,
  };
};