import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

const studioDir = join(process.cwd(), 'components', 'studio')

describe('Phase 5D Grainrad terminal workbench layout contract', () => {
  it('splits Studio into left input, center preview, right controls, and mobile tabs', async () => {
    const shellSource = await readFile(join(studioDir, 'StudioShell.tsx'), 'utf8')
    const mobileTabsSource = await readFile(join(studioDir, 'StudioMobileTabs.tsx'), 'utf8')

    expect(shellSource).toContain('data-studio-terminal-shell')
    expect(shellSource).toContain('data-studio-left-panel')
    expect(shellSource).toContain('data-studio-preview')
    expect(shellSource).toContain('data-studio-right-panel')
    expect(mobileTabsSource).toContain('data-studio-mobile-tabs')
    expect(shellSource).toContain('StudioLeftPanel')
    expect(shellSource).toContain('StudioRightPanel')
    expect(shellSource).not.toContain('StudioControls')
  })

  it('keeps panel ownership explicit instead of one all-purpose accordion', async () => {
    const leftPanel = await readFile(join(studioDir, 'StudioLeftPanel.tsx'), 'utf8')
    const rightPanel = await readFile(join(studioDir, 'StudioRightPanel.tsx'), 'utf8')

    expect(leftPanel).toContain('CharacterPanel')
    expect(leftPanel).toContain('StudioEffectsPanel')
    expect(leftPanel).toContain('StudioMotionPanel')
    expect(leftPanel).toContain('id="presets"')
    expect(leftPanel).not.toContain('StudioPresetsPanel')
    expect(rightPanel).toContain('Settings')
    expect(rightPanel).toContain('Processing')
    expect(rightPanel).toContain('Post-Processing')
    expect(rightPanel).toContain('StudioExportPanel')
  })
})
