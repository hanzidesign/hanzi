'use client'

import { IoMoonOutline, IoSunnyOutline } from 'react-icons/io5'
import { useStudioStore } from '@/app/studio/studio-store'
import classes from './StudioShell.module.css'

export default function StudioThemeToggle() {
  const theme = useStudioStore((store) => store.view.theme)
  const toggleStudioTheme = useStudioStore((store) => store.toggleStudioTheme)
  const Icon = theme === 'light' ? IoMoonOutline : IoSunnyOutline

  return (
    <button
      type="button"
      className={classes.previewActionButton}
      aria-label={theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme'}
      aria-pressed={theme === 'dark'}
      onClick={toggleStudioTheme}
    >
      <Icon aria-hidden size={16} />
      <span>Theme</span>
    </button>
  )
}
