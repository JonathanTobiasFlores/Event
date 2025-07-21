'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import EventCard from '@/components/EventCard'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { format } from 'date-fns'

type Event = {
  id: string
  name: string
  date: string
  created_at: string
  image_url?: string
}

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [images, setImages] = useState<Record<string, string>>({})
  const [dates, setDates] = useState<Record<string, Date>>({})
  const [modalOpen, setModalOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDate, setNewDate] = useState<Date | undefined>(undefined)
  const [newImage, setNewImage] = useState<File | null>(null)
  const [newImageUrl, setNewImageUrl] = useState<string | undefined>(undefined)
  const fileInputRef = useRef<HTMLInputElement>(null)
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
    if (!newName || !newDate) return
    setCreating(true)
    const eventId = `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    let imageUrl: string | undefined = undefined
    if (newImage) {
      // For demo: store as data URL. For prod, upload to Supabase Storage.
      const reader = new FileReader()
      imageUrl = await new Promise<string>(resolve => {
        reader.onload = e => resolve(e.target?.result as string)
        reader.readAsDataURL(newImage)
      })
    }
    const { error } = await supabase
      .from('events')
      .insert({
        id: eventId,
        name: newName,
        date: newDate.toISOString(),
        image_url: imageUrl
      })
    if (error) {
      console.error('Error creating event:', error)
      alert('Error creating event')
    } else {
      setNewName('')
      setNewDate(undefined)
      setNewImage(null)
      setNewImageUrl(undefined)
      setModalOpen(false)
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
          <Dialog open={modalOpen} onOpenChange={setModalOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setModalOpen(true)} disabled={creating}>
                Create Event
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Event</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Input
                  placeholder="Event name"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  disabled={creating}
                />
                <Popover>
                  <PopoverTrigger asChild>
                    <Button type="button" variant="outline" className="w-full justify-start">
                      {newDate ? format(newDate, 'PPP') : 'Pick a date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="center" className="p-0">
                    <Calendar
                      mode="single"
                      selected={newDate}
                      onSelect={d => setNewDate(d)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={e => {
                      if (e.target.files && e.target.files[0]) {
                        setNewImage(e.target.files[0])
                        const reader = new FileReader()
                        reader.onload = ev => setNewImageUrl(ev.target?.result as string)
                        reader.readAsDataURL(e.target.files[0])
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full"
                  >
                    {newImageUrl ? 'Change Image' : 'Upload Image'}
                  </Button>
                  {newImageUrl && (
                    <img src={newImageUrl} alt="Preview" className="mt-2 w-full h-32 object-cover rounded" />
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button onClick={createEvent} disabled={creating || !newName || !newDate}>
                  {creating ? 'Creating...' : 'Create'}
                </Button>
                <DialogClose asChild>
                  <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>
                    Cancel
                  </Button>
                </DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {events.map(event => (
            <Link key={event.id} href={`/events/${event.id}`} className="block">
              <EventCard
                name={event.name}
                date={dates[event.id] || new Date(event.date)}
                imageUrl={images[event.id] || event.image_url}
                onDateChange={date => setDates(ds => ({ ...ds, [event.id]: date }))}
              />
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