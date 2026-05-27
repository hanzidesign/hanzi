# Phase 1: Character Surface Foundation

**Purpose:** Replace the current centered 3D mesh preview with a fullscreen Character Surface that rasterizes the selected SVG into a mask texture.

## Scope

- Stable WebGL Character Surface only.
- No Morph Stack UI yet.
- No WebGPU dependency.
- Preserve character selection.

## Target Behavior

- Right-side preview fills the available preview area.
- No square `AspectRatio` wrapper.
- Selected SVG appears upright and centered within the Character Surface.
- Shader samples a mask texture generated from the selected SVG.
- Background canvas and foreground character can be drawn separately.

## Files

- Modify: `components/studio/StudioCanvas.tsx`
- Replace or create: `components/studio/CharacterSurfaceCanvas.tsx`
- Create: `components/studio/character-surface-rasterize.ts`
- Create: `components/studio/character-surface-rasterize.test.ts`
- Modify: `app/studio/studio-store.ts`
- Modify: `app/studio/studio-store.test.ts`

## Steps

1. Add tests for SVG rasterization helper:
   - creates a canvas-backed mask source
   - preserves orientation
   - returns bounded dimensions
   - rejects empty SVG data

2. Add `character-surface-rasterize.ts` for Canvas 2D rasterization.

3. Create `CharacterSurfaceCanvas.tsx` as a fullscreen WebGL surface.

4. Replace `StudioCanvas` preview internals:
   - remove `AspectRatio`
   - remove mesh loading status coupling
   - keep translation label readable
   - keep preview background controlled by Surface Shader Layer defaults later

5. Feed selected SVG data into rasterization and upload the result as a texture.

6. Render mask output with simple foreground/background colors.

7. Run:

   ```sh
   pnpm vitest run components/studio/character-surface-rasterize.test.ts
   pnpm test
   pnpm exec tsc --noEmit
   pnpm lint
   pnpm build
   ```

8. Browser smoke:
   - desktop `/studio`
   - mobile `/studio`
   - switch character
   - refresh page
   - confirm no upside-down character

## Checkpoint 1

- [ ] Fullscreen preview is active.
- [ ] Character Surface is mask-texture based.
- [ ] Character selection still works.
- [ ] Character is upright.
- [ ] No active preview path uses `CharacterMesh` or `ExtrudeGeometry`.

