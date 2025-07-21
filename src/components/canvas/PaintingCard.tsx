'use client';

import { useState, useEffect } from 'react';
import { Painting } from '@/app/types/canvas';
import { Button } from '@/components/ui/button';
import { Palette, Users } from 'lucide-react';
import PaintingDialog from './PaintingDialog';
import { createClient } from '@/lib/supabase/client';
import { useRealtimePresence } from '@/hooks/useRealtimePresence';

interface PaintingCardProps {
  painting: Painting;
}

export default function PaintingCard({ painting }: PaintingCardProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const supabase = createClient();
  
  const { presenceState } = useRealtimePresence({
    channelName: `painting:${painting.id}`,
    userId: 'preview-' + Math.random(),
  });

  const participantCount = Object.keys(presenceState).length;

  // Generate preview (you could also store thumbnails in the database)
  useEffect(() => {
    const loadPreview = async () => {
      const { data } = await supabase
        .from('canvas_strokes')
        .select('*')
        .eq('painting_id', painting.id)
        .order('created_at', { ascending: true })
        .limit(50); // Limit for performance

      if (data && data.length > 0) {
        // Create a small canvas for preview
        const canvas = document.createElement('canvas');
        canvas.width = 150;
        canvas.height = 150;
        const ctx = canvas.getContext('2d');
        
        if (ctx) {
          ctx.fillStyle = 'white';
          ctx.fillRect(0, 0, 150, 150);
          ctx.scale(0.5, 0.5); // Scale down for preview
          
          data.forEach((stroke) => {
            const points = stroke.points;
            if (points.length < 2) return;
            
            ctx.strokeStyle = stroke.color;
            ctx.lineWidth = 3;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            
            ctx.beginPath();
            ctx.moveTo(points[0].x, points[0].y);
            
            for (let i = 1; i < points.length; i++) {
              ctx.lineTo(points[i].x, points[i].y);
            }
            
            ctx.stroke();
          });
          
          setPreviewUrl(canvas.toDataURL());
        }
      }
    };

    loadPreview();
  }, [painting.id, supabase]);

  return (
    <>
      <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
        <div 
          className="aspect-square bg-gray-100 cursor-pointer relative"
          onClick={() => setIsDialogOpen(true)}
        >
          {previewUrl ? (
            <img 
              src={previewUrl} 
              alt={painting.title} 
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Palette className="w-12 h-12 text-gray-400" />
            </div>
          )}
          
          {participantCount > 0 && (
            <div className="absolute top-2 right-2 bg-black/70 text-white px-2 py-1 rounded-full flex items-center gap-1 text-xs">
              <Users className="w-3 h-3" />
              {participantCount}
            </div>
          )}
        </div>
        
        <div className="p-4">
          <h3 className="font-semibold text-lg mb-2">{painting.title}</h3>
          <Button 
            onClick={() => setIsDialogOpen(true)}
            className="w-full"
            size="sm"
          >
            Join Canvas
          </Button>
        </div>
      </div>

      {isDialogOpen && (
        <PaintingDialog
          painting={painting}
          isOpen={isDialogOpen}
          onClose={() => setIsDialogOpen(false)}
        />
      )}
    </>
  );
}