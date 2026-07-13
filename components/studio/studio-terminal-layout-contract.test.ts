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
    expect(shellSource).toContain('Fullscreen')
    expect(shellSource).not.toContain('IoPauseOutline')
    expect(shellSource).not.toContain('IoPlayOutline')
    expect(shellSource).not.toContain('AppShell')
    expect(shellSource).not.toContain('Burger')
    expect(shellSource).not.toContain('PageHeader')
    expect(shellStyles).toContain("data-studio-theme='light'")
    expect(shellStyles).toContain("data-studio-theme='dark'")
    expect(shellStyles).toContain('grid-template-columns: 329px minmax(0, 1fr) 414px')
    expect(shellStyles).toContain('--studio-top-rail-height: 50px')
    expect(shellStyles).toContain('--studio-bottom-rail-height: 60px')
    expect(shellSource).toContain('previewTopRail')
    expect(shellStyles).toContain('max-height: 40vh')
  })

  it('matches the generated desktop preview rails and compact terminal rows', async () => {
    const canvasSource = await readFile(join(studioDir, 'StudioCanvas.tsx'), 'utf8')
    const rowSource = await readFile(join(studioDir, 'TerminalRows.tsx'), 'utf8')
    const sectionSource = await readFile(join(studioDir, 'TerminalSection.tsx'), 'utf8')
    const shellStyles = await readFile(join(studioDir, 'StudioShell.module.css'), 'utf8')

    expect(canvasSource).not.toContain('rendererStatus')
    expect(canvasSource).not.toContain('rendererMode')
    expect(canvasSource).toContain('className={classes.zoomSpacer}')
    expect(canvasSource).toContain('aria-label="Fit preview"')
    expect(rowSource.indexOf('{children}')).toBeLessThan(
      rowSource.indexOf('<span className={classes.controlValue}>{value}</span>'),
    )
    expect(sectionSource).toContain('⌄')
    expect(sectionSource).toContain('›')
    expect(shellStyles).toContain('height: var(--studio-top-rail-height)')
    expect(shellStyles).toContain('height: var(--studio-bottom-rail-height)')
    expect(shellStyles).toContain('grid-template-columns: 142px minmax(0, 1fr) 44px')
  })

  it('has dedicated desktop panels, mobile tabs, and a mobile settings sheet', async () => {
    const leftPanel = await readFile(join(studioDir, 'StudioLeftPanel.tsx'), 'utf8')
    const rightPanel = await readFile(join(studioDir, 'StudioRightPanel.tsx'), 'utf8')
    const mobileTabs = await readFile(join(studioDir, 'StudioMobileTabs.tsx'), 'utf8')
    const settingsSheet = await readFile(join(studioDir, 'StudioSettingsSheet.tsx'), 'utf8')

    expect(leftPanel).toContain('CharacterPanel')
    expect(leftPanel).toContain('Input')
    expect(leftPanel).toContain('Effects')
    expect(leftPanel).toContain('StudioMotionPanel')
    expect(leftPanel).toContain('3D Motion')
    expect(leftPanel).toContain('Presets')
    expect(leftPanel).toContain('GRAINRAD_EFFECTS')
    expect(leftPanel).not.toContain('id="animation"')
    expect(leftPanel.indexOf('title="Input"')).toBeLessThan(leftPanel.indexOf('title="Effects"'))
    expect(leftPanel.indexOf('title="Effects"')).toBeLessThan(leftPanel.indexOf('title="Presets"'))
    expect(rightPanel).toContain('Settings')
    expect(rightPanel).toContain('Processing')
    expect(rightPanel).toContain('Post-Processing')
    expect(rightPanel).toContain('Export')
    expect(mobileTabs).toContain('Input')
    expect(mobileTabs).toContain('Effects')
    expect(mobileTabs).toContain('StudioMotionPanel')
    expect(mobileTabs).not.toContain("id: 'animation'")
    expect(mobileTabs).toContain('Export')
    expect(mobileTabs).toContain('data-studio-mobile-tabs')
    expect(settingsSheet).toContain('data-studio-settings-sheet')
    expect(settingsSheet).toContain('Settings')
  })
})
