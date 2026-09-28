export type MapCategory = 'estudio' | 'trabajo'

export interface MapLocation {
  id: string
  nombre: string
  categoria: MapCategory
  /** West-East coordinate (required by Mapbox). */
  lng: number
  lat: number
  descripcion: string
}

/**
 * Category glyphs as path data on a 512x512 grid.
 *
 * These used to be `?raw` imports of the .svg files. A `?raw` import is a
 * *string*, and interpolating a string in JSX produces a text node: the
 * location panel was literally printing "<svg" instead of a briefcase. It
 * only worked in Map.tsx because that one builds DOM with innerHTML.
 *
 * Holding the `d` here keeps one copy for both the panel (rendered as real
 * SVG) and the markers (injected via innerHTML), and lets the fill come from
 * `currentColor` instead of being baked to #000 in the asset.
 */
export const CATEGORY_ICON_PATHS: Record<MapCategory, string> = {
  estudio:
    'M256 89.61 22.486 177.18 256 293.937l111.22-55.61-104.337-31.9A16 16 0 0 1 256 208a16 16 0 0 1-16-16 16 16 0 0 1 16-16l-2.646 8.602 18.537 5.703a16 16 0 0 1 .008.056l27.354 8.365L455 246.645v12.146a16 16 0 0 0-7 13.21 16 16 0 0 0 7.293 13.406C448.01 312.932 448 375.383 448 400c16 10.395 16 10.775 32 0 0-24.614-.008-87.053-7.29-114.584A16 16 0 0 0 480 272a16 16 0 0 0-7-13.227v-25.42L413.676 215.1l75.838-37.92L256 89.61zM119.623 249 106.5 327.74c26.175 3.423 57.486 18.637 86.27 36.627 16.37 10.232 31.703 21.463 44.156 32.36 7.612 6.66 13.977 13.05 19.074 19.337 5.097-6.288 11.462-12.677 19.074-19.337 12.453-10.897 27.785-22.128 44.156-32.36 28.784-17.99 60.095-33.204 86.27-36.627L392.375 249h-6.25L256 314.063 125.873 249h-6.25z',
  trabajo:
    'M224.05 95.703c-7.08-.04-11.694 4.704-14.484 8.793-2.79 4.09-4.604 8.582-6.086 12.932-1.16 3.41-2.072 6.75-2.76 9.572h18.63c.357-1.242.74-2.505 1.17-3.77 1.185-3.48 2.706-6.816 3.916-8.59.498-.73.652-.846.712-.93l61.676.337c.063.084.25.225.764.97 1.208 1.755 2.72 5.04 3.904 8.467.407 1.18.768 2.356 1.11 3.516h18.656c-.69-2.773-1.597-6.045-2.75-9.387-1.484-4.3-3.304-8.75-6.096-12.804-2.792-4.055-7.357-8.72-14.363-8.757l-64-.35zM96 145c-5 0-11.05 2.777-15.637 7.363C75.777 156.95 73 163 73 168v21.275L132.816 279h12.758v-16h50v16H311v-16h50v16h18.184L439 189.275V168c0-5-2.777-11.05-7.363-15.637C427.05 147.777 421 145 416 145H96zm-23 76.725V376c0 5 2.777 11.05 7.363 15.637C84.95 396.223 91 399 96 399h320c5 0 11.05-2.777 15.637-7.363C436.223 387.05 439 381 439 376V221.725L388.816 297H361v41.188h-50V297H195.574v41.188h-50V297h-22.39L73 221.725zM163.574 281v39.188h14V281h-14zM329 281v39.188h14V281h-14z',
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