import _ from 'lodash'
import { createSlice } from '@reduxjs/toolkit'
import { countries } from 'assets/list'
import type { PayloadAction } from '@reduxjs/toolkit'
import type { Metadata, NftData } from 'types'

export type EditorState = Metadata &
  NftData & {
    seed: number
    isTc: boolean
  }

const country = 'int'
const year = 2006

const initialState: EditorState = {
  charUrl: `/chars/${country}/${year}-1.svg`,
  svgData: '',
  ptnUrl: '/images/patterns/000.jpg',
  seed: 0,
  isTc: true,
  distortion: 10,
  blur: 0,
  width: 0,
  x: 0,
  y: 0,
  rotation: 0,
  textColor: `rgba(0, 0, 0, 1)`,
  bgColor: `rgba(255, 255, 255, 1)`,
  country: countries[country],
  year,
  ch: '亂',
}

// Actual Slice
export const slice = createSlice({
  name: 'editor',
  initialState,
  reducers: {
    setCharUrl(state, action) {
      const url = action.payload
      state.charUrl = url
      state.svgData = `<image href="${url}" x="0" y="0" width="100%" height="100%" />`
    },
    setSvgData(state, action) {
      state.svgData = action.payload
    },
    setPtnUrl(state, action) {
      state.ptnUrl = action.payload
    },
    setSeed(state, action) {
      state.seed = action.payload
    },
    setIsTc(state, action) {
      state.isTc = action.payload
    },
    setDistortion(state, action) {
      state.distortion = action.payload
    },
    setBlur(state, action) {
      state.blur = action.payload
    },
    setWidth(state, action) {
      state.width = action.payload
    },
    setPosition(state, action: PayloadAction<{ x?: number; y?: number }>) {
      const { x, y } = action.payload
      if (_.isNumber(x)) {
        state.x = x
      }
      if (_.isNumber(y)) {
        state.y = y
      }
    },
    setRotation(state, action) {
      state.rotation = action.payload
    },
    setColor(state, action: PayloadAction<{ k: string; c: string }>) {
      const { k, c } = action.payload
      const key = k === 'text' ? 'textColor' : 'bgColor'
      state[key] = c
    },
    setMetadata(state, action: PayloadAction<Metadata>) {
      const { country, year, ch } = action.payload
      state.country = country
      state.year = year
      state.ch = ch
    },
    reset(state) {
      state.distortion = 10
      state.blur = 0
      state.width = 0
      state.x = 0
      state.y = 0
      state.rotation = 0
    },
  },
})

export const {
  setCharUrl,
  setSvgData,
  setPtnUrl,
  setSeed,
  setIsTc,
  setDistortion,
  setBlur,
  setWidth,
  setPosition,
  setRotation,
  setColor,
  setMetadata,
  reset,
} = slice.actions

export default slice.reducer
