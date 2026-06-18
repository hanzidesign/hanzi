'use client'

import { chars, sortedChars } from '@/assets/chars'
import { countries } from '@/assets/list'
import { useStudioStore } from '@/app/studio/studio-store'
import classes from './StudioShell.module.css'

export default function CharacterPanel() {
  const character = useStudioStore((store) => store.character)
  const setCharacter = useStudioStore((store) => store.setCharacter)
  const { country, year, isTc } = character
  const list = isTc ? sortedChars.tc : sortedChars.sc

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
    <div className={classes.characterSelector} data-studio-character-selector>
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
          {list[country].map(({ year: optionYear, ch }) => (
            <button
              key={optionYear}
              type="button"
              className={`${classes.characterButton} ${classes.yearButton}`}
              data-active={optionYear === year}
              onClick={() => handleChange(country, optionYear)}
            >
              <span>{optionYear}</span>
              <span className={classes.hanziGlyph}>({ch})</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
