'use client'

import { IoCloseOutline, IoSettingsOutline } from 'react-icons/io5'
import { useStudioStore } from '@/app/studio/studio-store'
import StudioRightPanel from '@/components/studio/StudioRightPanel'
import classes from './StudioShell.module.css'

export default function StudioSettingsSheet() {
  const settingsOpen = useStudioStore((store) => store.view.settingsOpen)
  const setSettingsOpen = useStudioStore((store) => store.setSettingsOpen)

  return (
    <>
      <button
        type="button"
        className={classes.settingsFab}
        aria-label="Open settings"
        onClick={() => setSettingsOpen(true)}
      >
        <IoSettingsOutline aria-hidden size={22} />
      </button>
      {settingsOpen ? (
        <>
          <button
            type="button"
            className={classes.settingsOverlay}
            aria-label="Close settings"
            onClick={() => setSettingsOpen(false)}
          />
          <div className={classes.settingsSheet} data-studio-settings-sheet>
            <div className={classes.settingsSheetHandle} />
            <div className={classes.settingsSheetHeader}>
              <span>Settings</span>
              <button
                type="button"
                aria-label="Close settings"
                onClick={() => setSettingsOpen(false)}
              >
                <IoCloseOutline aria-hidden size={30} />
              </button>
            </div>
            <div className={classes.settingsSheetBody}>
              <StudioRightPanel includeExport={false} />
            </div>
          </div>
        </>
      ) : null}
    </>
  )
}
