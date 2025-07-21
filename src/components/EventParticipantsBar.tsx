"use client"
import { useRealtimeCanvas } from '@/hooks/useRealtimeCanvas'
import EventTopBar from './EventTopBar'

export default function EventParticipantsBar({ eventName, eventDate, eventImage, eventId }: { eventName: string, eventDate: string, eventImage?: string, eventId: string }) {
  // Use a dummy user for the top bar, since the actual user is handled in SharedCanvas
  const user = { id: 'dummy', name: 'You' }
  const { participants } = useRealtimeCanvas(eventId, user)
  // Convert participants map to array
  const participantList = Array.from(participants.entries() as Iterable<[string, any]>)
    .map(([id, p]) => ({ id, name: p.name || id.slice(0, 6), color: p.color })) as { id: string; name: string; color: string }[];
  return (
    <EventTopBar
      eventName={eventName}
      eventDate={eventDate}
      eventImage={eventImage}
      eventId={eventId}
      participants={participantList}
    />
  )
} 