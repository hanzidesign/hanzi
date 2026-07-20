'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import {
  IoAddOutline,
  IoCloseOutline,
  IoExpandOutline,
  IoMenuOutline,
  IoMoonOutline,
  IoRemoveOutline,
  IoSunnyOutline,
} from 'react-icons/io5'
import { useStudioStore } from '@/app/studio/studio-store'
import classes from './StudioShell.module.css'

type StudioMobileHeaderProps = {
  onFullscreen: () => void
}

const MENU_ID = 'studio-mobile-header-menu'

export default function StudioMobileHeader({ onFullscreen }: StudioMobileHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const theme = useStudioStore((store) => store.view.theme)
  const previewZoom = useStudioStore((store) => store.view.previewZoom)
  const toggleStudioTheme = useStudioStore((store) => store.toggleStudioTheme)
  const setPreviewZoom = useStudioStore((store) => store.setPreviewZoom)
  const resetPreviewView = useStudioStore((store) => store.resetPreviewView)
  const ThemeIcon = theme === 'light' ? IoMoonOutline : IoSunnyOutline

  useEffect(() => {
    if (!menuOpen) {
      return
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [menuOpen])

  return (
    <header className={classes.mobileHeader}>
      <Link href="/" className={classes.mobileBrandLink}>
        <Image
          src={theme === 'dark' ? '/images/logo-dark.svg' : '/images/logo.svg'}
          alt=""
          aria-hidden
          width={28}
          height={28}
        />
        <span>Hanzi Studio</span>
      </Link>
      <button
        type="button"
        className={classes.mobileMenuButton}
        aria-label={menuOpen ? 'Close menu' : 'Open menu'}
        aria-controls={MENU_ID}
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen((open) => !open)}
      >
        {menuOpen ? <IoCloseOutline aria-hidden size={24} /> : <IoMenuOutline aria-hidden size={24} />}
      </button>
      {menuOpen ? (
        <>
          <button
            type="button"
            className={classes.mobileMenuOverlay}
            tabIndex={-1}
            aria-label="Close menu"
            onClick={() => setMenuOpen(false)}
          />
          <div id={MENU_ID} className={classes.mobileMenu}>
            <button
              type="button"
              className={classes.mobileMenuAction}
              aria-pressed={theme === 'dark'}
              onClick={toggleStudioTheme}
            >
              <ThemeIcon aria-hidden size={18} />
              <span>Theme</span>
            </button>
            <button
              type="button"
              className={classes.mobileMenuAction}
              onClick={() => {
                onFullscreen()
                setMenuOpen(false)
              }}
            >
              <IoExpandOutline aria-hidden size={18} />
              <span>Fullscreen</span>
            </button>
            <div className={classes.mobileMenuPreviewControls}>
              <span className={classes.mobileMenuLabel}>Preview</span>
              <div className={classes.mobileMenuZoomRow}>
                <button
                  type="button"
                  aria-label="Zoom out"
                  onClick={() => setPreviewZoom(previewZoom - 0.1)}
                >
                  <IoRemoveOutline aria-hidden size={18} />
                </button>
                <span className={classes.mobileMenuZoomValue}>
                  {Math.round(previewZoom * 100)}%
                </span>
                <button
                  type="button"
                  aria-label="Zoom in"
                  onClick={() => setPreviewZoom(previewZoom + 0.1)}
                >
                  <IoAddOutline aria-hidden size={18} />
                </button>
              </div>
              <div className={classes.mobileMenuFitRow}>
                <button type="button" onClick={resetPreviewView}>Reset</button>
                <button type="button" onClick={resetPreviewView}>Fit</button>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </header>
  )
}
