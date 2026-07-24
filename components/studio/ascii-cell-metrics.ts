export const ASCII_SCALE_MIN = 1
export const ASCII_SCALE_MAX = 20
export const DEFAULT_ASCII_SCALE = 6
export const ASCII_CELL_SIZE_MIN = 1
export const ASCII_CELL_SIZE_MAX = 64

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export function asciiScaleToCellSize(scale: number) {
  const normalized = (clamp(scale, ASCII_SCALE_MIN, ASCII_SCALE_MAX) - ASCII_SCALE_MIN) /
    (ASCII_SCALE_MAX - ASCII_SCALE_MIN)

  return Math.round(ASCII_CELL_SIZE_MIN + normalized * (ASCII_CELL_SIZE_MAX - ASCII_CELL_SIZE_MIN))
}

export function asciiCellSizeToScale(cellSize: number) {
  const normalized = (clamp(cellSize, ASCII_CELL_SIZE_MIN, ASCII_CELL_SIZE_MAX) - ASCII_CELL_SIZE_MIN) /
    (ASCII_CELL_SIZE_MAX - ASCII_CELL_SIZE_MIN)

  const scale = ASCII_SCALE_MIN + normalized * (ASCII_SCALE_MAX - ASCII_SCALE_MIN)

  return Math.round(scale * 10) / 10
}
