import { useState } from 'react'
import { TabNav } from '../../TabNav/TabNav'
import submoduleChangeSfx from '../../../assets/sfx/submodule_change.ogg'
import type { StatId } from '../../../data/operator'
import { StatusView } from './StatusView'
import { PerksView } from './PerksView'
import './Stat.css'

export type StatSubTab = 'STATUS' | 'PERKS'

const SUB_TABS: readonly StatSubTab[] = ['STATUS', 'PERKS']

export interface StatProps {
  /** Which S.P.E.C.I.A.L. stat is selected — driven by the case's RADS dial. */
  selectedStat: StatId
  onSelectStat: (id: StatId) => void
}

export function Stat({ selectedStat, onSelectStat }: StatProps) {
  const [subTab, setSubTab] = useState<StatSubTab>('STATUS')

  return (
    <div className="stat">
      <TabNav
        tabs={SUB_TABS}
        activeTab={subTab}
        onSelect={setSubTab}
        label="Secciones de estado"
        confirmSfx={submoduleChangeSfx}
        variant="secondary"
      />
      <div className="stat__content">
        {subTab === 'STATUS' ? (
          <StatusView
            selectedStat={selectedStat}
            onSelectStat={onSelectStat}
          />
        ) : (
          <PerksView />
        )}
      </div>
    </div>
  )
}