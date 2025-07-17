import { createClient } from '@/lib/supabase/server'
import SharedCanvas from '@/components/SharedCanvas'

export default async function PrivatePage() {
  const supabase = await createClient()
  const { data } = await supabase.auth.getUser()
  // Auth guard temporarily disabled for testing
  // if (error || !data?.user) {
  //   redirect('/login')
  // }

  return (
    <>
      <p>Hello {data?.user?.email ?? 'Guest'}</p>
      <SharedCanvas eventId={"demo"} />
    </>
  )
}