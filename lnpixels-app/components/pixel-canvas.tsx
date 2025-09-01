"use client"

import type React from "react"

import { useRef, useEffect, useCallback, useState } from "react"
import { usePixelStore } from "@/hooks/use-pixel-store"
import { usePanZoom } from "@/hooks/use-pan-zoom"
import { useWebSocket } from "@/hooks/use-websocket"

interface Pixel {
  x: number
  y: number
  color: string
  letter?: string
}

export function PixelCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [textInputPosition, setTextInputPosition] = useState<{ x: number; y: number } | null>(null)

  const { pixels, selectedColor, brushSize, zoom, panX, panY, toolMode, addPixel } = usePixelStore()

  const {
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleWheel,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    isSpacePressed,
  } = usePanZoom(containerRef)

  useWebSocket()

  const GRID_SIZE = 10

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (toolMode === "text" && textInputPosition && e.key.length === 1) {
        addPixel({
          x: textInputPosition.x,
          y: textInputPosition.y,
          color: selectedColor,
          letter: e.key.toUpperCase(),
        })
        setTextInputPosition({
          x: textInputPosition.x + 1,
          y: textInputPosition.y,
        })
      }
    }

    if (toolMode === "text") {
      window.addEventListener("keypress", handleKeyPress)
      return () => window.removeEventListener("keypress", handleKeyPress)
    }
  }, [toolMode, textInputPosition, selectedColor, addPixel])

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

  useEffect(() => {
    render()
  }, [render])

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
    if (isSpacePressed) return

    const coords = getPixelCoordinates(e.clientX, e.clientY)
    if (!coords) return

    if (toolMode === "text") {
      setTextInputPosition(coords)
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
      if (isSpacePressed) {
        handleMouseDown(e)
      } else {
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
    if (isDrawing && !isSpacePressed && toolMode === "paint") {
      handleCanvasClick(e)
    }
    handleMouseMove(e)
  }

  const handleCanvasMouseUp = (e: React.MouseEvent) => {
    if (!isSpacePressed) {
      setIsDrawing(false)
    }
    handleMouseUp(e)
  }

  return (
    <div
      ref={containerRef}
      className={`h-full w-full select-none ${
        toolMode === "text" ? "cursor-text" : isSpacePressed ? "cursor-move" : "cursor-pointer"
      }`}
      onMouseDown={handleCanvasMouseDown}
      onMouseMove={handleCanvasMouseMove}
      onMouseUp={handleCanvasMouseUp}
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      tabIndex={toolMode === "text" ? 0 : -1}
    >
      <canvas ref={canvasRef} className="block" style={{ touchAction: "none" }} />

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
        </div>
      )}
    </div>
  )
}
