'use client'

import { useRef, useEffect, useState } from 'react'
import { useRealtimeCanvas } from '@/hooks/useRealtimeCanvas'

function getUser() {
  if (typeof window === 'undefined') return { id: 'anon', name: 'Anon' }
  const id = localStorage.getItem('uid') || crypto.randomUUID()
  localStorage.setItem('uid', id)
  const name = localStorage.getItem('uname') || 'You'
  return { id, name }
}

export default function SharedCanvas({ eventId }: { eventId: string }) {
  const user = getUser()
  const { participants, sendCursor, sendStroke, tick } = useRealtimeCanvas(eventId, user)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [drawing, setDrawing] = useState(false)
  const [points, setPoints] = useState<{ x: number, y: number }[]>([])
  const [size, setSize] = useState({ width: 0, height: 0 })

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setSize({ width: window.innerWidth, height: window.innerHeight })
      const handleResize = () => setSize({ width: window.innerWidth, height: window.innerHeight })
      window.addEventListener('resize', handleResize)
      return () => window.removeEventListener('resize', handleResize)
    }
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    // Draw strokes
    participants.forEach((p, id) => {
      if ((p as any).strokes) {
        (p as any).strokes.forEach((stroke: any) => {
          ctx.strokeStyle = p.color
          ctx.lineWidth = 3
          ctx.beginPath()
          stroke.forEach((pt: any, i: number) => {
            if (i === 0) ctx.moveTo(pt.x, pt.y)
            else ctx.lineTo(pt.x, pt.y)
          })
          ctx.stroke()
        })
      }
    })
    // Draw local stroke
    if (points.length > 1) {
      ctx.strokeStyle = participants.get(user.id)?.color || '#000'
      ctx.lineWidth = 3
      ctx.beginPath()
      points.forEach((pt, i) => {
        if (i === 0) ctx.moveTo(pt.x, pt.y)
        else ctx.lineTo(pt.x, pt.y)
      })
      ctx.stroke()
    }
    // Draw cursors
    participants.forEach((p, id) => {
      ctx.fillStyle = p.color
      ctx.beginPath()
      ctx.arc(p.cursor.x, p.cursor.y, 8, 0, 2 * Math.PI)
      ctx.fill()
      ctx.font = '14px sans-serif'
      ctx.fillText(p.name || id.slice(0, 6), p.cursor.x + 12, p.cursor.y + 4)
    })
  }, [participants, points, size, user.id, tick])

  function getPos(e: any) {
    const rect = canvasRef.current!.getBoundingClientRect()
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top
    return { x, y }
  }

  function handlePointerDown(e: any) {
    setDrawing(true)
    const pos = getPos(e)
    setPoints([pos])
    sendCursor(pos.x, pos.y)
  }
  function handlePointerMove(e: any) {
    if (!drawing) return
    const pos = getPos(e)
    setPoints(pts => [...pts, pos])
    sendCursor(pos.x, pos.y)
  }
  function handlePointerUp() {
    setDrawing(false)
    if (points.length > 1) sendStroke(points)
    setPoints([])
  }

  return (
    <canvas
      ref={canvasRef}
      width={size.width}
      height={size.height}
      className="fixed inset-0 w-full h-full bg-white touch-none z-10"
      style={{ touchAction: 'none', cursor: 'crosshair' }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onTouchStart={handlePointerDown}
      onTouchMove={handlePointerMove}
      onTouchEnd={handlePointerUp}
    />
  )
} 