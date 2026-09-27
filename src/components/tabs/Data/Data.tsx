import { useEffect, useRef, useState } from 'react'
import { TabNav } from '../../TabNav/TabNav'
import submoduleChangeSfx from '../../../assets/sfx/submodule_change.ogg'
import selectSfx from '../../../assets/sfx/dial_move.ogg'
import { DATA_SECTIONS } from './dataSections'
import type { DataEntry, DataSectionId } from './dataSections'
import { playSfx } from '../../../utils/sfx'
import './Data.css'

const SUB_TABS = DATA_SECTIONS.map((s) => s.id)

export function Data() {
  const [sectionTab, setSectionTab] = useState<DataSectionId>('ABOUT')
  const [selectedId, setSelectedId] = useState<string>(
    () => DATA_SECTIONS[0].entries[0].id,
  )

  const section =
    DATA_SECTIONS.find((s) => s.id === sectionTab) ?? DATA_SECTIONS[0]
  const entries = section.entries
  const selected = entries.find((e) => e.id === selectedId) ?? entries[0]
  const index = entries.indexOf(selected)

  // Byte count has to include the newlines, otherwise "TAM" under-reports by
  // exactly (lines - 1).
  const bodyText = selected.lines.join('\n')

  const handleSelectSection = (tab: DataSectionId) => {
    setSectionTab(tab)
    const next = DATA_SECTIONS.find((s) => s.id === tab)
    setSelectedId(next?.entries[0]?.id ?? '')
  }

  return (
    <div className="data">
      <TabNav
        tabs={SUB_TABS}
        activeTab={sectionTab}
        onSelect={handleSelectSection}
        label="Secciones de datos"
        confirmSfx={submoduleChangeSfx}
        variant="secondary"
      />

      <div className="data__body">
        <nav className="register" aria-label={`Registros de ${section.label}`}>
          <p className="register__path">{section.path}</p>

          <ul className="register__list pip-scroll">
            {entries.map((entry, i) => (
              <li key={entry.id}>
                <button
                  type="button"
                  className="register-row"
                  aria-selected={entry.id === selected.id}
                  onClick={() => {
                    if (entry.id === selected.id) return
                    setSelectedId(entry.id)
                    playSfx(selectSfx)
                  }}
                >
                  <span className="register-row__addr">{hexAddr(i)}</span>
                  <span className="register-row__mark" aria-hidden="true">
                    &gt;
                  </span>
                  <span className="register-row__name">{entry.name}</span>
                </button>
              </li>
            ))}
          </ul>

          <p className="register__footer">REGISTROS: {entries.length}</p>
        </nav>

        <section className="viewer">
          <header className="viewer__head">
            <span className="viewer__file">
              {hexAddr(index)}▸ {selected.name}
            </span>
            <span className="viewer__meta">
              ENTRADA {index + 1}/{entries.length} · TAM {bodyText.length}B
            </span>
          </header>

          {/* aria-live is deliberately off: the typewriter mutates this subtree
              ~150 times, which would spam a screen reader with partial text. */}
          <div className="viewer__body pip-scroll">
            <FileContents key={selected.id} entry={selected} text={bodyText} />
          </div>
        </section>
      </div>
    </div>
  )
}

interface FileContentsProps {
  entry: DataEntry
  text: string
}

function FileContents({ entry, text }: FileContentsProps) {
  return (
    <div className="file">
      <Typewriter text={text} />
      {entry.urlDisabled ? (
        <p className="file__note">[ CANAL NO PUBLICADO ]</p>
      ) : entry.url ? (
        <a
          className="pip-btn file__action"
          href={entry.url}
          target="_blank"
          rel="noopener noreferrer"
        >
          [ {entry.urlText} ▸ ]
        </a>
      ) : null}
    </div>
  )
}

/**
 * Types the file out character by character. The step size scales with the
 * length so every record takes roughly the same time to read out.
 *
 * Mounted with a `key` of the entry id, so switching files remounts this and
 * the count/progress start clean without an effect reset.
 */
function Typewriter({ text }: { text: string }) {
  const [count, setCount] = useState(0)
  const frame = useRef<number | undefined>(undefined)
  // Progress lives in a ref because the rAF callback closes over the value
  // from the render that scheduled it; reading `count` there would stop the
  // loop on its first frame.
  const progress = useRef(0)

  useEffect(() => {
    if (text.length === 0) return

    const step = Math.max(1, Math.ceil(text.length / 150))
    let previous = performance.now()

    // ~8ms of wall clock per frame regardless of step size, so the reveal
    // speed stays constant instead of drifting with the interval.
    const tick = (now: number) => {
      if (now - previous >= 8) {
        previous = now
        const next = Math.min(progress.current + step, text.length)
        progress.current = next
        setCount(next)
        if (next >= text.length) return
      }
      frame.current = requestAnimationFrame(tick)
    }

    frame.current = requestAnimationFrame(tick)
    return () => {
      if (frame.current !== undefined) cancelAnimationFrame(frame.current)
    }
  }, [text])

  return (
    <pre className="file__text">
      {text.slice(0, count)}
      {count < text.length && (
        <span className="file__cursor" aria-hidden="true" />
      )}
    </pre>
  )
}

function hexAddr(index: number): string {
  const value = 0x2000 + Math.max(0, index) * 0x40
  return '0x' + value.toString(16).toUpperCase().padStart(5, '0')
}
