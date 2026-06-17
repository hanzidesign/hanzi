# Phase 2: Morph Layer Catalogue

**Purpose:** Build the schema and registry for the broad Morph Layer Catalogue before wiring complex UI.

## Scope

- Registry and helper logic.
- Stable and Experimental tier metadata.
- No user-facing Morph Stack panel yet.
- No requirement to visually compose every morph in shaders during this phase.
- Do not modify Studio store, panel UI, or Character Surface shader composition in this phase.
- WebGPU remains a renderer capability, not a Morph Layer.

## Files

- Create: `morph/types.ts`
- Create: `morph/catalogue.ts`
- Create: `morph/params.ts`
- Create: `morph/randomize.ts`
- Create: `morph/catalogue.test.ts`
- Create: `morph/randomize.test.ts`
- Reference: `tasks/v2.1/morph-layer-catalogue.md`

## Required Types

```ts
type MorphLayerTier = 'stable' | 'experimental'

type MorphLayerCategory =
  | 'coordinate'
  | 'lens'
  | 'field'
  | 'slice'
  | 'pixel'
  | 'morphology'
  | 'surface-depth'
  | 'vector'
  | 'feedback'

type MorphLayerDefinition = {
  id: string
  name: string
  category: MorphLayerCategory
  tier: MorphLayerTier
  pipelinePhase: MorphLayerPipelinePhase
  params: MorphParamDefinition[]
}
```

Phase 2 may add implementation-only pipeline phase metadata:

```ts
type MorphLayerPipelinePhase =
  | 'pre-raster'
  | 'coordinate'
  | 'mask'
  | 'surface'
  | 'post'
```

The user-facing model remains one ordered **Morph Stack**.

## Stable First Set

Implement these stable entries first to prove breadth:

- `sine-bend`
- `swirl-well`
- `curl-flow`
- `band-slice`
- `pixelate-grid`
- `ink-compression`
- `surface-depth`

Category mapping:

- `sine-bend`: `coordinate`
- `swirl-well`: `lens`
- `curl-flow`: `field`
- `band-slice`: `slice`
- `pixelate-grid`: `pixel`
- `ink-compression`: `morphology`
- `surface-depth`: `surface-depth`

## Experimental First Set

Add metadata only if implementation is not ready:

- `vector-pre-morph`
- `pixel-sort-heavy`
- `feedback-advection`
- `webgpu-renderer` as renderer capability, not stack layer

## Resolved Grill Decisions - 2026-06-17

- Keep Phase 2 limited to `morph/` schema, registry, params, randomization, and tests.
- Add `pipelinePhase` as implementation metadata only; do not create a second user-facing stack.
- Implement only the seven Stable entries listed above for the first catalogue breadth proof.
- Keep Experimental Morph Layer entries in the same catalogue with explicit badge metadata: label, reason, and risk note.
- Keep `webgpu-renderer` out of the Morph Layer registry; cover the boundary with tests.
- Model params like shader params, but do not bind Morph params to GLSL `uniformName` in Phase 2.
- Add randomization bounds to params separately from UI min/max bounds.
- Default deterministic randomization to three layers, with an option to pass a different layer count.
- Normalize numeric seeds to unsigned 32-bit values and use an internal deterministic PRNG.
- Return a `MorphStackPresetDraft` with `seed` and enabled layer drafts; Phase 3 store code will add instance ids, locks, and collapsed state.
- Validate the registry at import time, matching the existing shader registry style.
- No ADR is needed for these Phase 2 implementation-contract decisions.

## Steps

1. Write failing catalogue tests:
   - ids are unique
   - categories are valid
   - tiers are explicit
   - no Experimental layer is missing its badge metadata
   - every param has default/min/max where needed

2. Write deterministic randomization tests:
   - same seed returns same stack
   - default randomization excludes Experimental layers
   - opt-in randomization may include Experimental layers

3. Implement catalogue types, param definitions, defaults, bounds, and registry helpers.

4. Implement deterministic seeded random helper.

5. Run:

   ```sh
   pnpm vitest run morph/catalogue.test.ts morph/randomize.test.ts
   pnpm test
   pnpm exec tsc --noEmit
   pnpm lint
   pnpm build
   ```

## Checkpoint 2

- [ ] Catalogue exists and is not fluid-only.
- [ ] Stable and Experimental tiers are enforced by tests.
- [ ] Randomization defaults to Stable-only.
- [ ] Catalogue can support UI grouping by category.
