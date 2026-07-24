import type { ReactNode } from 'react'

/** The decorative stroke field is laid out in an 8 × 8, 1000-unit SVG. */
export const KAISHU_VIEWBOX_SIZE = 1000
export const KAISHU_GRID_SIZE = 8
export const KAISHU_CELL_PITCH = KAISHU_VIEWBOX_SIZE / KAISHU_GRID_SIZE
export const KAISHU_JITTER_MAX = 6
export const KAISHU_ROTATION_MAX_DEGREES = 8
export const KAISHU_SCALE_MIN = 0.84
export const KAISHU_SCALE_MAX = 0.96
export const KAISHU_MAX_LOCAL_WIDTH = 76
export const KAISHU_MAX_LOCAL_HEIGHT = 82
export const KAISHU_MAX_STROKE_WIDTH = 1.2
export const KAISHU_MAX_RELATIVE_PARALLAX_X = 26
export const KAISHU_MAX_RELATIVE_PARALLAX_Y = 17
export const KAISHU_OPACITY_MIN = 0.56
export const KAISHU_OPACITY_MAX = 0.88
export const KAISHU_DOT_LOCAL_SCALE = 0.42
export const KAISHU_DEPTH_OPACITIES = [0.38, 0.52, 0.64] as const

/** The original source contains twelve exact filled Kaishu silhouettes. */
export const KAISHU_STROKE_SOURCE_PATHS = [
  'M3760 4275 c0 -3 5 -16 12 -28 31 -58 49 -194 55 -414 6 -248 -5 -386 -43 -546 -22 -91 -23 -102 -9 -123 19 -29 117 -96 126 -86 26 31 49 263 49 507 0 110 7 278 15 374 9 95 13 181 10 191 -3 10 -34 32 -68 50 -34 18 -81 44 -104 57 -24 14 -43 22 -43 18z',
  'M4770 4015 c0 -26 228 -393 330 -531 73 -98 177 -213 221 -245 16 -11 53 -24 84 -29 58 -9 295 -2 295 10 0 3 -37 24 -82 45 -238 115 -478 320 -630 538 -35 49 -75 106 -89 126 -22 31 -129 103 -129 86z',
  'M1280 3824 c-258 -78 -640 -156 -777 -158 -46 -1 -83 -3 -83 -6 0 -3 28 -35 63 -72 49 -53 69 -68 91 -68 15 0 143 29 284 64 142 35 336 76 432 91 173 26 288 53 344 82 l28 15 -52 35 c-67 45 -111 63 -152 62 -18 0 -98 -20 -178 -45z',
  'M2295 3859 c-3 -3 32 -46 76 -95 45 -49 124 -140 176 -201 52 -62 99 -113 104 -113 30 0 56 161 39 243 -19 93 -54 122 -176 147 -74 16 -214 28 -219 19z',
  'M995 2741 c15 -69 -78 -339 -177 -515 -102 -183 -201 -317 -343 -465 -86 -90 -82 -95 25 -40 215 110 393 326 586 708 85 171 105 231 83 257 -14 18 -148 84 -169 84 -8 0 -9 -10 -5 -29z',
  'M3760 2706 c0 -7 6 -35 14 -62 49 -167 59 -685 14 -716 -7 -5 -34 -6 -60 -3 -27 3 -48 3 -48 -1 0 -15 153 -213 161 -208 14 8 56 94 68 141 6 23 16 178 21 344 5 166 15 328 21 359 8 42 8 63 0 78 -13 25 -191 88 -191 68z',
  'M4837 2483 c-19 -391 -3 -494 93 -575 78 -67 237 -96 425 -78 202 20 263 51 283 145 6 28 14 113 17 190 l7 140 -42 -75 c-95 -171 -148 -213 -308 -245 -106 -22 -261 -17 -313 8 -42 21 -74 73 -83 137 -8 56 8 210 34 316 l19 79 -25 26 c-13 14 -42 35 -63 47 l-38 22 -6 -137z',
  'M1807 2553 c-11 -17 85 -80 132 -87 82 -12 141 -58 288 -223 142 -158 245 -262 297 -301 l48 -35 137 21 c75 12 161 25 191 30 l55 7 -140 74 c-220 117 -337 190 -520 325 -225 167 -272 190 -391 194 -50 2 -94 0 -97 -5z',
  'M3490 1354 c0 -35 75 -239 124 -336 83 -165 159 -272 286 -399 104 -104 124 -121 210 -162 52 -25 108 -48 124 -52 l29 -6 -6 63 c-11 110 -50 348 -57 348 -4 0 -21 -48 -39 -106 -37 -119 -30 -116 -119 -55 -167 114 -303 311 -385 556 l-33 100 -60 32 c-68 37 -74 39 -74 17z',
  'M4960 1361 c0 -5 24 -40 53 -78 l52 -68 -2 -105 c-2 -130 -33 -313 -73 -432 -35 -106 -36 -108 -10 -140 16 -21 36 -28 112 -42 140 -26 252 -67 435 -161 92 -47 168 -83 171 -80 10 9 -88 142 -141 192 -65 62 -125 85 -305 118 -75 14 -143 27 -151 30 -20 8 -12 45 57 270 130 426 130 425 -59 471 -57 14 -112 27 -121 30 -10 3 -18 1 -18 -5z',
  'M432 1163 c-6 -32 -22 -113 -36 -180 -34 -158 -34 -254 -3 -314 28 -53 87 -92 172 -114 109 -28 395 -15 562 26 101 25 162 74 183 147 13 43 39 302 31 302 -3 -1 -24 -29 -46 -63 -63 -98 -149 -178 -235 -220 -128 -61 -217 -81 -360 -82 -148 0 -193 15 -223 77 -16 32 -17 45 -7 100 10 51 55 202 85 280 5 12 -8 28 -45 57 -29 23 -55 41 -60 41 -4 0 -13 -26 -18 -57z',
  'M1756 1193 c49 -211 159 -387 312 -501 145 -107 277 -152 452 -152 202 0 366 49 416 125 28 43 12 67 -103 153 -60 44 -153 118 -208 166 -55 47 -104 86 -108 86 -9 0 -4 -10 90 -174 41 -71 71 -132 66 -136 -16 -15 -115 -30 -197 -30 -157 0 -308 57 -440 166 -64 53 -131 130 -226 261 -49 68 -64 78 -54 36z',
] as const

