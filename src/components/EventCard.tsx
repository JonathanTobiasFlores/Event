import { Card, CardContent } from './ui/card'
import { Avatar, AvatarImage } from './ui/avatar'
import { Button } from './ui/button'
import { format } from 'date-fns'

export type EventCardProps = {
  name: string
  date: Date
  imageUrl?: string
  onDateChange?: (date: Date) => void
  onClick?: () => void
}

export default function EventCard({ name, date, imageUrl, onDateChange, onClick }: EventCardProps) {
  return (
    <Card className="w-full max-w-xs cursor-pointer hover:shadow-lg transition-shadow" onClick={onClick}>
      <CardContent className="flex flex-col items-center p-4">
        <div className="relative w-32 h-32 mb-4">
          <Avatar className="w-32 h-32 rounded-lg">
            {imageUrl ? (
              <AvatarImage src={imageUrl} alt={name} className="object-cover w-full h-full" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-200 rounded-lg text-gray-400 text-4xl">
                +
              </div>
            )}
          </Avatar>
        </div>
        <div className="w-full text-center">
          <div className="font-semibold text-lg mb-1 truncate">{name}</div>
          <Button type="button" variant="ghost" className="w-full justify-center" disabled>
            <span className="mr-2">{date ? format(date, 'PPP') : 'No date'}</span>
            <span role="img" aria-label="calendar">📅</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
} 