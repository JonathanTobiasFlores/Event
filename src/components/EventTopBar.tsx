import Link from 'next/link'
import { format } from 'date-fns'
import { Avatar, AvatarImage } from './ui/avatar'
import { Button } from './ui/button'

export type EventTopBarProps = {
  eventName: string
  eventDate: string
  eventImage?: string
  eventId: string
  participants?: Array<{ id: string; name: string; color: string }>
}

export default function EventTopBar({ eventName, eventDate, eventImage, eventId, participants }: EventTopBarProps) {
  return (
    <header className="fixed top-0 left-0 w-full z-30 bg-white/80 backdrop-blur border-b border-gray-200 flex flex-row-reverse items-center px-2 py-2 gap-2 shadow-sm">
      <Link href="/" className="ml-2">
        <Button size="icon" variant="ghost" className="rounded-full">
          <span aria-label="Back" className="text-2xl">←</span>
        </Button>
      </Link>
      <Avatar className="w-10 h-10 ml-2">
        {eventImage ? (
          <AvatarImage src={eventImage} alt={eventName} className="object-cover w-full h-full" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-200 rounded-lg text-gray-400 text-2xl">+</div>
        )}
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="font-semibold truncate text-base">{eventName}</div>
        <div className="text-xs text-gray-500 truncate">{format(new Date(eventDate), 'PPP')}</div>
      </div>
      {participants && participants.length > 0 && (
        <div className="flex items-center gap-2 mr-2">
          {participants.map(p => (
            <div key={p.id} className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: p.color }} />
              <span className="text-xs text-gray-700 truncate max-w-[60px]">{p.name}</span>
            </div>
          ))}
        </div>
      )}
    </header>
  )
} 