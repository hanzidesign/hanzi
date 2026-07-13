import {
  CanvasTexture,
  ClampToEdgeWrapping,
  DataTexture,
  LinearFilter,
  RGBAFormat,
  UnsignedByteType,
  Vector2,
} from 'three'

export const MATRIX_RAIN_CHARACTER_SETS = {
  standard: ' .:-=+*#%@',
  blocks: ' ░▒▓█',
  binary: ' 01',
  detailed: ' .\'`^",:;Il!i><~+_-?][}{1)(|\\/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$',
  minimal: ' .:#',
  alphabetic: ' .icotCOXWM',
  numeric: ' 1234567890',
  math: ' .-+×÷=≠<>≤≥∞∑∏√∫',
  emoji: ' ·•○◎●◐◑◒◓◔◕◖◗',
  custom: ' .:+*#@',
} as const

export type MatrixRainCharacterSetId = keyof typeof MATRIX_RAIN_CHARACTER_SETS

export const MATRIX_RAIN_DEFAULT_CUSTOM_CHARS =
  'ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ0123456789'

export const MATRIX_RAIN_GLYPH_ATLAS_SCALE = 1
export const MATRIX_RAIN_GLYPH_ATLAS_COLUMNS = 16
export const MATRIX_RAIN_GLYPH_WIDTH = 20
export const MATRIX_RAIN_GLYPH_HEIGHT = 32
export const MATRIX_RAIN_GLYPH_FONT =
  'bold 32px "JetBrains Mono", "SF Mono", "Fira Code", "Courier New", monospace'

export type MatrixRainGlyphAtlas = Readonly<{
  texture: CanvasTexture | DataTexture
  characters: string
  charset: string
  count: number
  columns: number
  cols: number
  rows: number
  scale: number
  charWidth: number
  charHeight: number
  size: Vector2
  characterSize: Vector2
}>

export function resolveMatrixRainCharacterSet(
  characterSet: MatrixRainCharacterSetId,
  customChars = '',
) {
  if (characterSet === 'custom') {
    return customChars.length > 0
      ? customChars
      : MATRIX_RAIN_CHARACTER_SETS.standard
  }

  return MATRIX_RAIN_CHARACTER_SETS[characterSet]
}

export function createMatrixRainGlyphAtlas(
  characterSet: MatrixRainCharacterSetId,
  customChars = '',
): MatrixRainGlyphAtlas {
  const characters = resolveMatrixRainCharacterSet(characterSet, customChars)
  const glyphs = characters.split('')
  const count = glyphs.length
  const columns = MATRIX_RAIN_GLYPH_ATLAS_COLUMNS
  const rows = Math.max(1, Math.ceil(count / columns))
  const width = columns * MATRIX_RAIN_GLYPH_WIDTH
  const height = rows * MATRIX_RAIN_GLYPH_HEIGHT
  const texture = createGlyphTexture(glyphs, columns, width, height)

  return {
    texture,
    characters,
    charset: characters,
    count,
    columns,
    cols: columns,
    rows,
    scale: MATRIX_RAIN_GLYPH_ATLAS_SCALE,
    charWidth: MATRIX_RAIN_GLYPH_WIDTH,
    charHeight: MATRIX_RAIN_GLYPH_HEIGHT,
    size: new Vector2(width, height),
    characterSize: new Vector2(
      MATRIX_RAIN_GLYPH_WIDTH,
      MATRIX_RAIN_GLYPH_HEIGHT,
    ),
  }
}

export function disposeMatrixRainGlyphAtlas(atlas: MatrixRainGlyphAtlas) {
  atlas.texture.dispose()
}

function createGlyphTexture(
  glyphs: string[],
  columns: number,
  width: number,
  height: number,
) {
  if (typeof document === 'undefined') {
    return createFallbackGlyphTexture()
  }

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')

  if (!context) {
    return createFallbackGlyphTexture()
  }

  context.fillStyle = '#000000'
  context.fillRect(0, 0, width, height)
  context.fillStyle = '#FFFFFF'
  context.font = MATRIX_RAIN_GLYPH_FONT
  context.textBaseline = 'top'
  context.textRendering = 'geometricPrecision'

  glyphs.forEach((glyph, index) => {
    const column = index % columns
    const row = Math.floor(index / columns)
    const x = column * MATRIX_RAIN_GLYPH_WIDTH
    const y = row * MATRIX_RAIN_GLYPH_HEIGHT
    context.fillText(glyph, x, y)
  })

  const texture = new CanvasTexture(canvas)
  configureGlyphTexture(texture)
  return texture
}

function createFallbackGlyphTexture() {
  const texture = new DataTexture(
    new Uint8Array([0, 0, 0, 255]),
    1,
    1,
    RGBAFormat,
    UnsignedByteType,
  )
  configureGlyphTexture(texture)
  return texture
}

function configureGlyphTexture(texture: CanvasTexture | DataTexture) {
  texture.magFilter = LinearFilter
  texture.minFilter = LinearFilter
  texture.wrapS = ClampToEdgeWrapping
  texture.wrapT = ClampToEdgeWrapping
  texture.generateMipmaps = false
  texture.needsUpdate = true
}
