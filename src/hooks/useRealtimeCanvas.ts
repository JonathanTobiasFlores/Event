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
    const int = setInterval(() => setTick(t => t + 1), 100)
    return () => {
      cleanupRef.current?.()
      setJoined(false)
      clearInterval(int)
    }
  }, [eventId, user.id])

  return {
    participants,
    sendCursor,
    sendStroke,
    joined,
    tick
  }
} 