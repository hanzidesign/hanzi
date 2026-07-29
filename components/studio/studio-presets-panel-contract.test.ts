import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

const studioDir = join(process.cwd(), 'components', 'studio')

describe('Studio presets panel contract', () => {
  it('supports named preset lifecycle and all-preset JSON transfer', async () => {
    const panel = await readFile(join(studioDir, 'StudioPresetsPanel.tsx'), 'utf8')

    expect(panel).toContain('saveStudioPreset')
    expect(panel).toContain('applyStudioPreset')
    expect(panel).toContain('renameStudioPreset')
    expect(panel).toContain('deleteStudioPreset')
    expect(panel).toContain('serializeStudioPresets')
    expect(panel).toContain('parseStudioPresetsJson')
    expect(panel).toContain('importStudioPresets')
    expect(panel).toContain('Export All')
    expect(panel).toContain('accept="application/json,.json"')
    expect(panel).toContain('useId()')
    expect(panel).toContain('htmlFor={nameInputId}')
  })

  it('renders only in the desktop Presets section', async () => {
    const leftPanel = await readFile(join(studioDir, 'StudioLeftPanel.tsx'), 'utf8')
    const mobileTabs = await readFile(join(studioDir, 'StudioMobileTabs.tsx'), 'utf8')

    expect(leftPanel).toMatch(/id="presets"[\s\S]*?<StudioPresetsPanel \/>/)
    expect(mobileTabs).not.toContain('StudioPresetsPanel')
    expect(mobileTabs).toContain("mobileTab === 'export' ? <StudioExportPanel /> : null")
    expect(mobileTabs).toContain("{ id: 'effects', label: 'Effects'")
    expect(mobileTabs).not.toContain("{ id: 'presets'")
  })
})
