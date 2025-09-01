"use client"

import { useEffect, useState } from "react"

// Activity item shape matches API: { events: ActivityItem[] }
export interface ActivityItem {
  id?: number
  x: number
  y: number
  color: string
  letter?: string
  sats: number
  created_at: number
  payment_hash: string
  event_id?: string
  type: string
}

interface UseActivityResult {
  activities: ActivityItem[]
  loading: boolean
  error: string | null
  refetch: (limit?: number) => Promise<void>
}

// Keep base URL consistent with the rest of the app (see lib/api.ts)
const API_BASE_URL = "http://localhost:3000/api"

export function useActivity(): UseActivityResult {
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchActivities = async (limit = 20) => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch(`${API_BASE_URL}/activity?limit=${limit}`)
      if (!res.ok) throw new Error(`Failed to fetch activities`)
      const data = await res.json()
      // API returns { events: ActivityItem[] }
      setActivities(Array.isArray(data?.events) ? data.events : [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch activities")
      // eslint-disable-next-line no-console
      console.error("Error fetching activities:", err)
    } finally {
      setLoading(false)
    }
  }

  // Listen for real-time updates broadcast by websocket hook
  useEffect(() => {
    const handler = (event: Event) => {
      try {
        const custom = event as CustomEvent<ActivityItem>
        const item = custom.detail
        if (!item || typeof item.created_at !== "number" || isNaN(item.created_at)) return
        setActivities(prev => [item, ...prev.slice(0, 19)]) // keep last 20
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error("Error handling activity update:", e)
      }
    }
    window.addEventListener("activityUpdate", handler)
    return () => window.removeEventListener("activityUpdate", handler)
  }, [])

  // Initial fetch
  useEffect(() => {
    fetchActivities()
  }, [])

  return { activities, loading, error, refetch: fetchActivities }
}
