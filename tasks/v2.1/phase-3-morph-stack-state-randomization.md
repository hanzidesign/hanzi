# Phase 3: Morph Stack State And Randomization

**Purpose:** Move the editor state from mesh/displacement semantics to Character Surface, Morph Stack, shader layers, pattern layers, locks, and randomization.

## Scope

- Zustand state and tests.
- No full UI rewrite yet.
- No shader implementation for every morph yet.

## Files

- Modify: `app/studio/studio-store.ts`
- Modify: `app/studio/studio-store.test.ts`
- Create: `app/studio/studio-store-v2_1-fixtures.test.ts`
- Modify: `components/studio/StudioControls.tsx`

## State Shape

Persist:

- selected character
- Morph Stack layers, order, params, enabled/collapsed/locked state
- Surface Shader Layers and locks
- Pattern Layers, sources, targets, locks
- random seed
- renderer mode selection
- active panel

Do not persist:

- uploaded image binaries or data URLs
- generated mask/SDF textures
- WebGPU availability
- transient render errors

## Steps

1. Add failing store tests for default v2.1 state.

2. Add tests for persistence payload:
   - includes Morph Stack
   - includes locks
   - includes Pattern Layer metadata
   - excludes runtime textures/data URLs

3. Add tests for randomize behavior:
   - locked Morph layers are preserved
   - locked Surface Shader Layers are preserved
   - locked Pattern Layers are preserved
   - seed reproduces stack

4. Update store types and defaults.

5. Add actions:
   - `addMorphLayer`
   - `duplicateMorphLayer`
   - `removeMorphLayer`
   - `reorderMorphLayer`
   - `updateMorphLayerParam`
   - `setMorphLayerLocked`
   - `randomizeMorphPreset`
   - `setSurfaceShaderLayer`
   - `setSurfaceShaderLayerLocked`
   - `addPatternLayer`
   - `removePatternLayer`
   - `updatePatternLayer`
   - `setPatternLayerLocked`

6. Add migration from old persisted key or use a new storage key if migration would be risky.

7. Run:

   ```sh
   pnpm vitest run app/studio/studio-store.test.ts app/studio/studio-store-v2_1-fixtures.test.ts
   pnpm test
   pnpm exec tsc --noEmit
   pnpm lint
   pnpm build
   ```

## Checkpoint 3

- [ ] Store no longer treats mesh/displacement as active primary state.
- [ ] Morph Stack state is serializable and persisted.
- [ ] Randomize is deterministic.
- [ ] Locks are scoped and honored.
- [ ] Runtime/binary data is excluded from persistence.

