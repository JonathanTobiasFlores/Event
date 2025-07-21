import { useEffect, useRef, useState } from 'react'
import {
  participants,
  setupRealtimeCanvas,
  sendCursor,
  sendStroke
} from '@/lib/realtimeCanvas'

export function useRealtimeCanvas(eventId: string, user: { id: string, name?: string }) {
  const [tick, setTick] = useState(0)
  const [joined, setJoined] = useState(false)
  const cleanupRef = useRef<null | (() => void)>(null)

  useEffect(() => {
    cleanupRef.current = setupRealtimeCanvas(eventId, user, () => setTick(t => t + 1))
    setJoined(true)
    // Remove the interval - we'll rely on actual changes to trigger updates
    return () => {
      cleanupRef.current?.()
      setJoined(false)
    }
  }, [eventId, user.id, user.name])

  return {
    participants,
    sendCursor,
    sendStroke,
    joined,
    tick
  }
}