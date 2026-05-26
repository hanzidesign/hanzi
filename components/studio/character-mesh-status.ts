export type CharacterMeshStatus =
  | { state: 'idle' }
  | { state: 'loading'; message: string }
  | { state: 'error'; message: string }

export const IDLE_CHARACTER_MESH_STATUS: CharacterMeshStatus = { state: 'idle' }
