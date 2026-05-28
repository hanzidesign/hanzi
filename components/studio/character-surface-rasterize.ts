export const CHARACTER_SURFACE_DEFAULT_MAX_TEXTURE_SIZE = 2048
export const CURRENT_PREVIEW_CAMERA_Z = 5
export const CURRENT_PREVIEW_CAMERA_FOV_DEGREES = 45
export const CURRENT_PREVIEW_CHARACTER_WORLD_SPAN = 2
export const CURRENT_PREVIEW_VERTICAL_INSET_PX = 48
export const CURRENT_PREVIEW_CHARACTER_SPAN_RATIO =
  CURRENT_PREVIEW_CHARACTER_WORLD_SPAN /
  getPerspectiveViewHeight(
    CURRENT_PREVIEW_CAMERA_Z,
    CURRENT_PREVIEW_CAMERA_FOV_DEGREES,
  )

type CharacterSurfaceViewport = {
  viewportWidth: number
  viewportHeight: number
}

type CharacterSurfaceRasterPlanOptions = CharacterSurfaceViewport & {
  maxTextureSize?: number
}

type SvgViewBox = {
  x: number
  y: number
  width: number
  height: number
}

type CharacterSurfaceFit = {
  x: number
  y: number
  width: number
  height: number
  flipY: boolean
}

export type CharacterSurfaceRasterPlan = {
  svg: CharacterSurfaceSvgMetadata
  mask: {
    width: number
    height: number
  }
  currentPreviewScaleBasis: number
  fit: CharacterSurfaceFit
}

export type CharacterSurfaceSvgMetadata = {
  viewBox: SvgViewBox
  aspectRatio: number
}

export type CharacterSurfaceMaskSource = {
  canvas: HTMLCanvasElement
  plan: CharacterSurfaceRasterPlan
}

const DRAWABLE_SVG_ELEMENT_PATTERN =
  /<(path|rect|circle|ellipse|line|polyline|polygon|text|image)\b/i

export function extractCharacterSurfaceSvgMetadata(
  svgText: string,
): CharacterSurfaceSvgMetadata {
  if (!svgText.trim()) {
    throw new Error('Character Surface received empty SVG data.')
  }

  if (!/<svg\b/i.test(svgText)) {
    throw new Error('Character Surface data is not an SVG document.')
  }

  if (!DRAWABLE_SVG_ELEMENT_PATTERN.test(svgText)) {
    throw new Error('Character SVG contains no drawable content.')
  }

  const viewBox = readSvgViewBox(svgText) ?? readSvgSizeAsViewBox(svgText)

  if (!viewBox || viewBox.width <= 0 || viewBox.height <= 0) {
    throw new Error('Character SVG must include a positive viewBox or size.')
  }

  return {
    viewBox,
    aspectRatio: viewBox.width / viewBox.height,
  }
}

export function createCharacterSurfaceRasterPlan(
  svgText: string,
  options: CharacterSurfaceRasterPlanOptions,
): CharacterSurfaceRasterPlan {
  const svg = extractCharacterSurfaceSvgMetadata(svgText)
  const mask = getBoundedMaskDimensions(
    options.viewportWidth,
    options.viewportHeight,
    options.maxTextureSize ?? CHARACTER_SURFACE_DEFAULT_MAX_TEXTURE_SIZE,
  )
  const currentPreviewScaleBasis = getCurrentPreviewScaleBasis(
    mask.width,
    mask.height,
    options.viewportHeight,
  )
  const fit = getCharacterFitRect(
    svg.aspectRatio,
    mask.width,
    mask.height,
    currentPreviewScaleBasis,
  )

  return {
    svg,
    mask,
    currentPreviewScaleBasis,
    fit,
  }
}

export async function rasterizeCharacterSurfaceMask(
  svgText: string,
  options: CharacterSurfaceRasterPlanOptions,
): Promise<CharacterSurfaceMaskSource> {
  const plan = createCharacterSurfaceRasterPlan(svgText, options)

  if (typeof document === 'undefined' || typeof Image === 'undefined') {
    throw new Error('Character Surface rasterization requires a browser.')
  }

  const canvas = document.createElement('canvas')
  canvas.width = plan.mask.width
  canvas.height = plan.mask.height

  const context = canvas.getContext('2d')

  if (!context) {
    throw new Error('Character Surface could not create a 2D canvas context.')
  }

  context.clearRect(0, 0, canvas.width, canvas.height)

  const image = await loadSvgImage(svgText)
  context.drawImage(
    image,
    plan.fit.x,
    plan.fit.y,
    plan.fit.width,
    plan.fit.height,
  )

  return {
    canvas,
    plan,
  }
}

