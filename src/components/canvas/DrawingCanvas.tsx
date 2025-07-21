'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { Point, Stroke } from '@/app/types/canvas';
import { generateUserColor } from '@/lib/utils/color';
import { getOrCreateUser } from '@/lib/utils/user';

interface DrawingCanvasProps {
  paintingId: string;
  strokes: Stroke[];
  participants: Map<string, any>;
  onStrokeComplete: (stroke: Stroke) => void;
  onCursorMove: (x: number, y: number) => void;
}

export default function DrawingCanvas({
  paintingId,
  strokes,
  participants,
  onStrokeComplete,
  onCursorMove,
}: DrawingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPoints, setCurrentPoints] = useState<Point[]>([]);
  const user = getOrCreateUser();
  const userColor = generateUserColor(user.id);

  const getPointerPosition = (e: React.PointerEvent | React.TouchEvent): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const y = 'touches' in e ? e.touches[0].clientY : e.clientY;

    return {
      x: x - rect.left,
      y: y - rect.top,
    };
  };

  const startDrawing = (e: React.PointerEvent | React.TouchEvent) => {
    const point = getPointerPosition(e);
    setIsDrawing(true);
    setCurrentPoints([point]);
    onCursorMove(point.x, point.y);
  };

  const draw = (e: React.PointerEvent | React.TouchEvent) => {
    const point = getPointerPosition(e);
    onCursorMove(point.x, point.y);

    if (!isDrawing) return;

    setCurrentPoints((prev) => {
      const lastPoint = prev[prev.length - 1];
      if (!lastPoint) return [point];

      const distance = Math.sqrt(
        Math.pow(point.x - lastPoint.x, 2) + Math.pow(point.y - lastPoint.y, 2)
      );

      if (distance > 2) {
        return [...prev, point];
      }
      return prev;
    });
  };

  const stopDrawing = (e: React.PointerEvent | React.TouchEvent) => {
    if (isDrawing && currentPoints.length > 1) {
      onStrokeComplete({
        points: currentPoints,
        color: userColor,
        userId: user.id,
        userName: user.name,
      });
    }
    setIsDrawing(false);
    setCurrentPoints([]);
  };

  // Add non-passive touchmove event listener to prevent scrolling while drawing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleTouchMove = (e: TouchEvent) => {
      if (isDrawing) {
        e.preventDefault();
      }
    };
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    return () => {
      canvas.removeEventListener('touchmove', handleTouchMove);
    };
  }, [isDrawing]);

  // Canvas rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Set canvas properties for smooth drawing
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Draw all strokes
    strokes.forEach((stroke) => {
      if (stroke.points.length < 2) return;

      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.beginPath();
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);

      for (let i = 1; i < stroke.points.length - 1; i++) {
        const xc = (stroke.points[i].x + stroke.points[i + 1].x) / 2;
        const yc = (stroke.points[i].y + stroke.points[i + 1].y) / 2;
        ctx.quadraticCurveTo(stroke.points[i].x, stroke.points[i].y, xc, yc);
      }

      const lastPoint = stroke.points[stroke.points.length - 1];
      ctx.lineTo(lastPoint.x, lastPoint.y);
      ctx.stroke();
    });

    // Draw current stroke
    if (isDrawing && currentPoints.length > 1) {
      ctx.strokeStyle = userColor;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.beginPath();
      ctx.moveTo(currentPoints[0].x, currentPoints[0].y);

      for (let i = 1; i < currentPoints.length - 1; i++) {
        const xc = (currentPoints[i].x + currentPoints[i + 1].x) / 2;
        const yc = (currentPoints[i].y + currentPoints[i + 1].y) / 2;
        ctx.quadraticCurveTo(currentPoints[i].x, currentPoints[i].y, xc, yc);
      }

      const lastPoint = currentPoints[currentPoints.length - 1];
      ctx.lineTo(lastPoint.x, lastPoint.y);
      ctx.stroke();
    }

    // Draw cursors
    participants.forEach((participant, id) => {
      if (id === user.id || !participant.cursor) return;

      ctx.save();
      ctx.fillStyle = participant.color;
      ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
      ctx.shadowBlur = 4;
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 2;

      // Draw cursor
      ctx.beginPath();
      ctx.arc(participant.cursor.x, participant.cursor.y, 6, 0, 2 * Math.PI);
      ctx.fill();

      // Draw name
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
      ctx.font = '12px sans-serif';
      const text = participant.name || 'Anonymous';
      const textWidth = ctx.measureText(text).width;
      
      ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
      ctx.fillRect(
        participant.cursor.x + 10,
        participant.cursor.y - 16,
        textWidth + 8,
        18
      );
      
      ctx.fillStyle = 'white';
      ctx.fillText(text, participant.cursor.x + 14, participant.cursor.y - 2);
      ctx.restore();
    });
  }, [strokes, currentPoints, isDrawing, participants, userColor, user.id]);

  return (
    <canvas
      ref={canvasRef}
      width={300}
      height={300}
      className="w-full h-full bg-white touch-none cursor-crosshair"
      onPointerDown={startDrawing}
      onPointerMove={draw}
      onPointerUp={stopDrawing}
      onPointerLeave={stopDrawing}
      onTouchStart={startDrawing}
      onTouchMove={draw}
      onTouchEnd={stopDrawing}
    />
  );
}