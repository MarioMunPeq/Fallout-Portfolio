import { createContext, useContext } from 'react'
import type { RefObject } from 'react'
import type { RadioStation, RadioTrack } from './radioStations'

export interface RadioContextValue {
  stations: readonly RadioStation[]
  station: RadioStation
  stationIndex: number
  track: RadioTrack | undefined
  trackIndex: number
  trackCount: number
  /** The station is on air, regardless of whether it has anything to play. */
  hasSignal: boolean
  /** …and whether it has a playlist at all. The band currently has none. */
  hasProgramme: boolean

  volume: number
  radioOn: boolean
  isPlaying: boolean
  currentTime: number
  duration: number
  tuning: boolean
  /** Sweeping readout shown while the dial is moving. */
  scanFrequency: number

  /** Live signal strength, 0-1. Falls to noise while tuning. */
  signal: number

  audioRef: RefObject<HTMLAudioElement | null>

  tuneTo: (index: number) => void
  tuneBy: (direction: -1 | 1) => void
  changeTrack: (direction: -1 | 1) => void
  selectTrack: (index: number) => void
  togglePower: () => void
  seek: (seconds: number) => void
  changeVolume: (value: number) => void
}

export const RadioContext = createContext<RadioContextValue | null>(null)

export function useRadio(): RadioContextValue {
  const ctx = useContext(RadioContext)
  if (!ctx) throw new Error('useRadio must be used within RadioProvider')
  return ctx
}
