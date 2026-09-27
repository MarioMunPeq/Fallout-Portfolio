import { useCallback, useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import type { Map as MapboxMap, Marker } from 'mapbox-gl'
import { MAP_CENTER, MAP_LOCATIONS } from '../../../data/mapLocations'
import type { MapCategory, MapLocation } from '../../../data/mapLocations'
import { LocationPanel } from './LocationPanel'
import { OffscreenPOIIndicators } from './OffscreenPOIIndicators'
import studyIcon from '../../../assets/icons/map/graduate-cap.svg?raw'
import workIcon from '../../../assets/icons/map/briefcase.svg?raw'
import clickSfx from '../../../assets/sfx/mechanical-click.wav'
import { playSfx } from '../../../utils/sfx'
import './Map.css'

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined
const MAPBOX_STYLE_URL = import.meta.env.VITE_MAPBOX_STYLE_URL as string | undefined

const MAP_ZOOM = { min: 11, max: 17 } as const

const CATEGORY_ICONS: Record<MapCategory, string> = {
  estudio: studyIcon,
  trabajo: workIcon,
}

const CATEGORY_LABEL: Record<MapCategory, string> = {
  estudio: 'ESTUDIO',
  trabajo: 'TRABAJO',
}

/** Build a marker element. Kept as DOM (not React) because Mapbox owns it. */
function markerHtml(location: MapLocation): HTMLButtonElement {
  const wrapper = document.createElement('button')
  wrapper.type = 'button'
  wrapper.className = 'map-marker'
  wrapper.setAttribute('aria-label', `${location.nombre} — ${CATEGORY_LABEL[location.categoria]}`)
  wrapper.innerHTML = `
    <span class="map-marker__head">
      <span class="map-marker__icon">${CATEGORY_ICONS[location.categoria]}</span>
    </span>
    <span class="map-marker__stem" aria-hidden="true"></span>
    <span class="map-marker__label" aria-hidden="true">${location.nombre}</span>
  `
  return wrapper
}

export function Map() {
  const containerRef = useRef<HTMLDivElement>(null)
  const markersRef = useRef<Marker[]>([])
  const [mapInstance, setMapInstance] = useState<MapboxMap | null>(null)
  const [selected, setSelected] = useState<MapLocation | null>(null)
  const [zoom, setZoom] = useState(15)
  const [cursor, setCursor] = useState<{ lng: number; lat: number } | null>(null)
  const [mapFailed, setMapFailed] = useState(false)

  const configured = Boolean(MAPBOX_TOKEN && MAPBOX_STYLE_URL)

  useEffect(() => {
    if (!configured) return
    const container = containerRef.current
    if (!container) return

    mapboxgl.accessToken = MAPBOX_TOKEN as string

    const map = new mapboxgl.Map({
      container,
      style: MAPBOX_STYLE_URL as string,
      center: MAP_CENTER,
      zoom: 15,
      // Top-down only: the Pip-Boy map is a flat tactical chart, never a 3D
      // camera. pitch/bearing and rotation gestures stay off.
      pitch: 0,
      bearing: 0,
      pitchWithRotate: false,
      dragRotate: false,
      touchPitch: false,
      dragPan: true,
      // Zoom is enabled. Markers are Mapbox-managed DOM, so they stay locked
      // to their coordinate at every zoom level; the earlier "misalignment"
      // was the off-screen indicator maths, not the markers.
      scrollZoom: true,
      boxZoom: false,
      doubleClickZoom: false,
      touchZoomRotate: false,
      minZoom: MAP_ZOOM.min,
      maxZoom: MAP_ZOOM.max,
      // Mapbox's ToS requires the logo and attribution to stay visible, so
      // both are kept and restyled in Map.css rather than hidden. The logo
      // moves to the bottom-right so it can't collide with the info panel.
      logoPosition: 'bottom-right',
      attributionControl: false,
    })

    // Added explicitly in compact form: a single ⓘ toggle instead of a bar
    // of attribution text across the bottom of the map. Grouped with the logo
    // in the bottom-right so the whole legal chrome lives in one corner and
    // the bottom-left stays free for the location panel.
    map.addControl(
      new mapboxgl.AttributionControl({ compact: true }),
      'bottom-right',
    )

    markersRef.current = MAP_LOCATIONS.map((location) => {
      const element = markerHtml(location)
      element.addEventListener('click', (event) => {
        event.stopPropagation()
        setSelected(location)
        playSfx(clickSfx)
      })
      return new mapboxgl.Marker({ element, anchor: 'bottom' })
        .setLngLat([location.lng, location.lat])
        .addTo(map)
    })

    const syncZoom = () => setZoom(map.getZoom())
    map.on('move', syncZoom)
    map.on('zoom', syncZoom)
    setZoom(map.getZoom())

    map.on('mousemove', (event) => {
      setCursor({ lng: event.lngLat.lng, lat: event.lngLat.lat })
    })
    map.on('mouseout', () => setCursor(null))

    // Clicking empty map clears the selection, like closing a panel.
    map.on('click', () => setSelected(null))

    setMapInstance(map)

    // A failed style or a dead token used to leave a silently black screen.
    // Surface it instead.
    const onError = (event: { error?: Error }) => {
      console.error('[map]', event?.error ?? event)
      setMapFailed(true)
    }
    map.on('error', onError)

    return () => {
      markersRef.current = []
      map.off('error', onError)
      map.remove()
      setMapInstance(null)
      setMapFailed(false)
    }
  }, [configured])

  const nudgeZoom = useCallback(
    (delta: number) => {
      const map = mapInstance
      if (!map) return
      map.easeTo({ zoom: map.getZoom() + delta, duration: 260 })
      playSfx(clickSfx)
    },
    [mapInstance],
  )

  const recenter = useCallback(() => {
    const map = mapInstance
    if (!map) return
    map.easeTo({ center: MAP_CENTER, zoom: 15, duration: 500 })
    setSelected(null)
    playSfx(clickSfx)
  }, [mapInstance])

  const focusLocation = useCallback(
    (location: MapLocation) => {
      mapInstance?.easeTo({ center: [location.lng, location.lat], duration: 420 })
    },
    [mapInstance],
  )

  if (!configured || mapFailed) {
    return (
      <div className="map map--status">
        <p className="map__status-title pip-blink">SEÑAL GPS NO DISPONIBLE</p>
        <p className="map__status-sub">
          {configured
            ? 'EL ESTILO DEL MAPA NO SE HA PODIDO CARGAR. REVISA VITE_MAPBOX_STYLE_URL Y QUE EL TOKEN SIGA SIENDO VÁLIDO.'
            : 'CONFIGURA VITE_MAPBOX_TOKEN Y VITE_MAPBOX_STYLE_URL EN TU .env'}
        </p>
      </div>
    )
  }

  return (
    // The mapbox container is this element itself, exactly as it was before:
    // splitting the canvas into a child div left the map with no laid-out box
    // and it rendered nothing. The overlays are siblings that Mapbox never
    // touches, so they can't be clobbered by a map re-render.
    <div ref={containerRef} className="map">
      <div className="map__reticle" aria-hidden="true" />

      <OffscreenPOIIndicators map={mapInstance} />

      <div className="map__hud">
        <div className="map__hud-row">
          <span className="map__hud-label">VALLADOLID</span>
          <span className="map__hud-value">N {MAP_CENTER[1].toFixed(4)}</span>
        </div>
        <div className="map__hud-row">
          <span className="map__hud-label">VISOR</span>
          <span className="map__hud-value">
            {cursor
              ? `E ${cursor.lng.toFixed(4)}  N ${cursor.lat.toFixed(4)}`
              : '— — — —'}
          </span>
        </div>
        <div className="map__hud-row">
          <span className="map__hud-label">ZOOM</span>
          <span className="map__hud-value">{zoom.toFixed(1)}</span>
        </div>
      </div>

      <div className="map__controls">
        <button
          type="button"
          className="pip-btn"
          onClick={() => nudgeZoom(1)}
          disabled={zoom >= MAP_ZOOM.max}
          aria-label="Acercar"
        >
          +
        </button>
        <button
          type="button"
          className="pip-btn"
          onClick={() => nudgeZoom(-1)}
          disabled={zoom <= MAP_ZOOM.min}
          aria-label="Alejar"
        >
          −
        </button>
        <button
          type="button"
          className="pip-btn"
          onClick={recenter}
          aria-label="Centrar mapa"
        >
          ⌖
        </button>
      </div>

      {selected && (
        <LocationPanel
          location={selected}
          onClose={() => setSelected(null)}
          onFocus={() => focusLocation(selected)}
        />
      )}
    </div>
  )
}
