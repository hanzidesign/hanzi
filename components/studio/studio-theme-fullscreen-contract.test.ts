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

  it('falls back when native fullscreen is unavailable and isolates mobile exit chrome', async () => {
    const shell = await readFile(join(studioDir, 'StudioShell.tsx'), 'utf8')
    const styles = await readFile(join(studioDir, 'StudioShell.module.css'), 'utf8')

    expect(shell).toContain('fallbackTarget')
    expect(shell).toContain('setFallbackTarget')
    expect(shell).toContain("targetKind === 'preview' ? previewRef.current : shellRef.current")
    expect(shell).not.toContain("document.querySelector<HTMLElement>(selector)")
    expect(shell).toContain("typeof target.requestFullscreen !== 'function'")
    expect(shell).toContain('Promise.resolve(target.requestFullscreen()).catch')
    expect(shell).toContain('IoContractOutline')
    expect(shell).toContain('className={classes.fullscreenExitButton}')
    expect(shell).toContain('aria-label="Exit fullscreen"')
    expect(shell).toContain("handleFullscreen('preview')")
    expect(shell).toContain("handleFullscreen('shell')")
    expect(shell).toContain("window.matchMedia('(max-width: 900px)').matches")
    expect(styles).toContain('.fullscreenExitButton')
    expect(styles).toContain(".shell[data-studio-fullscreen] .mobileHeader")
    expect(styles).toContain(".shell[data-studio-fullscreen] .mobilePanel")
    expect(styles).toContain(".shell[data-studio-fullscreen] .mobileTabs")
    expect(styles).toContain('.shell:fullscreen .mobileHeader')
    expect(styles).toContain('.shell:has(.preview:fullscreen) .mobileTabs')
    expect(styles).toContain(".shell[data-studio-fullscreen-chrome='visible'] .fullscreenExitButton")
    expect(styles).toContain(".shell[data-studio-fullscreen-chrome='hidden'] .fullscreenExitButton")
    expect(styles).toContain(".shell[data-studio-fullscreen='preview'] .mobilePanel")
    expect(styles).toContain('display: none;')
  })

  it('keeps preview zoom off the canvas measurement frame', async () => {
    const canvas = await readFile(join(studioDir, 'StudioCanvas.tsx'), 'utf8')
    const styles = await readFile(join(studioDir, 'StudioShell.module.css'), 'utf8')

    expect(canvas).toContain('type CSSProperties')
    expect(canvas).toContain("'--studio-preview-zoom': previewZoom")
    expect(canvas).toContain('style={previewCanvasFrameStyle}')
    expect(canvas).not.toContain('transform: `scale(${previewZoom})`')
    expect(styles).toContain('--studio-preview-zoom: 1')
    expect(styles).toContain('.previewCanvasFrame canvas')
    expect(styles).toContain('transform: scale(var(--studio-preview-zoom))')
    expect(styles).toContain('transform-origin: center center')
  })

  it('applies width-preserving camera framing before mobile fullscreen renders', async () => {
    const renderContext = await readFile(join(studioDir, 'studio-render-context.tsx'), 'utf8')
    const contour = await readFile(join(studioDir, 'CharacterContourCanvas.tsx'), 'utf8')

    expect(renderContext).toContain('resolvePreviewVerticalFov={renderContext.resolvePreviewVerticalFov}')
    expect(renderContext).toContain('resolvePreviewVerticalFov')
    expect(renderContext).toContain('mobileMediaQueryRef.current === null')
    expect(renderContext).toContain('shell === null || !shell.isConnected')
    expect(renderContext).toContain('}, -2)')
    expect(contour).toContain('resolvePreviewVerticalFov')
    expect(contour).toContain('CONTOUR_SOURCE_CAMERA_FOV')
    expect(contour.indexOf('source.camera.fov =')).toBeLessThan(
      contour.indexOf('source.camera.updateProjectionMatrix()'),
    )
  })
})
