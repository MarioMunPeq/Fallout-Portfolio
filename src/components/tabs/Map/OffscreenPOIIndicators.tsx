import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
// Aliased: a bare `Map` here would shadow the built-in Map collection that
// groups the pips by edge.
import type { Map as MapboxMap } from 'mapbox-gl'
import { MAP_LOCATIONS, CATEGORY_ICON_PATHS } from '../../../data/mapLocations'
import type { MapCategory, MapLocation } from '../../../data/mapLocations'
import './OffscreenPOIIndicators.css'

type Edge = 'top' | 'right' | 'bottom' | 'left'

interface OffscreenIndicator {
  id: string
  nombre: string
  categoria: MapCategory
  x: number
  y: number
  /** Degrees, pointing from the viewport centre toward the POI. */
  rotation: number
  edge: Edge
  /**
   * How far the chip sits from the arrow, in --u units. Along a top/bottom
   * edge it only has to clear the arrow; along a left/right edge it also has
   * to clear the viewport border, and the chip is as wide as it is tall times
   * several, so a bigger shift is the only thing keeping it on screen.
   */
  chipK: number
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
): { x: number; y: number; rotation: number; edge: Edge } {
  const dx = targetX - centerX
  const dy = targetY - centerY
  const angle = Math.atan2(dy, dx)

  // The POI is directly behind the centre (degenerate ray): push it up.
  if (dx === 0 && dy === 0) {
    return { x: centerX, y: margin, rotation: -90, edge: 'top' }
  }

  const halfWidth = Math.max(1, width / 2 - margin)
  const halfHeight = Math.max(1, height / 2 - margin)

  const cosA = Math.cos(angle)
  const sinA = Math.sin(angle)

  // Distance along the ray until it crosses the inset rect.
  const tx = cosA === 0 ? Infinity : halfWidth / Math.abs(cosA)
  const ty = sinA === 0 ? Infinity : halfHeight / Math.abs(sinA)
  const t = Math.min(tx, ty)

  // The edge is whichever boundary the ray hit first. It comes from the same
  // comparison, so it cannot disagree with the point we just computed.
  const edge: Edge = tx <= ty ? (cosA > 0 ? 'right' : 'left') : sinA > 0 ? 'bottom' : 'top'

  return {
    x: centerX + cosA * t,
    y: centerY + sinA * t,
    rotation: (angle * 180) / Math.PI,
    edge,
  }
}

/**
 * Slide pips along their edge until their chips stop overlapping.
 *
 * Without this, every POI that happens to lie in the same direction as another
 * lands on the same edge at nearly the same coordinate, and the chips pile up
 * into an unreadable stack — which is exactly what happened once four of the
 * six locations fell south of the viewport at once.
 *
 * `span` is the along-edge space one chip needs, so the pips end up evenly
 * distributed rather than merely not-touching.
 */
function spread(
  group: OffscreenIndicator[],
  span: number,
  width: number,
  height: number,
  margin: number,
): void {
  if (group.length === 0) return
  const horizontal = group[0].edge === 'top' || group[0].edge === 'bottom'
  const from = margin
  const to = (horizontal ? width : height) - margin

  group.sort((a, b) => (horizontal ? a.x - b.x : a.y - b.y))

  const gap = group.length > 1 ? (to - from) / (group.length - 1) : 0
  const step = Math.min(span, gap)

  // Walk forward from the first, then clamp. Starting from the first and
  // pushing forward keeps the pips in their original left-to-right order.
  for (let i = 1; i < group.length; i++) {
    const prev = group[i - 1]
    const current = group[i]
    if (horizontal) {
      if (current.x - prev.x < step) current.x = prev.x + step
    } else if (current.y - prev.y < step) {
      current.y = prev.y + step
    }
  }

  // The last one may now be past the end of the edge; walk back.
  const last = group[group.length - 1]
  const overshoot = horizontal ? last.x - to : last.y - to
  if (overshoot > 0) {
    for (let i = group.length - 1; i >= 0; i--) {
      const item = group[i]
      if (horizontal) item.x = Math.min(item.x - overshoot, to)
      else item.y = Math.min(item.y - overshoot, to)
    }
  }
}

