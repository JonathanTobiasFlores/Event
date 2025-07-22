'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { Point, Stroke } from '@/app/types/canvas';
import { generateUserColor } from '@/lib/utils/color';
import { getOrCreateUser } from '@/lib/utils/user';
import { RealtimeParticipant } from '@/lib/realtimeCanvas';
import { broadcastInProgressStroke, listenInProgressStrokes } from '@/lib/realtimeCanvas';

interface DrawingCanvasProps {
  paintingId: string;
  strokes: Stroke[];
  participants: Map<string, RealtimeParticipant>;
  onStrokeComplete: (stroke: Stroke) => void;
  onCursorMove: (x: number, y: number, isDrawing?: boolean) => void;
  isConnected?: boolean;
  userColor: string;
}

export default function DrawingCanvas({
  paintingId,
  strokes,
  participants,
  onStrokeComplete,
  onCursorMove,
  isConnected = true,
  userColor
}: DrawingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPoints, setCurrentPoints] = useState<Point[]>([]);
  const [ghostStrokes, setGhostStrokes] = useState<Record<string, { points: Point[]; color: string }>>({});
  const user = getOrCreateUser();
  const animationFrameRef = useRef<number | null>(null);

  // Listen for in-progress strokes from others
  useEffect(() => {
    listenInProgressStrokes(paintingId, (userId, points, color) => {
      setGhostStrokes(prev => ({ ...prev, [userId]: { points, color } }));
    });
  }, [paintingId]);

  const getPointerPosition = (e: any): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    let x, y;
    if (e.touches && e.touches.length > 0) {
      x = e.touches[0].clientX;
      y = e.touches[0].clientY;
    } else if (typeof e.clientX === 'number' && typeof e.clientY === 'number') {
      x = e.clientX;
      y = e.clientY;
    } else {
      x = 0;
      y = 0;
    }

    // Scale coordinates to canvas internal size
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (x - rect.left) * scaleX,
      y: (y - rect.top) * scaleY,
    };
  };

  const startDrawing = (e: React.PointerEvent | React.TouchEvent) => {
    const point = getPointerPosition(e);
    setIsDrawing(true);
    setCurrentPoints([point]);
    onCursorMove(point.x, point.y, true);
  };

  const draw = (e: React.PointerEvent | React.TouchEvent) => {
    const point = getPointerPosition(e);
    onCursorMove(point.x, point.y, isDrawing);

    if (!isDrawing) return;

    setCurrentPoints((prev) => {
      const lastPoint = prev[prev.length - 1];
      if (!lastPoint) return [point];

      const distance = Math.sqrt(
        Math.pow(point.x - lastPoint.x, 2) + Math.pow(point.y - lastPoint.y, 2)
      );

      if (distance > 2) {
        const newPoints = [...prev, point];
        // Broadcast in-progress stroke
        broadcastInProgressStroke(paintingId, user.id, newPoints, userColor);
        return newPoints;
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
    const point = getPointerPosition(e);
    onCursorMove(point.x, point.y, false);
    // Clear own ghost stroke
    setGhostStrokes(prev => { const copy = { ...prev }; delete copy[user.id]; return copy });
  };

  // Canvas rendering with animation frame
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Show connection status
    if (!isConnected) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#666';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Connecting...', canvas.width / 2, canvas.height / 2);
      return;
    }

    // Set canvas properties for smooth drawing
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Draw all completed strokes
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

    // Draw ghost strokes from other users
    Object.entries(ghostStrokes).forEach(([uid, stroke]) => {
      if (uid === user.id) return;
      if (stroke.points.length < 2) return;
      ctx.strokeStyle = stroke.color || '#888';
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
      const last = stroke.points[stroke.points.length - 1];
      ctx.lineTo(last.x, last.y);
      ctx.stroke();
    });

    // Draw current stroke being drawn
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

    // Draw other participants' cursors
    participants.forEach((participant) => {
      if (participant.userId === user.id) return;

      const { cursor, color, userName, isDrawing: participantDrawing } = participant;
      
      // Skip if cursor is off-screen
      if (cursor.x < 0 || cursor.y < 0) return;

      ctx.save();

      // Draw cursor dot
      ctx.fillStyle = color;
      ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
      ctx.shadowBlur = 4;
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 2;
      
      ctx.beginPath();
      ctx.arc(cursor.x, cursor.y, participantDrawing ? 8 : 6, 0, 2 * Math.PI);
      ctx.fill();

      // Draw name tag
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
      ctx.font = '12px sans-serif';
      const text = userName || 'Anonymous';
      const textWidth = ctx.measureText(text).width;
      
      // Background for name
      ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
      ctx.fillRect(
        cursor.x + 10,
        cursor.y - 16,
        textWidth + 8,
        18
      );
      
      // Name text
      ctx.fillStyle = 'white';
      ctx.fillText(text, cursor.x + 14, cursor.y - 2);

      // Drawing indicator
      if (participantDrawing) {
        ctx.fillStyle = color;
        ctx.font = '16px sans-serif';
        ctx.fillText('✏️', cursor.x - 20, cursor.y + 5);
      }

      ctx.restore();
    });
  }, [strokes, currentPoints, isDrawing, participants, userColor, user.id, isConnected, ghostStrokes]);

  // Setup animation loop
  useEffect(() => {
    const animate = () => {
      renderCanvas();
      animationFrameRef.current = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [renderCanvas]);

  // Add non-passive touch event listeners to prevent scrolling while drawing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const prevent = (e: TouchEvent) => {
      if (isDrawing) e.preventDefault();
    };

    canvas.addEventListener('touchmove', prevent, { passive: false });
    canvas.addEventListener('touchstart', prevent, { passive: false });
    canvas.addEventListener('touchend', prevent, { passive: false });

    return () => {
      canvas.removeEventListener('touchmove', prevent);
      canvas.removeEventListener('touchstart', prevent);
      canvas.removeEventListener('touchend', prevent);
    };
  }, [isDrawing]);

  return (
    <canvas
      ref={canvasRef}
      width={300}
      height={300}
      className="w-full h-full bg-white touch-none cursor-crosshair rounded-md border"
      onPointerDown={startDrawing}
      onPointerMove={draw}
      onPointerUp={stopDrawing}
      onPointerLeave={stopDrawing}
      onPointerCancel={stopDrawing}
      onTouchStart={startDrawing}
      onTouchMove={draw}
      onTouchEnd={stopDrawing}
      onTouchCancel={stopDrawing}
    />
  );
}