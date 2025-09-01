"use client"

import type React from "react"

import { useRef, useEffect, useCallback, useState } from "react"
import { usePixelStore } from "@/hooks/use-pixel-store"
import { usePanZoom } from "@/hooks/use-pan-zoom"
import { useWebSocket } from "@/hooks/use-websocket"
import { useViewportPixels } from "@/hooks/use-viewport-pixels"

interface Pixel {
  x: number
  y: number
  color: string
  letter?: string
}

export function PixelCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const hiddenInputRef = useRef<HTMLInputElement>(null)
  const lastProcessedLength = useRef(0)
  const lastProcessedChar = useRef<{ char: string; timestamp: number } | null>(null)
  const isComposingRef = useRef(false)
  const [isDrawing, setIsDrawing] = useState(false)
  const [textInputPosition, setTextInputPosition] = useState<{ x: number; y: number } | null>(null)
  // Touch intent: defer painting briefly to distinguish from pinch/pan
  const paintIntentTimer = useRef<number | null>(null)
  const paintIntentCoords = useRef<{ x: number; y: number } | null>(null)

  const { pixels, selectedColor, brushSize, zoom, panX, panY, toolMode, addPixel, setPan } = usePixelStore()

  const {
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleWheel,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    isShiftPressed,
    isDragging,
  } = usePanZoom(containerRef)

  useWebSocket()
  useViewportPixels(containerRef)

  // Clear drawing state when shift is pressed (prevents drawing during panning)
  useEffect(() => {
    if (isShiftPressed) {
      setIsDrawing(false)
      // Don't clear text input position - let user resume typing after panning
    }
  }, [isShiftPressed])

  const GRID_SIZE = 10

  useEffect(() => {
    const handleInput = (e: Event) => {
      const target = e.target as HTMLInputElement
      const value = target.value

      // Skip processing while composing (IME/predictive text)
      const ie = e as unknown as { isComposing?: boolean; inputType?: string }
      if (ie && ie.isComposing) return
      if (isComposingRef.current) return

      if (toolMode === "text" && textInputPosition && !isDragging) {
        const prevLen = lastProcessedLength.current
        const currLen = value.length

        if (currLen > prevLen) {
          // Process only newly added characters in order
          for (let i = prevLen; i < currLen; i++) {
            const ch = value[i]
            if (!ch) continue
            if (ch === ' ') {
              // spaces: no pixel; cursor will advance via delta below
              continue
            } else if (ch.length === 1) {
              const upper = ch.toUpperCase()
              addPixel({
                x: textInputPosition.x + (i - prevLen),
                y: textInputPosition.y,
                color: selectedColor,
                letter: upper,
              })
            }
          }
          // Advance cursor by number of new characters
          const delta = currLen - prevLen
          if (delta > 0) {
            setTextInputPosition((pos) => pos ? { x: pos.x + delta, y: pos.y } : pos)
          }
        } else if (currLen < prevLen) {
          // Deletions: move cursor back locally, but do not erase pixels already placed
          const delta = prevLen - currLen
          if (delta > 0) {
            setTextInputPosition((pos) => pos ? { x: Math.max(0, pos.x - delta), y: pos.y } : pos)
          }
        }

        lastProcessedLength.current = currLen
      }
    }

    if (toolMode === "text") {
      // Add input & composition listeners for keyboard support
      const hiddenInput = hiddenInputRef.current
      if (hiddenInput) {
        hiddenInput.addEventListener("input", handleInput)
        hiddenInput.addEventListener("compositionstart", () => { isComposingRef.current = true })
        hiddenInput.addEventListener("compositionend", () => { isComposingRef.current = false })
      }

      return () => {
        if (hiddenInput) {
          hiddenInput.removeEventListener("input", handleInput)
          hiddenInput.removeEventListener("compositionstart", () => { isComposingRef.current = true })
          hiddenInput.removeEventListener("compositionend", () => { isComposingRef.current = false })
        }
      }
    }
  }, [toolMode, textInputPosition, selectedColor, addPixel, isDragging])

  const drawGrid = useCallback(
    (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
      const { width, height } = canvas
      const gridSize = GRID_SIZE * zoom

      const startX = Math.floor(-panX / gridSize) * gridSize + (panX % gridSize)
      const startY = Math.floor(-panY / gridSize) * gridSize + (panY % gridSize)

      ctx.strokeStyle = "rgba(107, 114, 128, 0.2)"
      ctx.lineWidth = 0.5

      for (let x = startX; x < width; x += gridSize) {
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, height)
        ctx.stroke()
      }

      for (let y = startY; y < height; y += gridSize) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(width, y)
        ctx.stroke()
      }
    },
    [zoom, panX, panY],
  )

  const drawPixels = useCallback(
    (ctx: CanvasRenderingContext2D) => {
      const gridSize = GRID_SIZE * zoom

      pixels.forEach((pixel: Pixel) => {
        const screenX = pixel.x * gridSize + panX
        const screenY = pixel.y * gridSize + panY

        if (screenX > -gridSize && screenX < ctx.canvas.width && screenY > -gridSize && screenY < ctx.canvas.height) {
          ctx.fillStyle = pixel.color
          ctx.fillRect(screenX, screenY, gridSize, gridSize)

          if (pixel.letter) {
            ctx.fillStyle = pixel.color === "#ffffff" ? "#000000" : "#ffffff"
            ctx.font = `${Math.max(8, gridSize * 0.6)}px monospace`
            ctx.textAlign = "center"
            ctx.textBaseline = "middle"
            ctx.fillText(pixel.letter, screenX + gridSize / 2, screenY + gridSize / 2)
          }
        }
      })

      if (toolMode === "text" && textInputPosition) {
        const screenX = textInputPosition.x * gridSize + panX
        const screenY = textInputPosition.y * gridSize + panY

        const time = Date.now()
        if (Math.floor(time / 500) % 2 === 0) {
          ctx.strokeStyle = selectedColor
          ctx.lineWidth = 2
          ctx.strokeRect(screenX, screenY, gridSize, gridSize)
        }
      }
    },
    [pixels, zoom, panX, panY, toolMode, textInputPosition, selectedColor],
  )

  const render = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    drawGrid(ctx, canvas)

    drawPixels(ctx)
  }, [drawGrid, drawPixels])

  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const resizeCanvas = () => {
      canvas.width = container.clientWidth
      canvas.height = container.clientHeight
      render()
    }

    resizeCanvas()
    window.addEventListener("resize", resizeCanvas)
    return () => window.removeEventListener("resize", resizeCanvas)
  }, [render])

  // Center (0,0) coordinate on initial load
  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const centerCanvas = () => {
      const centerX = container.clientWidth / 2
      const centerY = container.clientHeight / 2
      setPan(centerX, centerY)
    }

    // Center after a short delay to ensure container is properly sized
    const timeoutId = setTimeout(centerCanvas, 100)
    return () => clearTimeout(timeoutId)
  }, [setPan])

  useEffect(() => {
    render()
  }, [render])

  // Clear any pending touch intent timer on unmount/tool change
  useEffect(() => {
    return () => {
      if (paintIntentTimer.current !== null) {
        clearTimeout(paintIntentTimer.current)
        paintIntentTimer.current = null
      }
      paintIntentCoords.current = null
    }
  }, [toolMode])

  const getPixelCoordinates = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current
    if (!canvas) return null

    const rect = canvas.getBoundingClientRect()
    const x = clientX - rect.left
    const y = clientY - rect.top

    const gridSize = GRID_SIZE * zoom
    const pixelX = Math.floor((x - panX) / gridSize)
    const pixelY = Math.floor((y - panY) / gridSize)

    return { x: pixelX, y: pixelY }
  }

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (isShiftPressed) return

    const coords = getPixelCoordinates(e.clientX, e.clientY)
    if (!coords) return

    if (toolMode === "text") {
      setTextInputPosition(coords)
      // Reset input tracking when setting new position
      lastProcessedLength.current = 0
  if (hiddenInputRef.current) hiddenInputRef.current.value = ""
      // Focus hidden input for mobile keyboard
      setTimeout(() => {
        if (hiddenInputRef.current) {
          hiddenInputRef.current.focus()
        }
      }, 100)
    } else {
      const halfBrush = Math.floor(brushSize / 2)

      for (let dx = -halfBrush; dx < brushSize - halfBrush; dx++) {
        for (let dy = -halfBrush; dy < brushSize - halfBrush; dy++) {
          addPixel({
            x: coords.x + dx,
            y: coords.y + dy,
            color: selectedColor,
            letter: undefined,
          })
        }
      }
    }
  }

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) {
      if (isShiftPressed) {
        // Panning mode - don't set drawing state
        handleMouseDown(e)
      } else {
        // Only set drawing state in paint mode
        if (toolMode === "paint") {
          setIsDrawing(true)
        }
        handleCanvasClick(e)
      }
    } else {
      handleMouseDown(e)
    }
  }

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    // Only draw if we're in paint mode, currently drawing, not panning, and not in shift-pan mode
    if (isDrawing && !isShiftPressed && toolMode === "paint") {
      handleCanvasClick(e)
    }
    handleMouseMove()
  }

  const handleCanvasMouseUp = (e: React.MouseEvent) => {
    // Always clear drawing state on mouse up
    setIsDrawing(false)
    handleMouseUp()
  }

  // --- Touch handlers: single-finger paints, two-finger pinch to pan/zoom ---
  const handleCanvasTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      // Two-finger gesture for pan/zoom
      // Cancel any pending paint intent
      if (paintIntentTimer.current !== null) {
        clearTimeout(paintIntentTimer.current)
        paintIntentTimer.current = null
      }
      paintIntentCoords.current = null
      handleTouchStart(e)
      return
    }

    if (e.touches.length === 1) {
      const t = e.touches[0]
      const coords = getPixelCoordinates(t.clientX, t.clientY)
      if (!coords) return

      // Defer action slightly to distinguish between single-touch paint and beginning of pinch
      paintIntentCoords.current = coords
      if (paintIntentTimer.current !== null) {
        clearTimeout(paintIntentTimer.current)
      }
      paintIntentTimer.current = window.setTimeout(() => {
        // If no second touch arrived, commit the intended action
        if (!paintIntentCoords.current) return
        if (toolMode === "text") {
          setTextInputPosition(paintIntentCoords.current)
          // Reset input tracking when setting new position
          lastProcessedLength.current = 0
          if (hiddenInputRef.current) hiddenInputRef.current.value = ""
          // Focus hidden input for mobile keyboard
          setTimeout(() => {
            if (hiddenInputRef.current) {
              hiddenInputRef.current.focus()
            }
          }, 100)
        } else if (toolMode === "paint") {
          setIsDrawing(true)
          const halfBrush = Math.floor(brushSize / 2)
          for (let dx = -halfBrush; dx < brushSize - halfBrush; dx++) {
            for (let dy = -halfBrush; dy < brushSize - halfBrush; dy++) {
              addPixel({
                x: paintIntentCoords.current!.x + dx,
                y: paintIntentCoords.current!.y + dy,
                color: selectedColor,
                letter: undefined,
              })
            }
          }
        }
        // Clear intent after handling
        paintIntentCoords.current = null
        paintIntentTimer.current = null
      }, 120)
    }
  }

  const handleCanvasTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      // Pan/zoom with two fingers
      // Cancel any pending paint intent when a second finger joins
      if (paintIntentTimer.current !== null) {
        clearTimeout(paintIntentTimer.current)
        paintIntentTimer.current = null
      }
      paintIntentCoords.current = null
      handleTouchMove(e)
      return
    }

    if (e.touches.length === 1 && toolMode === "paint") {
      // If paint intent hasn't fired yet, don't paint on move
      if (paintIntentTimer.current !== null) return
      if (!isDrawing) return
      e.preventDefault()
      const t = e.touches[0]
      const coords = getPixelCoordinates(t.clientX, t.clientY)
      if (!coords) return

      const halfBrush = Math.floor(brushSize / 2)
      for (let dx = -halfBrush; dx < brushSize - halfBrush; dx++) {
        for (let dy = -halfBrush; dy < brushSize - halfBrush; dy++) {
          addPixel({ x: coords.x + dx, y: coords.y + dy, color: selectedColor, letter: undefined })
        }
      }
    }
  }

  const handleCanvasTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length < 2) {
      // End pinch state if any
      handleTouchEnd()
    }
    // Stop drawing when touch ends or fingers lifted
    if (e.touches.length === 0) {
      setIsDrawing(false)
    }
    // Clear any pending paint intent if touch ends before it fires
    if (paintIntentTimer.current !== null) {
      clearTimeout(paintIntentTimer.current)
      paintIntentTimer.current = null
    }
    paintIntentCoords.current = null
  }

  return (
    <div
      ref={containerRef}
      className={`h-full w-full select-none ${
        toolMode === "text" ? "cursor-text" : isShiftPressed ? "cursor-move" : "cursor-pointer"
      }`}
      onMouseDown={handleCanvasMouseDown}
      onMouseMove={handleCanvasMouseMove}
      onMouseUp={handleCanvasMouseUp}
      onWheel={handleWheel}
  onTouchStart={handleCanvasTouchStart}
  onTouchMove={handleCanvasTouchMove}
  onTouchEnd={handleCanvasTouchEnd}
      tabIndex={toolMode === "text" ? 0 : -1}
    >
      <canvas ref={canvasRef} className="block" style={{ touchAction: "none" }} />

      {/* Hidden input for mobile keyboard support in text mode */}
      <input
        ref={hiddenInputRef}
        type="text"
        className="absolute opacity-0 pointer-events-none -z-10"
        style={{
          position: 'absolute',
          top: '-9999px',
          left: '-9999px',
          width: '1px',
          height: '1px',
        }}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
      />

      <div className="absolute bottom-4 left-4 bg-card/90 backdrop-blur-sm px-3 py-2 rounded-lg text-sm font-mono">
        <div>Zoom: {(zoom * 100).toFixed(0)}%</div>
        <div>
          Pan: ({Math.round(-panX / (GRID_SIZE * zoom))}, {Math.round(-panY / (GRID_SIZE * zoom))})
        </div>
        <div>Pixels: {pixels.length}</div>
        <div>Mode: {toolMode === "text" ? "Text" : "Paint"}</div>
        {toolMode === "text" && textInputPosition && (
          <div>
            Cursor: ({textInputPosition.x}, {textInputPosition.y})
          </div>
        )}
      </div>

      {toolMode === "text" && (
        <div className="absolute top-4 right-4 bg-card/90 backdrop-blur-sm px-3 py-2 rounded-lg text-sm">
          <div className="font-semibold mb-1">Text Mode</div>
          <div>Click to place cursor</div>
          <div>Type to add letters</div>
          <div className="text-xs text-muted-foreground mt-1">100 sats per letter</div>
          {textInputPosition && (
            <div className="text-xs text-green-600 mt-1">
              📱 Keyboard should open automatically
            </div>
          )}
        </div>
      )}
    </div>
  )
}
