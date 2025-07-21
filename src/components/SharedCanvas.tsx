'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
import { useRealtimeCanvas } from '@/hooks/useRealtimeCanvas'

function getUser() {
  if (typeof window === 'undefined') return { id: 'anon', name: 'Anon' }
  const id = localStorage.getItem('uid') || crypto.randomUUID()
  localStorage.setItem('uid', id)
  const name = localStorage.getItem('uname') || prompt('Enter your name:') || 'Anonymous'
  localStorage.setItem('uname', name)
  return { id, name }
}

export default function SharedCanvas({ eventId }: { eventId: string }) {
  const user = getUser()
  const { participants, sendCursor, sendStroke, tick } = useRealtimeCanvas(eventId, user)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [drawing, setDrawing] = useState(false)
  const [points, setPoints] = useState<{ x: number, y: number }[]>([])
  const [size, setSize] = useState({ width: 0, height: 0 })
  const animationFrameRef = useRef<number | null>(null)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setSize({ width: window.innerWidth, height: window.innerHeight })
      const handleResize = () => setSize({ width: window.innerWidth, height: window.innerHeight })
      window.addEventListener('resize', handleResize)
      return () => window.removeEventListener('resize', handleResize)
    }
  }, [])

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    
    // Enable anti-aliasing
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    
    // Draw all strokes
    participants.forEach((p, id) => {
      if (p.strokes && p.strokes.length > 0) {
        ctx.strokeStyle = p.color
        ctx.lineWidth = 3
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        
        p.strokes.forEach((stroke: any) => {
          if (stroke.length < 2) return
          
          ctx.beginPath()
          ctx.moveTo(stroke[0].x, stroke[0].y)
          
          // Use quadratic curves for smoother lines
          for (let i = 1; i < stroke.length - 1; i++) {
            const xc = (stroke[i].x + stroke[i + 1].x) / 2
            const yc = (stroke[i].y + stroke[i + 1].y) / 2
            ctx.quadraticCurveTo(stroke[i].x, stroke[i].y, xc, yc)
          }
          
          // Draw the last segment
          if (stroke.length > 1) {
            const last = stroke[stroke.length - 1]
            ctx.lineTo(last.x, last.y)
          }
          
          ctx.stroke()
        })
      }
    })
    
    // Draw current stroke being drawn
    if (drawing && points.length > 1) {
      const myColor = participants.get(user.id)?.color || '#000'
      ctx.strokeStyle = myColor
      ctx.lineWidth = 3
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.beginPath()
      ctx.moveTo(points[0].x, points[0].y)
      
      for (let i = 1; i < points.length - 1; i++) {
        const xc = (points[i].x + points[i + 1].x) / 2
        const yc = (points[i].y + points[i + 1].y) / 2
        ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc)
      }
      
      if (points.length > 1) {
        const last = points[points.length - 1]
        ctx.lineTo(last.x, last.y)
      }
      
      ctx.stroke()
    }
    
    // Draw cursors
    participants.forEach((p, id) => {
      if (id === user.id && !drawing) return // Hide own cursor when drawing
      
      ctx.save()
      ctx.fillStyle = p.color
      ctx.shadowColor = 'rgba(0, 0, 0, 0.3)'
      ctx.shadowBlur = 4
      ctx.shadowOffsetX = 2
      ctx.shadowOffsetY = 2
      
      // Draw cursor dot
      ctx.beginPath()
      ctx.arc(p.cursor.x, p.cursor.y, 6, 0, 2 * Math.PI)
      ctx.fill()
      
      // Draw name tag
      ctx.shadowBlur = 0
      ctx.shadowOffsetX = 0
      ctx.shadowOffsetY = 0
      ctx.font = '12px sans-serif'
      ctx.fillStyle = '#000'
      ctx.fillRect(p.cursor.x + 10, p.cursor.y - 16, ctx.measureText(p.name || '').width + 8, 18)
      ctx.fillStyle = '#fff'
      ctx.fillText(p.name || id.slice(0, 6), p.cursor.x + 14, p.cursor.y - 2)
      
      ctx.restore()
    })
  }, [participants, points, drawing, user.id])

  // Use requestAnimationFrame for smooth rendering
  useEffect(() => {
    const animate = () => {
      drawCanvas()
      animationFrameRef.current = requestAnimationFrame(animate)
    }
    animate()
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [drawCanvas])

  function getPos(e: React.PointerEvent | React.TouchEvent) {
    const rect = canvasRef.current!.getBoundingClientRect()
    const x = 'touches' in e ? e.touches[0].clientX : e.clientX
    const y = 'touches' in e ? e.touches[0].clientY : e.clientY
    return { x: x - rect.left, y: y - rect.top }
  }

  function handlePointerDown(e: React.PointerEvent | React.TouchEvent) {
    e.preventDefault()
    setDrawing(true)
    const pos = getPos(e)
    setPoints([pos])
    sendCursor(pos.x, pos.y)
  }

  function handlePointerMove(e: React.PointerEvent | React.TouchEvent) {
    e.preventDefault()
    const pos = getPos(e)
    
    // Always send cursor position, but throttled in the lib
    sendCursor(pos.x, pos.y)
    
    if (!drawing) return
    
    // Add point to stroke with some minimum distance to avoid too many points
    setPoints(pts => {
      if (pts.length === 0) return [pos]
      const lastPt = pts[pts.length - 1]
      const dist = Math.sqrt(Math.pow(pos.x - lastPt.x, 2) + Math.pow(pos.y - lastPt.y, 2))
      if (dist > 2) { // Minimum 2 pixels distance
        return [...pts, pos]
      }
      return pts
    })
  }

  function handlePointerUp(e: React.PointerEvent | React.TouchEvent) {
    e.preventDefault()
    setDrawing(false)
    if (points.length > 1) {
      sendStroke(points)
    }
    setPoints([])
  }

  return (
    <div className="fixed inset-0 w-full h-full bg-gray-50">
      <canvas
        ref={canvasRef}
        width={size.width}
        height={size.height}
        className="absolute inset-0 w-full h-full bg-white touch-none"
        style={{ touchAction: 'none', cursor: 'crosshair' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onPointerCancel={handlePointerUp}
      />
    </div>
  )
}