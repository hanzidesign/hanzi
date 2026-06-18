'use client'

import type { IconType } from 'react-icons'
import {
  IoDownloadOutline,
  IoOptionsOutline,
  IoPlayCircleOutline,
  IoTextOutline,
} from 'react-icons/io5'
import { useStudioStore, type StudioMobileTab } from '@/app/studio/studio-store'
import CharacterPanel from '@/components/studio/CharacterPanel'
import StudioExportPanel from '@/components/studio/StudioExportPanel'
import {
  StudioAnimationPanel,
  StudioEffectsPanel,
} from '@/components/studio/StudioLeftPanel'
import classes from './StudioShell.module.css'

type MobileTabDefinition = {
  id: StudioMobileTab
  label: string
  Icon: IconType
}

const mobileTabs: MobileTabDefinition[] = [
  { id: 'input', label: 'Input', Icon: IoTextOutline },
  { id: 'effects', label: 'Effects', Icon: IoOptionsOutline },
  { id: 'animation', label: 'Animation', Icon: IoPlayCircleOutline },
  { id: 'export', label: 'Export', Icon: IoDownloadOutline },
]

export default function StudioMobileTabs() {
  const mobileTab = useStudioStore((store) => store.view.mobileTab)
  const setMobileTab = useStudioStore((store) => store.setMobileTab)

  return (
    <>
      <div className={classes.mobilePanel}>
        <div className={classes.mobilePanelInner}>
          <h2 className={classes.mobilePanelTitle}>
            {mobileTabs.find((tab) => tab.id === mobileTab)?.label ?? 'Input'}
          </h2>
          {mobileTab === 'input' ? <CharacterPanel /> : null}
          {mobileTab === 'effects' ? <StudioEffectsPanel /> : null}
          {mobileTab === 'animation' ? <StudioAnimationPanel /> : null}
          {mobileTab === 'export' ? <StudioExportPanel /> : null}
        </div>
      </div>
      <nav
        className={classes.mobileTabs}
        data-studio-mobile-tabs
      >
        {mobileTabs.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            className={classes.mobileTabButton}
            data-active={mobileTab === id}
            onClick={() => setMobileTab(id)}
          >
            <Icon aria-hidden width={18} height={18} />
            <span>{label}</span>
          </button>
        ))}
      </nav>
    </>
  )
}
