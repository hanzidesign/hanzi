const SIX_DIGIT_HEX_COLOR_PATTERN = /^#[0-9a-f]{6}$/i

export function isSixDigitHexColor(value: unknown): boolean {
  return typeof value === 'string' && SIX_DIGIT_HEX_COLOR_PATTERN.test(value)
}
