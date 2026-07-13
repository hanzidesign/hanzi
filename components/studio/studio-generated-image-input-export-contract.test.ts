import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

const studioDir = join(process.cwd(), 'components', 'studio')

describe('generated-image input and export layout contract', () => {
  it('collapses the current character into a 65px popover trigger', async () => {
    const characterPanel = await readFile(join(studioDir, 'CharacterPanel.tsx'), 'utf8')
    const styles = await readFile(join(studioDir, 'StudioShell.module.css'), 'utf8')

    expect(characterPanel).toContain('data-studio-character-trigger')
    expect(characterPanel).toContain('aria-expanded={open}')
    expect(characterPanel).toContain('role="dialog"')
    expect(characterPanel).toContain('getCharacterDisplayState')
    expect(styles).toContain('min-height: 65px')
    expect(styles).toContain('.characterPopover')
  })

  it('always shows the generated-image 4x2 export grid and targets the active preview canvas', async () => {
    const exportPanel = await readFile(join(studioDir, 'StudioExportPanel.tsx'), 'utf8')
    const styles = await readFile(join(studioDir, 'StudioShell.module.css'), 'utf8')

    for (const label of ['PNG', 'JPG', 'WEBP', 'GIF', 'MP4', 'APNG', 'SVG', 'COPY']) {
      expect(exportPanel).toContain(`label: '${label}'`)
    }

    expect(exportPanel).toContain("'[data-studio-preview] canvas'")
    expect(exportPanel).not.toContain('character-ascii-canvas')
    expect(exportPanel).toContain('const disabled = !option.supported')
    expect(exportPanel).toContain('disabled={disabled}')
    expect(styles).toContain('grid-template-columns: repeat(4, minmax(0, 1fr))')
  })
})
