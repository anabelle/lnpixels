"use client"

import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { usePixelStore } from "@/hooks/use-pixel-store"
import { Activity, ZoomIn, ZoomOut, Home, Save, Trash2, Minus, Plus, Paintbrush, Type, HelpCircle, Eraser } from "lucide-react"
import { useState } from "react"
import { ColorPicker } from "./color-picker"
import { ThemeToggle } from "./theme-toggle"

interface ToolbarProps {
  onToggleActivity: () => void
  onOpenInfo?: () => void
}

export function Toolbar({ onToggleActivity, onOpenInfo }: ToolbarProps) {
  const {
    selectedColor,
    setSelectedColor,
    brushSize,
    setBrushSize,
    zoom,
    setZoom,
    toolMode,
    setToolMode,
    resetView,
    openSaveModal,
    clearCanvas,
    pixels,
    getNewPixels,
  } = usePixelStore()

  const newPixelCount = typeof getNewPixels === 'function'
    ? getNewPixels().length
    : (Array.isArray(pixels) ? pixels.filter((p: any) => p && (p as any).isNew === true).length : 0)

  const [showColorPicker, setShowColorPicker] = useState(false)

  const handleZoomIn = () => setZoom(Math.min(zoom * 1.5, 10))
  const handleZoomOut = () => setZoom(Math.max(zoom / 1.5, 0.1))

  return (
    <>
      {/* Desktop/Landscape - Horizontal toolbar */}
      <div className="hidden md:flex fixed top-4 left-4 right-4 z-50 items-center justify-between bg-background/95 backdrop-blur-sm border rounded-lg px-3 py-2 shadow-lg">
        {/* Left section - Drawing tools */}
        <div className="flex items-center gap-2">
          {/* Tool mode selector */}
          <div className="flex items-center gap-1 border rounded p-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant={toolMode === "paint" ? "default" : "ghost"}
                  onClick={() => setToolMode("paint")}
                  className="h-6 w-6 p-0"
                  aria-label="Paint tool"
                >
                  <Paintbrush className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Paint (B)</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant={toolMode === "erase" ? "default" : "ghost"}
                  onClick={() => setToolMode("erase")}
                  className="h-6 w-6 p-0"
                  aria-label="Eraser tool"
                >
                  <Eraser className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Eraser (E)</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant={toolMode === "text" ? "default" : "ghost"}
                  onClick={() => setToolMode("text")}
                  className="h-6 w-6 p-0"
                  aria-label="Text tool"
                >
                  <Type className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Text (T)</TooltipContent>
            </Tooltip>
          </div>

          {/* Color picker */}
          <div className="relative">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  className="w-8 h-8 rounded border-2 border-border hover:scale-105 transition-transform"
                  style={{ backgroundColor: selectedColor }}
                  onClick={() => setShowColorPicker(!showColorPicker)}
                  aria-label="Current color"
                  title={`Color: ${selectedColor}`}
                />
              </TooltipTrigger>
              <TooltipContent>Pick color</TooltipContent>
            </Tooltip>
            {showColorPicker && (
              <ColorPicker
                color={selectedColor}
                onChange={setSelectedColor}
                onClose={() => setShowColorPicker(false)}
              />
            )}
          </div>

          {/* Brush size - for paint and erase modes */}
          {(toolMode === "paint" || toolMode === "erase") && (
            <div className="flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setBrushSize(Math.max(1, brushSize - 1))}
                    disabled={brushSize <= 1}
                    className="h-8 w-8 p-0"
                    aria-label="Decrease brush size"
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Smaller brush (-)</TooltipContent>
              </Tooltip>
              <span className="text-xs font-mono w-6 text-center">{brushSize}</span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setBrushSize(Math.min(10, brushSize + 1))}
                    disabled={brushSize >= 10}
                    className="h-8 w-8 p-0"
                    aria-label="Increase brush size"
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Larger brush (+)</TooltipContent>
              </Tooltip>
            </div>
          )}
        </div>

        {/* Center section - Navigation */}
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="sm" variant="ghost" onClick={handleZoomOut} className="h-8 w-8 p-0" aria-label="Zoom out">
                <ZoomOut className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Zoom out</TooltipContent>
          </Tooltip>
          <span className="text-xs font-mono w-12 text-center">{(zoom * 100).toFixed(0)}%</span>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="sm" variant="ghost" onClick={handleZoomIn} className="h-8 w-8 p-0" aria-label="Zoom in">
                <ZoomIn className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Zoom in</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="sm" variant="ghost" onClick={resetView} className="h-8 w-8 p-0" aria-label="Reset view">
                <Home className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Reset view</TooltipContent>
          </Tooltip>
        </div>

        {/* Right section - Actions */}
        <div className="flex items-center gap-2">
          <ThemeToggle />

          {onOpenInfo && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="sm" variant="ghost" onClick={onOpenInfo} className="h-8 w-8 p-0" aria-label="Help / Info">
                  <HelpCircle className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Help / Info</TooltipContent>
            </Tooltip>
          )}

          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="sm" variant="ghost" onClick={onToggleActivity} className="h-8 w-8 p-0" aria-label="Toggle activity">
                <Activity className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Toggle activity</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                variant="ghost"
                onClick={clearCanvas}
                disabled={newPixelCount === 0}
                className="h-8 w-8 p-0"
                aria-label="Clear new pixels"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Clear new pixels</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="sm" className="h-8 px-3" onClick={openSaveModal} disabled={newPixelCount === 0} aria-label="Save">
                    <Save className="h-4 w-4 mr-1" />
                    <span className="text-xs">{newPixelCount}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Save ({newPixelCount})</TooltipContent>
              </Tooltip>
            </TooltipTrigger>
            <TooltipContent>Save ({newPixelCount})</TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Mobile toolbar */}
      <div className="md:hidden fixed top-4 left-4 z-50 flex flex-col gap-2 bg-background/95 backdrop-blur-sm border rounded-lg p-2 shadow-lg">
        {/* Drawing tools section */}
        <div className="flex flex-col items-center gap-2">
          {/* Tool mode selector */}
          <div className="flex gap-1 border rounded p-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant={toolMode === "paint" ? "default" : "ghost"}
                  onClick={() => setToolMode("paint")}
                  className="h-5 w-5 p-0"
                  aria-label="Paint tool"
                >
                  <Paintbrush className="h-2 w-2" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Paint</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant={toolMode === "erase" ? "default" : "ghost"}
                  onClick={() => setToolMode("erase")}
                  className="h-5 w-5 p-0"
                  aria-label="Eraser tool"
                >
                  <Eraser className="h-2 w-2" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Eraser</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant={toolMode === "text" ? "default" : "ghost"}
                  onClick={() => setToolMode("text")}
                  className="h-5 w-5 p-0"
                  aria-label="Text tool"
                >
                  <Type className="h-2 w-2" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Text</TooltipContent>
            </Tooltip>
          </div>

          {/* Color picker */}
          <div className="relative">
            <button
              className="w-8 h-8 rounded border-2 border-border hover:scale-105 transition-transform"
              style={{ backgroundColor: selectedColor }}
              onClick={() => setShowColorPicker(!showColorPicker)}
              aria-label="Current color"
            />
            {showColorPicker && (
              <ColorPicker
                color={selectedColor}
                onChange={setSelectedColor}
                onClose={() => setShowColorPicker(false)}
              />
            )}
          </div>

          {/* Brush size - for paint and erase modes */}
          {(toolMode === "paint" || toolMode === "erase") && (
            <div className="flex flex-col items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setBrushSize(Math.min(10, brushSize + 1))}
                    disabled={brushSize >= 10}
                    className="h-6 w-6 p-0"
                    aria-label="Increase brush size"
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Larger brush</TooltipContent>
              </Tooltip>
              <span className="text-xs font-mono">{brushSize}</span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setBrushSize(Math.max(1, brushSize - 1))}
                    disabled={brushSize <= 1}
                    className="h-6 w-6 p-0"
                    aria-label="Decrease brush size"
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Smaller brush</TooltipContent>
              </Tooltip>
            </div>
          )}
        </div>

        {/* Navigation section */}
        <div className="flex flex-col items-center gap-1 border-t pt-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="sm" variant="ghost" onClick={handleZoomIn} className="h-6 w-6 p-0" aria-label="Zoom in">
                <ZoomIn className="h-3 w-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Zoom in</TooltipContent>
          </Tooltip>
          <span className="text-xs font-mono">{(zoom * 100).toFixed(0)}%</span>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="sm" variant="ghost" onClick={handleZoomOut} className="h-6 w-6 p-0" aria-label="Zoom out">
                <ZoomOut className="h-3 w-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Zoom out</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="sm" variant="ghost" onClick={resetView} className="h-6 w-6 p-0" aria-label="Reset view">
                <Home className="h-3 w-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Reset view</TooltipContent>
          </Tooltip>
        </div>

        {/* Actions section */}
        <div className="flex flex-col items-center gap-1 border-t pt-2">
          <ThemeToggle />

          {onOpenInfo && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="sm" variant="ghost" onClick={onOpenInfo} className="h-6 w-6 p-0" aria-label="Help / Info">
                  <HelpCircle className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Help / Info</TooltipContent>
            </Tooltip>
          )}

          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="sm" variant="ghost" onClick={onToggleActivity} className="h-6 w-6 p-0" aria-label="Toggle activity">
                <Activity className="h-3 w-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Toggle activity</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                variant="ghost"
                onClick={clearCanvas}
                disabled={newPixelCount === 0}
                className="h-6 w-6 p-0"
                aria-label="Clear new pixels"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Clear new pixels</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="sm" className="h-6 w-6 p-0 relative" onClick={openSaveModal} disabled={newPixelCount === 0} aria-label="Save">
                <Save className="h-3 w-3" />
                {newPixelCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs rounded-full w-4 h-4 flex items-center justify-center text-[10px]">
                    {newPixelCount > 99 ? "99+" : newPixelCount}
                  </span>
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>Save</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </>
  )
}
