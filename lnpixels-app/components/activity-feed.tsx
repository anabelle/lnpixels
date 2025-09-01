"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { X, Zap } from "lucide-react"
import { useEffect, useState } from "react"

interface Activity {
  id: string
  type: "purchase" | "update"
  x: number
  y: number
  color: string
  letter?: string
  amount: number
  timestamp: string
}

interface ActivityFeedProps {
  onClose: () => void
}

export function ActivityFeed({ onClose }: ActivityFeedProps) {
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchActivities()
  }, [])

  const fetchActivities = async () => {
    try {
      setError(null)
      const response = await fetch("http://localhost:3001/api/activity?limit=50")
      if (!response.ok) {
        throw new Error(`Failed to fetch activities: ${response.status}`)
      }
      const data = await response.json()
      setActivities(data || [])
    } catch (error) {
      console.error("Failed to fetch activities:", error)
      const errorMessage = error instanceof Error ? error.message : "Failed to fetch activities"
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString()
  }

  const formatSats = (amount: number) => {
    return amount.toLocaleString()
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
              <button
                onClick={fetchActivities}
                className="text-sm text-primary hover:underline"
              >
                Try again
              </button>
            </div>
          ) : activities.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No recent activity</div>
          ) : (
            <div className="space-y-3">
              {activities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div
                    className="w-6 h-6 rounded border border-border flex-shrink-0"
                    style={{ backgroundColor: activity.color }}
                  >
                    {activity.letter && (
                      <div className="w-full h-full flex items-center justify-center text-xs font-mono">
                        {activity.letter}
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">
                      Pixel ({activity.x}, {activity.y})
                    </div>
                    <div className="text-xs text-muted-foreground">{formatTime(activity.timestamp)}</div>
                  </div>

                  <div className="flex items-center gap-1 text-sm font-medium text-secondary">
                    <Zap className="h-3 w-3" />
                    {formatSats(activity.amount)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
