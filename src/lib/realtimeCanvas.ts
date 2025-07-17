import { createClient } from '@/lib/supabase/client'

const THROTTLE = 1000 / 30
let lastCursor = 0
let channel: any
let unsub: (() => void) | null = null

type Stroke = Array<{ x: number, y: number }>
export type Participant = {
  cursor: { x: number, y: number }
  color: string
  name?: string
  strokes?: Stroke[]
}

export const participants = new Map<string, Participant>()

function pickColor(id: string) {
  // Deterministic HSL color per user
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash)
  return `hsl(${hash % 360},90%,60%)`
}

export function setupRealtimeCanvas(eventId: string, user: { id: string, name?: string }, onChange?: () => void) {
  const supabase = createClient()
  channel = supabase.channel(`canvas:${eventId}`, { config: { presence: { key: user.id } } })

  channel.on('presence', { event: 'sync' }, () => {
    const state = channel.presenceState()
    participants.clear()
    Object.entries(state).forEach(([id, arr]: any) => {
      const info = arr[0] || {}
      participants.set(id, {
        cursor: info.cursor || { x: 0, y: 0 },
        color: pickColor(id),
        name: info.name || id.slice(0, 6),
        strokes: []
      })
    })
    onChange?.()
  })

  channel.on('presence', { event: 'leave' }, ({ key }: { key: string }) => {
    participants.delete(key)
    onChange?.()
  })

  channel.on('broadcast', { event: 'stroke' }, ({ payload, sender_id }: { payload: { points: Stroke }, sender_id: string }) => {
    if (!participants.has(sender_id)) return
    if (!payload?.points) return
    const p = participants.get(sender_id)!
    if (!p.strokes) p.strokes = []
    p.strokes.push(payload.points)
    onChange?.()
  })

  unsub = channel.subscribe(async (status: any) => {
    if (status === 'SUBSCRIBED') {
      await channel.track({ cursor: { x: 0, y: 0 }, name: user.name })
    }
  })

  return () => {
    unsub?.()
    channel.unsubscribe()
    participants.clear()
    onChange?.()
  }
}

export function sendCursor(x: number, y: number) {
  if (!channel) return
  const now = Date.now()
  if (now - lastCursor < THROTTLE) return
  lastCursor = now
  channel.track({ cursor: { x, y } })
}

export function sendStroke(points: Array<{ x: number, y: number }>) {
  if (!channel) return
  channel.send({ type: 'broadcast', event: 'stroke', payload: { points } })
} 