/** Crop rectangles in the transformed 600 × 450 source coordinate system. */
export const KAISHU_STROKE_CROPS = [
  { x: 374, y: 20, width: 26, height: 124.5 },
  { x: 475, y: 46, width: 97, height: 85.5 },
  { x: 40, y: 61, width: 128.5, height: 39 },
  { x: 227.5, y: 61.5, width: 44.5, height: 45.5 },
  { x: 39, y: 171, width: 80.5, height: 112.5 },
  { x: 366, y: 177, width: 32, height: 103.5 },
  { x: 481, y: 186, width: 87.5, height: 84 },
  { x: 178.5, y: 192, width: 119, height: 69.5 },
  { x: 347, y: 311, width: 81.5, height: 101.5 },
  { x: 494, y: 311, width: 78, height: 115.5 },
  { x: 35, y: 326, width: 101.5, height: 71.5 },
  { x: 173, y: 326, width: 124, height: 71.5 },
] as const

/** Exactly 57 paths are used by the home page (19 in each depth layer). */
export const KAISHU_STROKE_OUTLINES = Array.from(
  { length: 57 },
  (_, index) => KAISHU_STROKE_SOURCE_PATHS[index % KAISHU_STROKE_SOURCE_PATHS.length]
)
export const KAISHU_STROKE_COUNT = KAISHU_STROKE_OUTLINES.length

export type KaishuStrokePlacement = {
  outlineIndex: number
  slotIndex: number
  translateX: number
  translateY: number
  rotation: number
  scale: number
  opacity: number
  strokeWidth: number
}

function clampRandom(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0
  if (value >= 1) return 1 - Number.EPSILON
  return value
}

function randomSigned(random: () => number, magnitude: number): number {
  return clampRandom(random()) * magnitude * 2 - magnitude
}

/**
 * Build one stable, shuffled set of positions.  The caller can inject a
 * random source for tests; all values are clamped so malformed sources cannot
 * push a contour beyond the layout contract.
 */
export function createKaishuStrokePlacements(random: () => number): KaishuStrokePlacement[] {
  const slots = Array.from({ length: KAISHU_GRID_SIZE * KAISHU_GRID_SIZE }, (_, index) => index)

  for (let index = slots.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(clampRandom(random()) * (index + 1))
    ;[slots[index], slots[randomIndex]] = [slots[randomIndex], slots[index]]
  }

  return KAISHU_STROKE_OUTLINES.map((_, outlineIndex) => {
    const slotIndex = slots[outlineIndex]
    const row = Math.floor(slotIndex / KAISHU_GRID_SIZE)
    const column = slotIndex % KAISHU_GRID_SIZE

    return {
      outlineIndex,
      slotIndex,
      translateX:
        (column + 0.5) * KAISHU_CELL_PITCH + randomSigned(random, KAISHU_JITTER_MAX),
      translateY: (row + 0.5) * KAISHU_CELL_PITCH + randomSigned(random, KAISHU_JITTER_MAX),
      rotation: randomSigned(random, KAISHU_ROTATION_MAX_DEGREES),
      scale:
        KAISHU_SCALE_MIN +
        clampRandom(random()) * (KAISHU_SCALE_MAX - KAISHU_SCALE_MIN),
      opacity:
        KAISHU_OPACITY_MIN +
        clampRandom(random()) * (KAISHU_OPACITY_MAX - KAISHU_OPACITY_MIN),
      strokeWidth:
        0.8 + clampRandom(random()) * (KAISHU_MAX_STROKE_WIDTH - 0.8),
    }
  })
}

let cachedKaishuStrokePlacements: KaishuStrokePlacement[] | undefined

function cryptoRandom(): number {
  const cryptoObject = globalThis.crypto
  if (cryptoObject?.getRandomValues) {
    const values = new Uint32Array(1)
    cryptoObject.getRandomValues(values)
    return values[0] / 0x1_0000_0000
  }
  return Math.random()
}

