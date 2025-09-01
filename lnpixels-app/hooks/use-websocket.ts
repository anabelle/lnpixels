"use client"

import { useEffect, useRef } from "react"
import { io, Socket } from "socket.io-client"
import { usePixelStore } from "./use-pixel-store"

export function useWebSocket() {
  const { addPixel, updatePixels } = usePixelStore()
  const socketRef = useRef<Socket | null>(null)

  useEffect(() => {
    // Connect to the WebSocket server
    const socket = io("http://localhost:3001/api", {
      transports: ["websocket", "polling"],
    })

    socketRef.current = socket

    socket.on("connect", () => {
      console.log("Connected to WebSocket server")
    })

    socket.on("disconnect", () => {
      console.log("Disconnected from WebSocket server")
    })

    // Listen for pixel updates
    socket.on("pixel_update", (data) => {
      console.log("Received pixel update:", data)
      // Update the pixel in the store
      addPixel({
        x: data.x,
        y: data.y,
        color: data.color,
        letter: data.letter,
        sats: data.sats,
      })
    })

    // Listen for bulk pixel updates
    socket.on("bulk_pixel_update", (data) => {
      console.log("Received bulk pixel update:", data)
      // Update multiple pixels in the store
      updatePixels(data.pixels)
    })

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect()
      }
    }
  }, [addPixel, updatePixels])

  return socketRef.current
}
