'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

type Event = {
  id: string
  name: string
  date: string
  created_at: string
}

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    loadEvents()
  }, [])

  async function loadEvents() {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .order('date', { ascending: true })
    
    if (error) {
      console.error('Error loading events:', error)
    } else {
      setEvents(data || [])
    }
    setLoading(false)
  }

  async function createEvent() {
    const name = prompt('Event name:')
    if (!name) return
    
    const dateStr = prompt('Event date (YYYY-MM-DD):')
    if (!dateStr) return
    
    setCreating(true)
    const eventId = `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    
    const { error } = await supabase
      .from('events')
      .insert({
        id: eventId,
        name,
        date: new Date(dateStr).toISOString()
      })
    
    if (error) {
      console.error('Error creating event:', error)
      alert('Error creating event')
    } else {
      await loadEvents()
    }
    setCreating(false)
  }

  if (loading) return <div className="p-8">Loading...</div>

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Event Planner</h1>
          <Button onClick={createEvent} disabled={creating}>
            {creating ? 'Creating...' : 'Create Event'}
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {events.map(event => (
            <Link
              key={event.id}
              href={`/events/${event.id}`}
              className="block p-6 bg-white rounded-lg shadow hover:shadow-lg transition-shadow"
            >
              <h3 className="text-lg font-semibold mb-2">{event.name}</h3>
              <p className="text-gray-600">
                {new Date(event.date).toLocaleDateString()}
              </p>
              <p className="text-sm text-gray-500 mt-2">
                Click to start planning
              </p>
            </Link>
          ))}
        </div>

        {events.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No events yet. Create your first event!
          </div>
        )}
      </div>
    </div>
  )
}