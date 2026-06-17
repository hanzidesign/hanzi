# Phase 3: Morph Stack State And Randomization

**Purpose:** Move the editor state from mesh/displacement semantics to Character Surface, Morph Stack, shader layers, pattern layers, locks, and randomization.

## Scope

- Zustand state and tests.
- No full UI rewrite yet.
- No shader implementation for every morph yet.
- Quarantine old mesh/displacement state so it is no longer active primary state or persisted; do not delete old components in this phase.
- Add only minimal panel enum/wiring changes needed for v2.1 state. Full Morph Stack UI lands in Phase 5.

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
- renderer mode selection: `webgl` or `webgpu-experimental`, defaulting to `webgl`
- active panel

Do not persist:

- uploaded image binaries or data URLs
- generated mask textures or future generated SDF textures
- WebGPU availability
- transient render errors

## Resolved Grill Decisions - 2026-06-17

- Phase 3 implements store state, actions, persistence, and randomization only; it does not implement the full Morph Stack panel UI or Character Surface shader rendering.
- Active panels become `character`, `morph`, `shader`, and `pattern`; `mesh` and `displacement` stop being active v2.1 panels.
- The default Morph Stack starts from a three-layer Stable preset generated from seed `0`.
- Morph layer instances use `id`, `definitionId`, `params`, `enabled`, `collapsed`, and `locked`.
- Manual reorder can move locked Morph layers, but randomization preserves locked Morph layers in their existing index with the same instance id, definition, params, enabled state, collapsed state, and lock state.
- Surface Shader Layer state is persisted now but rendered in Phase 4. The store uses fixed `foreground` and `background` layers with `color`, `stylePresetId`, `params`, and `locked`.
- Pattern Layer state is persisted as metadata only: `id`, `source`, `target`, and `locked`. Uploaded local file data and data URLs remain runtime-only and are not persisted.
- Pattern Layers are capped at three in store actions.
- Randomization updates the Morph Stack and unlocked Surface Shader Layers. It may update existing unlocked Pattern Layers, but it does not add or remove Pattern Layers.
- Renderer mode is persisted as `webgl` or `webgpu-experimental`, defaulting to `webgl`; WebGPU availability remains runtime-only and is not persisted.
- Use a new storage key, `hanzi-studio-character-surface-v2_1_phase3`, and start clean instead of merging old shader-only state.

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

6. Use a new v2.1 storage key and start clean. Do not migrate old mesh/displacement state.

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
