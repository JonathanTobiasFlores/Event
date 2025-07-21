'use client';

import { useState, useEffect } from 'react';
import { Event, Painting } from '@/app/types/canvas';
import { Button } from '@/components/ui/button';
import { Plus, ArrowLeft } from 'lucide-react';
import PaintingCard from '@/components/canvas/PaintingCard';
import CreatePaintingDialog from '@/components/canvas/CreatePaintingDialog';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { format } from 'date-fns';
import { getOrCreateUser } from '@/lib/utils/user';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';

interface CreateListDialogProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  userId: string;
}

function CreateListDialog({ isOpen, onClose, eventId, userId }: CreateListDialogProps) {
  const [title, setTitle] = useState('');
  const [item, setItem] = useState('');
  const [items, setItems] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const handleAddItem = () => {
    if (item.trim()) {
      setItems([...items, item.trim()]);
      setItem('');
    }
  };

  const handleCreate = async () => {
    setLoading(true);
    const id = `list-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    await supabase.from('lists').insert({
      id,
      title,
      items,
      created_by: userId,
      event_id: eventId,
    });
    setTitle('');
    setItems([]);
    setItem('');
    setLoading(false);
    onClose();
  };

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
        <h2 className="text-lg font-semibold mb-2">Create List</h2>
        <input
          className="w-full border rounded px-2 py-1 mb-2"
          placeholder="List Title"
          value={title}
          onChange={e => setTitle(e.target.value)}
        />
        <div className="flex gap-2 mb-2">
          <input
            className="flex-1 border rounded px-2 py-1"
            placeholder="Add item"
            value={item}
            onChange={e => setItem(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAddItem()}
          />
          <Button onClick={handleAddItem} type="button">Add</Button>
        </div>
        <ul className="list-disc pl-5 mb-2">
          {items.map((pt, idx) => <li key={idx}>{pt}</li>)}
        </ul>
        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button onClick={handleCreate} disabled={loading || !title.trim() || items.length === 0}>
            {loading ? 'Creating...' : 'Create List'}
          </Button>
        </div>
      </div>
    </div>
  );
}

interface EventCanvasProps {
  event: Event;
}

export default function EventCanvas({ event }: EventCanvasProps) {
  const [paintings, setPaintings] = useState<Painting[]>([]);
  const [lists, setLists] = useState<any[]>([]);
  const [openType, setOpenType] = useState<null | 'canvas' | 'list'>(null);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();
  const user = getOrCreateUser();

  const loadAll = async () => {
    const { data: paintingsData } = await supabase
      .from('paintings')
      .select('*')
      .eq('event_id', event.id)
      .order('created_at', { ascending: false });
    setPaintings(paintingsData || []);
    const { data: listsData } = await supabase
      .from('lists')
      .select('*')
      .eq('event_id', event.id)
      .order('created_at', { ascending: false });
    setLists(listsData || []);
    setLoading(false);
  };

  useEffect(() => {
    loadAll();
    // Real-time for paintings
    const paintingsChannel = supabase
      .channel(`paintings:${event.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'paintings',
          filter: `event_id=eq.${event.id}`,
        },
        () => loadAll()
      )
      .subscribe();
    // Real-time for lists
    const listsChannel = supabase
      .channel(`lists:${event.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'lists',
          filter: `event_id=eq.${event.id}`,
        },
        () => loadAll()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(paintingsChannel);
      supabase.removeChannel(listsChannel);
    };
  }, [event.id, supabase]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-xl font-semibold">{event.name}</h1>
                <p className="text-sm text-gray-500">
                  {format(new Date(event.date), 'yyyy-MM-dd')}
                </p>
              </div>
            </div>
            <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
              <PopoverTrigger asChild>
                <Button size="sm" className="gap-2">
                  <Plus className="h-4 w-4" /> New
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-32 p-0">
                <div className="flex flex-col">
                  <Button variant="ghost" className="justify-start rounded-none" onClick={() => { setOpenType('canvas'); setPopoverOpen(false); }}>Canvas</Button>
                  <Button variant="ghost" className="justify-start rounded-none" onClick={() => { setOpenType('list'); setPopoverOpen(false); }}>List</Button>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>
      <CreatePaintingDialog
        eventId={event.id}
        isOpen={openType === 'canvas'}
        onClose={() => setOpenType(null)}
        onPaintingCreated={loadAll}
      />
      <CreateListDialog
        isOpen={openType === 'list'}
        onClose={() => setOpenType(null)}
        eventId={event.id}
        userId={user.id}
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="text-center py-16">Loading...</div>
        ) : (
          <>
            <div className="mb-10">
              <h2 className="text-xl font-semibold mb-4">Canvases</h2>
              {paintings.length === 0 ? (
                <div className="text-gray-500">No canvases yet.</div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {paintings.map((painting) => (
                    <PaintingCard key={painting.id} painting={painting} />
                  ))}
                </div>
              )}
            </div>
            <div>
              <h2 className="text-xl font-semibold mb-4">Lists</h2>
              {lists.length === 0 ? (
                <div className="text-gray-500">No lists yet.</div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {lists.map((list) => (
                    <div key={list.id} className="bg-white rounded-lg shadow p-6">
                      <h3 className="text-lg font-semibold mb-2">{list.title}</h3>
                      <ul className="list-disc pl-5 text-gray-700">
                        {Array.isArray(list.items) ? list.items.map((item: string, idx: number) => (
                          <li key={idx}>{item}</li>
                        )) : null}
                      </ul>
                      <p className="text-gray-500 text-xs mt-2">Created {format(new Date(list.created_at), 'yyyy-MM-dd')}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}