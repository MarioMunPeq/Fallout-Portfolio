export type MapCategory = 'estudio' | 'trabajo'

export interface MapLocation {
  id: string
  nombre: string
  categoria: MapCategory
  /** West-East coordinate (required by Mapbox). */
  lng: number
  /** North-South coordinate. */
  lat: number
  descripcion: string
}

/**
 * Ubicaciones reales obtenidas vía Mapbox Geocoding API (todas en Valladolid).
 */
/** Centro inicial del mapa: [lng, lat] (Valladolid, España). */
export const MAP_CENTER: [number, number] = [-4.7245, 41.6523]

export const MAP_LOCATIONS: readonly MapLocation[] = [
  {
    id: 'ies-la-merced',
    nombre: 'IES LA MERCED',
    categoria: 'estudio',
    lng: -4.719336,
    lat: 41.649411,
    descripcion: 'Grado Medio en Telecomunicaciones.',
  },
  {
    id: 'ies-galileo',
    nombre: 'IES GALILEO',
    categoria: 'estudio',
    lng: -4.702786,
    lat: 41.647369,
    descripcion:
      'Grado Superior en Robótica (Automatización y Robótica Industrial).',
  },
  {
    id: 'ies-julian-marias',
    nombre: 'IES JULIÁN MARÍAS',
    categoria: 'estudio',
    lng: -4.758619,
    lat: 41.632183,
    descripcion:
      'Grado Superior en Desarrollo de Aplicaciones Multiplataforma (DAM).',
  },
  {
    id: 'synersight',
    nombre: 'SYNERSIGHT',
    categoria: 'trabajo',
    lng: -4.699256,
    lat: 41.607726,
    descripcion: 'Prácticas de Robótica.',
  },
  {
    id: 'michelin',
    nombre: 'MICHELIN',
    categoria: 'trabajo',
    lng: -4.716901,
    lat: 41.675412,
    descripcion: 'Prácticas de DAM.',
  },
  {
    id: 'diputacion-valladolid',
    nombre: 'DIPUTACIÓN DE VALLADOLID',
    categoria: 'trabajo',
    lng: -4.719092,
    lat: 41.654628,
    descripcion: 'Desarrollador web — Feb 2026 a Sep 2026.',
  },
]