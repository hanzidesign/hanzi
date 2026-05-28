# Hanzi Studio Current Task State

Active implementation package: `tasks/v2.1/README.md`.
Direct development branch for v2.1 architecture: `v2.1`.
Current status: Phase 1 Character Surface implementation has passed automated verification; manual browser smoke is pending user report.

Keep this file as current-state tracking only. Historical phase logs belong in the superseded task docs or git history, not here.

## Active v2.1 Package

- [x] Lock the v2.1 glossary in `CONTEXT.md`: Character Surface, Morph Stack, Morph Layer Catalogue, Surface Shader Layers, Pattern Layer, Experimental Extension, and Vector Pre-Morph.
- [x] Create the phased `tasks/v2.1/` implementation package.
- [x] Include PM-style checkpoints across multiple phases.
- [x] Add the Morph Layer Catalogue planning artifact.
- [x] Mark the old Character Mesh shader plans as superseded.
- [x] Mark v2.1 architecture for direct development on branch `v2.1`.
- [x] Run docs-only verification for the v2.1 planning package.
- [x] Clean up old task, lesson, and planning-doc status so active guidance points to v2.1.
- [x] Complete Phase 0 architecture lock grill and record resolved decisions.
- [x] Complete Phase 1 Character Surface foundation grill and record resolved implementation decisions.
- [x] Start Phase 1 Character Surface implementation after explicit implementation approval.

## Phase 1 Implementation Checklist

- [x] Add failing Node-safe raster helper tests for empty SVG rejection, metadata extraction, bounded mask dimensions, fit transform, and current-scale preservation.
- [x] Add failing store tests for clean v2.1 storage key, non-persisted loaded SVG text, and stale SVG runtime clearing on character change.
- [x] Implement `character-surface-rasterize.ts` pure helpers and browser rasterization entry point.
- [x] Update Studio store runtime state, storage key, persistence partialization, and actions for selected SVG loading.
- [x] Replace the active `ShaderCanvas`/`CharacterMesh` preview chain with `CharacterSurfaceCanvas`.
- [x] Remove `AspectRatio`, mesh status wording, `OrbitControls`, displacement texture loading, and active `CharacterMesh`/`ExtrudeGeometry` preview use.
- [x] Run Phase 1 focused tests, full repo verification, and record results.
- [x] Provide manual `/studio` browser smoke checklist for the user.

## Current Source Of Truth

- `CONTEXT.md`
- `tasks/v2.1/README.md`
- `tasks/v2.1/checkpoints.md`
- `tasks/v2.1/morph-layer-catalogue.md`

## Superseded / Historical Docs

- `tasks/shader-effect-redesign-plan.md`: superseded 3D Character Mesh implementation plan.
- `tasks/shader-effect-redesign-phased-implementation-plan.md`: superseded 3D Character Mesh phased handoff.
- `tasks/hanzi-studio-refactor-plan.md`: historical initial Hanzi Studio refactor scope; useful only for product-boundary background.

## Latest Planning Review - 2026-05-27

- Created `tasks/v2.1/README.md` as the active source of truth for the Character Surface redesign.
- Added phase plans for architecture lock, fullscreen Character Surface foundation, Morph Layer Catalogue, Morph Stack state/randomization, Surface Shader and Pattern Layers, Studio panel UX, Experimental Extensions, and cleanup/verification.
- Added `tasks/v2.1/checkpoints.md` with PM checkpoint lists for each phase.
- Added `tasks/v2.1/morph-layer-catalogue.md` with Stable and Experimental deformation families informed by open-source shader/filter/vector morph patterns.
- Kept product name as Hanzi Studio while renaming the core preview object to Character Surface and control system to Morph Stack.
- Set default Morph Stack composition to Sequential Warp Chain.
- Set Randomize to generate a full preset from Stable layers only by default, while honoring layer locks.
- Defined two Surface Shader Layers: foreground character mask and background canvas.
- Defined Pattern Layers as UI layers with one selector target each and a maximum of three Pattern Layers.
- Defined Experimental Extensions as opt-in modules shown inside the same panel system, not separate products, canvases, or required runtime dependencies.
- Marked v2.1 implementation as direct development on branch `v2.1`.

## Phase 0 Architecture Lock Review - 2026-05-28

