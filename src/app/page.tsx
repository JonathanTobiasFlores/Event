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
import EventCard from '@/components/EventCard';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogDescription } from '@/components/ui/dialog';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar as ShadcnCalendar } from '@/components/ui/calendar';
import { getCurrentUser } from '@/lib/supabase/client';

export default function HomePage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [eventName, setEventName] = useState('');
  const [eventImageFile, setEventImageFile] = useState<File | null>(null);
  const [eventImagePreview, setEventImagePreview] = useState<string | null>(null);
  const supabase = createClient();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    loadEvents();
    getCurrentUser().then(({ data }) => setUser(data.user));
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
    if (!eventName.trim() || !selectedDate) return;
    setCreating(true);
    const eventId = `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    let imageUrl: string | null = null;
    if (eventImageFile) {
      // Upload image to Supabase Storage
      const fileExt = eventImageFile.name.split('.').pop();
      const filePath = `events/${eventId}.${fileExt}`;
      const { data: uploadData, error: uploadError } = await supabase.storage.from('event-images').upload(filePath, eventImageFile, { upsert: true });
      if (uploadError) {
        console.error('Supabase upload error:', uploadError);
        alert('Image upload failed: ' + uploadError.message);
      } else {
        const { data: publicUrlData } = supabase.storage.from('event-images').getPublicUrl(filePath);
        imageUrl = publicUrlData.publicUrl;
      }
    }
    const { error } = await supabase
      .from('events')
      .insert({
        id: eventId,
        name: eventName.trim(),
        date: selectedDate.toISOString(),
        image_url: imageUrl,
      });
    if (!error) {
      await loadEvents();
      setEventName('');
      setSelectedDate(undefined);
      setEventImageFile(null);
      setEventImagePreview(null);
      setOpenDialog(false);
    }
    setCreating(false);
  }

  const getFirstName = (user: any) => {
    return (
      user?.user_metadata?.given_name ||
      user?.user_metadata?.full_name?.split(' ')[0] ||
      user?.email?.split('@')[0]
    );
  };

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
        {user && (
          <div className="mb-4 text-lg font-semibold text-primary">
            Welcome, {getFirstName(user)}!
          </div>
        )}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Collaborative Canvas</h1>
          <p className="text-gray-600">Create events and draw together in real-time</p>
        </div>
        <Dialog open={openDialog} onOpenChange={setOpenDialog}>
          <DialogTrigger asChild>
            <Button size="lg" className="gap-2 mb-8">
              <Plus className="h-5 w-5" />
              Create Event
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Event</DialogTitle>
              <DialogDescription>Fill in the details below to create a new collaborative event.</DialogDescription>
            </DialogHeader>
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
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={"w-full justify-start text-left font-normal " + (!selectedDate ? 'text-muted-foreground' : '')}
                      type="button"
                      disabled={creating}
                    >
                      {selectedDate ? format(selectedDate, 'PPP') : 'Pick a date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="p-0">
                    <ShadcnCalendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <Label htmlFor="image">Event Image (optional)</Label>
                <Input
                  id="image"
                  type="file"
                  accept="image/*"
                  disabled={creating}
                  onChange={e => {
                    const file = e.target.files?.[0] || null;
                    setEventImageFile(file);
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (ev) => setEventImagePreview(ev.target?.result as string);
                      reader.readAsDataURL(file);
                    } else {
                      setEventImagePreview(null);
                    }
                  }}
                />
                {eventImagePreview && (
                  <img src={eventImagePreview} alt="Preview" className="mt-2 rounded w-32 h-32 object-cover border" />
                )}
              </div>
              <DialogFooter className="flex gap-2 justify-end pt-4">
                <DialogClose asChild>
                  <Button type="button" variant="outline" disabled={creating}>
                    Cancel
                  </Button>
                </DialogClose>
                <Button type="submit" disabled={creating || !eventName.trim() || !selectedDate}>
                  {creating ? 'Creating...' : 'Create Event'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

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
                className="block"
                style={{ textDecoration: 'none' }}
              >
                <EventCard
                  name={event.name}
                  date={new Date(event.date)}
                  imageUrl={event.image_url}
                />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}