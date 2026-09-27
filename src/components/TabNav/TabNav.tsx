import { useCallback, useEffect, useRef } from 'react'
import type { KeyboardEvent } from 'react'
import { playSfx } from '../../utils/sfx'
import dialMoveSfx from '../../assets/sfx/dial_move.ogg'
import moduleChangeSfx from '../../assets/sfx/module_change.ogg'
import './TabNav.css'

export interface TabNavProps<T extends string> {
  tabs: readonly T[]
  activeTab: T
  onSelect: (tab: T) => void
  label: string
  moveSfx?: string
  confirmSfx?: string
  variant?: 'primary' | 'secondary'
  /** Enable 1-9 number-key shortcuts. Primary nav only. */
  numericShortcuts?: boolean
}

export function TabNav<T extends string>({
  tabs,
  activeTab,
  onSelect,
  label,
  moveSfx = dialMoveSfx,
  confirmSfx = moduleChangeSfx,
  variant = 'primary',
  numericShortcuts = false,
}: TabNavProps<T>) {
  const ref = useRef<HTMLDivElement>(null)
  const activeIndex = tabs.indexOf(activeTab)

  const select = useCallback(
    (index: number, sfx: string) => {
      const tab = tabs[index]
      if (tab === undefined) return
      if (tab === activeTab) return
      onSelect(tab)
      playSfx(sfx)
    },
    [tabs, activeTab, onSelect],
  )

  // Arrows switch immediately, the way the physical keys do. No separate
  // "highlight then confirm" mode — that was one keystroke too many.
  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      const last = tabs.length - 1

      switch (event.key) {
        case 'ArrowLeft':
          event.preventDefault()
          select(activeIndex <= 0 ? last : activeIndex - 1, moveSfx)
          break
        case 'ArrowRight':
          event.preventDefault()
          select(activeIndex >= last ? 0 : activeIndex + 1, moveSfx)
          break
        case 'Home':
          event.preventDefault()
          select(0, moveSfx)
          break
        case 'End':
          event.preventDefault()
          select(last, moveSfx)
          break
        default: {
          if (!numericShortcuts || event.metaKey || event.ctrlKey || event.altKey) {
            return
          }
          const n = Number(event.key)
          if (Number.isInteger(n) && n >= 1 && n <= tabs.length) {
            event.preventDefault()
            select(n - 1, confirmSfx)
          }
        }
      }
    },
    [tabs, activeIndex, numericShortcuts, select, moveSfx, confirmSfx],
  )

  // Roving tabindex: keep the strip keyboard-reachable without trapping focus.
  useEffect(() => {
    const node = ref.current
    if (!node) return
    const active = node.querySelector<HTMLButtonElement>('[aria-selected="true"]')
    active?.focus({ preventScroll: true })
  }, [])

  return (
    <div
      ref={ref}
      className={`tabnav tabnav--${variant}`}
      role="tablist"
      aria-label={label}
      onKeyDown={handleKeyDown}
    >
      {tabs.map((tab, index) => {
        const isActive = tab === activeTab
        return (
          <button
            key={tab}
            type="button"
            role="tab"
            tabIndex={isActive ? 0 : -1}
            className="tabnav__tab"
            aria-selected={isActive}
            onClick={() => select(index, confirmSfx)}
          >
            {variant === 'primary' && numericShortcuts && (
              <span className="tabnav__key" aria-hidden="true">
                {index + 1}
              </span>
            )}
            <span className="tabnav__label">{tab}</span>
          </button>
        )
      })}
    </div>
  )
}
