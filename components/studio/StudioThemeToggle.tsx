'use client'

import { IoMoonOutline, IoSunnyOutline } from 'react-icons/io5'
import { useStudioStore } from '@/app/studio/studio-store'
import classes from './StudioShell.module.css'

type StudioThemeToggleProps = {
  onToggleTheme: () => void
}

export default function StudioThemeToggle({ onToggleTheme }: StudioThemeToggleProps) {
  const theme = useStudioStore((store) => store.view.theme)
  const Icon = theme === 'light' ? IoMoonOutline : IoSunnyOutline

  return (
    <button
      type="button"
      className={classes.previewActionButton}
      aria-label={theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme'}
      aria-pressed={theme === 'dark'}
      onClick={onToggleTheme}
    >
      <Icon aria-hidden size={16} />
      <span>Theme</span>
    </button>
  )
}
