'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import DrawingCanvas from './DrawingCanvas';
import { Painting, Stroke } from '@/app/types/canvas';
import { getOrCreateUser } from '@/lib/utils/user';
import { generateUserColor } from '@/lib/utils/color';
import { usePaintingRealtime } from '@/hooks/usePaintingRealtime';
import { Loader2 } from 'lucide-react';

interface PaintingDialogProps {
  painting: Painting;
  isOpen: boolean;
  onClose: () => void;
}

export default function PaintingDialog({ painting, isOpen, onClose }: PaintingDialogProps) {
  const user = getOrCreateUser();
  const userColor = generateUserColor(user.id);
  
  const {
    strokes,
    participants,
    isConnected,
    sendCursorUpdate,
    sendStroke
  } = usePaintingRealtime({
    paintingId: painting.id,
    userId: user.id,
    userName: user.name,
    userColor
  });

  const handleStrokeComplete = async (stroke: Stroke) => {
    await sendStroke(stroke.points);
  };

  const handleCursorMove = (x: number, y: number, isDrawing: boolean = false) => {
    sendCursorUpdate(x, y, isDrawing);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] w-full sm:max-w-lg p-0">
        <DialogHeader className="p-4 pb-2">
          <DialogTitle className="flex items-center gap-2">
            {painting.title}
            {!isConnected && (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </DialogTitle>
          <DialogDescription>
            Draw together in real time. Your strokes will appear to all participants instantly.
          </DialogDescription>
        </DialogHeader>
        <div className="aspect-square w-full max-h-[70vh] p-4">
          <DrawingCanvas
            paintingId={painting.id}
            strokes={strokes}
            participants={participants}
            onStrokeComplete={handleStrokeComplete}
            onCursorMove={handleCursorMove}
            isConnected={isConnected}
          />
        </div>
        <div className="p-4 pt-2 border-t flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {participants.size} {participants.size === 1 ? 'person' : 'people'} drawing
          </p>
          <div className="flex items-center gap-2">
            {Array.from(participants.entries()).slice(0, 5).map(([id, participant]) => (
              <div
                key={id}
                className="flex items-center gap-1"
                title={participant.userName}
              >
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: participant.color }}
                />
                {participant.isDrawing && (
                  <span className="text-xs">✏️</span>
                )}
              </div>
            ))}
            {participants.size > 5 && (
              <span className="text-xs text-muted-foreground">
                +{participants.size - 5}
              </span>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}