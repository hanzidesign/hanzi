'use client'

import { useEffect, useRef, useState } from 'react'
import { chars, sortedChars } from '@/assets/chars'
import { countries } from '@/assets/list'
import {
  getCharacterDisplayState,
  useStudioStore,
} from '@/app/studio/studio-store'
import classes from './StudioShell.module.css'

export default function CharacterPanel() {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
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
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
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
        type="button"
        className={classes.characterTrigger}
        data-studio-character-trigger
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((nextOpen) => !nextOpen)}
      >
        <span className={classes.characterTriggerGlyph}>{ch}</span>
        <span className={classes.characterTriggerChevron} aria-hidden>
          {open ? '^' : 'v'}
        </span>
      </button>
      {open ? (
        <div
          className={`${classes.characterSelector} ${classes.characterPopover}`}
          role="dialog"
          aria-label="Choose character"
        >
          <div>
            <div className={classes.characterColumnTitle}>Country</div>
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
          </div>
          <div>
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
                  }}
                >
                  <span>{optionYear}</span>
                  <span className={classes.hanziGlyph}>({optionCharacter})</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
