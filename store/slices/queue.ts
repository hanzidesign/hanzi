import _ from 'lodash'
import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import type { Job } from 'types'

export type QueueState = {
  list: { [uid: string]: Job | undefined }
}

const initialState: QueueState = {
  list: {},
}

export const slice = createSlice({
  name: 'queue',
  initialState,
  reducers: {
    addJob(state, action: PayloadAction<Job>) {
      const { uid } = action.payload
      state.list = { ...state.list, [uid]: action.payload }
    },
    setStart(state, action: PayloadAction<{ uid: string; startAt?: number }>) {
      const { uid, startAt } = action.payload
      const job = state.list[uid]
      if (job) {
        const cloned = _.clone(state.list)
        cloned[uid] = { ...job, startAt, failed: false }
        state.list = cloned
      }
    },
    setIpfsUrl(state, action: PayloadAction<{ uid: string; ipfsUrl: string }>) {
      const { uid, ipfsUrl } = action.payload
      const job = state.list[uid]
      if (job) {
        const cloned = _.clone(state.list)
        cloned[uid] = { ...job, ipfsUrl }
        state.list = cloned
      }
    },
    setCancel(state, action: PayloadAction<string>) {
      const uid = action.payload
      const job = state.list[uid]
      if (job) {
        const { [uid]: i, ...rest } = state.list
        state.list = { ...rest }
      }
    },
    setSaved(state, action: PayloadAction<string>) {
      const uid = action.payload
      const job = state.list[uid]
      if (job) {
        const cloned = _.clone(state.list)
        cloned[uid] = { ...job, saved: true }
        state.list = cloned
      }
    },
    setFailed(state, action: PayloadAction<{ uid: string; failed: boolean }>) {
      const { uid, failed } = action.payload
      const job = state.list[uid]
      if (job) {
        const cloned = _.clone(state.list)
        cloned[uid] = { ...job, failed, startAt: undefined }
        state.list = cloned
      }
    },
  },
})

export const { addJob, setStart, setIpfsUrl, setCancel, setSaved, setFailed } = slice.actions
export default slice.reducer
