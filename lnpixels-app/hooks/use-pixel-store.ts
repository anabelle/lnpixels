"use client"

import { create } from "zustand/react"
import { apiClient, Pixel as ApiPixel } from "@/lib/api"



interface SaveModal {
  isOpen: boolean
  totalPixels: number
  totalCost: number
}

interface Pixel extends ApiPixel {
  lastSoldAmount?: number // Amount in sats the pixel was last sold for
  sats?: number // From API response
  isNew?: boolean // True if this pixel was drawn by the current user, false if loaded from database
  originalPixel?: Pixel // Original pixel state when this pixel overwrites an existing one
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
  // Progressive/infinite loading helpers
  mergeExistingPixels: (newPixels: Pixel[]) => void
  fetchMorePixels: (x1: number, y1: number, x2: number, y2: number) => Promise<void>
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
  zoom: 2, // Reduced default zoom from 10 to 2 (divided by 5)
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
    set((state) => {
      // Find existing pixel at the same coordinates to preserve its sats value for overwrite pricing
      const existingPixel = state.pixels.find((p) => p.x === pixel.x && p.y === pixel.y)
      let originalPixel: Pixel | undefined

      if (existingPixel) {
        if (!existingPixel.isNew) {
          // Overwriting a permanent pixel - store it for restoration
          const { originalPixel: _, ...cleanOriginal } = existingPixel
          originalPixel = { ...cleanOriginal, isNew: false }
        } else if (existingPixel.originalPixel) {
          // Overwriting a new pixel that already has an originalPixel - preserve the chain
          originalPixel = existingPixel.originalPixel
        }
      }

      const newPixel = {
        ...pixel,
        isNew: true,
        // Preserve sats value from existing pixel for overwrite pricing
        sats: existingPixel?.sats || pixel.sats,
        // Store original pixel for restoration on clear
        originalPixel
      }

      if (existingPixel?.sats) {
        console.log(`Overwriting pixel at (${pixel.x}, ${pixel.y}) - original sats: ${existingPixel.sats}, preserved for overwrite pricing`);
      }

      return {
        pixels: [...state.pixels.filter((p) => !(p.x === pixel.x && p.y === pixel.y)), newPixel],
      }
    }),

  addExistingPixel: (pixel) =>
    set((state) => ({
      pixels: [...state.pixels.filter((p) => !(p.x === pixel.x && p.y === pixel.y)), { ...pixel, isNew: false }],
    })),

  setSelectedColor: (color) => set({ selectedColor: color }),
  setBrushSize: (size) => set({ brushSize: size }),
  setZoom: (zoom) => set({ zoom }),
  setPan: (x, y) => set({ panX: x, panY: y }),
  setToolMode: (mode) => set({ toolMode: mode }),

  resetView: () => set({ zoom: 2, panX: 0, panY: 0 }), // Updated resetView to set zoom to 2

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

  // Merge a batch of existing pixels into the canvas without clearing user-drawn ones
  mergeExistingPixels: (newPixels) =>
    set((state) => {
      if (!newPixels || newPixels.length === 0) return { pixels: state.pixels }
      // Build a map for quick replacement by coordinate
      const key = (p: Pixel) => `${p.x}:${p.y}`
      const current = new Map<string, Pixel>()
      for (const p of state.pixels) current.set(key(p), p)
      for (const p of newPixels) {
        const existing = current.get(key(p))
        // If there's a user-drawn new pixel at same spot, keep it (don't overwrite in-progress work)
        if (existing?.isNew) continue
        current.set(key(p), { ...p, isNew: false })
      }
      return { pixels: Array.from(current.values()) }
    }),

  // Fetch more pixels for a rectangle and merge them without resetting the canvas
  fetchMorePixels: async (x1, y1, x2, y2) => {
    try {
      const pixels = await apiClient.getPixels(x1, y1, x2, y2)
      const existingPixels = pixels.map(pixel => ({ ...pixel, isNew: false }))
      get().mergeExistingPixels(existingPixels)
    } catch (error) {
      console.error('Failed to fetch more pixels:', error)
      // don't surface as fatal error to avoid UI flashes; keep silent for progressive loads
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
        const overwritePrice = Math.round(pixel.sats * 2)
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

  clearCanvas: () => {
    // Clear new pixels (user-drawn), but restore original pixels if they were overwritten
    set((state) => {
      const existingPixels = state.pixels.filter(pixel => pixel.isNew !== true)
      const restoredPixels = state.pixels
        .filter(pixel => pixel.isNew === true && pixel.originalPixel)
        .map(pixel => {
          // Create a clean copy of the original pixel without originalPixel field to avoid circular refs
          const { originalPixel, ...cleanOriginal } = pixel.originalPixel!
          return { ...cleanOriginal, isNew: false }
        })

      // Merge existing and restored pixels, removing duplicates by coordinate
      const pixelMap = new Map<string, Pixel>()
      const key = (p: Pixel) => `${p.x}:${p.y}`

      // Add existing pixels first (these are permanent pixels that weren't overwritten)
      existingPixels.forEach(pixel => pixelMap.set(key(pixel), pixel))

      // Add restored original pixels (these restore permanent pixels that were overwritten)
      restoredPixels.forEach(pixel => pixelMap.set(key(pixel), pixel))

      return { pixels: Array.from(pixelMap.values()) }
    })
  },

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
