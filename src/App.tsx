import { useCallback, useEffect, useRef, useState } from 'react'
import { BootSequence } from './components/BootSequence/BootSequence'
import { Device } from './components/Device/Device'
import { Screen } from './components/Screen/Screen'
import { StatusBar } from './components/StatusBar/StatusBar'
import { Stat } from './components/tabs/Stat/Stat'
import { Misiones } from './components/tabs/Misiones/Misiones'
import { Data } from './components/tabs/Data/Data'
import { Radio } from './components/tabs/Radio/Radio'
import { RadioProvider } from './components/tabs/Radio/RadioProvider'
import { useRadio } from './components/tabs/Radio/radioContext'
import { Map } from './components/tabs/Map/Map'
import { HackView } from './components/tabs/Hack/HackView'
import { useActiveTab } from './hooks/useActiveTab'
import type { TabId } from './hooks/useActiveTab'
import { OPERATOR, SPECIAL_STATS } from './data/operator'
import type { StatId } from './data/operator'
import { BAND } from './components/tabs/Radio/radioStations'
import { playSfx } from './utils/sfx'
import './App.css'

import bootSequenceSfx from './assets/sfx/UI_PipBoy_BootSequence_C.ogg'
import bootOkSfx from './assets/sfx/UI_Pipboy_OK.ogg'
import powerOnSfx from './assets/sfx/crt-on.wav'
import powerOffSfx from './assets/sfx/toggle-switch.mp3'
import clickSfx from './assets/sfx/mechanical-click.wav'
import bootFrame1 from './assets/images/boot/1.png'
import bootFrame2 from './assets/images/boot/2.png'
import bootFrame3 from './assets/images/boot/3.png'
import bootFrame4 from './assets/images/boot/4.png'
import bootFrame5 from './assets/images/boot/5.png'
import bootFrame6 from './assets/images/boot/6.png'
import bootFrame7 from './assets/images/boot/7.png'
import bootFrame8 from './assets/images/boot/8.png'

const BOOT_FRAMES = [
  bootFrame1,
  bootFrame2,
  bootFrame3,
  bootFrame4,
  bootFrame5,
  bootFrame6,
  bootFrame7,
  bootFrame8,
]

/** How long the CRT interference burst runs when the module changes. */
const GLITCH_MS = 190

/**
 * The radio provider wraps the whole app so audio survives tab switches, which
 * means the HUD has to live *inside* it to read the now-playing state.
 */
function App() {
  return (
    <RadioProvider>
      <Hud />
    </RadioProvider>
  )
}

function Hud() {
  const radio = useRadio()
  const { tabs, activeTab, setActiveTab } = useActiveTab()
  const [booted, setBooted] = useState(false)
  const [powered, setPowered] = useState(true)
  const [turnOn, setTurnOn] = useState(false)
  const [turnOff, setTurnOff] = useState(false)
  const [glitch, setGlitch] = useState(0)
  const [radStat, setRadStat] = useState<StatId>('INT')
  const glitchTimer = useRef<number | undefined>(undefined)

  useEffect(() => {
    playSfx(bootSequenceSfx)
  }, [])

  useEffect(() => {
    if (booted) playSfx(bootOkSfx)
  }, [booted])

  // Tab changes get a brief RGB-split interference burst. The class has to be
  // removed between triggers or the one-shot animation won't replay.
  const handleSelect = useCallback(
    (tab: TabId) => {
      if (tab === activeTab) return
      setActiveTab(tab)
      setGlitch((n) => n + 1)
      window.clearTimeout(glitchTimer.current)
      glitchTimer.current = window.setTimeout(() => setGlitch(0), GLITCH_MS)
    },
    [activeTab, setActiveTab],
  )

  useEffect(() => () => window.clearTimeout(glitchTimer.current), [])

  const handleBootComplete = useCallback(() => {
    setBooted(true)
    setTurnOn(true)
    window.setTimeout(() => setTurnOn(false), 640)
  }, [])

  const togglePower = useCallback(() => {
    setPowered((on) => {
      if (on) {
        playSfx(powerOffSfx)
        setTurnOff(true)
        window.setTimeout(() => {
          setTurnOff(false)
          setTurnOn(true)
        }, 460)
      } else {
        playSfx(powerOnSfx)
        setTurnOn(true)
        window.setTimeout(() => setTurnOn(false), 640)
      }
      return !on
    })
  }, [])

  /* ---- Live case controls ------------------------------------------------ */

  const handleTune = useCallback(
    (value: number) => {
      // The knob sweeps the band; land on whichever station is nearest.
      const freq = BAND.min + value * (BAND.max - BAND.min)
      let best = 0
      let bestDelta = Infinity
      radio.stations.forEach((station, index) => {
        const delta = Math.abs(station.frequency - freq)
        if (delta < bestDelta) {
          bestDelta = delta
          best = index
        }
      })
      if (best !== radio.stationIndex) {
        radio.tuneTo(best)
        playSfx(clickSfx)
      }
    },
    [radio],
  )

  const handleStat = useCallback((id: string) => {
    setRadStat(id as StatId)
    playSfx(clickSfx)
  }, [])

  // Knob position reflects the tuned station.
  const tuneValue =
    (radio.station.frequency - BAND.min) / (BAND.max - BAND.min)

  return (
    <Device
      tabs={tabs}
      activeTab={activeTab}
      onSelectTab={(tab) => handleSelect(tab as TabId)}
      stats={SPECIAL_STATS.map((s) => ({ id: s.id, value: s.value }))}
      activeStat={radStat}
      onSelectStat={handleStat}
      tune={Math.max(0, Math.min(1, tuneValue))}
      onTune={handleTune}
      tuneLabel={`${radio.station.frequency.toFixed(1)} MHz`}
      powered={powered}
      onPowerToggle={togglePower}
    >
      <Screen
        turnOn={turnOn}
        turnOff={turnOff}
        off={!powered}
        glitchKey={glitch || undefined}
      >
        {!booted ? (
          <BootSequence
            frames={BOOT_FRAMES}
            frameIntervalMs={150}
            durationMs={4200}
            onBootComplete={handleBootComplete}
          />
        ) : (
          <div className="pip-screen">
            {/* No on-screen tab bar: the module labels live on the case. */}

            <div className="pip-body">
              {activeTab === 'STAT' ? (
                <Stat selectedStat={radStat} onSelectStat={setRadStat} />
              ) : activeTab === 'MISIONES' ? (
                <Misiones />
              ) : activeTab === 'DATA' ? (
                <Data />
              ) : activeTab === 'RADIO' ? (
                <Radio />
              ) : activeTab === 'MAP' ? (
                <Map />
              ) : activeTab === 'HACK' ? (
                <HackView />
              ) : (
                <div className="placeholder">
                  <p className="placeholder__title">{activeTab}</p>
                  <p className="placeholder__subtitle">MÓDULO EN CONSTRUCCIÓN</p>
                </div>
              )}
            </div>

            <StatusBar
              hp={OPERATOR.hp}
              hpMax={OPERATOR.hpMax}
              level={OPERATOR.level}
              xp={OPERATOR.xp}
              xpForNext={OPERATOR.xpForNext}
              ap={OPERATOR.ap}
              apMax={OPERATOR.apMax}
              slot={
                radio.isPlaying ? (
                  <span className="hud__radio">
                    <span className="hud__radio-bars" aria-hidden="true">
                      <i />
                      <i />
                      <i />
                    </span>
                    {radio.station.name} · {radio.track?.name}
                  </span>
                ) : (
                  <span>{activeTab}</span>
                )
              }
            />
          </div>
        )}
      </Screen>
    </Device>
  )
}

export default App
