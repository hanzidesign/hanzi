'use client'

import { IoExpandOutline } from 'react-icons/io5'
import { useEffect, useRef, useState, type RefObject } from 'react'
import StudioCanvas from '@/components/studio/StudioCanvas'
import StudioLeftPanel from '@/components/studio/StudioLeftPanel'
import StudioMobileHeader from '@/components/studio/StudioMobileHeader'
import StudioMobileTabs from '@/components/studio/StudioMobileTabs'
import StudioRightPanel from '@/components/studio/StudioRightPanel'
import StudioThemeToggle from '@/components/studio/StudioThemeToggle'
import { useSharedStudioTheme } from '@/components/studio/use-shared-studio-theme'
import {
  StudioPreviewFrameProvider,
  StudioRenderModeProvider,
} from '@/components/studio/studio-render-context'
import classes from './StudioShell.module.css'

const FULLSCREEN_CHROME_IDLE_MS = 2000
type FullscreenTarget = 'preview' | 'shell' | null

function useStudioFullscreenChrome(
  shellRef: RefObject<HTMLElement | null>,
  previewRef: RefObject<HTMLElement | null>,
) {
  const [fullscreenTarget, setFullscreenTarget] = useState<FullscreenTarget>(null)
  const [chromeVisible, setChromeVisible] = useState(true)
  const fullscreenTargetRef = useRef<FullscreenTarget>(null)
  const chromeTimerRef = useRef<number | null>(null)

  useEffect(() => {
    const clearChromeTimer = () => {
      if (chromeTimerRef.current !== null) {
        window.clearTimeout(chromeTimerRef.current)
        chromeTimerRef.current = null
      }
    }

    const scheduleChromeHide = () => {
      clearChromeTimer()

      if (fullscreenTargetRef.current === null) {
        return
      }

      chromeTimerRef.current = window.setTimeout(() => {
        setChromeVisible(false)
        chromeTimerRef.current = null
      }, FULLSCREEN_CHROME_IDLE_MS)
    }

    const revealChrome = () => {
      if (fullscreenTargetRef.current === null) {
        return
      }

      setChromeVisible(true)
      scheduleChromeHide()
    }

    const updateFullscreenTarget = () => {
      const fullscreenElement = document.fullscreenElement
      const nextTarget = fullscreenElement === previewRef.current
        ? 'preview'
        : fullscreenElement === shellRef.current
          ? 'shell'
          : null

      fullscreenTargetRef.current = nextTarget
      setFullscreenTarget(nextTarget)

      if (nextTarget === null) {
        clearChromeTimer()
        setChromeVisible(true)
        return
      }

      setChromeVisible(true)
      scheduleChromeHide()
    }

    const activityEvents = ['mousemove', 'pointerdown', 'click', 'keydown', 'focusin'] as const
    document.addEventListener('fullscreenchange', updateFullscreenTarget)
    activityEvents.forEach((eventName) => {
      document.addEventListener(eventName, revealChrome, true)
    })
    updateFullscreenTarget()

    return () => {
      document.removeEventListener('fullscreenchange', updateFullscreenTarget)
      activityEvents.forEach((eventName) => {
        document.removeEventListener(eventName, revealChrome, true)
      })
      clearChromeTimer()
    }
  }, [previewRef, shellRef])

  return { fullscreenTarget, chromeVisible }
}

export default function StudioShell() {
  const shellRef = useRef<HTMLDivElement>(null)
  const previewRef = useRef<HTMLElement>(null)
  const { theme, toggleColorScheme } = useSharedStudioTheme()
  const { fullscreenTarget, chromeVisible } = useStudioFullscreenChrome(shellRef, previewRef)

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
          ref={shellRef}
          className={classes.shell}
          data-studio-terminal-shell
          data-studio-theme={theme}
          data-studio-fullscreen={fullscreenTarget ?? undefined}
          data-studio-fullscreen-chrome={
            fullscreenTarget === null ? undefined : chromeVisible ? 'visible' : 'hidden'
          }
        >
          <StudioMobileHeader
            onFullscreen={() => handleFullscreen('[data-studio-terminal-shell]')}
            onToggleTheme={toggleColorScheme}
          />
          <aside className={classes.leftPanel} data-studio-left-panel>
            <StudioLeftPanel />
          </aside>
          <main
            ref={previewRef}
            className={classes.preview}
            data-studio-preview
            data-studio-fullscreen={fullscreenTarget === 'preview' ? 'preview' : undefined}
            data-studio-fullscreen-chrome={
              fullscreenTarget === 'preview' ? chromeVisible ? 'visible' : 'hidden' : undefined
            }
          >
            <StudioCanvas />
            <div className={classes.previewTopRail}>
              <div className={classes.previewActions}>
                <StudioThemeToggle onToggleTheme={toggleColorScheme} />
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
