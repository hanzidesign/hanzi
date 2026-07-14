import type { PixelSortSettings } from './pixel-sort-core'

export type PixelSortWorkerRenderRequest = Readonly<{
  id: number
  width: number
  height: number
  rgba: ArrayBuffer
  settings: PixelSortSettings
}>

export type PixelSortWorkerRenderSuccess = Readonly<{
  id: number
  ok: true
  width: number
  height: number
  rgba: ArrayBuffer
}>

export type PixelSortWorkerRenderFailure = Readonly<{
  id: number
  ok: false
  error: string
}>

export type PixelSortWorkerRenderResponse =
  | PixelSortWorkerRenderSuccess
  | PixelSortWorkerRenderFailure

export type PixelSortWorkerRenderInput = Omit<PixelSortWorkerRenderRequest, 'id'>
export type PixelSortWorkerRenderOutput = Omit<PixelSortWorkerRenderSuccess, 'id' | 'ok'>
