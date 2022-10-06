import { createSlice } from '@reduxjs/toolkit'

export type EditorState = {
  charUrl: string
}

const initialState: EditorState = {
  charUrl: '',
}

// Actual Slice
export const slice = createSlice({
  name: 'editor',
  initialState,
  reducers: {
    setCharUrl(state, action) {
      state.charUrl = action.payload
    },
  },
})

export const { setCharUrl } = slice.actions

export default slice.reducer
