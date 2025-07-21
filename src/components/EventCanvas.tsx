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

interface EventCanvasProps {
  event: Event;
}

export default function EventCanvas({ event }: EventCanvasProps) {
  const [paintings, setPaintings] = useState<Painting[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const loadPaintings = async () => {
    const { data, error } = await supabase
      .from('paintings')
      .select('*')
      .eq('event_id', event.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setPaintings(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadPaintings();

    // Subscribe to new paintings
    const channel = supabase
      .channel(`paintings:${event.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'paintings',
          filter: `event_id=eq.${event.id}`,
        },
        (payload) => {
          setPaintings((current) => [payload.new as Painting, ...current]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [event.id, supabase]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
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
            
            <Button
              onClick={() => setIsCreateDialogOpen(true)}
              size="sm"
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">New Canvas</span>
              <span className="sm:hidden">New</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-gray-200 rounded-lg animate-pulse aspect-square" />
            ))}
          </div>
        ) : paintings.length === 0 ? (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
              <Plus className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No canvases yet</h3>
            <p className="text-gray-500 mb-6">Create your first canvas to start drawing together</p>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              Create First Canvas
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {paintings.map((painting) => (
              <PaintingCard key={painting.id} painting={painting} />
            ))}
          </div>
        )}
      </div>

      <CreatePaintingDialog
        eventId={event.id}
        isOpen={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
        onPaintingCreated={loadPaintings}
      />
    </div>
  );
}