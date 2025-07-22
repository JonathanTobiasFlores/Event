'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import { Calendar, Plus, Sparkles } from 'lucide-react';
import { Event } from '@/app/types/canvas';
import { format } from 'date-fns';
import EventCard from '@/components/EventCard';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogDescription } from '@/components/ui/dialog';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar as ShadcnCalendar } from '@/components/ui/calendar';
import { getCurrentUser } from '@/lib/supabase/client';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';

const EVENTS_PER_PAGE = 9;

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
  const [page, setPage] = useState(1);

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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-mint-2 border-t-mint-3 mx-auto"></div>
          <p className="text-muted-foreground">Loading events...</p>
        </div>
      </div>
    );
  }

  const totalPages = Math.ceil(events.length / EVENTS_PER_PAGE);
  const paginatedEvents = events.slice((page - 1) * EVENTS_PER_PAGE, page * EVENTS_PER_PAGE);

  return (
    <div className="container mx-auto px-4 pt-safe pb-20 space-y-6">
      <div className="animate-fade-in-up">
        {user && (
          <div className="mb-6">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">
              Welcome back, {getFirstName(user)}!
            </h2>
            <p className="text-muted-foreground">Ready to create something amazing today?</p>
          </div>
        )}

        {/* Section header and Create Event button */}
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">
            Your Events
          </h2>
          <Dialog open={openDialog} onOpenChange={setOpenDialog}>
            <DialogTrigger asChild>
              <Button size="lg" className="gap-2 bg-mint-3 hover:bg-mint-3/90 text-white shadow-lg hover:shadow-xl transition-all transform hover:scale-105">
                <Plus className="h-5 w-5" />
                Create Event
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md bg-mint-1 border-mint-2/30">
              <DialogHeader>
                <DialogTitle className="text-2xl tracking-tight">Create New Event</DialogTitle>
                <DialogDescription>Fill in the details below to create a new collaborative event.</DialogDescription>
              </DialogHeader>
              <form onSubmit={createEvent} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-base font-medium">Event Name</Label>
                  <Input
                    id="name"
                    value={eventName}
                    onChange={(e) => setEventName(e.target.value)}
                    placeholder="Birthday Party, Team Meeting, etc."
                    required
                    disabled={creating}
                    className="bg-mint-0 border-mint-2/50 focus:ring-mint-2 focus:border-mint-3"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date" className="text-base font-medium">Event Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={"w-full justify-start text-left font-normal bg-mint-0 border-mint-2/50 hover:bg-mint-1/50 " + (!selectedDate ? 'text-muted-foreground' : '')}
                        type="button"
                        disabled={creating}
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        {selectedDate ? format(selectedDate, 'PPP') : 'Pick a date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent align="start" className="p-0 bg-mint-1 border-mint-2/30">
                      <ShadcnCalendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={setSelectedDate}
                        initialFocus
                        className="rounded-md"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="image" className="text-base font-medium">Event Image (optional)</Label>
                  <Input
                    id="image"
                    type="file"
                    accept="image/*"
                    disabled={creating}
                    className="bg-mint-0 border-mint-2/50 file:bg-mint-2 file:text-foreground file:border-0 file:rounded-md file:mr-4"
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
                    <img src={eventImagePreview} alt="Preview" className="mt-4 rounded-2xl w-32 h-40 object-cover border-2 border-mint-2/50" />
                  )}
                </div>
                <DialogFooter className="flex gap-3 justify-end pt-4">
                  <DialogClose asChild>
                    <Button type="button" variant="outline" disabled={creating} className="border-mint-2/50 hover:bg-mint-1/50">
                      Cancel
                    </Button>
                  </DialogClose>
                  <Button type="submit" disabled={creating || !eventName.trim() || !selectedDate} className="bg-mint-3 hover:bg-mint-3/90 text-white">
                    {creating ? (
                      <>
                        <Sparkles className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      'Create Event'
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {events.length === 0 ? (
          <div className="text-center py-20 bg-mint-1 rounded-2xl shadow-lg border border-mint-2/30">
            <Calendar className="h-16 w-16 text-mint-3 mx-auto mb-4" />
            <h3 className="text-2xl font-semibold text-foreground mb-2 tracking-tight">No events yet</h3>
            <p className="text-muted-foreground mb-6">Create your first event to get started</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {paginatedEvents.map((event) => (
                <Link
                  key={event.id}
                  href={`/events/${event.id}`}
                  className="block animate-fade-in-up"
                >
                  <EventCard
                    name={event.name}
                    date={new Date(event.date)}
                    imageUrl={event.image_url}
                  />
                </Link>
              ))}
            </div>
            {totalPages > 1 && (
              <Pagination className="mt-8">
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => page > 1 && setPage(page - 1)}
                      aria-disabled={page === 1}
                      tabIndex={page === 1 ? -1 : 0}
                    />
                  </PaginationItem>
                  {[...Array(totalPages)].map((_, i) => (
                    <PaginationItem key={i}>
                      <PaginationLink
                        isActive={page === i + 1}
                        onClick={() => page !== i + 1 && setPage(i + 1)}
                        aria-current={page === i + 1 ? 'page' : undefined}
                        aria-disabled={page === i + 1}
                        tabIndex={page === i + 1 ? -1 : 0}
                      >
                        {i + 1}
                      </PaginationLink>
                    </PaginationItem>
                  ))}
                  <PaginationItem>
                    <PaginationNext
                      onClick={() => page < totalPages && setPage(page + 1)}
                      aria-disabled={page === totalPages}
                      tabIndex={page === totalPages ? -1 : 0}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            )}
          </>
        )}
      </div>
    </div>
  );
}