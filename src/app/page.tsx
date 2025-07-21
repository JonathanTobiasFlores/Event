'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import { Calendar, Plus } from 'lucide-react';
import { Event } from '@/app/types/canvas';
import { format } from 'date-fns';

export default function HomePage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [eventName, setEventName] = useState('');
  const [eventDate, setEventDate] = useState('');
  const supabase = createClient();

  useEffect(() => {
    loadEvents();
  }, []);

  async function loadEvents() {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .order('date', { ascending: true });
    
    if (!error && data) {
      setEvents(data);
    }
    setLoading(false);
  }

  async function createEvent(e: React.FormEvent) {
    e.preventDefault();
    if (!eventName.trim() || !eventDate) return;
    
    setCreating(true);
    const eventId = `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const { error } = await supabase
      .from('events')
      .insert({
        id: eventId,
        name: eventName.trim(),
        date: new Date(eventDate).toISOString()
      });
    
    if (!error) {
      await loadEvents();
      setEventName('');
      setEventDate('');
      setShowCreateForm(false);
    }
    setCreating(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading events...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Collaborative Canvas</h1>
          <p className="text-gray-600">Create events and draw together in real-time</p>
        </div>

        {showCreateForm ? (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-lg font-semibold mb-4">Create New Event</h2>
            <form onSubmit={createEvent} className="space-y-4">
              <div>
                <Label htmlFor="name">Event Name</Label>
                <Input
                  id="name"
                  value={eventName}
                  onChange={(e) => setEventName(e.target.value)}
                  placeholder="Birthday Party, Team Meeting, etc."
                  required
                  disabled={creating}
                />
              </div>
              <div>
                <Label htmlFor="date">Event Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  required
                  disabled={creating}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateForm(false)}
                  disabled={creating}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={creating}>
                  {creating ? 'Creating...' : 'Create Event'}
                </Button>
              </div>
            </form>
          </div>
        ) : (
          <div className="mb-8 flex justify-center">
            <Button onClick={() => setShowCreateForm(true)} size="lg" className="gap-2">
              <Plus className="h-5 w-5" />
              Create Event
            </Button>
          </div>
        )}

        {events.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-lg">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No events yet</h3>
            <p className="text-gray-500">Create your first event to get started</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {events.map((event) => (
              <Link
                key={event.id}
                href={`/events/${event.id}`}
                className="block bg-white rounded-lg shadow hover:shadow-md transition-shadow p-6"
              >
                <h3 className="text-lg font-semibold mb-2">{event.name}</h3>
                <p className="text-gray-600 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {format(new Date(event.date), 'yyyy-MM-dd')}
                </p>
                <p className="text-sm text-gray-500 mt-4">
                  Tap to view canvases →
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}