"use client"

import { useRef, useCallback, useEffect, useState } from "react"
import { usePixelStore } from "./use-pixel-store"

export function usePanZoom(containerRef: React.RefObject<HTMLDivElement | null>) {
  const { zoom, panX, panY, setZoom, setPan } = usePixelStore()
  const isDragging = useRef(false)
  const lastMousePos = useRef({ x: 0, y: 0 })
  const lastTouchDistance = useRef(0)
  const lastTouchCenter = useRef({ x: 0, y: 0 })
  const [isShiftPressed, setIsShiftPressed] = useState(false)

  const panRef = useRef({ x: panX, y: panY })

  useEffect(() => {
    panRef.current = { x: panX, y: panY }
  }, [panX, panY])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "ShiftLeft" || e.code === "ShiftRight") {
        if (!e.repeat) {
          e.preventDefault()
          setIsShiftPressed(true)
          if (containerRef.current) {
            containerRef.current.style.cursor = "grab"
          }
        }
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "ShiftLeft" || e.code === "ShiftRight") {
        e.preventDefault()
        setIsShiftPressed(false)
        if (containerRef.current) {
          containerRef.current.style.cursor = "crosshair"
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    window.addEventListener("keyup", handleKeyUp)

    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("keyup", handleKeyUp)
    }
  }, [containerRef])

  const handleGlobalMouseMove = useCallback(
    (e: MouseEvent) => {
      if (isDragging.current) {
        const deltaX = e.clientX - lastMousePos.current.x
        const deltaY = e.clientY - lastMousePos.current.y

        const newPanX = panRef.current.x + deltaX
        const newPanY = panRef.current.y + deltaY

        setPan(newPanX, newPanY)
        lastMousePos.current = { x: e.clientX, y: e.clientY }
      }
    },
    [setPan],
  )

  const handleGlobalMouseUp = useCallback(() => {
    if (isDragging.current) {
      isDragging.current = false
      if (containerRef.current) {
        containerRef.current.style.cursor = isShiftPressed ? "grab" : "crosshair"
      }
    }
    document.removeEventListener("mousemove", handleGlobalMouseMove)
    document.removeEventListener("mouseup", handleGlobalMouseUp)
  }, [containerRef, handleGlobalMouseMove, isShiftPressed])

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if ((e.button === 0 && isShiftPressed) || e.button === 1 || e.button === 2) {
        e.preventDefault()
        e.stopPropagation() // Prevent painting when panning
        isDragging.current = true
        lastMousePos.current = { x: e.clientX, y: e.clientY }
        if (containerRef.current) {
          containerRef.current.style.cursor = "grabbing"
        }

        document.addEventListener("mousemove", handleGlobalMouseMove)
        document.addEventListener("mouseup", handleGlobalMouseUp)
      }
    },
    [containerRef, handleGlobalMouseMove, handleGlobalMouseUp, isShiftPressed],
  )

  const handleMouseMove = useCallback(() => {
    // This is now handled by global event listeners
  }, [])

  const handleMouseUp = useCallback(() => {
    // This is now handled by global event listeners
  }, [])

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault()

      const container = containerRef.current
      if (!container) return

      const rect = container.getBoundingClientRect()
      const mouseX = e.clientX - rect.left
      const mouseY = e.clientY - rect.top

      const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1
      const newZoom = Math.max(0.1, Math.min(10, zoom * zoomFactor))

      const zoomRatio = newZoom / zoom
      const newPanX = mouseX - (mouseX - panX) * zoomRatio
      const newPanY = mouseY - (mouseY - panY) * zoomRatio

      setZoom(newZoom)
      setPan(newPanX, newPanY)
    },
    [zoom, panX, panY, setZoom, setPan, containerRef],
  )

  const getTouchDistance = (touches: React.TouchList) => {
    if (touches.length < 2) return 0
    const dx = touches[0].clientX - touches[1].clientX
    const dy = touches[0].clientY - touches[1].clientY
    return Math.sqrt(dx * dx + dy * dy)
  }

  const getTouchCenter = (touches: React.TouchList) => {
    if (touches.length === 1) {
      return { x: touches[0].clientX, y: touches[0].clientY }
    }
    return {
      x: (touches[0].clientX + touches[1].clientX) / 2,
      y: (touches[0].clientY + touches[1].clientY) / 2,
    }
  }

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      e.preventDefault()
      isDragging.current = false
      lastTouchDistance.current = getTouchDistance(e.touches)
      lastTouchCenter.current = getTouchCenter(e.touches)
    }
  }, [])

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault()

        const distance = getTouchDistance(e.touches)
        const center = getTouchCenter(e.touches)

        if (lastTouchDistance.current > 0 && lastTouchCenter.current) {
          const container = containerRef.current
          if (!container) return

          const rect = container.getBoundingClientRect()

          // Handle panning
          const deltaX = center.x - lastTouchCenter.current.x
          const deltaY = center.y - lastTouchCenter.current.y

          // Handle zooming
          const zoomFactor = distance / lastTouchDistance.current
          const newZoom = Math.max(0.1, Math.min(10, zoom * zoomFactor))

          const centerX = center.x - rect.left
          const centerY = center.y - rect.top

          const zoomRatio = newZoom / zoom
          const newPanX = centerX - (centerX - (panRef.current.x + deltaX)) * zoomRatio
          const newPanY = centerY - (centerY - (panRef.current.y + deltaY)) * zoomRatio

          setZoom(newZoom)
          setPan(newPanX, newPanY)
        }

        lastTouchDistance.current = distance
        lastTouchCenter.current = center
      }
    },
    [zoom, setZoom, setPan, containerRef],
  )

  const handleTouchEnd = useCallback(() => {
    isDragging.current = false
    lastTouchDistance.current = 0
  }, [])

  return {
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleWheel,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    isShiftPressed,
    isDragging: isDragging.current,
  }
}
