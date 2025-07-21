import { createClient } from '@/lib/supabase/client'
import { RealtimeChannel } from '@supabase/supabase-js'

const THROTTLE_MS = 50 // Throttle cursor updates to 20fps
let lastCursorUpdate = 0

interface CanvasState {
  channel: RealtimeChannel | null
  paintingId: string
  userId: string
  userColor: string
  userName: string
}

const canvasStates = new Map<string, CanvasState>()

export interface RealtimeStroke {
  id: string
  points: Array<{ x: number; y: number }>
  color: string
  userId: string
  userName: string
  timestamp: number
}

export interface RealtimeParticipant {
  userId: string
  userName: string
  color: string
  cursor: { x: number; y: number }
  isDrawing: boolean
}

export function setupPaintingChannel(
  paintingId: string,
  userId: string,
  userName: string,
  userColor: string,
  onStrokeReceived: (stroke: RealtimeStroke) => void,
  onParticipantsUpdate: (participants: Map<string, RealtimeParticipant>) => void
) {
  const supabase = createClient()
  const participants = new Map<string, RealtimeParticipant>()

  // Clean up existing channel if any
  const existingState = canvasStates.get(paintingId)
  if (existingState?.channel) {
    existingState.channel.unsubscribe()
  }

  const channel = supabase.channel(`painting:${paintingId}`, {
    config: {
      presence: { key: userId },
      broadcast: { self: false, ack: false }
    }
  })

  // Store channel state
  canvasStates.set(paintingId, {
    channel,
    paintingId,
    userId,
    userColor,
    userName
  })

  // Handle presence updates
  channel
    .on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState()
      participants.clear()
      
      Object.entries(state).forEach(([key, presences]: [string, any[]]) => {
        if (presences.length > 0) {
          const presence = presences[0]
          participants.set(key, {
            userId: key,
            userName: presence.userName || 'Anonymous',
            color: presence.color || '#000000',
            cursor: presence.cursor || { x: -100, y: -100 },
            isDrawing: presence.isDrawing || false
          })
        }
      })
      
      onParticipantsUpdate(new Map(participants))
    })
    .on('presence', { event: 'join' }, ({ key, newPresences }) => {
      if (newPresences.length > 0) {
        const presence = newPresences[0]
        participants.set(key, {
          userId: key,
          userName: presence.userName || 'Anonymous',
          color: presence.color || '#000000',
          cursor: presence.cursor || { x: -100, y: -100 },
          isDrawing: presence.isDrawing || false
        })
        onParticipantsUpdate(new Map(participants))
      }
    })
    .on('presence', { event: 'leave' }, ({ key }) => {
      participants.delete(key)
      onParticipantsUpdate(new Map(participants))
    })

  // Handle stroke broadcasts
  channel.on('broadcast', { event: 'stroke' }, ({ payload }) => {
    if (payload.userId !== userId) {
      onStrokeReceived(payload)
    }
  })

  // Subscribe to the channel
  channel.subscribe(async (status) => {
    if (status === 'SUBSCRIBED') {
      // Join with initial presence
      await channel.track({
        userName,
        color: userColor,
        cursor: { x: -100, y: -100 },
        isDrawing: false
      })
    }
  })

  return () => {
    channel.unsubscribe()
    canvasStates.delete(paintingId)
  }
}

export async function updateCursorPosition(
  paintingId: string,
  x: number,
  y: number,
  isDrawing: boolean
) {
  const now = Date.now()
  if (now - lastCursorUpdate < THROTTLE_MS && !isDrawing) {
    return // Throttle cursor updates when not drawing
  }
  lastCursorUpdate = now

  const state = canvasStates.get(paintingId)
  if (!state?.channel) return

  await state.channel.track({
    userName: state.userName,
    color: state.userColor,
    cursor: { x, y },
    isDrawing
  })
}

export async function broadcastStroke(
  paintingId: string,
  points: Array<{ x: number; y: number }>
) {
  const state = canvasStates.get(paintingId)
  if (!state?.channel) return

  const stroke: RealtimeStroke = {
    id: `${state.userId}-${Date.now()}`,
    points,
    color: state.userColor,
    userId: state.userId,
    userName: state.userName,
    timestamp: Date.now()
  }

  await state.channel.send({
    type: 'broadcast',
    event: 'stroke',
    payload: stroke
  })

  return stroke
}