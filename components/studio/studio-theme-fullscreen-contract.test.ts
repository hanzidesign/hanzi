import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

const studioDir = join(process.cwd(), 'components', 'studio')

describe('Studio shared theme and fullscreen chrome contract', () => {
  it('uses Mantine as the shared theme source and syncs Studio state one way', async () => {
    const themeHook = await readFile(join(studioDir, 'use-shared-studio-theme.ts'), 'utf8')
    const shell = await readFile(join(studioDir, 'StudioShell.tsx'), 'utf8')
    const desktopToggle = await readFile(join(studioDir, 'StudioThemeToggle.tsx'), 'utf8')
    const mobileHeader = await readFile(join(studioDir, 'StudioMobileHeader.tsx'), 'utf8')

    expect(themeHook).toContain("useComputedColorScheme('dark')")
    expect(themeHook).toContain('useMantineColorScheme()')
    expect(themeHook).toContain("getAttribute('data-mantine-color-scheme')")
    expect(themeHook).toContain('setStudioTheme(resolvedTheme)')
    expect(shell).toContain('useSharedStudioTheme')
    expect(shell).toContain('onToggleTheme={toggleColorScheme}')
    expect(desktopToggle).toContain('onToggleTheme')
    expect(desktopToggle).not.toContain('toggleStudioTheme')
    expect(mobileHeader).toContain('onToggleTheme')
    expect(mobileHeader).not.toContain('toggleStudioTheme')
  })

  it('tracks both fullscreen targets, activity reset, cleanup, and rail state in CSS', async () => {
    const shell = await readFile(join(studioDir, 'StudioShell.tsx'), 'utf8')
    const styles = await readFile(join(studioDir, 'StudioShell.module.css'), 'utf8')

    expect(shell).toContain('FULLSCREEN_CHROME_IDLE_MS = 2000')
    expect(shell).toContain("'preview'")
    expect(shell).toContain("'shell'")
    expect(shell).toContain("'mousemove', 'pointerdown', 'click', 'keydown', 'focusin'")
    expect(shell).toContain("removeEventListener('fullscreenchange'")
    expect(shell).toContain('data-studio-fullscreen={fullscreenTarget ?? undefined}')
    expect(shell).toContain('data-studio-fullscreen-chrome=')
    expect(styles).toContain('.shell:fullscreen .leftPanel')
    expect(styles).toContain('.shell:fullscreen .mobilePanel')
    expect(styles).toContain(".shell[data-studio-fullscreen='shell'] .mobilePanel")
    expect(styles).toContain(".shell[data-studio-fullscreen='preview'] .previewCanvasFrame")
    expect(styles).toContain('visibility: hidden')
    expect(styles).toContain('pointer-events: none')
    expect(styles).toContain('@media (prefers-reduced-motion: reduce)')
  })
})
