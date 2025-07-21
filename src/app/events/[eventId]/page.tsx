import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import SharedCanvas from '@/components/SharedCanvas'
import EventTopBar from '@/components/EventTopBar'
import ParticipantsList from '@/components/ParticipantsList'

export default async function EventPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params
  const supabase = await createClient()
  const { data: event } = await supabase
    .from('events')
    .select('*')
    .eq('id', eventId)
    .single()

  if (!event) return notFound()

  return (
    <div className="min-h-screen bg-gray-50">
      <EventTopBar
        eventName={event.name}
        eventDate={event.date}
        eventImage={event.image_url}
        eventId={event.id}
      />
      <div className="pt-16">
        <ParticipantsList eventId={event.id} />
        <SharedCanvas eventId={event.id} />
      </div>
    </div>
  )
} 