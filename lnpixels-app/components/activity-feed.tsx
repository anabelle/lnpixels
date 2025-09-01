"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { X, Zap } from "lucide-react"
import { useActivity } from "@/hooks/use-activity"

interface ActivityFeedProps {
  onClose: () => void
}

export function ActivityFeed({ onClose }: ActivityFeedProps) {
  const { activities, loading, error, refetch } = useActivity()

  const formatTimeAgo = (ts: number) => {
    if (!ts || isNaN(ts)) return "Unknown"
    const diff = Date.now() - ts
    if (diff < 0) return "Just now"
    const m = Math.floor(diff / 60000)
    const h = Math.floor(diff / 3600000)
    const d = Math.floor(diff / 86400000)
    if (d > 0) return `${d}d ago`
    if (h > 0) return `${h}h ago`
    if (m > 0) return `${m}m ago`
    return "Just now"
  }

  const formatSats = (sats: number | undefined) => {
    if (!sats) return "0"
    return sats.toLocaleString()
  }

  return (
    <Card className="w-full bg-card/95 backdrop-blur-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg">Recent Activity</CardTitle>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>

      <CardContent>
        <ScrollArea className="h-96">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-red-500 mb-2">{error}</p>
              <button onClick={() => refetch(50)} className="text-sm text-primary hover:underline">
                Try again
              </button>
            </div>
          ) : activities.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No recent activity</div>
          ) : (
            <div className="space-y-3">
              {activities.map((a) => {
                const key = `${a.payment_hash}-${a.x}-${a.y}-${a.created_at}`
                return (
                  <div
                    key={key}
                    className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <div
                      className="w-6 h-6 rounded border border-border flex-shrink-0"
                      style={{ backgroundColor: a.color }}
                      title={a.color}
                    >
                      {a.letter && (
                        <div className="w-full h-full flex items-center justify-center text-xs font-mono">
                          {a.letter}
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">
                        {a.type === "bulk_purchase" ? "Rectangle" : "Pixel"} ({a.x}, {a.y})
                      </div>
                      <div className="text-xs text-muted-foreground">{formatTimeAgo(a.created_at)}</div>
                    </div>

                    <div className="flex items-center gap-1 text-sm font-medium text-secondary">
                      <Zap className="h-3 w-3" />
                      {formatSats(a.sats)}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
