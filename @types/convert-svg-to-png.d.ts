declare module 'convert-svg-to-png' {
  type Options = {
    allowDeprecatedAttributes: boolean
    background: string
    baseFile: string
    baseUrl: string
    height: number | string
    width: number | string
    puppeteer: any
    rounding: 'ceil' | 'floor' | 'round'
    scale: number
  }

  function convert(input: Buffer | string, options?: Partial<Options>): Promise<Buffer>
}
