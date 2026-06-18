import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

const studioDir = join(process.cwd(), 'components', 'studio')

describe('Phase 5D Grainrad terminal Studio layout contract', () => {
  it('uses a route-local terminal shell instead of the old AppShell workbench', async () => {
    const shellSource = await readFile(join(studioDir, 'StudioShell.tsx'), 'utf8')
    const shellStyles = await readFile(join(studioDir, 'StudioShell.module.css'), 'utf8')
    const mobileTabs = await readFile(join(studioDir, 'StudioMobileTabs.tsx'), 'utf8')

    expect(shellSource).toContain('data-studio-terminal-shell')
    expect(shellSource).toContain('data-studio-theme')
    expect(shellSource).toContain('data-studio-left-panel')
    expect(shellSource).toContain('data-studio-preview')
    expect(shellSource).toContain('data-studio-right-panel')
    expect(mobileTabs).toContain('data-studio-mobile-tabs')
    expect(shellSource).toContain('StudioThemeToggle')
    expect(shellSource).not.toContain('AppShell')
    expect(shellSource).not.toContain('Burger')
    expect(shellSource).not.toContain('PageHeader')
    expect(shellStyles).toContain("data-studio-theme='light'")
    expect(shellStyles).toContain("data-studio-theme='dark'")
    expect(shellStyles).toContain('grid-template-columns: 18rem minmax(0, 1fr) 22rem')
    expect(shellStyles).toContain('max-height: 40vh')
  })

  it('has dedicated desktop panels, mobile tabs, and a mobile settings sheet', async () => {
    const leftPanel = await readFile(join(studioDir, 'StudioLeftPanel.tsx'), 'utf8')
    const rightPanel = await readFile(join(studioDir, 'StudioRightPanel.tsx'), 'utf8')
    const mobileTabs = await readFile(join(studioDir, 'StudioMobileTabs.tsx'), 'utf8')
    const settingsSheet = await readFile(join(studioDir, 'StudioSettingsSheet.tsx'), 'utf8')

    expect(leftPanel).toContain('CharacterPanel')
    expect(leftPanel).toContain('Input')
    expect(leftPanel).toContain('Effects')
    expect(leftPanel).toContain('Animation')
    expect(leftPanel).toContain('GRAINRAD_EFFECTS')
    expect(leftPanel).not.toContain('Presets')
    expect(rightPanel).toContain('Settings')
    expect(rightPanel).toContain('Processing')
    expect(rightPanel).toContain('Post-Processing')
    expect(rightPanel).toContain('Export')
    expect(mobileTabs).toContain('Input')
    expect(mobileTabs).toContain('Effects')
    expect(mobileTabs).toContain('Animation')
    expect(mobileTabs).not.toContain('Presets')
    expect(mobileTabs).toContain('Export')
    expect(mobileTabs).toContain('data-studio-mobile-tabs')
    expect(settingsSheet).toContain('data-studio-settings-sheet')
    expect(settingsSheet).toContain('Settings')
  })
})
