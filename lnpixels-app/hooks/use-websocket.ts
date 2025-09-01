"use client"

import { useEffect, useRef } from "react"
import { io, Socket } from "socket.io-client"
import { usePixelStore } from "./use-pixel-store"

export function useWebSocket() {
  const { addPixel, updatePixels, addExistingPixel } = usePixelStore()
  const socketRef = useRef<Socket | null>(null)

  useEffect(() => {
    // Connect to the WebSocket server
    const socket = io("https://ln.pixel.xx.kg/api", {
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
      // Update the pixel in the store as existing (from other users' payments)
      addExistingPixel({
        x: data.x,
        y: data.y,
        color: data.color,
        letter: data.letter,
        sats: data.sats,
      })
    })

    // Listen for activity updates and broadcast as CustomEvent like the web app
    socket.on("activity.append", (data) => {
      console.log("Received activity update:", data)
      try {
        if (!data || typeof data.created_at !== "number" || isNaN(data.created_at)) return
        window.dispatchEvent(new CustomEvent('activityUpdate', { detail: data }))
      } catch (e) {
        console.error('Error dispatching activityUpdate event', e)
      }
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
  }, [addPixel, updatePixels, addExistingPixel])

  return socketRef.current
}
