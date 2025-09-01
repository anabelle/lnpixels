"use client"

import { useEffect, useRef } from "react"
import { io, Socket } from "socket.io-client"
import { usePixelStore } from "./use-pixel-store"

export function useWebSocket() {
  const { addPixel, updatePixels } = usePixelStore()
  const socketRef = useRef<Socket | null>(null)

  useEffect(() => {
    // Connect to the WebSocket server
    const socket = io("http://localhost:3000/api", {
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
    socket.on("pixel.update", (data) => {
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

    // Listen for activity updates
    socket.on("activity.append", (data) => {
      console.log("Received activity update:", data)
      // For now, we'll just log activity updates
      // You could add activity state management here if needed
    })

    // Listen for payment confirmations
    socket.on("payment.confirmed", (data) => {
      console.log("Received payment confirmation:", data)
      // Emit a window event so the save modal can listen for it
      window.dispatchEvent(new CustomEvent('payment.confirmed', { detail: data }))
    })

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect()
      }
    }
  }, [addPixel, updatePixels])

  return socketRef.current
}
