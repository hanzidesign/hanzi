import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

const studioDir = join(process.cwd(), 'components', 'studio')

describe('Phase 5D Grainrad terminal controller contract', () => {
  it('uses shared compact controller primitives instead of Mantine card controls', async () => {
    const rowSource = await readFile(join(studioDir, 'TerminalRows.tsx'), 'utf8')
    const sectionSource = await readFile(join(studioDir, 'TerminalSection.tsx'), 'utf8')
    const rightPanel = await readFile(join(studioDir, 'StudioRightPanel.tsx'), 'utf8')

    expect(sectionSource).toContain('TerminalSection')
    expect(sectionSource).toContain('expandedSections')
    expect(sectionSource).toContain("symbol = expanded ? '-' : '+'")
    expect(rowSource).toContain('TerminalRangeRow')
    expect(rowSource).toContain('TerminalSelectRow')
    expect(rowSource).toContain('TerminalDropdownRow')
    expect(rowSource).toContain('dropdownMenu')
    expect(rowSource).toContain('TerminalColorRow')
    expect(rowSource).toContain('TerminalToggleRow')
    expect(rowSource).toContain('TerminalOptionGrid')
    expect(rowSource).toContain('type="range"')
    expect(rowSource).toContain('type="color"')
    expect(rowSource).toContain('type="checkbox"')
    expect(rowSource).not.toContain('@mantine/core')
    expect(rightPanel).toContain('TerminalRangeRow')
    expect(rightPanel).toContain('TerminalDropdownRow')
    expect(rightPanel).toContain('renderEffectSettings')
    expect(rightPanel).not.toContain('TerminalSelectRow')
  })

  it('keeps CharacterPanel as the input while retheming it to terminal controls', async () => {
    const characterPanel = await readFile(join(studioDir, 'CharacterPanel.tsx'), 'utf8')

    expect(characterPanel).toContain('data-studio-character-selector')
    expect(characterPanel).toContain('Country')
    expect(characterPanel).toContain('Year')
    expect(characterPanel).toContain('TC')
    expect(characterPanel).toContain('SC')
    expect(characterPanel).not.toContain('@mantine/core')
    expect(characterPanel).not.toContain('SimpleGrid')
    expect(characterPanel).not.toContain('PanelBox')
  })
})
