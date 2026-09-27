import { useCallback, useEffect, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { QUESTS, STATUS_LABEL } from '../../../data/projects'
import { playSfx } from '../../../utils/sfx'
import selectSfx from '../../../assets/sfx/dial_move.ogg'
import openSfx from '../../../assets/sfx/submodule_change.ogg'
import './Misiones.css'

/** F3's quest-log glyphs: filled dot = active, tick = done, hollow = open. */
const STATUS_GLYPH = {
  active: '●',
  completed: '✔',
  paused: '○',
} as const

function useClock(): string {
  const [stamp, setStamp] = useState(() => formatDate(new Date()))

  useEffect(() => {
    const id = window.setInterval(() => setStamp(formatDate(new Date())), 30_000)
    return () => window.clearInterval(id)
  }, [])

  return stamp
}

function formatDate(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${String(d.getFullYear()).slice(-2)}, ${p(d.getHours())}:${p(d.getMinutes())}`
}

export function Misiones() {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const clock = useClock()
  const listRef = useRef<HTMLUListElement>(null)
  const shouldScroll = useRef(false)

  // Scroll the list to the selection, but only when the move came from the
  // keyboard. scrollIntoView also scrolls every scrollable ancestor, which
  // used to yank the tab bar out of view.
  useEffect(() => {
    if (!shouldScroll.current) return
    shouldScroll.current = false
    const el = listRef.current?.querySelector<HTMLElement>('[aria-selected="true"]')
    if (el && listRef.current) {
      const top = el.offsetTop
      const view = listRef.current
      if (top < view.scrollTop) view.scrollTop = top
      else if (top + el.offsetHeight > view.scrollTop + view.clientHeight) {
        view.scrollTop = top + el.offsetHeight - view.clientHeight
      }
    }
  }, [selectedIndex])

  const move = useCallback((next: number) => {
    shouldScroll.current = true
    setSelectedIndex((next + QUESTS.length) % QUESTS.length)
    playSfx(selectSfx)
  }, [])

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      switch (event.key) {
        case 'ArrowUp':
          event.preventDefault()
          move(selectedIndex - 1)
          break
        case 'ArrowDown':
          event.preventDefault()
          move(selectedIndex + 1)
          break
        case 'Home':
          event.preventDefault()
          move(0)
          break
        case 'End':
          event.preventDefault()
          move(QUESTS.length - 1)
          break
        default:
          break
      }
    },
    [selectedIndex, move],
  )

  const quest = QUESTS[selectedIndex]
  const done = quest.objectives.filter((o) => o.completed).length
  const total = quest.objectives.length
  const progress = Math.round((done / total) * 100)

  return (
    <div
      className="misiones"
      onKeyDown={handleKeyDown}
      role="group"
      aria-label="Diario de misiones"
    >
      <header className="misiones__bar">
        <span className="misiones__location">VALLADOLID</span>
        <span className="misiones__count">
          {QUESTS.length} MISIONES REGISTRADAS
        </span>
        <time className="misiones__datetime" dateTime={clock.split(',')[0]}>
          {clock}
        </time>
      </header>

      <div className="misiones__body">
        {/* ---- Quest list ------------------------------------------------ */}
        <nav className="misiones__list pip-scroll" aria-label="Misiones">
          <ul ref={listRef}>
            {QUESTS.map((q, index) => (
              <li key={q.id}>
                <button
                  type="button"
                  className="mission"
                  aria-selected={index === selectedIndex}
                  aria-current={index === selectedIndex || undefined}
                  onClick={() => {
                    if (index !== selectedIndex) playSfx(openSfx)
                    setSelectedIndex(index)
                  }}
                >
                  <span
                    className="mission__glyph"
                    data-status={q.status}
                    aria-hidden="true"
                  >
                    {STATUS_GLYPH[q.status]}
                  </span>
                  <span className="mission__text">
                    <span className="mission__name">{q.name}</span>
                    <span className="mission__tagline">{q.tagline}</span>
                  </span>
                  <span className="mission__year">{q.year}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* ---- Detail ----------------------------------------------------- */}
        <article className="misiones__detail pip-panel" key={quest.id}>
          <header className="detail__head">
            <h1 className="detail__title">{quest.name}</h1>
            <span className="detail__status" data-status={quest.status}>
              {STATUS_LABEL[quest.status]}
            </span>
          </header>

          <p className="detail__description">{quest.description}</p>

          <ul className="detail__tech" aria-label="Tecnologías">
            {quest.tech.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>

          <section className="detail__objectives">
            <div className="detail__objectives-head">
              <h2 className="pip-label">OBJETIVOS</h2>
              <span className="detail__progress">
                {done}/{total} · {progress}%
              </span>
            </div>

            <div className="detail__progress-track" aria-hidden="true">
              <span style={{ width: `${progress}%` }} />
            </div>

            <ul className="objectives pip-scroll">
              {quest.objectives.map((objective) => (
                <li
                  key={objective.text}
                  className="objective"
                  data-done={objective.completed || undefined}
                >
                  <span className="objective__box" aria-hidden="true">
                    {objective.completed ? '✔' : '○'}
                  </span>
                  <span className="objective__text">{objective.text}</span>
                </li>
              ))}
            </ul>
          </section>

          <footer className="detail__actions">
            <a
              className="pip-btn"
              href={quest.repoUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              REPOSITORIO ↗
            </a>
            {quest.demoUrl && (
              <a
                className="pip-btn pip-btn--primary"
                href={quest.demoUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                VISITAR PROYECTO ↗
              </a>
            )}
          </footer>
        </article>
      </div>
    </div>
  )
}
