"use client"

import { create } from "zustand/react"
import { apiClient, Pixel as ApiPixel } from "@/lib/api"

interface PixelData {
  x: number
  y: number
  color: string
  letter?: string
}

interface SaveModal {
  isOpen: boolean
  totalPixels: number
  totalCost: number
}

interface Pixel extends ApiPixel {
  lastSoldAmount?: number // Amount in sats the pixel was last sold for
  sats?: number // From API response
  isNew?: boolean // True if this pixel was drawn by the current user, false if loaded from database
}

interface PixelStore {
  // Canvas state
  pixels: Pixel[]
  selectedColor: string
  brushSize: number
  zoom: number
  panX: number
  panY: number
  toolMode: "paint" | "text"

  saveModal: SaveModal

  // Loading and error states
  isLoading: boolean
  error: string | null

  // Actions
  addPixel: (pixel: Pixel) => void
  addExistingPixel: (pixel: Pixel) => void // Add pixel from database/WebSocket (not user-drawn)
  setSelectedColor: (color: string) => void
  setBrushSize: (size: number) => void
  setZoom: (zoom: number) => void
  setPan: (x: number, y: number) => void
  setToolMode: (mode: "paint" | "text") => void
  resetView: () => void
  openSaveModal: () => void
  closeSaveModal: () => void
  updatePixels: (newPixels: Pixel[]) => void
  clearCanvas: () => void
  fetchPixels: (x1: number, y1: number, x2: number, y2: number) => Promise<void>
  setError: (error: string | null) => void
  setLoading: (loading: boolean) => void
  getNewPixels: () => Pixel[] // Get only pixels drawn by the current user
  markNewPixelsAsExisting: () => void // Mark all new pixels as existing (after payment)
}

export const usePixelStore = create<PixelStore>((set, get) => ({
  // Initial state
  pixels: [],
  selectedColor: "#000000",
  brushSize: 1,
  zoom: 10, // Increased initial zoom from 1 to 10 (10x increase)
  panX: 0,
  panY: 0,
  toolMode: "paint",
  saveModal: {
    isOpen: false,
    totalPixels: 0,
    totalCost: 0,
  },
  isLoading: false,
  error: null,

  // Actions
  addPixel: (pixel) =>
    set((state) => ({
      pixels: [...state.pixels.filter((p) => !(p.x === pixel.x && p.y === pixel.y)), { ...pixel, isNew: true }],
    })),

  addExistingPixel: (pixel) =>
    set((state) => ({
      pixels: [...state.pixels.filter((p) => !(p.x === pixel.x && p.y === pixel.y)), { ...pixel, isNew: false }],
    })),

  setSelectedColor: (color) => set({ selectedColor: color }),
  setBrushSize: (size) => set({ brushSize: size }),
  setZoom: (zoom) => set({ zoom }),
  setPan: (x, y) => set({ panX: x, panY: y }),
  setToolMode: (mode) => set({ toolMode: mode }),

  resetView: () => set({ zoom: 10, panX: 0, panY: 0 }), // Updated resetView to set zoom to 10

  setError: (error) => set({ error }),
  setLoading: (loading) => set({ isLoading: loading }),

  fetchPixels: async (x1, y1, x2, y2) => {
    set({ isLoading: true, error: null });
    try {
      const pixels = await apiClient.getPixels(x1, y1, x2, y2);
      // Mark fetched pixels as existing (not new)
      const existingPixels = pixels.map(pixel => ({ ...pixel, isNew: false }));
      set({ pixels: existingPixels, isLoading: false });
    } catch (error) {
      console.error('Failed to fetch pixels:', error);
      set({
  pixels: [],
        error: error instanceof Error ? error.message : 'Failed to fetch pixels',
        isLoading: false
      });
    }
  },

  openSaveModal: () => {
    const { pixels } = get()
    // Only count NEW pixels drawn by the user, not existing pixels from database
    const newPixels = pixels.filter(pixel => pixel.isNew === true)
    const totalPixels = newPixels.length
    const totalCost = newPixels.reduce((cost, pixel) => {
      // Calculate base pixel type price
      let basePrice: number
      if (pixel.letter) {
        basePrice = 100 // Color + letter = 100 sats
      } else if (pixel.color === "#000000") {
        basePrice = 1 // Black pixel = 1 sat
      } else {
        basePrice = 10 // Color pixel = 10 sats
      }

      // If pixel has purchase history, apply overwrite rule
      if (pixel.sats) {
        const overwritePrice = pixel.sats * 2
        return cost + Math.max(basePrice, overwritePrice)
      }

      return cost + basePrice
    }, 0)

    set({
      saveModal: { isOpen: true, totalPixels, totalCost },
    })
  },

  closeSaveModal: () =>
    set({
      saveModal: { isOpen: false, totalPixels: 0, totalCost: 0 },
    }),

  updatePixels: (newPixels) => set({ pixels: newPixels }),

  clearCanvas: () => set({ pixels: [] }),

  getNewPixels: () => {
    const { pixels } = get()
    return pixels.filter(pixel => pixel.isNew === true)
  },

  markNewPixelsAsExisting: () => {
    set((state) => ({
      pixels: state.pixels.map(pixel => 
        pixel.isNew ? { ...pixel, isNew: false } : pixel
      )
    }))
  },
}))
