import {
  CanvasTexture,
  ClampToEdgeWrapping,
  DataTexture,
  NearestFilter,
  RGBAFormat,
  UnsignedByteType,
  type Texture,
} from 'three'

export const CHARACTER_SETS = {
  standard: '@%#*+=-:. ',
  blocks: '█▓▒░',
  binary: '01',
  detailed: '$@B%8&WM#*oahkbdpqwmZO0QLCJUYXzcvunxrjft/\\|()1{}[]?-_+~<>i!lI;:,"^`\'. ',
  minimal: '#.',
  alphabetic: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz',
  numeric: '0123456789',
  math: '+-*/=<>^%()[]{}|~',
  symbols: '!@#$%^&*()_+-=[]{}|;\':",./<>?`~',
  custom: '█▓▒░@#%*+=-:. ',
} as const

export type CharacterSetId = keyof typeof CHARACTER_SETS

export type CharacterGlyphAtlas = Readonly<{
  texture: Texture
  characters: string
  count: number
  columns: number
}>

const GLYPH_ATLAS_CELL_SIZE = 64

export function resolveCharacterSet(
  characterSet: CharacterSetId,
  customChars = '',
) {
  if (characterSet === 'custom' && customChars.length > 0) {
    return customChars
  }

  return CHARACTER_SETS[characterSet]
}

export function createCharacterGlyphAtlas(
  characterSet: CharacterSetId,
  customChars = '',
): CharacterGlyphAtlas {
  const characters = resolveCharacterSet(characterSet, customChars)
  const glyphs = Array.from(characters || CHARACTER_SETS.standard)
  const count = glyphs.length
  const columns = Math.max(1, Math.ceil(Math.sqrt(count)))
  const rows = Math.max(1, Math.ceil(count / columns))

  if (typeof document === 'undefined') {
    return { characters, count, columns, texture: createFallbackGlyphTexture() }
  }

  const canvas = document.createElement('canvas')
  canvas.width = columns * GLYPH_ATLAS_CELL_SIZE
  canvas.height = rows * GLYPH_ATLAS_CELL_SIZE
  const context = canvas.getContext('2d')

  if (!context) {
    return { characters, count, columns, texture: createFallbackGlyphTexture() }
  }

  context.clearRect(0, 0, canvas.width, canvas.height)
  context.fillStyle = '#ffffff'
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.font = `${Math.floor(GLYPH_ATLAS_CELL_SIZE * 0.76)}px ${readCanvasFontFamily()}`

  glyphs.forEach((glyph, index) => {
    if (glyph === ' ') return
    const column = index % columns
    const row = Math.floor(index / columns)
    const x = column * GLYPH_ATLAS_CELL_SIZE + GLYPH_ATLAS_CELL_SIZE / 2
    const y = row * GLYPH_ATLAS_CELL_SIZE + GLYPH_ATLAS_CELL_SIZE * 0.55
    context.fillText(glyph, x, y)
  })

  const texture = new CanvasTexture(canvas)
  configureGlyphTexture(texture)
  return { characters, count, columns, texture }
}

export function disposeCharacterGlyphAtlas(atlas: CharacterGlyphAtlas) {
  atlas.texture.dispose()
}

function createFallbackGlyphTexture() {
  const texture = new DataTexture(
    new Uint8Array([255, 255, 255, 255]),
    1,
    1,
    RGBAFormat,
    UnsignedByteType,
  )
  configureGlyphTexture(texture)
  return texture
}

function configureGlyphTexture(texture: Texture) {
  texture.magFilter = NearestFilter
  texture.minFilter = NearestFilter
  texture.wrapS = ClampToEdgeWrapping
  texture.wrapT = ClampToEdgeWrapping
  texture.needsUpdate = true
}

function readCanvasFontFamily() {
  if (typeof window === 'undefined') return 'monospace'
  const styles = window.getComputedStyle(document.documentElement)
  const bodyFont = styles.getPropertyValue('--font-body').trim()
  const notoFont = styles.getPropertyValue('--font-noto').trim()
  return [bodyFont, notoFont, 'monospace'].filter(Boolean).join(', ')
}
