import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { playSfx } from '../../../utils/sfx'
import clickSfx from '../../../assets/sfx/mechanical-click.wav'
import tuneSfx from '../../../assets/sfx/electric-hum.wav'
import { RADIO_STATIONS, radioSession, BAND } from './radioStations'
import { RadioContext } from './radioContext'
import type { RadioContextValue } from './radioContext'

/** How long the dial takes to settle on a new frequency. */
const TUNE_MS = 750
/** Rewind threshold: below this, "previous" restarts the track. */
const RESTART_BEFORE = 3

export function RadioProvider({ children }: { children: ReactNode }) {
  const [stationIndex, setStationIndex] = useState(radioSession.stationIndex)
  const [trackIndex, setTrackIndex] = useState(0)
  const [volume, setVolume] = useState(radioSession.volume)
  const [radioOn, setRadioOn] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [tuning, setTuning] = useState(false)
  const [scanFrequency, setScanFrequency] = useState<number>(BAND.min)

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const tuneTimer = useRef<number | undefined>(undefined)

  const station = RADIO_STATIONS[stationIndex] ?? RADIO_STATIONS[0]
  const track = station.tracks[trackIndex] ?? station.tracks[0]
  // Signal is a property of the frequency, not of whether the station happens
  // to have a playlist. The band plays nothing, so deriving this from
  // `tracks.length` left every station reading as a dead one.
  const hasSignal = station.strength > 0
  const hasProgramme = station.tracks.length > 0

  // Playback follows (track, radioOn). Volume is applied imperatively in
  // changeVolume so dragging the slider doesn't restart playback.
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    if (radioOn && track) {
      audio.volume = volume / 100
      audio
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false))
    } else {
      audio.pause()
    }
  }, [track, radioOn, volume])

  // The dial sweep: the readout races across the band while tuning.
  useEffect(() => {
    if (!tuning) return
    const id = window.setInterval(() => {
      setScanFrequency((v) => (v >= BAND.max ? BAND.min : v + 0.4))
    }, 40)
    return () => window.clearInterval(id)
  }, [tuning])

  useEffect(() => () => window.clearTimeout(tuneTimer.current), [])

  const tuneTo = useCallback(
    (target: number) => {
      if (tuning) return
      const wrapped = (target + RADIO_STATIONS.length) % RADIO_STATIONS.length

      playSfx(clickSfx)
      audioRef.current?.pause()

      // Retuning the station you're already on still gives the click + sweep
      // feedback, instead of silently doing nothing.
      setTuning(true)
      setScanFrequency(BAND.min)
      playSfx(tuneSfx)

      window.clearTimeout(tuneTimer.current)
      tuneTimer.current = window.setTimeout(() => {
        radioSession.stationIndex = wrapped
        setStationIndex(wrapped)
        setTrackIndex(0)
        setCurrentTime(0)
        setDuration(0)
        setTuning(false)
      }, TUNE_MS)
    },
    [tuning],
  )

  const tuneBy = useCallback(
    (direction: -1 | 1) => tuneTo(stationIndex + direction),
    [tuneTo, stationIndex],
  )

  const seek = useCallback((seconds: number) => {
    const audio = audioRef.current
    if (!audio || !Number.isFinite(seconds)) return
    audio.currentTime = Math.max(0, seconds)
    setCurrentTime(audio.currentTime)
  }, [])

  const changeTrack = useCallback(
    (direction: -1 | 1) => {
      const count = station.tracks.length
      if (count === 0) return

      // Going "previous" more than a few seconds in restarts the track, the
      // way a tape deck does. It used to jump to the end of the queue.
      if (direction === -1 && currentTime > RESTART_BEFORE) {
        seek(0)
        return
      }

      playSfx(clickSfx)
      setTrackIndex((index) => {
        const next = index + direction
        if (next < 0) return count - 1
        if (next >= count) return 0
        return next
      })
      setCurrentTime(0)
    },
    [station.tracks.length, currentTime, seek],
  )

  const selectTrack = useCallback(
    (index: number) => {
      if (index < 0 || index >= station.tracks.length) return
      playSfx(clickSfx)
      setTrackIndex(index)
      setCurrentTime(0)
    },
    [station.tracks.length],
  )

  const togglePower = useCallback(() => {
    playSfx(clickSfx)
    setRadioOn((value) => !value)
  }, [])

  const changeVolume = useCallback((value: number) => {
    const clamped = Math.min(100, Math.max(0, value))
    radioSession.volume = clamped
    setVolume(clamped)
    const audio = audioRef.current
    if (audio) audio.volume = clamped / 100
  }, [])

  // Signal strength: the meter's full height once the programme is playing,
  // half of it while merely tuned, and noise while the dial is moving. Rises
  // smoothly so the meter needle doesn't snap.
  const targetSignal = tuning ? 0.08 : hasSignal ? station.strength : 0
  const [signal, setSignal] = useState(0)

  useEffect(() => {
    const ceiling = targetSignal * (isPlaying ? 1 : 0.55)
    const id = window.setInterval(() => {
      setSignal((current) => {
        if (current < ceiling) return Math.min(ceiling, current + 0.05)
        if (current > ceiling) return Math.max(ceiling, current - 0.08)
        return current
      })
    }, 60)
    return () => window.clearInterval(id)
  }, [targetSignal, isPlaying])

  const value: RadioContextValue = {
    stations: RADIO_STATIONS,
    station,
    stationIndex,
    track,
    trackIndex,
    trackCount: station.tracks.length,
    hasSignal,
    hasProgramme,
    volume,
    radioOn,
    isPlaying,
    currentTime,
    duration,
    tuning,
    scanFrequency,
    signal,
    audioRef,
    tuneTo,
    tuneBy,
    changeTrack,
    selectTrack,
    togglePower,
    seek,
    changeVolume,
  }

  return (
    <RadioContext.Provider value={value}>
      {children}
      <audio
        ref={audioRef}
        src={track?.url}
        preload="none"
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => {
          const d = e.currentTarget.duration
          setDuration(Number.isFinite(d) ? d : 0)
        }}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        // Auto-advance wraps the station like a real broadcast schedule.
        onEnded={() => changeTrack(1)}
        onError={() => setIsPlaying(false)}
      />
    </RadioContext.Provider>
  )
}
