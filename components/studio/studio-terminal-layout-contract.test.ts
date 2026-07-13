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
    expect(shellStyles).toContain('position: fixed')
    expect(shellStyles).toContain('inset: 0')
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
    expect(sectionSource).toContain("expanded ? '−' : '+'")
    expect(shellStyles).toContain('height: var(--studio-top-rail-height)')
    expect(shellStyles).toContain('height: var(--studio-bottom-rail-height)')
    expect(shellStyles).toContain('grid-template-columns: 142px minmax(0, 1fr) 44px')
  })

  it('keeps every Character option inside the popover scrollport', async () => {
    const characterPanel = await readFile(join(studioDir, 'CharacterPanel.tsx'), 'utf8')
    const shellStyles = await readFile(join(studioDir, 'StudioShell.module.css'), 'utf8')

    expect(characterPanel.match(/characterPopoverScroll/g)).toHaveLength(1)
    expect(characterPanel).toContain('data-scrollbar-visible={scrollbarVisible}')
    expect(characterPanel).toContain('onPointerEnter={() => setScrollbarVisible(true)}')
    expect(characterPanel).toContain('onPointerLeave={() => setScrollbarVisible(false)}')
    expect(characterPanel.indexOf('Country')).toBeLessThan(
      characterPanel.indexOf('characterPopoverScroll'),
    )
    expect(characterPanel.indexOf('<span>Year</span>')).toBeLessThan(
      characterPanel.indexOf('characterPopoverScroll'),
    )
    expect(shellStyles).toContain('height: min(34rem, calc(100dvh - 2rem))')
    expect(shellStyles).toContain('grid-template-rows: auto minmax(0, 1fr)')
    expect(shellStyles).toContain('.characterPopoverScroll')
    expect(shellStyles).toContain('overflow-y: auto')
    expect(shellStyles).toContain('.characterPopover > .characterSelector:first-child')
    expect(shellStyles).toContain('padding: 0 10px 10px')
    expect(shellStyles).toContain('.characterPopoverScroll::-webkit-scrollbar')
    expect(shellStyles).toContain('width: 3px')
    expect(shellStyles).toContain('@supports not selector(::-webkit-scrollbar)')
    const characterScrollbarFallback = shellStyles.slice(
      shellStyles.indexOf('@supports not selector(::-webkit-scrollbar)'),
      shellStyles.indexOf('.characterPopoverScroll::-webkit-scrollbar'),
    )
    expect(characterScrollbarFallback).toContain('scrollbar-width: thin')
    expect(characterScrollbarFallback).toContain('scrollbar-color: transparent transparent')
    expect(shellStyles).toContain(".characterPopoverScroll[data-scrollbar-visible='true']::-webkit-scrollbar-thumb")
    expect(shellStyles).toContain('.characterPopoverScroll::-webkit-scrollbar-thumb:hover')
    expect(shellStyles).toContain('background-color: transparent')
    expect(shellStyles).toContain('var(--studio-text-bright) 55%')
    expect(shellStyles).toContain('var(--studio-text-bright) 85%')
    expect(shellStyles).toContain('transition: background-color 160ms ease')
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
