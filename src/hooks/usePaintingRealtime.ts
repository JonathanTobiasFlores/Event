import { useEffect, useState, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { 
  setupPaintingChannel, 
  updateCursorPosition, 
  broadcastStroke,
  RealtimeStroke,
  RealtimeParticipant
} from '@/lib/realtimeCanvas';
import { Stroke } from '@/app/types/canvas';

interface UsePaintingRealtimeProps {
  paintingId: string;
  userId: string;
  userName: string;
  userColor: string;
}

export function usePaintingRealtime({
  paintingId,
  userId,
  userName,
  userColor
}: UsePaintingRealtimeProps) {
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [participants, setParticipants] = useState<Map<string, RealtimeParticipant>>(new Map());
  const [isConnected, setIsConnected] = useState(false);
  const supabase = createClient();
  const cleanupRef = useRef<(() => void) | null>(null);

  // Load existing strokes from database
  useEffect(() => {
    const loadStrokes = async () => {
      const { data, error } = await supabase
        .from('canvas_strokes')
        .select('*')
        .eq('painting_id', paintingId)
        .order('created_at', { ascending: true });

      if (data && !error) {
        setStrokes(
          data.map((row: any) => ({
            points: row.points,
            color: row.color,
            userId: row.user_id,
            userName: row.user_name || 'Anonymous',
          }))
        );
      }
    };

    loadStrokes();
  }, [paintingId, supabase]);

  // Setup realtime channel
  useEffect(() => {
    const handleStrokeReceived = (stroke: RealtimeStroke) => {
      setStrokes(prev => [...prev, {
        points: stroke.points,
        color: stroke.color,
        userId: stroke.userId,
        userName: stroke.userName
      }]);
    };

    const handleParticipantsUpdate = (updatedParticipants: Map<string, RealtimeParticipant>) => {
      setParticipants(updatedParticipants);
    };

    cleanupRef.current = setupPaintingChannel(
      paintingId,
      userId,
      userName,
      userColor,
      handleStrokeReceived,
      handleParticipantsUpdate
    );

    setIsConnected(true);

    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
      setIsConnected(false);
    };
  }, [paintingId, userId, userName, userColor]);

  const sendCursorUpdate = useCallback((x: number, y: number, isDrawing: boolean = false) => {
    updateCursorPosition(paintingId, x, y, isDrawing);
  }, [paintingId]);

  const sendStroke = useCallback(async (points: Array<{ x: number; y: number }>) => {
    // Broadcast to other users
    const realtimeStroke = await broadcastStroke(paintingId, points);
    
    if (realtimeStroke) {
      // Add to local state immediately
      setStrokes(prev => [...prev, {
        points: realtimeStroke.points,
        color: realtimeStroke.color,
        userId: realtimeStroke.userId,
        userName: realtimeStroke.userName
      }]);

      // Save to database
      await supabase.from('canvas_strokes').insert({
        painting_id: paintingId,
        user_id: userId,
        user_name: userName,
        color: userColor,
        points: points,
      });
    }
  }, [paintingId, userId, userName, userColor, supabase]);

  return {
    strokes,
    participants,
    isConnected,
    sendCursorUpdate,
    sendStroke
  };
}