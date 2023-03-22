import { combineReducers } from '@reduxjs/toolkit'
import editor from './slices/editor'
import nft from './slices/nft'
import queue from './slices/queue'

const reducers = combineReducers({
  editor,
  nft,
  queue,
})

export default reducers
