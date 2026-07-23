import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { chars, meaning } from '@/assets/chars'

const studioDir = join(process.cwd(), 'components', 'studio')

describe('Studio navigation, Character meaning, and interaction affordances', () => {
  it('provides a linked Studio brand with the product icon', async () => {
    const leftPanel = await readFile(join(studioDir, 'StudioLeftPanel.tsx'), 'utf8')

    expect(leftPanel).toContain("import Link from 'next/link'")
    expect(leftPanel).toContain('href="/"')
    expect(leftPanel).toContain("const theme = useStudioStore((store) => store.view.theme)")
    expect(leftPanel).toContain("src={theme === 'dark' ? '/images/logo-dark.svg' : '/images/logo.svg'}")
    expect(leftPanel).toContain('Hanzi Studio')
    expect(leftPanel).toContain('className={classes.brandLink}')
  })

  it('shows the selected Character meaning from the shared asset data', async () => {
    const characterPanel = await readFile(join(studioDir, 'CharacterPanel.tsx'), 'utf8')

    expect(characterPanel).toContain('chars, meaning, sortedChars')
    expect(characterPanel).toContain('meaning[country]?.[year]')
    expect(characterPanel).toContain('className={classes.characterTriggerMeaning}')
  })

  it('aligns each Character option as year, English meaning, and Hanzi columns', async () => {
    const characterPanel = await readFile(join(studioDir, 'CharacterPanel.tsx'), 'utf8')
    const styles = await readFile(join(studioDir, 'StudioShell.module.css'), 'utf8')

    expect(characterPanel).toContain('meaning[country]?.[optionYear]')
    expect(characterPanel).toContain('className={classes.characterOptionYear}')
    expect(characterPanel).toContain('className={classes.characterOptionMeaning}')
    expect(characterPanel).toContain('className={classes.hanziGlyph}')
    expect(styles).toMatch(/\.yearButton \{[\s\S]*?display: grid;[\s\S]*?grid-template-columns:/)
    expect(styles).toMatch(/\.characterOptionMeaning \{[\s\S]*?text-align: right;/)
  })

  it('has a non-empty meaning for every selectable Character', () => {
    for (const script of Object.values(chars)) {
      for (const [country, years] of Object.entries(script)) {
        for (const year of Object.keys(years)) {
          expect(meaning[country]?.[year], `${country}/${year}`).toBeTruthy()
        }
      }
    }
  })

  it('uses pointer cursors for enabled click targets and preserves disabled affordances', async () => {
    const styles = await readFile(join(studioDir, 'StudioShell.module.css'), 'utf8')

    expect(styles).toContain('.shell button:not(:disabled)')
    expect(styles).toContain('.shell a[href]')
    expect(styles).toContain('.characterPopover button:not(:disabled)')
    expect(styles).toContain('cursor: pointer')
    expect(styles).toContain('.exportFormatButton:disabled')
    expect(styles).toContain('cursor: not-allowed')
  })

  it('uses a Mantine tooltip around the hoverable disabled export wrapper', async () => {
    const exportPanel = await readFile(join(studioDir, 'StudioExportPanel.tsx'), 'utf8')

    expect(exportPanel).toContain("import { Tooltip } from '@mantine/core'")
    expect(exportPanel).toContain('<Tooltip')
    expect(exportPanel).toContain('label={unavailableReason}')
    expect(exportPanel).toContain('className={classes.exportFormatTooltip}')
    expect(exportPanel).toContain("'3D Motion Play must be off to export PNG'")
    expect(exportPanel).not.toContain('title={unavailableReason}')
  })
})
