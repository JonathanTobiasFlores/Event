'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import DrawingCanvas from './DrawingCanvas';
import { Painting, Stroke } from '@/app/types/canvas';
import { createClient } from '@/lib/supabase/client';
import { useRealtimePresence } from '@/hooks/useRealtimePresence';
import { getOrCreateUser } from '@/lib/utils/user';
import { generateUserColor } from '@/lib/utils/color';

interface PaintingDialogProps {
  painting: Painting;
  isOpen: boolean;
  onClose: () => void;
}

export default function PaintingDialog({ painting, isOpen, onClose }: PaintingDialogProps) {
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [participants, setParticipants] = useState(new Map());
  const supabase = createClient();
  const user = getOrCreateUser();
  
  const { presenceState, updatePresence, channel } = useRealtimePresence({
    channelName: `painting:${painting.id}`,
    userId: user.id,
    userData: {
      name: user.name,
      color: generateUserColor(user.id),
      cursor: { x: -100, y: -100 },
    },
  });

  // Load existing strokes
  useEffect(() => {
    if (!isOpen) return;

    const loadStrokes = async () => {
      const { data, error } = await supabase
        .from('canvas_strokes')
        .select('*')
        .eq('painting_id', painting.id)
        .order('created_at', { ascending: true });

      if (data && !error) {
        setStrokes(
          data.map((row) => ({
            points: row.points,
            color: row.color,
            userId: row.user_id,
            userName: row.user_name || 'Anonymous',
          }))
        );
      }
    };

    loadStrokes();
  }, [painting.id, isOpen, supabase]);

  // Update participants from presence state
  useEffect(() => {
    const newParticipants = new Map();
    Object.entries(presenceState).forEach(([key, presences]: [string, any]) => {
      if (presences.length > 0) {
        const presence = presences[0];
        newParticipants.set(key, presence);
      }
    });
    setParticipants(newParticipants);
  }, [presenceState]);

  // Listen for new strokes
  useEffect(() => {
    if (!channel) return;

    const handleNewStroke = ({ payload }: { payload: any }) => {
      if (payload.userId !== user.id) {
        setStrokes((prev) => [...prev, payload]);
      }
    };

    const result: any = channel.on('broadcast', { event: 'stroke' }, handleNewStroke);

    return () => {
      if (result && typeof result.unsubscribe === 'function') {
        result.unsubscribe();
      }
    };
  }, [channel, user.id]);

  const handleStrokeComplete = async (stroke: Stroke) => {
    // Add to local state
    setStrokes((prev) => [...prev, stroke]);

    // Save to database
    await supabase.from('canvas_strokes').insert({
      painting_id: painting.id,
      user_id: stroke.userId,
      user_name: stroke.userName,
      color: stroke.color,
      points: stroke.points,
    });

    // Broadcast to others
    if (channel) {
      channel.send({
        type: 'broadcast',
        event: 'stroke',
        payload: stroke,
      });
    }
  };

  const handleCursorMove = (x: number, y: number) => {
    updatePresence({
      name: user.name,
      color: generateUserColor(user.id),
      cursor: { x, y },
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] w-full sm:max-w-lg p-0">
        <DialogHeader className="p-4 pb-2">
          <DialogTitle>{painting.title}</DialogTitle>
        </DialogHeader>
        <div className="aspect-square w-full max-h-[70vh] p-4">
          <DrawingCanvas
            paintingId={painting.id}
            strokes={strokes}
            participants={participants}
            onStrokeComplete={handleStrokeComplete}
            onCursorMove={handleCursorMove}
          />
        </div>
        <div className="p-4 pt-2 border-t">
          <p className="text-sm text-muted-foreground">
            {participants.size} {participants.size === 1 ? 'person' : 'people'} drawing
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}