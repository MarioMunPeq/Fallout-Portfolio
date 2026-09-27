import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import type { Map } from 'mapbox-gl'
import { MAP_LOCATIONS } from '../../../data/mapLocations'
import type { MapLocation } from '../../../data/mapLocations'
import './OffscreenPOIIndicators.css'

interface OffscreenIndicator {
  id: string
  nombre: string
  x: number
  y: number
  /** Degrees, pointing from the viewport centre toward the POI. */
  rotation: number
}

/**
 * Place a marker for a POI that is outside the viewport, on the border of the
 * visible rect, along the ray from the centre toward the POI.
 *
 * The previous version snapped the point onto whichever full edge it judged
 * dominant, so a POI off in a corner produced an arrow parked on an edge
 * pointing at empty space. Intersecting the ray with the rect and keeping the
 * angle handles corners correctly with no edge special-casing at all.
 */
function edgePoint(
  centerX: number,
  centerY: number,
  targetX: number,
  targetY: number,
  width: number,
  height: number,
  margin: number,
): { x: number; y: number; rotation: number } {
  const dx = targetX - centerX
  const dy = targetY - centerY
  const angle = Math.atan2(dy, dx)

  // The POI is directly behind the centre (degenerate ray): push it up.
  if (dx === 0 && dy === 0) {
    return { x: centerX, y: margin, rotation: -90 }
  }

  const halfWidth = Math.max(1, width / 2 - margin)
  const halfHeight = Math.max(1, height / 2 - margin)

  const cosA = Math.cos(angle)
  const sinA = Math.sin(angle)

  // Distance along the ray until it crosses the inset rect.
  const tx = cosA === 0 ? Infinity : halfWidth / Math.abs(cosA)
  const ty = sinA === 0 ? Infinity : halfHeight / Math.abs(sinA)
  const t = Math.min(tx, ty)

  return {
    x: centerX + cosA * t,
    y: centerY + sinA * t,
    rotation: (angle * 180) / Math.PI,
  }
}

function project(map: Map, location: MapLocation): { x: number; y: number } | null {
  try {
    const point = map.project([location.lng, location.lat])
    return { x: point.x, y: point.y }
  } catch {
    return null
  }
}

export function OffscreenPOIIndicators({ map }: { map: Map | null }) {
  const [indicators, setIndicators] = useState<OffscreenIndicator[]>([])
  const frame = useRef<number | undefined>(undefined)

  useEffect(() => {
    if (!map) return

    const MARGIN = 22

    const update = () => {
      const bounds = map.getContainer().getBoundingClientRect()
      if (bounds.width === 0 || bounds.height === 0) return

      const centerX = bounds.width / 2
      const centerY = bounds.height / 2
      const next: OffscreenIndicator[] = []

      for (const location of MAP_LOCATIONS) {
        const p = project(map, location)
        if (!p) continue

        const inside =
          p.x >= 0 && p.x <= bounds.width && p.y >= 0 && p.y <= bounds.height
        if (inside) continue

        const { x, y, rotation } = edgePoint(
          centerX,
          centerY,
          p.x,
          p.y,
          bounds.width,
          bounds.height,
          MARGIN,
        )

        next.push({ id: location.id, nombre: location.nombre, x, y, rotation })
      }

      setIndicators(next)
    }

    // 'move' already covers zoom/rotate/pitch, so one listener is enough;
    // 'resize' is separate because it doesn't always fire 'move'.
    const onMove = () => {
      if (frame.current !== undefined) cancelAnimationFrame(frame.current)
      frame.current = requestAnimationFrame(update)
    }

    map.on('move', onMove)
    map.on('resize', onMove)
    update()

    return () => {
      map.off('move', onMove)
      map.off('resize', onMove)
      if (frame.current !== undefined) cancelAnimationFrame(frame.current)
    }
  }, [map])

  if (indicators.length === 0) return null

  return (
    <div className="offscreen" aria-hidden="true">
      {indicators.map((indicator) => (
        <span
          key={indicator.id}
          className="offscreen__pip"
          style={
            {
              '--x': `${indicator.x}px`,
              '--y': `${indicator.y}px`,
              '--angle': `${indicator.rotation}deg`,
            } as CSSProperties
          }
        >
          <span className="offscreen__arrow" />
        </span>
      ))}
    </div>
  )
}
