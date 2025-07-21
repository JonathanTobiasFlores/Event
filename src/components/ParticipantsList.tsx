"use client"
import { useRealtimeCanvas } from '@/hooks/useRealtimeCanvas'

export default function ParticipantsList({ eventId }: { eventId: string }) {
  // Use a dummy user for the list, since the actual user is handled in SharedCanvas
  const user = { id: 'dummy', name: 'You' }
  const { participants } = useRealtimeCanvas(eventId, user)
  return (
    <div className="fixed left-0 top-16 bg-white rounded-r-lg shadow-md p-3 z-20">
      <h3 className="text-sm font-semibold mb-2">Participants ({participants.size})</h3>
      <div className="space-y-1">
        {Array.from(participants.entries()).map(([id, p]) => (
          <div key={id} className="flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: p.color }}
            />
            <span className="text-xs">{p.name || id.slice(0, 6)}</span>
            {id === user.id && <span className="text-xs text-gray-500">(you)</span>}
          </div>
        ))}
      </div>
    </div>
  )
} 