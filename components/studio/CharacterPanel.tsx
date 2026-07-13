'use client'

import { type CSSProperties, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { chars, sortedChars } from '@/assets/chars'
import { countries } from '@/assets/list'
import {
  getCharacterDisplayState,
  useStudioStore,
} from '@/app/studio/studio-store'
import classes from './StudioShell.module.css'

export default function CharacterPanel() {
  const [open, setOpen] = useState(false)
  const [scrollbarVisible, setScrollbarVisible] = useState(false)
  const [popoverStyle, setPopoverStyle] = useState<CSSProperties>({})
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)
  const character = useStudioStore((store) => store.character)
  const setCharacter = useStudioStore((store) => store.setCharacter)
  const { country, year, isTc } = character
  const { ch } = getCharacterDisplayState(character)
  const list = isTc ? sortedChars.tc : sortedChars.sc

  useEffect(() => {
    if (!open) {
      return
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node

      if (
        !rootRef.current?.contains(target) &&
        !popoverRef.current?.contains(target)
      ) {
        setOpen(false)
        setScrollbarVisible(false)
      }
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
        setScrollbarVisible(false)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  useLayoutEffect(() => {
    if (!open) {
      return
    }

    const updatePopoverPosition = () => {
      const trigger = triggerRef.current
      const popover = popoverRef.current

      if (!trigger || !popover) {
        return
      }

      const triggerRect = trigger.getBoundingClientRect()
      const popoverRect = popover.getBoundingClientRect()
      const viewportPadding = 16
      const gap = 6
      const width = Math.min(448, window.innerWidth - viewportPadding * 2)
      const left = Math.min(
        Math.max(triggerRect.left, viewportPadding),
        window.innerWidth - width - viewportPadding,
      )
      const fitsBelow = triggerRect.bottom + gap + popoverRect.height <= window.innerHeight - viewportPadding
      const top = fitsBelow
        ? triggerRect.bottom + gap
        : Math.max(viewportPadding, triggerRect.top - popoverRect.height - gap)
      const computedStyle = window.getComputedStyle(rootRef.current ?? trigger)

      setPopoverStyle({
        top,
        left,
        width,
        '--studio-panel': computedStyle.getPropertyValue('--studio-panel'),
        '--studio-panel-strong': computedStyle.getPropertyValue('--studio-panel-strong'),
        '--studio-border': computedStyle.getPropertyValue('--studio-border'),
        '--studio-border-strong': computedStyle.getPropertyValue('--studio-border-strong'),
        '--studio-text': computedStyle.getPropertyValue('--studio-text'),
        '--studio-text-dim': computedStyle.getPropertyValue('--studio-text-dim'),
        '--studio-text-bright': computedStyle.getPropertyValue('--studio-text-bright'),
        '--studio-control-active': computedStyle.getPropertyValue('--studio-control-active'),
        '--studio-control-active-text': computedStyle.getPropertyValue('--studio-control-active-text'),
        '--font-noto': computedStyle.getPropertyValue('--font-noto'),
      } as CSSProperties)
    }

    updatePopoverPosition()
    window.addEventListener('resize', updatePopoverPosition)
    window.addEventListener('scroll', updatePopoverPosition, true)

    return () => {
      window.removeEventListener('resize', updatePopoverPosition)
      window.removeEventListener('scroll', updatePopoverPosition, true)
    }
  }, [open])

  const handleChange = (nextCountry: string, nextYear: string, nextIsTc = isTc) => {
    const nextList = nextIsTc ? chars.tc : chars.sc

    if (nextList[nextCountry]?.[nextYear]) {
      setCharacter(nextCountry, nextYear, nextIsTc)
    }
  }

  const handleScriptChange = (nextIsTc: boolean) => {
    const nextList = nextIsTc ? chars.tc : chars.sc

    if (nextList[country]?.[year]) {
      handleChange(country, year, nextIsTc)
      return
    }

    const firstCountry = Object.keys(nextList)[0] ?? country
    const firstYear = Object.keys(nextList[firstCountry] ?? {})[0] ?? year
    handleChange(firstCountry, firstYear, nextIsTc)
  }

  return (
    <div
      ref={rootRef}
      className={classes.characterPicker}
      data-studio-character-selector
    >
      <button
        ref={triggerRef}
        type="button"
        className={classes.characterTrigger}
        data-studio-character-trigger
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => {
          if (open) {
            setScrollbarVisible(false)
          }
          setOpen(!open)
        }}
      >
        <span className={classes.characterTriggerGlyph}>{ch}</span>
        <span className={classes.characterTriggerChevron} aria-hidden>
          {open ? '−' : '+'}
        </span>
      </button>
      {open && typeof document !== 'undefined' ? createPortal(
        <div
          ref={popoverRef}
          className={classes.characterPopover}
          style={popoverStyle}
          data-studio-character-popover
          role="dialog"
          aria-label="Choose character"
        >
          <div className={classes.characterSelector}>
            <div className={classes.characterColumnTitle}>Country</div>
            <div className={classes.characterColumnTitle}>
              <span>Year</span>
              <span className={classes.scriptToggle} aria-label="Character script">
                <button
                  type="button"
                  data-active={isTc}
                  onClick={() => handleScriptChange(true)}
                >
                  TC
                </button>
                <button
                  type="button"
                  data-active={!isTc}
                  onClick={() => handleScriptChange(false)}
                >
                  SC
                </button>
              </span>
            </div>
          </div>
          <div
            className={`${classes.characterSelector} ${classes.characterPopoverScroll}`}
            data-scrollbar-visible={scrollbarVisible}
            onPointerEnter={() => setScrollbarVisible(true)}
            onPointerLeave={() => setScrollbarVisible(false)}
          >
            <div className={classes.characterList}>
              {Object.entries(countries).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  className={classes.characterButton}
                  data-active={key === country}
                  onClick={() => {
                    const [{ year: nextYear }] = list[key]
                    handleChange(key, nextYear)
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className={classes.characterList}>
              {list[country].map(({ year: optionYear, ch: optionCharacter }) => (
                <button
                  key={optionYear}
                  type="button"
                  className={`${classes.characterButton} ${classes.yearButton}`}
                  data-active={optionYear === year}
                  onClick={() => {
                    handleChange(country, optionYear)
                    setOpen(false)
                    setScrollbarVisible(false)
                  }}
                >
                  <span>{optionYear}</span>
                  <span className={classes.hanziGlyph}>({optionCharacter})</span>
                </button>
              ))}
            </div>
          </div>
        </div>,
        document.body,
      ) : null}
    </div>
  )
}
