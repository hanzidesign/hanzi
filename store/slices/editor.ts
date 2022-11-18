import _ from 'lodash'
import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'

export type EditorState = {
  charUrl: string
  ptnUrl: string
  distortion: number
  blur: number
  width: number
  x: number
  y: number
  rotation: number
  textColor: string
  bgColor: string
}

const initialState: EditorState = {
  charUrl: '/chars/int/2006-1.svg',
  ptnUrl: '/images/patterns/000.jpg',
  distortion: 10,
  blur: 0,
  width: 0,
  x: 0,
  y: 0,
  rotation: 0,
  textColor: `rgba(0, 0, 0, 1)`,
  bgColor: `rgba(255, 255, 255, 1)`,
}

// Actual Slice
export const slice = createSlice({
  name: 'editor',
  initialState,
  reducers: {
    setCharUrl(state, action) {
      state.charUrl = action.payload
    },
    setPtnUrl(state, action) {
      state.ptnUrl = action.payload
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
    setColor(state, action: PayloadAction<{ k: 'text' | 'bg'; c: string }>) {
      const { k, c } = action.payload
      const key = k === 'text' ? 'textColor' : 'bgColor'
      state[key] = c
    },
  },
})

export const {
  setCharUrl,
  setPtnUrl,
  setDistortion,
  setBlur,
  setWidth,
  setPosition,
  setRotation,
  setColor,
} = slice.actions

export default slice.reducer
