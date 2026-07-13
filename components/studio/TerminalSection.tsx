'use client'

import type { ReactNode } from 'react'
import { useStudioStore, type StudioSectionId } from '@/app/studio/studio-store'
import classes from './StudioShell.module.css'

type TerminalSectionProps = {
  id: StudioSectionId
  title: string
  action?: ReactNode
  flush?: boolean
  children: ReactNode
}

export default function TerminalSection({
  id,
  title,
  action,
  flush = false,
  children,
}: TerminalSectionProps) {
  const expanded = useStudioStore((store) => store.view.expandedSections[id])
  const toggleTerminalSection = useStudioStore((store) => store.toggleTerminalSection)
  const symbol = expanded ? '−' : '+'

  return (
    <section className={classes.section} data-studio-section={id}>
      <div className={classes.sectionHeader}>
        <button
          type="button"
          className={classes.sectionToggle}
          aria-expanded={expanded}
          onClick={() => toggleTerminalSection(id)}
        >
          <span className={classes.sectionTitle}>
            <span className={classes.sectionSymbol}>{symbol}</span>
            {title}
          </span>
        </button>
        {action ? <span className={classes.sectionAction}>{action}</span> : null}
      </div>
      {expanded ? (
        <div className={flush ? classes.sectionBodyFlush : classes.sectionBody}>
          {children}
        </div>
      ) : null}
    </section>
  )
}
