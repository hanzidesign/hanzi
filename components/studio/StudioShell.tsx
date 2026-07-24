'use client'

import { IoExpandOutline } from 'react-icons/io5'
import { useStudioStore } from '@/app/studio/studio-store'
import StudioCanvas from '@/components/studio/StudioCanvas'
import StudioLeftPanel from '@/components/studio/StudioLeftPanel'
import StudioMobileHeader from '@/components/studio/StudioMobileHeader'
import StudioMobileTabs from '@/components/studio/StudioMobileTabs'
import StudioRightPanel from '@/components/studio/StudioRightPanel'
import StudioThemeToggle from '@/components/studio/StudioThemeToggle'
import {
  StudioPreviewFrameProvider,
  StudioRenderModeProvider,
} from '@/components/studio/studio-render-context'
import classes from './StudioShell.module.css'

export default function StudioShell() {
  const theme = useStudioStore((store) => store.view.theme)

  const handleFullscreen = (selector: '[data-studio-preview]' | '[data-studio-terminal-shell]') => {
    const target = document.querySelector<HTMLElement>(selector)

    if (!target) {
      return
    }

    if (document.fullscreenElement) {
      void document.exitFullscreen()
      return
    }

    void target.requestFullscreen()
  }

  return (
    <StudioPreviewFrameProvider>
      <StudioRenderModeProvider exportRender={false}>
        <div
          className={classes.shell}
          data-studio-terminal-shell
          data-studio-theme={theme}
        >
          <StudioMobileHeader
            onFullscreen={() => handleFullscreen('[data-studio-terminal-shell]')}
          />
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
                  onClick={() => handleFullscreen('[data-studio-preview]')}
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
        </div>
      </StudioRenderModeProvider>
    </StudioPreviewFrameProvider>
  )
}
