'use client'

import type { IconType } from 'react-icons'
import {
  IoCubeOutline,
  IoDownloadOutline,
  IoOptionsOutline,
  IoSettingsOutline,
  IoTextOutline,
} from 'react-icons/io5'
import { useStudioStore, type StudioMobileTab } from '@/app/studio/studio-store'
import CharacterPanel from '@/components/studio/CharacterPanel'
import StudioExportPanel from '@/components/studio/StudioExportPanel'
import {
  StudioModelDeformPanel,
  StudioModelPanel,
  StudioEffectsPanel,
  StudioMotionPanel,
  StudioModelReset,
} from '@/components/studio/StudioLeftPanel'
import StudioRightPanel from '@/components/studio/StudioRightPanel'
import classes from './StudioShell.module.css'

type MobileTabDefinition = {
  id: StudioMobileTab
  label: string
  Icon: IconType
}

const mobileTabs: MobileTabDefinition[] = [
  { id: 'input', label: 'Input', Icon: IoTextOutline },
  { id: 'model', label: 'Model', Icon: IoCubeOutline },
  { id: 'effects', label: 'Effects', Icon: IoOptionsOutline },
  { id: 'settings', label: 'Settings', Icon: IoSettingsOutline },
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
          {mobileTab === 'input' ? (
            <>
              <CharacterPanel />
              <StudioMotionPanel />
            </>
          ) : null}
          {mobileTab === 'effects' ? <StudioEffectsPanel /> : null}
          {mobileTab === 'model' ? (
            <>
              <div className={classes.inputGroupHeader}>
                <div className={classes.inputLabel}>Model</div>
                <StudioModelReset />
              </div>
              <StudioModelPanel />
              <div className={classes.inputGroupHeader}>
                <div className={classes.inputLabel}>Model Deform</div>
              </div>
              <StudioModelDeformPanel />
            </>
          ) : null}
          {mobileTab === 'settings' ? <StudioRightPanel includeExport={false} title="Controllers" /> : null}
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
            aria-pressed={mobileTab === id}
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
