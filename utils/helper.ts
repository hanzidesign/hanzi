export function wait<T = undefined>(milliseconds = 500, value?: T) {
  return new Promise<T | undefined>((resolve) => {
    setTimeout(() => {
      resolve(value)
    }, milliseconds)
  })
}

export function fillArray(n: number) {
  return Array.from({ length: n }, (_, i) => i)
}

export function getName(year: string, country: string, ch: string) {
  return `${year}-${country}-${ch}`
}
