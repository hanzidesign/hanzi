'use client'

import { IoExpandOutline } from 'react-icons/io5'
import { useStudioStore } from '@/app/studio/studio-store'
import StudioCanvas from '@/components/studio/StudioCanvas'
import StudioLeftPanel from '@/components/studio/StudioLeftPanel'
import StudioMobileTabs from '@/components/studio/StudioMobileTabs'
import StudioRightPanel from '@/components/studio/StudioRightPanel'
import StudioSettingsSheet from '@/components/studio/StudioSettingsSheet'
import StudioThemeToggle from '@/components/studio/StudioThemeToggle'
import classes from './StudioShell.module.css'

export default function StudioShell() {
  const theme = useStudioStore((store) => store.view.theme)

  const handleFullscreen = () => {
    const preview = document.querySelector<HTMLElement>('[data-studio-preview]')

    if (!preview) {
      return
    }

    if (document.fullscreenElement) {
      void document.exitFullscreen()
      return
    }

    void preview.requestFullscreen()
  }

  return (
    <div
      className={classes.shell}
      data-studio-terminal-shell
      data-studio-theme={theme}
    >
      <header className={classes.mobileHeader}>Hanzi Studio</header>
      <aside className={classes.leftPanel} data-studio-left-panel>
        <StudioLeftPanel />
      </aside>
      <main className={classes.preview} data-studio-preview>
        <StudioCanvas />
        <div className={classes.previewTopRail}>
          <div className={classes.previewActions}>
            <StudioThemeToggle />
            <button
              type="button"
              className={classes.previewActionButton}
              aria-label="Toggle fullscreen"
              onClick={handleFullscreen}
            >
              <IoExpandOutline aria-hidden size={16} />
              <span>Fullscreen</span>
            </button>
          </div>
        </div>
      </main>
      <aside className={classes.rightPanel} data-studio-right-panel>
        <StudioRightPanel />
      </aside>
      <StudioMobileTabs />
      <StudioSettingsSheet />
    </div>
  )
}
