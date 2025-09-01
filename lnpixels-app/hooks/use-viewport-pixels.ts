"use client"

import { useCallback, useEffect, useMemo, useRef } from "react"
import { usePixelStore } from "./use-pixel-store"

// Tile-based viewport pixel loader. Computes the visible rect from zoom/pan
// and progressively fetches tiles. Avoids refetching tiles already loaded.
// Listens to window resize as well.
export function useViewportPixels(containerRef: React.RefObject<HTMLDivElement | null>) {
  const { zoom, panX, panY, fetchMorePixels } = usePixelStore()

  const GRID_SIZE = 10 // world units per pixel cell
  const tilePx = 20 // world cells per tile edge

  const loadedTiles = useRef<Set<string>>(new Set())
  const inflight = useRef<Set<string>>(new Set())
  const rafId = useRef<number | null>(null)

  const computeVisibleWorldRect = useCallback(() => {
    const container = containerRef.current
    if (!container) return null

    // Canvas/world mapping: screen = world * (GRID_SIZE*zoom) + pan
    const width = container.clientWidth
    const height = container.clientHeight

    const cellSize = GRID_SIZE * zoom

    const leftWorld = Math.floor((-panX) / cellSize)
    const topWorld = Math.floor((-panY) / cellSize)
    const rightWorld = Math.ceil((width - panX) / cellSize)
    const bottomWorld = Math.ceil((height - panY) / cellSize)

    return { x1: leftWorld - 2, y1: topWorld - 2, x2: rightWorld + 2, y2: bottomWorld + 2 }
  }, [containerRef, zoom, panX, panY])

  const visibleTiles = useMemo(() => {
    const rect = computeVisibleWorldRect()
    if (!rect) return [] as Array<{ tx: number; ty: number }>
    const { x1, y1, x2, y2 } = rect
    const list: Array<{ tx: number; ty: number }> = []
    const toTile = (n: number) => Math.floor(n / tilePx)
    for (let ty = toTile(y1); ty <= toTile(y2); ty++) {
      for (let tx = toTile(x1); tx <= toTile(x2); tx++) {
        list.push({ tx, ty })
      }
    }
    return list
  }, [computeVisibleWorldRect, zoom, panX, panY])

  const scheduleLoad = useCallback(() => {
    if (rafId.current) cancelAnimationFrame(rafId.current)
    rafId.current = requestAnimationFrame(async () => {
      const toLoad: Array<{ tx: number; ty: number }> = []
      for (const { tx, ty } of visibleTiles) {
        const key = `${tx}:${ty}`
        if (loadedTiles.current.has(key) || inflight.current.has(key)) continue
        toLoad.push({ tx, ty })
        inflight.current.add(key)
      }

      // Fetch sequentially to avoid burst; could be parallel with caps if needed
      for (const { tx, ty } of toLoad) {
        const key = `${tx}:${ty}`
        const x1 = tx * tilePx
        const y1 = ty * tilePx
        const x2 = x1 + tilePx - 1
        const y2 = y1 + tilePx - 1
        try {
          await fetchMorePixels(x1, y1, x2, y2)
          loadedTiles.current.add(key)
        } finally {
          inflight.current.delete(key)
        }
      }
    })
  }, [visibleTiles, fetchMorePixels])

  // Trigger on zoom/pan changes
  useEffect(() => {
    scheduleLoad()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoom, panX, panY, visibleTiles.length])

  // Also on container resize
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(() => scheduleLoad())
    ro.observe(el)
    return () => ro.disconnect()
  }, [containerRef, scheduleLoad])
}
