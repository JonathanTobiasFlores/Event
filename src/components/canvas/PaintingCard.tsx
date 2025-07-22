'use client';

import { useState, useEffect } from 'react';
import { Painting } from '@/app/types/canvas';
import { Button } from '@/components/ui/button';
import { Palette, Users, Loader2 } from 'lucide-react';
import PaintingDialog from './PaintingDialog';
import { createClient } from '@/lib/supabase/client';
import { useRealtimePresence } from '@/hooks/useRealtimePresence';

interface PaintingCardProps {
  painting: Painting;
}

export default function PaintingCard({ painting }: PaintingCardProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(true);
  const supabase = createClient();
  
  const { presenceState } = useRealtimePresence({
    channelName: `painting:${painting.id}`,
    userId: 'preview-' + Math.random().toString(36).substring(7),
  });

  const participantCount = Object.keys(presenceState).length;

  // Generate preview thumbnail
  useEffect(() => {
    let mounted = true;

    const loadPreview = async () => {
      try {
        const { data } = await supabase
          .from('canvas_strokes')
          .select('*')
          .eq('painting_id', painting.id)
          .order('created_at', { ascending: true })
          .limit(50);

        if (!mounted) return;

        if (data && data.length > 0) {
          const canvas = document.createElement('canvas');
          canvas.width = 300;
          canvas.height = 300;
          const ctx = canvas.getContext('2d');
          
          if (ctx) {
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, 300, 300);
            
            data.forEach((stroke: any) => {
              const points = stroke.points;
              if (!Array.isArray(points) || points.length < 2) return;
              
              ctx.strokeStyle = stroke.color;
              ctx.lineWidth = 3;
              ctx.lineCap = 'round';
              ctx.lineJoin = 'round';
              
              ctx.beginPath();
              ctx.moveTo(points[0].x, points[0].y);
              
              for (let i = 1; i < points.length - 1; i++) {
                const xc = (points[i].x + points[i + 1].x) / 2;
                const yc = (points[i].y + points[i + 1].y) / 2;
                ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
              }
              
              ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
              ctx.stroke();
            });
            
            setPreviewUrl(canvas.toDataURL('image/png', 0.8));
          }
        }
      } catch (error) {
        console.error('Error loading preview:', error);
      } finally {
        if (mounted) {
          setIsLoadingPreview(false);
        }
      }
    };

    loadPreview();

    return () => {
      mounted = false;
    };
  }, [painting.id, supabase]);

  return (
    <>
      <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
        <div 
          className="aspect-square bg-gray-100 cursor-pointer relative overflow-hidden"
          onClick={() => setIsDialogOpen(true)}
        >
          {isLoadingPreview ? (
            <div className="w-full h-full flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
            </div>
          ) : previewUrl ? (
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
          <h3 className="font-semibold text-lg mb-2 truncate">{painting.title}</h3>
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