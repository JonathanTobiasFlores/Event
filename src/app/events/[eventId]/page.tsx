import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import EventCanvas from '@/components/EventCanvas';

export default async function EventPage({ 
  params 
}: { 
  params: Promise<{ eventId: string }> 
}) {
  const { eventId } = await params;
  const supabase = await createClient();
  
  const { data: event, error } = await supabase
    .from('events')
    .select('*')
    .eq('id', eventId)
    .single();

  if (error || !event) {
    return notFound();
  }

  return <EventCanvas event={event} />;
}