# Hanzi Studio Current Task State

Active implementation package: `tasks/v2.1/README.md`.
Direct development branch for v2.1 architecture: `v2.1`.
Current status: v2.1 planning package and Phase 0 architecture lock are complete; Phase 1 implementation has not started.

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
- [ ] Start Phase 1 Character Surface implementation after explicit implementation approval.

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

## Cleanup Review - 2026-05-27

- Replaced historical Phase 1-6 execution logs in this file with current v2.1 tracking only.
- Removed stale mesh/displacement implementation rules from `tasks/lessons.md`; active lessons now preserve only evergreen guidance.
- Strengthened superseded/historical guards in old planning docs so future work does not accidentally resume the Character Mesh path.
- Verification: stale active-rule grep against `tasks/todo.md` and `tasks/lessons.md` returned no matches.
- Verification: old-doc guard grep confirmed the historical and superseded warnings are present.
