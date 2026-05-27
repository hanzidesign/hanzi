# Phase 4: Surface Shader And Pattern Layers

**Purpose:** Add foreground/background Surface Shader Layers and Pattern Layers that can target Character Surface selectors.

## Scope

- Shader layer state and rendering.
- Pattern Layer state and rendering.
- Keep Pattern Layer cap at three.
- Each Pattern Layer has exactly one target.

## Files

- Modify: `components/studio/CharacterSurfaceCanvas.tsx`
- Create: `components/studio/surface-shader-material.ts`
- Create: `components/studio/surface-shader-material.test.ts`
- Create: `components/studio/pattern-layer-texture.ts`
- Create: `components/studio/pattern-layer-texture.test.ts`
- Modify: `app/studio/studio-store.ts`
- Modify: `app/studio/studio-store.test.ts`

## Layer Targets

Initial selector targets:

- `morph-stack`
- `foreground-shader`
- `background-shader`

## Steps

1. Add tests for Pattern Layer target validation:
   - exactly one target
   - max three layers
   - invalid target sanitizes to fallback

2. Add tests for Surface Shader Layer locks and randomization preservation.

3. Implement foreground/background shader composition.

4. Implement Pattern Layer texture loading:
   - built-in pattern source
   - uploaded session-only source
   - last valid texture fallback
   - no uploaded data URL persistence

5. Wire Pattern Layer target behavior:
   - `morph-stack` feeds the whole Morph Stack pipeline
   - `foreground-shader` styles the character mask
   - `background-shader` styles the canvas

6. Run:

   ```sh
   pnpm vitest run components/studio/surface-shader-material.test.ts components/studio/pattern-layer-texture.test.ts app/studio/studio-store.test.ts
   pnpm test
   pnpm exec tsc --noEmit
   pnpm lint
   pnpm build
   ```

## Checkpoint 4

- [ ] Foreground and background shader layers are visibly separate.
- [ ] Pattern Layer max of three is enforced.
- [ ] Pattern Layer target is single-select.
- [ ] Pattern target `morph-stack` affects whole morph pipeline.
- [ ] Locks preserve shader/pattern settings during randomization.

