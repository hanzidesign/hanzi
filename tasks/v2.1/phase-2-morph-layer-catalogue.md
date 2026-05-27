# Phase 2: Morph Layer Catalogue

**Purpose:** Build the schema and registry for the broad Morph Layer Catalogue before wiring complex UI.

## Scope

- Registry and helper logic.
- Stable and Experimental tier metadata.
- No user-facing Morph Stack panel yet.

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
  params: MorphParamDefinition[]
}
```

## Stable First Set

Implement enough stable entries to prove breadth:

- `sine-bend`
- `swirl-well`
- `curl-flow`
- `band-slice`
- `pixelate-grid`
- `ink-compression`
- `surface-depth`

## Experimental First Set

Add metadata only if implementation is not ready:

- `vector-pre-morph`
- `pixel-sort-heavy`
- `feedback-advection`
- `webgpu-renderer` as renderer capability, not stack layer

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

3. Implement catalogue types and registry helpers.

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

