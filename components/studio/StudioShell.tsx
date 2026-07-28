'use client'

import { IoContractOutline, IoExpandOutline } from 'react-icons/io5'
import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'
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
type FullscreenTarget = 'preview' | 'shell'

function useStudioFullscreenChrome(
  shellRef: RefObject<HTMLElement | null>,
  previewRef: RefObject<HTMLElement | null>,
) {
  const [nativeFullscreenTarget, setNativeFullscreenTarget] = useState<FullscreenTarget | null>(
    null,
  )
  const [fallbackTarget, setFallbackTarget] = useState<FullscreenTarget | null>(null)
  const [chromeVisible, setChromeVisible] = useState(true)
  const fullscreenTargetRef = useRef<FullscreenTarget | null>(null)
  const chromeTimerRef = useRef<number | null>(null)
  const fullscreenTarget = nativeFullscreenTarget ?? fallbackTarget

  const clearChromeTimer = useCallback(() => {
    if (chromeTimerRef.current !== null) {
      window.clearTimeout(chromeTimerRef.current)
      chromeTimerRef.current = null
    }
  }, [])

  const scheduleChromeHide = useCallback(() => {
    clearChromeTimer()

    if (fullscreenTargetRef.current === null) {
      return
    }

    chromeTimerRef.current = window.setTimeout(() => {
      setChromeVisible(false)
      chromeTimerRef.current = null
    }, FULLSCREEN_CHROME_IDLE_MS)
  }, [clearChromeTimer])

  useEffect(() => {
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

      if (nextTarget !== null) {
        setFallbackTarget(null)
      }
      setNativeFullscreenTarget(nextTarget)
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
  }, [clearChromeTimer, previewRef, scheduleChromeHide, shellRef])

  useEffect(() => {
    fullscreenTargetRef.current = fullscreenTarget

    if (fullscreenTarget === null) {
      clearChromeTimer()
      setChromeVisible(true)
      return
    }

    setChromeVisible(true)
    scheduleChromeHide()
  }, [clearChromeTimer, fullscreenTarget, scheduleChromeHide])

  return {
    fallbackTarget,
    fullscreenTarget,
    chromeVisible,
    setFallbackTarget,
  }
}

export default function StudioShell() {
  const shellRef = useRef<HTMLDivElement>(null)
  const previewRef = useRef<HTMLElement>(null)
  const { theme, toggleColorScheme } = useSharedStudioTheme()
  const {
    fallbackTarget,
    fullscreenTarget,
    chromeVisible,
    setFallbackTarget,
  } = useStudioFullscreenChrome(shellRef, previewRef)

  const handleFullscreen = (targetKind: FullscreenTarget) => {
    const target = targetKind === 'preview' ? previewRef.current : shellRef.current

    if (!target) {
      return
    }

    if (fallbackTarget !== null) {
      setFallbackTarget(null)
      return
    }

    if (document.fullscreenElement) {
      void document.exitFullscreen()
      return
    }

    if (window.matchMedia('(max-width: 900px)').matches) {
      setFallbackTarget(targetKind)
      return
    }

    if (typeof target.requestFullscreen !== 'function') {
      setFallbackTarget(targetKind)
      return
    }

    try {
      void Promise.resolve(target.requestFullscreen()).catch(() => {
        setFallbackTarget(targetKind)
      })
    } catch {
      setFallbackTarget(targetKind)
    }
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
            onFullscreen={() => handleFullscreen('shell')}
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
            {fullscreenTarget !== null ? (
              <button
                type="button"
                className={classes.fullscreenExitButton}
                aria-label="Exit fullscreen"
                onClick={() => handleFullscreen(fullscreenTarget)}
              >
                <IoContractOutline aria-hidden size={20} />
              </button>
            ) : null}
            <div className={classes.previewTopRail}>
              <div className={classes.previewActions}>
                <StudioThemeToggle onToggleTheme={toggleColorScheme} />
                <button
                  type="button"
                  className={classes.previewActionButton}
                  aria-label="Toggle fullscreen"
                  onClick={() => handleFullscreen('preview')}
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
