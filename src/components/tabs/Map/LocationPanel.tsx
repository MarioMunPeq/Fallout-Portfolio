import type { MapCategory, MapLocation } from '../../../data/mapLocations'
import { CATEGORY_ICON_PATHS } from '../../../data/mapLocations'
import './LocationPanel.css'

const CATEGORY_LABEL: Record<MapCategory, string> = {
  estudio: 'EDUCACIÓN',
  trabajo: 'EMPLEO',
}

/**
 * Rendered as a real SVG element. See CATEGORY_ICON_PATHS for why the
 * ?raw import had to go: it was a string, and a string in JSX is a text node,
 * so the panel was printing the markup literally.
 */
function CategoryIcon({ categoria }: { categoria: MapCategory }) {
  return (
    <svg viewBox="0 0 512 512" aria-hidden="true" focusable="false">
      <path d={CATEGORY_ICON_PATHS[categoria]} />
    </svg>
  )
}

interface LocationPanelProps {
  location: MapLocation
  onClose: () => void
  /** Re-centres the camera on this location. */
  onFocus?: () => void
}

export function LocationPanel({ location, onClose, onFocus }: LocationPanelProps) {
  return (
    <aside
      className="locpanel pip-panel"
      role="dialog"
      aria-label={`Ubicación: ${location.nombre}`}
    >
      <header className="locpanel__head">
        <span className="pip-label">LOCATION DATA</span>
        <button
          type="button"
          className="locpanel__close"
          onClick={onClose}
          aria-label="Cerrar panel de ubicación"
        >
          ✕
        </button>
      </header>

      <div className="locpanel__title">
        <span className="locpanel__icon" aria-hidden="true">
          <CategoryIcon categoria={location.categoria} />
        </span>
        <h2 className="locpanel__name">{location.nombre}</h2>
      </div>

      <dl className="locpanel__meta">
        <div>
          <dt className="pip-label">CLASIF.</dt>
          <dd>{CATEGORY_LABEL[location.categoria]}</dd>
        </div>
        <div>
          <dt className="pip-label">ESTADO</dt>
          <dd>ARCHIVADO</dd>
        </div>
        <div>
          <dt className="pip-label">COORD.</dt>
          <dd>
            {location.lat.toFixed(4)} N
            <br />
            {Math.abs(location.lng).toFixed(4)} O
          </dd>
        </div>
      </dl>

      <p className="locpanel__desc">{location.descripcion}</p>

      {onFocus && (
        <button type="button" className="pip-btn locpanel__focus" onClick={onFocus}>
          CENTRAR VISTA
        </button>
      )}
    </aside>
  )
}
