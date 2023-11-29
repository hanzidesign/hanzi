import { createLogger } from 'redux-logger'

const ignoreTypes = ['persist/PERSIST', 'persist/REHYDRATE']

export const logger = createLogger({
  predicate: (getState, action) => !ignoreTypes.includes(action.type),
})
