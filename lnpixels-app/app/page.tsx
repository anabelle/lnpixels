"use client"

import { PixelCanvas } from "@/components/pixel-canvas"
import { Toolbar } from "@/components/toolbar"
import { ActivityFeed } from "@/components/activity-feed"
import { SaveModal } from "@/components/save-modal"
import { InfoModal } from "@/components/info-modal"
import { ErrorBoundary } from "@/components/ErrorBoundary"
import { usePixelStore } from "@/hooks/use-pixel-store"
import { useWebSocket } from "@/hooks/use-websocket"
import { useState, useEffect } from "react"

export default function Home() {
  const [showActivityFeed, setShowActivityFeed] = useState(false)
  const [showInfo, setShowInfo] = useState(false)
  // Pixel loading is handled progressively by PixelCanvas via useViewportPixels
  // Keep only modal and error/loader via store in the future if needed
  const { saveModal, closeSaveModal, isLoading, error } = usePixelStore()

  // Initialize WebSocket connection for real-time updates
  useWebSocket()

  // Initial pixels are loaded based on viewport in PixelCanvas

  // Show Info modal on first visit
  useEffect(() => {
    try {
      const seen = typeof window !== "undefined" && localStorage.getItem("lnpixels_seen_info")
      if (!seen) {
        setShowInfo(true)
        localStorage.setItem("lnpixels_seen_info", "1")
      }
    } catch {}
  }, [])

  return (
    <div className="h-screen w-screen overflow-hidden bg-background">
      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-background/80 flex items-center justify-center z-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
            <p className="text-sm text-muted-foreground">Loading pixels...</p>
          </div>
        </div>
      )}

      {/* Error display */}
      {error && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-destructive text-destructive-foreground px-4 py-2 rounded-md z-50">
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Main Canvas Area */}
      <div className="relative h-full w-full">
        <ErrorBoundary fallback={({ error }) => (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-destructive mb-2">Canvas failed to load</p>
              <button 
                onClick={() => window.location.reload()}
                className="text-sm text-primary hover:underline"
              >
                Refresh
              </button>
            </div>
          </div>
        )}>
          <PixelCanvas />
        </ErrorBoundary>

        {/* Toolbar */}
        <div className="absolute top-4 left-4 z-10">
          <ErrorBoundary fallback={() => null}>
            <Toolbar
              onToggleActivity={() => setShowActivityFeed(!showActivityFeed)}
              onOpenInfo={() => setShowInfo(true)}
            />
          </ErrorBoundary>
        </div>

        {/* Activity Feed */}
        {showActivityFeed && (
          <div className="absolute top-4 right-4 z-10 w-80">
            <ErrorBoundary fallback={() => (
              <div className="bg-background border rounded-lg p-4 text-sm">
                <p className="text-destructive">Activity feed unavailable</p>
              </div>
            )}>
              <ActivityFeed onClose={() => setShowActivityFeed(false)} />
            </ErrorBoundary>
          </div>
        )}

        {saveModal.isOpen && (
          <ErrorBoundary fallback={() => null}>
            <SaveModal
              isOpen={saveModal.isOpen}
              onClose={closeSaveModal}
              totalPixels={saveModal.totalPixels}
              totalCost={saveModal.totalCost}
            />
          </ErrorBoundary>
        )}

        {/* Info modal */}
        {showInfo && (
          <ErrorBoundary fallback={() => null}>
            <InfoModal
              isOpen={showInfo}
              onClose={() => setShowInfo(false)}
              onGetStarted={() => setShowInfo(false)}
            />
          </ErrorBoundary>
        )}
      </div>
    </div>
  )
}
