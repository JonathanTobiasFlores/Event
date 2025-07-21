import { createClient } from '@/lib/supabase/client'

const THROTTLE = 1000 / 60
let lastCursor = 0
let channel: any
let unsub: (() => void) | null = null
let currentUserId: string = ''
let currentUserColor: string = ''
let currentUserName: string = ''
let currentEventId: string = ''
let supabaseClient: any = null

type Stroke = Array<{ x: number, y: number }>
export type Participant = {
  cursor: { x: number, y: number }
  color: string
  name?: string
  strokes?: Stroke[]
}

export const participants = new Map<string, Participant>()

function pickColor(id: string) {
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash)
  return `hsl(${hash % 360},90%,60%)`
}

async function loadStrokesFromDB(eventId: string, onChange?: () => void) {
  if (!supabaseClient) return
  
  try {
    const { data, error } = await supabaseClient
      .from('canvas_strokes')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at', { ascending: true })
    
    if (error) {
      console.error('Error loading strokes:', error)
      return
    }
    
    if (data && data.length > 0) {
      // Group strokes by user
      const strokesByUser = new Map<string, { strokes: Stroke[], color: string, name: string }>()
      
      data.forEach((row: any) => {
        if (!strokesByUser.has(row.user_id)) {
          strokesByUser.set(row.user_id, {
            strokes: [],
            color: row.color,
            name: row.user_name || row.user_id.slice(0, 6)
          })
        }
        strokesByUser.get(row.user_id)!.strokes.push(row.points)
      })
      
      // Update participants with loaded strokes
      strokesByUser.forEach((userData, userId) => {
        if (userId === currentUserId) {
          // Update current user's strokes
          const p = participants.get(currentUserId)
          if (p) {
            p.strokes = userData.strokes
          }
        } else {
          // Create or update other participants
          const existing = participants.get(userId)
          if (existing) {
            existing.strokes = userData.strokes
            existing.color = userData.color
            existing.name = userData.name
          } else {
            participants.set(userId, {
              cursor: { x: -100, y: -100 }, // Off-screen initially
              color: userData.color,
              name: userData.name,
              strokes: userData.strokes
            })
          }
        }
      })
      
      onChange?.()
    }
  } catch (error) {
    console.error('Error in loadStrokesFromDB:', error)
  }
}

async function saveStrokeToDB(eventId: string, points: Stroke) {
  if (!supabaseClient) return
  
  try {
    // First check if the events table exists and has the event
    const { data: eventData, error: eventError } = await supabaseClient
      .from('events')
      .select('id')
      .eq('id', eventId)
      .single()
    
    if (eventError && eventError.code === 'PGRST116') {
      // Table doesn't exist, work without persistence
      console.warn('Events table not found, working without persistence')
      return
    }
    
    if (!eventData) {
      // Create the event if it doesn't exist
      await supabaseClient
        .from('events')
        .insert({
          id: eventId,
          name: eventId,
          date: new Date().toISOString()
        })
    }
    
    // Now save the stroke
    const { error } = await supabaseClient
      .from('canvas_strokes')
      .insert({
        event_id: eventId,
        user_id: currentUserId,
        user_name: currentUserName,
        color: currentUserColor,
        points: points
      })
    
    if (error) {
      console.error('Error saving stroke:', error)
    }
  } catch (error) {
    console.error('Error in saveStrokeToDB:', error)
  }
}

export function setupRealtimeCanvas(eventId: string, user: { id: string, name?: string }, onChange?: () => void) {
  supabaseClient = createClient()
  currentUserId = user.id
  currentUserColor = pickColor(user.id)
  currentUserName = user.name || user.id.slice(0, 6)
  currentEventId = eventId
  
  channel = supabaseClient.channel(`canvas:${eventId}`, { 
    config: { 
      presence: { key: user.id },
      broadcast: { ack: true }
    } 
  })

  // Initialize current user
  participants.set(user.id, {
    cursor: { x: 0, y: 0 },
    color: currentUserColor,
    name: currentUserName,
    strokes: []
  })

  // Load existing strokes from database
  loadStrokesFromDB(eventId, onChange)

  channel.on('presence', { event: 'sync' }, () => {
    const state = channel.presenceState()
    
    Object.entries(state).forEach(([id, arr]: any) => {
      if (id === currentUserId) return
      
      const info = arr[0] || {}
      const existingParticipant = participants.get(id)
      
      participants.set(id, {
        cursor: info.cursor || { x: 0, y: 0 },
        color: info.color || pickColor(id),
        name: info.name || id.slice(0, 6),
        strokes: existingParticipant?.strokes || []
      })
    })
    onChange?.()
  })

  channel.on('presence', { event: 'leave' }, ({ key }: { key: string }) => {
    if (key !== currentUserId) {
      // Keep their strokes but hide cursor
      const p = participants.get(key)
      if (p) {
        p.cursor = { x: -100, y: -100 }
        onChange?.()
      }
    }
  })

  channel.on('broadcast', { event: 'stroke' }, ({ payload }: { payload: { points: Stroke, userId: string, color: string, userName: string } }) => {
    if (!payload?.points || !payload?.userId) return
    if (payload.userId === currentUserId) return
    
    const p = participants.get(payload.userId)
    if (p) {
      if (!p.strokes) p.strokes = []
      p.strokes.push(payload.points)
      p.color = payload.color || p.color
      p.name = payload.userName || p.name
    } else {
      participants.set(payload.userId, {
        cursor: { x: -100, y: -100 },
        color: payload.color || pickColor(payload.userId),
        name: payload.userName || payload.userId.slice(0, 6),
        strokes: [payload.points]
      })
    }
    onChange?.()
  })

  channel.subscribe(async (status: any) => {
    if (status === 'SUBSCRIBED') {
      await channel.track({ 
        cursor: { x: 0, y: 0 }, 
        name: currentUserName,
        color: currentUserColor 
      })
    }
  })

  return () => {
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
  channel.track({ 
    cursor: { x, y },
    color: currentUserColor,
    name: currentUserName
  })
}

export async function sendStroke(points: Array<{ x: number, y: number }>) {
  if (!channel || !currentUserId) return
  
  // Update local participant
  const p = participants.get(currentUserId)
  if (p) {
    if (!p.strokes) p.strokes = []
    p.strokes.push(points)
  }
  
  // Save to database
  await saveStrokeToDB(currentEventId, points)
  
  // Broadcast to others
  channel.send({ 
    type: 'broadcast', 
    event: 'stroke', 
    payload: { 
      points,
      userId: currentUserId,
      color: currentUserColor,
      userName: currentUserName
    } 
  })
}