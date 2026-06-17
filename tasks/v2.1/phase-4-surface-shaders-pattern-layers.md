# Phase 4: Surface Shader And Pattern Layers

**Purpose:** Add foreground/background Surface Shader Layers and Pattern Layers that can target Character Surface selectors.

## Scope

- Shader layer state and rendering.
- Pattern Layer state and rendering.
- Keep Pattern Layer cap at three.
- Each Pattern Layer has exactly one target.
- Keep full controls UI for Phase 5.
- Treat Phase 4 as the first real rendering baseline for Surface Shader Layers, not the final user-control surface.

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

Invalid Pattern Layer targets sanitize to `foreground-shader`.

## Pattern Sources

- Built-in pattern assets from the existing pattern asset list.
- Local file input as a session-only runtime source.

Invalid or missing Pattern Layer sources fall back to the first built-in pattern. If a local file fails to load after a previous valid texture exists, keep the last valid runtime texture and surface a non-persisted UI error.

## Resolved Grill Decisions - 2026-06-17

- Phase 4 wires real rendering for Surface Shader Layers and Pattern Layers, but does not build the full controls UI.
- Surface Shader Layer capability matures in three stages:
  - Phase 4: rendering-complete baseline with `solid`, `soft-gradient`, and `depth-lit`.
  - Phase 5: user-control-complete Studio panel UX.
  - Phase 6: heavier Experimental renderer/shader capabilities.
- Foreground shader styling applies only inside the rasterized character mask.
- Background shader styling applies to the canvas outside the character mask and remains visually separate from the foreground layer.
- Pattern target `foreground-shader` modulates only the foreground character styling; it does not change mask alpha or geometry.
- Pattern target `background-shader` modulates only the background canvas styling.
- Pattern target `morph-stack` is a pipeline-level texture input in Phase 4. It may provide global modulation but must not become a per-morph-layer target.
- Create `pattern-layer-texture.ts`; reuse cover-transform ideas where useful, but do not depend on displacement naming.
- Do not add a local file picker in Phase 4. Support local-file runtime data when present; keep uploaded data URLs out of persistence.
- Pattern load failures keep the last valid texture when one exists; otherwise they fall back to the first built-in pattern and expose only non-persisted error state.
- Phase 4 should keep Phase 3 lock/randomization behavior intact and covered by tests.
- `CharacterSurfaceCanvas` should prefer `surfaceShaders.background.color` over legacy `view.backgroundColor` for shader output. `view.backgroundColor` remains only a legacy/CSS fallback.
- No ADR is needed for these phase-level rendering contracts.

## Steps

1. Add tests for Pattern Layer target validation:
   - exactly one target
   - max three layers
   - invalid target sanitizes to fallback

2. Add tests for Surface Shader Layer locks and randomization preservation.

3. Add tests that randomization may update existing unlocked Pattern Layers, but does not add or remove Pattern Layers by default.

4. Implement foreground/background shader composition.

5. Implement Pattern Layer texture loading:
   - built-in pattern source
   - uploaded session-only source
   - last valid texture fallback
   - no uploaded data URL persistence

6. Wire Pattern Layer target behavior:
   - `morph-stack` feeds the whole Morph Stack pipeline
   - `foreground-shader` styles the character mask
   - `background-shader` styles the canvas

7. Run:

   ```sh
   pnpm vitest run components/studio/surface-shader-material.test.ts components/studio/pattern-layer-texture.test.ts app/studio/studio-store.test.ts
   pnpm test
   pnpm exec tsc --noEmit
   pnpm lint
   pnpm build
   ```

## Checkpoint 4

- [x] Foreground and background shader layers are visibly separate in the shader composition path.
- [x] Pattern Layer max of three is enforced.
- [x] Pattern Layer target is single-select.
- [x] Pattern target `morph-stack` affects the whole renderer pipeline as global texture modulation.
- [x] Locks preserve shader/pattern settings during randomization.
