// import { persistReducer } from 'redux-persist'
// import storage from './customStorage'
import { combineReducers } from '@reduxjs/toolkit'
import editor from './slices/editor'
import nft from './slices/nft'
import queue from './slices/queue'

const reducers = combineReducers({
  // editor: persistReducer({ key: 'editor', storage, blacklist: ['ptnData'] }, editor),
  editor,
  nft,
  queue,
})

export default reducers
