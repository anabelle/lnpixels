"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"

interface ColorPickerProps {
  color: string
  onChange: (color: string) => void
  onClose: () => void
}

// Convert HSV to RGB
function hsvToRgb(h: number, s: number, v: number): [number, number, number] {
  const c = v * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = v - c

  let r = 0,
    g = 0,
    b = 0

  if (0 <= h && h < 60) {
    r = c
    g = x
    b = 0
  } else if (60 <= h && h < 120) {
    r = x
    g = c
    b = 0
  } else if (120 <= h && h < 180) {
    r = 0
    g = c
    b = x
  } else if (180 <= h && h < 240) {
    r = 0
    g = x
    b = c
  } else if (240 <= h && h < 300) {
    r = x
    g = 0
    b = c
  } else if (300 <= h && h < 360) {
    r = c
    g = 0
    b = x
  }

  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)]
}

// Convert RGB to HSV
function rgbToHsv(r: number, g: number, b: number): [number, number, number] {
  r /= 255
  g /= 255
  b /= 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const diff = max - min

  let h = 0
  if (diff !== 0) {
    if (max === r) {
      h = ((g - b) / diff) % 6
    } else if (max === g) {
      h = (b - r) / diff + 2
    } else {
      h = (r - g) / diff + 4
    }
  }
  h = Math.round(h * 60)
  if (h < 0) h += 360

  const s = max === 0 ? 0 : diff / max
  const v = max

  return [h, s, v]
}

// Convert RGB to hex
function rgbToHex(r: number, g: number, b: number): string {
  return (
    "#" +
    [r, g, b]
      .map((x) => {
        const hex = x.toString(16)
        return hex.length === 1 ? "0" + hex : hex
      })
      .join("")
  )
}

// Convert hex to RGB
function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? [Number.parseInt(result[1], 16), Number.parseInt(result[2], 16), Number.parseInt(result[3], 16)]
    : [0, 0, 0]
}

export function ColorPicker({ color, onChange, onClose }: ColorPickerProps) {
  const [r, g, b] = hexToRgb(color)
  const [h, s, v] = rgbToHsv(r, g, b)

  const [hue, setHue] = useState(h)
  const [saturation, setSaturation] = useState(s)
  const [value, setValue] = useState(v)

  const svRef = useRef<HTMLDivElement>(null)
  const hueRef = useRef<HTMLDivElement>(null)

  const updateColor = (newH: number, newS: number, newV: number) => {
    const [newR, newG, newB] = hsvToRgb(newH, newS, newV)
    const hex = rgbToHex(newR, newG, newB)
    onChange(hex)
  }

  const handleSVMouseDown = (e: React.MouseEvent) => {
    const rect = svRef.current?.getBoundingClientRect()
    if (!rect) return

    const handleMouseMove = (e: MouseEvent) => {
      const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
      const y = Math.max(0, Math.min(1, 1 - (e.clientY - rect.top) / rect.height))

      setSaturation(x)
      setValue(y)
      updateColor(hue, x, y)
    }

    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
    }

    document.addEventListener("mousemove", handleMouseMove)
    document.addEventListener("mouseup", handleMouseUp)
    handleMouseMove(e as any)
  }

  const handleHueMouseDown = (e: React.MouseEvent) => {
    const rect = hueRef.current?.getBoundingClientRect()
    if (!rect) return

    const handleMouseMove = (e: MouseEvent) => {
      const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height))
      const newHue = y * 360

      setHue(newHue)
      updateColor(newHue, saturation, value)
    }

    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
    }

    document.addEventListener("mousemove", handleMouseMove)
    document.addEventListener("mouseup", handleMouseUp)
    handleMouseMove(e as any)
  }

  const presetColors = [
    "#000000",
    "#ffffff",
    "#ff0000",
    "#00ff00",
    "#0000ff",
    "#ffff00",
    "#ff00ff",
    "#00ffff",
    "#ffa500",
    "#800080",
    "#ffc0cb",
    "#a52a2a",
  ]

  return (
    <div className="absolute top-10 left-0 bg-background border rounded-lg p-4 shadow-xl z-20 w-64">
      {/* Current color display */}
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded border-2 border-border" style={{ backgroundColor: color }} />
        <input
          type="text"
          value={color.toUpperCase()}
          onChange={(e) => {
            const hex = e.target.value
            if (/^#[0-9A-F]{6}$/i.test(hex)) {
              onChange(hex)
              const [newR, newG, newB] = hexToRgb(hex)
              const [newH, newS, newV] = rgbToHsv(newR, newG, newB)
              setHue(newH)
              setSaturation(newS)
              setValue(newV)
            }
          }}
          className="flex-1 px-2 py-1 text-xs border rounded font-mono"
        />
      </div>

      {/* Saturation/Value picker */}
      <div className="relative mb-3">
        <div
          ref={svRef}
          className="w-full h-32 cursor-crosshair rounded"
          style={{
            background: `linear-gradient(to right, white, hsl(${hue}, 100%, 50%)), linear-gradient(to top, black, transparent)`,
          }}
          onMouseDown={handleSVMouseDown}
        >
          <div
            className="absolute w-3 h-3 border-2 border-white rounded-full shadow-md pointer-events-none"
            style={{
              left: `${saturation * 100}%`,
              top: `${(1 - value) * 100}%`,
              transform: "translate(-50%, -50%)",
            }}
          />
        </div>
      </div>

      {/* Hue picker */}
      <div className="relative mb-3">
        <div
          ref={hueRef}
          className="w-full h-4 cursor-pointer rounded"
          style={{
            background:
              "linear-gradient(to bottom, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%)",
          }}
          onMouseDown={handleHueMouseDown}
        >
          <div
            className="absolute w-full h-1 border border-white shadow-md pointer-events-none"
            style={{
              top: `${(hue / 360) * 100}%`,
              transform: "translateY(-50%)",
            }}
          />
        </div>
      </div>

      {/* Preset colors */}
      <div className="grid grid-cols-6 gap-1 mb-3">
        {presetColors.map((presetColor) => (
          <button
            key={presetColor}
            className="w-6 h-6 rounded border border-border hover:scale-110 transition-transform"
            style={{ backgroundColor: presetColor }}
            onClick={() => onChange(presetColor)}
          />
        ))}
      </div>

      {/* Close button */}
      <Button size="sm" onClick={onClose} className="w-full">
        Done
      </Button>
    </div>
  )
}