function project(map: MapboxMap, location: MapLocation): { x: number; y: number } | null {
  try {
    const point = map.project([location.lng, location.lat])
    return { x: point.x, y: point.y }
  } catch {
    return null
  }
}

export function OffscreenPOIIndicators({
  map,
  onSelect,
}: {
  map: MapboxMap | null
  onSelect: (location: MapLocation) => void
}) {
  const [indicators, setIndicators] = useState<OffscreenIndicator[]>([])
  const frame = useRef<number | undefined>(undefined)

  useEffect(() => {
    if (!map) return

    const MARGIN = 22
    const CHIP_SPAN_U = 11

    const update = () => {
      const bounds = map.getContainer().getBoundingClientRect()
      if (bounds.width === 0 || bounds.height === 0) return

      const centerX = bounds.width / 2
      const centerY = bounds.height / 2
      const next: OffscreenIndicator[] = []

      // The chip is sized in --u, so read it back rather than hardcoding a
      // pixel width: otherwise the spacing and the chips drift apart the
      // moment the type scale changes.
      const unit = parseFloat(
        getComputedStyle(map.getContainer()).getPropertyValue('--u'),
      )
      const span = (Number.isFinite(unit) ? unit : 14) * CHIP_SPAN_U

      for (const location of MAP_LOCATIONS) {
        const p = project(map, location)
        if (!p) continue

        const inside =
          p.x >= 0 && p.x <= bounds.width && p.y >= 0 && p.y <= bounds.height
        if (inside) continue

        const { x, y, rotation, edge } = edgePoint(
          centerX,
          centerY,
          p.x,
          p.y,
          bounds.width,
          bounds.height,
          MARGIN,
        )

        next.push({
          id: location.id,
          nombre: location.nombre,
          categoria: location.categoria,
          x,
          y,
          rotation,
          edge,
          // On a left/right edge the chip would otherwise hang off the side of
          // the screen, because it is a wide horizontal box centred on a pip
          // that sits 22px from the border.
          chipK: edge === 'left' || edge === 'right' ? 7 : 1.6,
        })
      }

      // De-overlap per edge. Grouped first because two pips on opposite edges
      // never collide however close their coordinates are.
      const byEdge = new Map<Edge, OffscreenIndicator[]>()
      for (const indicator of next) {
        const group = byEdge.get(indicator.edge)
        if (group) group.push(indicator)
        else byEdge.set(indicator.edge, [indicator])
      }
      for (const group of byEdge.values()) {
        spread(group, span, bounds.width, bounds.height, MARGIN)
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

  // Each pip is a real button now, so the name is rendered as a chip and the
  // whole thing is reachable by keyboard. The container stays
  // pointer-events: none so the empty half of the map keeps panning; each pip
  // opts back in.
  return (
    <div className="offscreen">
      {indicators.map((indicator) => {
        const location = MAP_LOCATIONS.find((l) => l.id === indicator.id)
        if (!location) return null
        return (
          <button
            key={indicator.id}
            type="button"
            className="offscreen__pip"
            style={
              {
                '--x': `${indicator.x}px`,
                '--y': `${indicator.y}px`,
                '--angle': `${indicator.rotation}deg`,
                '--chip-k': String(indicator.chipK),
              } as CSSProperties
            }
            onClick={(event) => {
              event.stopPropagation()
              onSelect(location)
            }}
            aria-label={`Ver ficha de ${indicator.nombre}`}
          >
            <span className="offscreen__chip" aria-hidden="true">
              <svg
                className="offscreen__icon"
                viewBox="0 0 512 512"
                focusable="false"
              >
                <path d={CATEGORY_ICON_PATHS[indicator.categoria]} />
              </svg>
              <span className="offscreen__name">{indicator.nombre}</span>
            </span>
            <span className="offscreen__arrow" aria-hidden="true" />
          </button>
        )
      })}
    </div>
  )
}
