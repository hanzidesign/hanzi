# Phase 1: Character Surface Foundation

**Purpose:** Replace the current centered 3D mesh preview with a fullscreen Character Surface that rasterizes the selected SVG into a mask texture.

## Scope

- Stable WebGL Character Surface only.
- Mask-texture rasterization only; defer full SDF generation until morphology or contour effects require it.
- No Morph Stack UI yet.
- No WebGPU dependency.
- Preserve character selection.
- Introduce the clean v2.1 persisted-state key in this phase. Do not migrate old mesh/displacement state.
- Keep old mesh/displacement code only if quarantined from the active preview path.

## Target Behavior

- Right-side preview fills the available preview area.
- No square `AspectRatio` wrapper.
- Selected SVG appears fully visible, upright, centered, and aspect-ratio preserving within the Character Surface.
- Default character visual scale matches the current preview scale; do not shrink, enlarge, stretch, crop, or distort the selected character while moving from the square mesh preview to the fullscreen Character Surface.
- Shader samples a mask texture generated from the selected SVG.
- Background canvas and foreground character can be drawn separately with Phase 1 defaults only: foreground `#000` and background from the current view background/default.

## Files

- Modify: `components/studio/StudioCanvas.tsx`
- Replace or create: `components/studio/CharacterSurfaceCanvas.tsx`
- Modify or quarantine: `components/studio/ShaderCanvas.tsx`
- Create: `components/studio/character-surface-rasterize.ts`
- Create: `components/studio/character-surface-rasterize.test.ts`
- Modify: `app/studio/studio-store.ts`
- Modify: `app/studio/studio-store.test.ts`

## Resolved Implementation Decisions

- Replace the active `ShaderCanvas`/`CharacterMesh` preview chain with `CharacterSurfaceCanvas`; do not run two active WebGL preview stacks in parallel.
- Remove active preview coupling to `CharacterMesh`, `ExtrudeGeometry`, `OrbitControls`, mesh loading status, displacement texture loading, and displacement-primary semantics.
- Load selected SVG text through active Studio runtime state as non-persisted data, keyed by the selected `characterUrl`. Do not make `CharacterSurfaceCanvas` the long-term owner of SVG fetching because later pre-raster steps need the same SVG source.
- Use a new v2.1 storage key during Phase 1 so refresh checks start clean. Persist only compact serializable editor choices; do not persist generated mask textures, fetched SVG text, image data URLs, render errors, or old mesh/displacement state.
- Keep the first render path simple: a fullscreen WebGL surface samples one `u_characterMask` texture and outputs foreground/background colors. Full Morph Stack composition and Surface Shader Layer controls land in later phases.
- Fit the selected SVG with a contain-style transform that preserves the source aspect ratio and current default visual scale while keeping the full character visible, centered, and upright.
- Do not add DOM/canvas test dependencies in Phase 1. The current Vitest environment is Node-only, so automated raster helper tests should cover pure parsing, bounds, sizing/orientation calculations, and empty-input rejection. Real browser image decode, Canvas 2D draw, WebGL upload, and visual uprightness are verified through the manual `/studio` smoke checklist.

## Steps

1. Add tests for SVG rasterization helper:
   - rejects empty SVG data
   - extracts drawable SVG metadata needed for rasterization
   - computes bounded mask dimensions
   - computes an upright, centered, aspect-ratio-preserving fit transform
   - preserves the current default visual scale

   Do not require Node Vitest to decode images or draw a real Canvas 2D mask. Browser decode/draw/upload behavior is covered by the manual smoke checklist unless the user explicitly asks for automated browser visual testing.

2. Add `character-surface-rasterize.ts` for rasterization planning plus browser Canvas 2D rasterization.

3. Add active runtime loading for selected SVG text:
   - load by selected `characterUrl`
   - keep loaded SVG text non-persisted
   - clear stale runtime SVG text when the selected character changes
   - surface load errors as non-persisted preview status

4. Create `CharacterSurfaceCanvas.tsx` as a fullscreen WebGL surface:
   - reuse the useful active WebGL seams from `ShaderCanvas`
   - remove `CharacterMesh`
   - remove `OrbitControls`
   - remove displacement texture loading
   - upload the rasterized SVG mask as `u_characterMask`

5. Replace `StudioCanvas` preview internals:
   - remove `AspectRatio`
   - remove mesh loading status coupling
   - rename status wording to Character Surface/raster status
   - keep translation label readable
   - keep preview background controlled by Phase 1 defaults until Surface Shader Layer controls land later

6. Feed selected SVG data into rasterization and upload the result as a texture.

7. Render mask output with simple foreground/background colors.

8. Run:

   ```sh
   pnpm vitest run components/studio/character-surface-rasterize.test.ts
   pnpm test
   pnpm exec tsc --noEmit
   pnpm lint
   pnpm build
   ```

9. Ask the user to perform manual browser smoke checks:
   - desktop `/studio`
   - mobile `/studio`
   - switch character
   - refresh page
   - confirm no upside-down character
   - confirm the selected character remains fully visible, centered, aspect-ratio preserving, and at the same default visual scale as the current preview

   Do not run automated browser visual checks unless the user explicitly asks for them.

## Checkpoint 1

- [ ] Fullscreen preview is active.
- [ ] Character Surface is mask-texture based.
- [ ] Character selection still works.
- [ ] Character is upright.
- [ ] Character remains fully visible, centered, aspect-ratio preserving, and at the same default visual scale as the current preview.
- [ ] v2.1 uses a clean storage key and does not migrate old mesh/displacement state.
- [ ] No active preview path uses `CharacterMesh` or `ExtrudeGeometry`.
