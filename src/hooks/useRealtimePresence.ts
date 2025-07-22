import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

interface UseRealtimePresenceOptions {
  channelName: string;
  userId: string;
  userData?: any;
}

export function useRealtimePresence({ channelName, userId, userData }: UseRealtimePresenceOptions) {
  const [presenceState, setPresenceState] = useState<Record<string, any>>({});
  const supabase = useMemo(() => createClient(), []);
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    const newChannel = supabase.channel(channelName, {
      config: {
        presence: { key: userId },
      },
    });

    channelRef.current = newChannel;

    newChannel
      .on('presence', { event: 'sync' }, () => {
        setPresenceState(newChannel.presenceState());
      })
      .on('presence', { event: 'join' }, () => {
        setPresenceState(newChannel.presenceState());
      })
      .on('presence', { event: 'leave' }, () => {
        setPresenceState(newChannel.presenceState());
      });

    newChannel.subscribe(async (status: string) => {
      if (status === 'SUBSCRIBED' && userData) {
        await newChannel.track(userData);
      }
    });

    return () => {
      newChannel.unsubscribe();
      channelRef.current = null;
    };
  }, [channelName, userId, supabase, userData]);

  const updatePresence = useCallback(async (data: any) => {
    if (channelRef.current) {
      await channelRef.current.track(data);
    }
  }, []);

  return { presenceState, updatePresence, channel: channelRef.current };
}