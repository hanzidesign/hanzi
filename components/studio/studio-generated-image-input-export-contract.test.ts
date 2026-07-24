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

  it('renders the four formats through a hidden fixed-size square canvas', async () => {
    const exportPanel = await readFile(join(studioDir, 'StudioExportPanel.tsx'), 'utf8')
    const exportSurface = await readFile(join(studioDir, 'StudioExportRenderSurface.tsx'), 'utf8')
    const renderContext = await readFile(join(studioDir, 'studio-render-context.tsx'), 'utf8')
    const styles = await readFile(join(studioDir, 'StudioShell.module.css'), 'utf8')

    for (const label of ['PNG', 'APNG', 'GIF', 'MP4']) {
      expect(exportPanel).toContain(`label: '${label}'`)
    }
    for (const removedLabel of ['JPG', 'WEBP', 'SVG', 'COPY']) {
      expect(exportPanel).not.toContain(`label: '${removedLabel}'`)
    }

    expect(exportPanel).not.toContain("'[data-studio-preview] canvas'")
    expect(exportPanel).not.toContain('createFixedExportCanvas')
    expect(exportPanel).not.toContain('character-ascii-canvas')
    expect(exportPanel).toContain('requestExportFrame')
    expect(exportPanel).toContain('readLatestPreviewAnimationTime()')
    expect(exportPanel).toContain('renderFrame(frame.animationTime)')
    expect(exportPanel).toContain('canvas.width !== pending.size')
    expect(exportSurface).toContain('data-studio-export-render-surface')
    expect(exportSurface).toContain('style={{ width: size, height: size }}')
    expect(exportSurface).toContain('initialAnimationTime={initialAnimationTime}')
    expect(renderContext).toContain('dpr={exportRender ? 1 : dpr}')
    expect(renderContext).toContain('onFrameRendered?.(requestId, gl.domElement)')
    expect(renderContext).toContain('readLatestPreviewAnimationTime')
    expect(renderContext).toContain('export function useStudioRenderMode()')
    expect(renderContext).toContain('new AnimationTimeline(initialAnimationTime ?? timeOffset, timeOffset)')
    expect(renderContext).toContain('export function reportLatestPreviewAnimationTime(')
    expect(renderContext).not.toContain('Math.max(0, animationTime)')
    expect(exportPanel).toContain('disabled={disabled}')
    expect(exportPanel).toContain('const pngAvailable = !motionPlaying')
    expect(exportPanel).toContain('motionSpeed >= MIN_MOTION_SPEED')
    expect(exportPanel).toContain('PNG_EXPORT_SIZE = 2048')
    expect(exportPanel).toContain('ANIMATION_EXPORT_SIZE = 1024')
    expect(exportPanel).toContain('createPortal')
    expect(exportPanel).toContain('role="progressbar"')
    expect(exportPanel).toContain('Cancel')
    expect(exportPanel).toContain('Download')
    expect(exportPanel).toContain("compressExportBlob(rawBlob, 'png')")
    expect(exportPanel).toContain("format === 'gif'")
    expect(styles).toContain('grid-template-columns: repeat(4, minmax(0, 1fr))')
    expect(styles).toContain('.exportModalBackdrop')
    expect(styles).toContain('.exportRenderSurface')
    expect(styles).toContain('left: -10000px')
    expect(styles).not.toContain('.exportRenderSurface {\n  display: none')
    expect(styles).toContain('align-items: center')
    expect(styles).toContain('justify-content: center')
  })
})