- Treated the user grill response as the final Phase 0 approval gate for the v2.1 planning package.
- Locked clean v2.1 persistence: use a new storage key and do not migrate old mesh/displacement state.
- Locked Phase 1 rasterization scope to mask texture first; defer full SDF generation until morphology or contour effects need it.
- Locked the first Stable Morph Layer implementation set: `sine-bend`, `swirl-well`, `curl-flow`, `band-slice`, `pixelate-grid`, `ink-compression`, and `surface-depth`.
- Locked renderer vocabulary: persist `webgl` or `webgpu-experimental`; WebGPU is a renderer capability, not a Morph Layer.
- Locked manual browser visual verification: provide a `/studio` checklist and wait for the user's report instead of automatically running browser visual checks.
- No application code changed in Phase 0.

## Phase 1 Character Surface Foundation Grill - 2026-05-28

- Locked Phase 1 to replace the active `ShaderCanvas`/`CharacterMesh` preview chain with `CharacterSurfaceCanvas`; do not keep two active WebGL preview stacks.
- Locked active preview removal of `CharacterMesh`, `ExtrudeGeometry`, `OrbitControls`, mesh loading status, displacement texture loading, and displacement-primary semantics.
- Locked selected SVG loading into active non-persisted Studio runtime state keyed by `characterUrl`, rather than making the canvas component the long-term owner of SVG fetching.
- Locked clean v2.1 storage key introduction during Phase 1; do not migrate old mesh/displacement state.
- Locked Phase 1 test strategy: keep Node Vitest focused on pure parsing, bounds, sizing/orientation, and empty-input rejection; browser decode/draw/upload/uprightness stays in the manual `/studio` smoke checklist unless the user explicitly asks for automated browser visual testing.
- Locked first render path to one `u_characterMask` texture with foreground/background defaults; full Morph Stack composition and Surface Shader Layer controls remain later phases.
- Locked Character Surface fit behavior: selected character must remain fully visible, centered, upright, aspect-ratio preserving, and at the current preview's default visual scale.
- Updated `CONTEXT.md`, `tasks/v2.1/phase-1-character-surface-foundation.md`, and `tasks/lessons.md` only. No application code changed.

## Phase 1 Implementation Review - 2026-05-28

- Added `components/studio/character-surface-rasterize.ts` with Node-safe SVG metadata/fit planning and browser Canvas 2D rasterization for a fullscreen mask texture.
- Added `components/studio/CharacterSurfaceCanvas.tsx` as the active fullscreen WebGL Character Surface. It samples one `u_characterMask` texture and renders Phase 1 foreground/background defaults.
- Updated `components/studio/StudioCanvas.tsx` to remove the square preview wrapper, active `ShaderCanvas` path, mesh status wording, and active mesh/displacement preview coupling.
- Updated `app/studio/studio-store.ts` to use a clean `hanzi-studio-character-surface-v2_1` storage key, keep loaded SVG text in non-persisted runtime state, and persist only compact character/shader/view choices.
- Added tests for raster planning, clean v2.1 persistence, loaded-SVG runtime behavior, and active preview contract.
- Verification passed: `pnpm vitest run components/studio/character-surface-rasterize.test.ts app/studio/studio-store.test.ts components/studio/character-surface-preview-contract.test.ts`, `pnpm test`, `pnpm exec tsc --noEmit`, `pnpm lint`, and `pnpm build`. One earlier build attempt hit a transient Google font fetch failure; subsequent builds passed.
- Manual browser smoke is still pending user report by v2.1 rule. Checklist: desktop `/studio`, mobile `/studio`, switch character, refresh page, confirm nonblank fullscreen Character Surface, confirm no upside-down character, and confirm the character remains fully visible, centered, aspect-ratio preserving, and at the current default visual scale.

## Cleanup Review - 2026-05-27

- Replaced historical Phase 1-6 execution logs in this file with current v2.1 tracking only.
- Removed stale mesh/displacement implementation rules from `tasks/lessons.md`; active lessons now preserve only evergreen guidance.
- Strengthened superseded/historical guards in old planning docs so future work does not accidentally resume the Character Mesh path.
- Verification: stale active-rule grep against `tasks/todo.md` and `tasks/lessons.md` returned no matches.
- Verification: old-doc guard grep confirmed the historical and superseded warnings are present.
