export interface RadioTrack {
  url: string
  name: string
  artist: string
}

export interface RadioStation {
  id: string
  name: string
  tagline: string
  /** MHz, as a number so the dial can interpolate between stations. */
  frequency: number
  /** 0-1. Drives the signal-strength meter. Zero means a dead frequency. */
  strength: number
  tracks: readonly RadioTrack[]
}

/**
 * The one and only audio folder: `src/assets/audio/radio/`. There is no
 * per-station folder any more — the band used to be split into `estacion-1`
 * and `estacion-2`, one per project, which meant the module advertised a
 * different station for every project in the portfolio. Everything in here
 * now belongs to RADIO YERMO; the other station stays silent.
 *
 * `import.meta.glob` is resolved at build time and BOTH arguments must be
 * literals: the pattern cannot be a variable or template literal, and the
 * options object cannot be a shared identifier. The pattern is written out in
 * full at the call site.
 *
 * Extensions are listed case-insensitively so dropping `Song.Mp3` or
 * `Track.Ogg` into the folder works instead of silently yielding nothing.
 */
function listTracks(): readonly RadioTrack[] {
  const modules = import.meta.glob<string>(
    '../../../assets/audio/radio/*.{mp3,MP3,Mp3,m4a,M4A,M4a,ogg,OGG,Ogg,wav,WAV,Wav,flac,FLAC,Flac}',
    { eager: true, query: '?url', import: 'default' },
  )

  return Object.entries(modules)
    .map(([path, url]) => {
      const file = path.split('/').pop() ?? path
      const stem = file.replace(/\.[^.]+$/, '').replaceAll('_', ' ').trim()
      /* "Title - Artist" is the drop-in convention — "Big Iron - Marty
         Robbins.mp3" — and it is read in that order. It used to be parsed the
         other way round, which put the song title on the small line and the
         artist on the big one, and mislabelled "Maybe - Ink Spots" as an
         artist called Maybe. Anything without the separator is a title on its
         own. */
      const [maybeTitle, ...rest] = stem.split(' - ')
      const hasArtist = rest.length > 0 && maybeTitle.length <= 40
      return {
        url,
        name: hasArtist ? maybeTitle.trim() : stem,
        artist: hasArtist ? rest.join(' - ').trim() : 'SEÑAL DESCONOCIDA',
      }
    })
    .sort((a, b) =>
      a.name.localeCompare(b.name, 'es', { numeric: true, sensitivity: 'base' }),
    )
}

/** The FM band the dial sweeps, in MHz. */
export const BAND = { min: 88, max: 108 } as const

export const RADIO_STATIONS: readonly RadioStation[] = [
  {
    id: 'yer-mo',
    name: 'RADIO YERMO',
    tagline: 'LA SEÑAL DEL DESIERTO',
    frequency: 96.2,
    strength: 0.92,
    // The one station with a programme: everything in the single folder.
    tracks: listTracks(),
  },
  {
    // Live on the dial, tuned and metered like the rest, but it carries no
    // music at all. That is what makes the pair read as a band rather than a
    // one-item list.
    id: 're-fu',
    name: 'ONDA REFUGIO',
    tagline: 'LA VOZ DE LOS QUE QUEDAN',
    frequency: 104,
    strength: 0.61,
    tracks: [],
  },
  {
    // A dead frequency. Having one on the dial is what makes the tuner feel
    // like a real band sweep instead of a two-item list.
    id: 'silencio',
    name: '— — —',
    tagline: 'SIN EMISIÓN',
    frequency: 99.4,
    strength: 0,
    tracks: [],
  },
]

/**
 * Survives tab switches: the provider wraps the whole app, so station and
 * volume persist without remounting. The radio deliberately keeps playing
 * when you navigate away, like the one in the game.
 */
export const radioSession = {
  stationIndex: 0,
  volume: 70,
}