/** Return the document-lifetime layout, including across Strict Mode replays. */
export function getKaishuStrokePlacements(): KaishuStrokePlacement[] {
  if (!cachedKaishuStrokePlacements) {
    cachedKaishuStrokePlacements = createKaishuStrokePlacements(cryptoRandom)
  }
  return cachedKaishuStrokePlacements
}

/**
 * Serialize the cached contour field for GPU rasterization.  The dimensions
 * are bitmap dimensions (rather than CSS dimensions), while the root
 * viewBox deliberately stays identical to the DOM SVG so xMidYMid slice has
 * the same crop.  `strokeScale` is the backing/CSS pixel ratio supplied by
 * the canvas resize path.
 */
export function serializeKaishuStrokeMaskSvg(
  backingWidth: number,
  backingHeight: number,
  placements: readonly KaishuStrokePlacement[] = getKaishuStrokePlacements(),
  strokeScale = 1
): string {
  const width = Math.max(1, Math.floor(backingWidth))
  const height = Math.max(1, Math.floor(backingHeight))
  const safeStrokeScale = Number.isFinite(strokeScale) && strokeScale > 0 ? strokeScale : 1
  const contours = KAISHU_STROKE_OUTLINES.map((outline, pathIndex) => {
    const placement = placements[pathIndex]
    if (!placement) {
      return ''
    }

    const sourceIndex = pathIndex % KAISHU_STROKE_CROPS.length
    const crop = KAISHU_STROKE_CROPS[sourceIndex]
    const localScale = sourceIndex === 3 ? KAISHU_DOT_LOCAL_SCALE : 1
    const localWidth = Math.round(KAISHU_MAX_LOCAL_WIDTH * localScale * 100) / 100
    const localHeight = Math.round(KAISHU_MAX_LOCAL_HEIGHT * localScale * 100) / 100
    const transform = `translate(${placement.translateX.toFixed(2)} ${placement.translateY.toFixed(2)}) rotate(${placement.rotation.toFixed(2)}) scale(${placement.scale.toFixed(3)})`
    const strokeWidth = (placement.strokeWidth * safeStrokeScale).toFixed(3)
    const layerOpacity = KAISHU_DEPTH_OPACITIES[Math.floor(pathIndex / 19)] ?? 1
    const opacity = (placement.opacity * layerOpacity).toFixed(3)

    return `<g transform="${transform}"><svg x="${(-localWidth / 2).toFixed(2)}" y="${(-localHeight / 2).toFixed(2)}" width="${localWidth.toFixed(2)}" height="${localHeight.toFixed(2)}" viewBox="${crop.x} ${crop.y} ${crop.width} ${crop.height}" preserveAspectRatio="xMidYMid meet"><g transform="translate(0 450) scale(.1 -.1)"><path d="${outline}" fill="none" stroke="#fff" stroke-width="${strokeWidth}" stroke-linejoin="miter" stroke-miterlimit="2.5" vector-effect="non-scaling-stroke" opacity="${opacity}" /></g></svg></g>`
  }).join('')

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${KAISHU_VIEWBOX_SIZE} ${KAISHU_VIEWBOX_SIZE}" preserveAspectRatio="xMidYMid slice">${contours}</svg>`
}

type KaishuStrokePathsProps = {
  layerClassNames: readonly [string, string, string]
}

/** Pure SVG renderer: no text, font, canvas, or CSS dependency. */
export function KaishuStrokePaths({ layerClassNames }: KaishuStrokePathsProps): ReactNode {
  return (
    <>
      {layerClassNames.map((className, layerIndex) => {
        const start = layerIndex * 19
        const layerOutlines = KAISHU_STROKE_OUTLINES.slice(start, start + 19)

        return (
          <g className={className} key={layerIndex}>
            {layerOutlines.map((outline, outlineIndex) => {
              const pathIndex = start + outlineIndex
              const sourceIndex = pathIndex % KAISHU_STROKE_CROPS.length
              const crop = KAISHU_STROKE_CROPS[sourceIndex]
              const localScale = sourceIndex === 3 ? KAISHU_DOT_LOCAL_SCALE : 1
              const localWidth = Math.round(KAISHU_MAX_LOCAL_WIDTH * localScale * 100) / 100
              const localHeight = Math.round(KAISHU_MAX_LOCAL_HEIGHT * localScale * 100) / 100

              return (
                <g data-kaishu-stroke="true" key={pathIndex}>
                  <svg
                    height={localHeight}
                    preserveAspectRatio="xMidYMid meet"
                    viewBox={`${crop.x} ${crop.y} ${crop.width} ${crop.height}`}
                    width={localWidth}
                    x={-localWidth / 2}
                    y={-localHeight / 2}
                  >
                    <g transform="translate(0 450) scale(.1 -.1)">
                      <path d={outline} vectorEffect="non-scaling-stroke" />
                    </g>
                  </svg>
                </g>
              )
            })}
          </g>
        )
      })}
    </>
  )
}
