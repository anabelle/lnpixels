import { useState, useCallback } from 'react';
import { Rectangle } from '../lib/rectangleSelection';

export type PixelType = 'basic' | 'color' | 'letter';

export interface SelectionState {
  selectedPixel: { x: number; y: number } | null;
  selectedRectangle: Rectangle | null;
  selectedPixels: { x: number; y: number }[];
  pixelCount: number;
}

export interface PixelPurchaseState {
  type: PixelType;
  color: string;
  letter: string;
  price: number;
  selection: SelectionState;
}

const PRICING = {
  basic: 1,
  color: 10,
  letter: 100,
};

const DEFAULT_SELECTION: SelectionState = {
  selectedPixel: null,
  selectedRectangle: null,
  selectedPixels: [],
  pixelCount: 0,
};

export const usePixelPurchase = () => {
  const [state, setState] = useState<PixelPurchaseState>({
    type: 'basic',
    color: '#ff0000',
    letter: '',
    price: PRICING.basic,
    selection: DEFAULT_SELECTION,
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

  const setSelection = useCallback((selection: SelectionState) => {
    setState(prev => ({
      ...prev,
      selection,
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

  const getPriceForType = useCallback((type: PixelType) => {
    return `${PRICING[type]} sat${PRICING[type] !== 1 ? 's' : ''}`;
  }, []);

  const getSelectedPixelCount = useCallback(() => {
    return state.selection.pixelCount;
  }, [state.selection.pixelCount]);

  const getPurchasedPixelsInSelection = useCallback((purchasedPixels: { x: number; y: number; sats: number }[]) => {
    return state.selection.selectedPixels.filter(selectedPixel =>
      purchasedPixels.some(purchasedPixel =>
        purchasedPixel.x === selectedPixel.x && purchasedPixel.y === selectedPixel.y
      )
    ).length;
  }, [state.selection.selectedPixels]);

  const getEstimatedValue = useCallback((purchasedPixels: { x: number; y: number; sats: number }[] = []) => {
    const selectedCount = getSelectedPixelCount();
    const purchasedCount = getPurchasedPixelsInSelection(purchasedPixels);
    const availableCount = selectedCount - purchasedCount;

    // Calculate total price based on individual pixel pricing
    let totalPrice = 0;
    let availablePixelsPrice = 0;

    // Calculate price for each selected pixel individually
    state.selection.selectedPixels.forEach(selectedPixel => {
      const existingPixel = purchasedPixels.find(p =>
        p.x === selectedPixel.x && p.y === selectedPixel.y
      );

      if (existingPixel) {
        // Pixel already exists - charge maximum of (2x last price, base price for new pixel type)
        const doubleLastPrice = existingPixel.sats * 2;
        const basePriceForNewType = PRICING[state.type];
        const pixelPrice = Math.max(doubleLastPrice, basePriceForNewType);
        totalPrice += pixelPrice;
      } else {
        // New pixel - use base price for selected type
        const pixelPrice = PRICING[state.type];
        totalPrice += pixelPrice;
        availablePixelsPrice += pixelPrice;
      }
    });

    return {
      selectedCount,
      purchasedCount,
      availableCount,
      availablePixelsPrice,
      totalPrice,
    };
  }, [state.type, state.selection.selectedPixels, getSelectedPixelCount, getPurchasedPixelsInSelection]);

  const getTotalDisplayPrice = useCallback((purchasedPixels: { x: number; y: number; sats: number }[] = []) => {
    const { totalPrice } = getEstimatedValue(purchasedPixels);
    return `${totalPrice} sat${totalPrice !== 1 ? 's' : ''}`;
  }, [getEstimatedValue]);

  return {
    state,
    setPixelType,
    setColor,
    setLetter,
    setSelection,
    isValid,
    getDisplayPrice,
    getPriceForType,
    getSelectedPixelCount,
    getPurchasedPixelsInSelection,
    getEstimatedValue,
    getTotalDisplayPrice,
  };
};