import { useEffect, useRef, useState } from 'react'
import {
  setupPaintingChannel,
  updateCursorPosition,
  broadcastStroke,
  RealtimeParticipant
} from '@/lib/realtimeCanvas'

export function useRealtimeCanvas(eventId: string, user: { id: string, name?: string }) {
  const [participants, setParticipants] = useState<Map<string, RealtimeParticipant>>(new Map())
  const [joined, setJoined] = useState(false)
  const cleanupRef = useRef<null | (() => void)>(null)

  useEffect(() => {
    if (!eventId || !user.id) return;
    cleanupRef.current = setupPaintingChannel(
      eventId,
      user.id,
      user.name || 'Anonymous',
      '#000000', // You may want to pass a color here
      () => {}, // onStrokeReceived: not used here
      setParticipants
    )
    setJoined(true)
    return () => {
      cleanupRef.current?.()
      setJoined(false)
    }
  }, [eventId, user.id, user.name])

  return {
    participants,
    updateCursorPosition,
    broadcastStroke,
    joined
  }
}