function getPerspectiveViewHeight(cameraZ: number, fovDegrees: number) {
  return 2 * cameraZ * Math.tan((fovDegrees * Math.PI) / 360)
}

function getBoundedMaskDimensions(
  viewportWidth: number,
  viewportHeight: number,
  maxTextureSize: number,
) {
  if (
    !Number.isFinite(viewportWidth) ||
    !Number.isFinite(viewportHeight) ||
    viewportWidth <= 0 ||
    viewportHeight <= 0
  ) {
    throw new Error('Character Surface viewport must have positive dimensions.')
  }

  const boundedMaxTextureSize = Math.max(1, Math.floor(maxTextureSize))
  const scale = Math.min(
    1,
    boundedMaxTextureSize / Math.max(viewportWidth, viewportHeight),
  )

  return {
    width: Math.max(1, Math.round(viewportWidth * scale)),
    height: Math.max(1, Math.round(viewportHeight * scale)),
  }
}

function getCharacterFitRect(
  svgAspectRatio: number,
  maskWidth: number,
  maskHeight: number,
  currentPreviewScaleBasis: number,
): CharacterSurfaceFit {
  const maxCharacterSpan =
    currentPreviewScaleBasis * CURRENT_PREVIEW_CHARACTER_SPAN_RATIO
  const isWide = svgAspectRatio >= 1
  const width = isWide ? maxCharacterSpan : maxCharacterSpan * svgAspectRatio
  const height = isWide ? maxCharacterSpan / svgAspectRatio : maxCharacterSpan

  return {
    x: (maskWidth - width) / 2,
    y: (maskHeight - height) / 2,
    width,
    height,
    flipY: false,
  }
}

function getCurrentPreviewScaleBasis(
  maskWidth: number,
  maskHeight: number,
  viewportHeight: number,
) {
  const textureScale = maskHeight / viewportHeight
  const oldPreviewHeight =
    maskHeight - CURRENT_PREVIEW_VERTICAL_INSET_PX * textureScale

  return Math.max(1, Math.min(maskWidth, oldPreviewHeight))
}

function readSvgViewBox(svgText: string): SvgViewBox | null {
  const viewBox = readSvgAttribute(svgText, 'viewBox')

  if (!viewBox) {
    return null
  }

  const [x, y, width, height] = viewBox
    .trim()
    .split(/[\s,]+/)
    .map((value) => Number(value))

  if (![x, y, width, height].every(Number.isFinite)) {
    return null
  }

  return { x, y, width, height }
}

function readSvgSizeAsViewBox(svgText: string): SvgViewBox | null {
  const width = readSvgLength(readSvgAttribute(svgText, 'width'))
  const height = readSvgLength(readSvgAttribute(svgText, 'height'))

  if (!width || !height) {
    return null
  }

  return {
    x: 0,
    y: 0,
    width,
    height,
  }
}

function readSvgAttribute(svgText: string, name: string) {
  const svgTag = svgText.match(/<svg\b[^>]*>/i)?.[0]

  if (!svgTag) {
    return null
  }

  const attributeMatch = svgTag.match(
    new RegExp(`${name}\\s*=\\s*["']([^"']+)["']`, 'i'),
  )

  return attributeMatch?.[1] ?? null
}

function readSvgLength(value: string | null) {
  if (!value) {
    return null
  }

  const match = value.trim().match(/^([0-9]+(?:\.[0-9]+)?)/)

  if (!match) {
    return null
  }

  const length = Number(match[1])

  return Number.isFinite(length) && length > 0 ? length : null
}

function loadSvgImage(svgText: string) {
  const blob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' })
  const objectUrl = URL.createObjectURL(blob)

  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()

    image.onload = () => {
      URL.revokeObjectURL(objectUrl)
      resolve(image)
    }
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('Character Surface could not decode SVG image.'))
    }
    image.src = objectUrl
  })
}
