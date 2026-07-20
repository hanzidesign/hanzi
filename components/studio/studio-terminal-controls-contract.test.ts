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
    expect(sectionSource).toContain("symbol = expanded ? '−' : '+'")
    expect(rowSource).toContain('TerminalRangeRow')
    expect(rowSource).toContain('TerminalSelectRow')
    expect(rowSource).toContain('TerminalDropdownRow')
    expect(rowSource).toContain('dropdownMenu')
    expect(rowSource).toContain('IoChevronDownOutline')
    expect(rowSource).toContain('IoChevronUpOutline')
    expect(rowSource).not.toContain("{open ? '^' : 'v'}")
    expect(rowSource).not.toContain("'✓'")
    expect(rowSource).not.toContain('selectedMark')
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
    expect(characterPanel).toContain('createPortal')
    expect(characterPanel).toContain('document.body')
    expect(characterPanel).toContain('data-studio-character-popover')
    expect(characterPanel).toContain("open ? '−' : '+'")
    expect(characterPanel).not.toContain('@mantine/core')
    expect(characterPanel).not.toContain('SimpleGrid')
    expect(characterPanel).not.toContain('PanelBox')
  })

  it('scales range presentation without changing persisted or renderer units', async () => {
    const rightPanel = await readFile(join(studioDir, 'StudioRightPanel.tsx'), 'utf8')

    expect(rightPanel).toContain(
      'const displayScale = control.displayScaleByTheme?.[theme] ?? control.displayScale ?? 1',
    )
    expect(rightPanel).toContain('const displayNumberValue = numberValue * displayScale')
    expect(rightPanel).toContain('const scaledMinimum = control.min * displayScale')
    expect(rightPanel).toContain('const scaledMaximum = control.max * displayScale')
    expect(rightPanel).toContain('min={Math.min(scaledMinimum, scaledMaximum)}')
    expect(rightPanel).toContain('max={Math.max(scaledMinimum, scaledMaximum)}')
    expect(rightPanel).toContain('step={Math.abs(control.step * displayScale)}')
    expect(rightPanel).toContain('nextValue / displayScale')
  })

  it('renders Scanlines Direction through the shared selector UI', async () => {
    const effects = await readFile(join(studioDir, 'grainrad-effects.ts'), 'utf8')
    const rightPanel = await readFile(join(studioDir, 'StudioRightPanel.tsx'), 'utf8')

    expect(effects).toContain("selectControl('scanline-direction', 'Direction'")
    expect(rightPanel).toContain("if (control.kind === 'select')")
    expect(rightPanel).toContain('<TerminalDropdownRow')
    expect(rightPanel).not.toContain('TerminalSelectRow')
  })

  it('lets dropdown menus widen for long option labels without leaving the viewport', async () => {
    const styles = await readFile(join(studioDir, 'StudioShell.module.css'), 'utf8')

    expect(styles).toContain('width: max-content;')
    expect(styles).toContain('min-width: 100%;')
    expect(styles).toContain('max-width: min(360px, calc(100vw - 24px));')
    expect(styles).toContain('text-overflow: ellipsis;')
    expect(styles).toContain('white-space: nowrap;')
  })
})
