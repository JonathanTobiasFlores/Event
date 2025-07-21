import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import SharedCanvas from '@/components/SharedCanvas'

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
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">{event.name}</h1>
        <p className="text-gray-600 mb-8">{new Date(event.date).toLocaleString()}</p>
        <div className="mb-8">
          <SharedCanvas eventId={event.id} />
        </div>
      </div>
    </div>
  )
} 