import { Card, CardContent } from './ui/card'
import { format } from 'date-fns'
import { Calendar } from 'lucide-react'

export type EventCardProps = {
  name: string
  date: Date
  imageUrl?: string
  onDateChange?: (date: Date) => void
  onClick?: () => void
}

export default function EventCard({ name, date, imageUrl, onDateChange, onClick }: EventCardProps) {
  return (
    <Card 
      className="w-full max-w-md mx-auto bg-mint-1 border-mint-2/30 shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-[1.02] cursor-pointer rounded-xl overflow-hidden flex flex-col items-center gap-4 p-6 group" 
      onClick={onClick}
    >
      {/* Larger square image/avatar */}
      <div className="w-24 h-24 rounded-xl bg-mint-0 border border-mint-2/30 flex items-center justify-center overflow-hidden mb-2">
        {imageUrl ? (
          <img 
            src={imageUrl} 
            alt={name} 
            className="w-full h-full object-cover rounded-xl" 
          />
        ) : (
          <Calendar className="w-10 h-10 text-mint-3/50" />
        )}
      </div>
      {/* Event info */}
      <CardContent className="flex flex-col items-center p-0 w-full">
        <h3 className="font-semibold text-lg text-foreground text-center mb-1 truncate w-full">{name}</h3>
        <div className="flex items-center gap-2 text-sm text-muted-foreground justify-center">
          <Calendar className="w-4 h-4 text-mint-3" />
          <span className="truncate">{format(date, 'PPP')}</span>
        </div>
      </CardContent>
    </Card>
  )
}