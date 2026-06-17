# Hanzi Studio Current Task State

Active implementation package: `tasks/v2.1/README.md`.
Direct development branch for v2.1 architecture: `v2.1`.
Current status: Phase 4 Surface Shader And Pattern Layers implementation has passed automated verification. Phase 1 and Phase 4 manual browser smoke remain pending user report.

Keep this file as current-state tracking only. Historical phase logs belong in the superseded task docs or git history, not here.

## Phase 5 Layer Compositing Feasibility - 2026-06-17

- [x] Inspect the reference image expectation: Morph, Shader, and Pattern effects should stack in visible rows with per-layer strength, lock, order, and blend controls.
- [x] Compare that expectation with current v2.1 state and renderer.
- [x] Record the feasibility boundary: user-visible stackable layers compile into fixed Character Surface render phases.
- [x] Document why arbitrary interleaving across all layer kinds is not the Phase 5 target.
- [x] Add implementation guidelines for shared layer contract, intensity semantics, blend modes, caps, randomization, and Pattern Layer accumulation.

Review result:

- The direction is feasible, but it needs a compositing contract before UI implementation.
- Current Morph Stack state is closest to the target. It needs a global `intensity` field and visible runtime mapping.
- Current Surface Shader state is not yet stackable. Phase 5 should convert it into stackable foreground/background shader layers, or add stackable child layers under fixed foreground/background roots.
- Current Pattern Layers are metadata stacks, but runtime uses the first valid texture per target. Phase 5 must blend all valid Pattern Layers for a target so stacked rows visually accumulate.
- The user-facing model should match the image: separate Morph Stack, Surface Shader Layers, and Pattern Layers panels, each with row controls for visibility, order where meaningful, intensity, blend mode where meaningful, lock, and expanded params.
- The runtime model should remain phase-compiled: pre-raster -> raster mask -> coordinate morph -> mask/morphology -> surface shader stacks -> pattern modulation -> final composite -> optional post surface.
- Keep Pattern Layer max at three for Phase 5 unless texture-slot tests prove a higher cap is safe. The immediate requirement is real stacking/blending of the three layers.
- Added `tasks/v2.1/phase-5-layer-compositing-guidelines.md` as the plan guideline for this correction.

## Phase 5A Package Capability Research - 2026-06-17

- [x] Install or inspect `lygia`, `glslify`, `postprocessing`, and `@react-three/postprocessing` in a contained tooling spike.
- [x] Verify whether `glslify` can resolve LYGIA includes under the current Next/Turbopack setup without brittle custom build steps.
- [x] Map LYGIA modules to Character Surface shape targets: coordinate distortion, generative/noise fields, morphological filters, mask/SDF operations, surface-depth lighting, and color/blend helpers.
- [x] Map LYGIA modules to Character Surface shade targets: foreground gradient/color transforms, depth/rim/highlight lighting, palette/tonemap helpers, and mask-preserving filters.
- [x] Evaluate postprocessing effects for mask-safe enhancement versus risky global blur/crop/distortion.
- [x] Decide package-by-package whether to adopt now, use as reference, or defer with fallback.
- [x] Record which package capabilities become user-facing controls in Morph Stack, Pattern Layers, Shader controls, and Randomize controls.
- [x] Only after this research record is complete, begin production Phase 5 implementation.

Research result:

- Added Phase 5A dependencies: `lygia@1.4.1`, `glslify@7.1.1`, `postprocessing@6.39.1`, and `@react-three/postprocessing@3.0.4`.
- `glslify` does not directly resolve LYGIA's `#include` graph. `#pragma glslify: ... = require('lygia/...')` fails because LYGIA GLSL files do not export glslify symbols, and raw `#include "lygia/..."` is preserved instead of expanded.
- LYGIA's documented GLSL path requires project-side `#include` resolution. A local recursive include-resolver spike successfully expanded `snoise`, `pincushion`, `dilation`, `fresnel`, and `tonemapACES` to one shader string with no remaining `#include`.
- Implementation decision: adopt `lygia` now, but consume GLSL through a local include resolver added to the existing `loaders/glsl-source-loader.cjs` path or a sibling helper. Use `glslify` only as auxiliary tooling for non-LYGIA glslify modules if needed, not as the primary LYGIA resolver.
- Do not adopt `resolve-lygia` now. It is older, Patron-licensed, and primarily mirrors the online resolver path; a tiny local resolver better fits Next/Turbopack and avoids network dependency.
- Adopt `postprocessing` / `@react-three/postprocessing` now for Surface-level enhancement after the Character Surface material. It should not become the primary Morph Stack deformation engine.

Useful LYGIA modules for shape / Morph Stack:

- Coordinate and lens deformation: `distort/pincushion.glsl`, `distort/barrel.glsl`, `space/rotate.glsl`, `space/cart2polar.glsl`, `space/kaleidoscope.glsl`.
- Generative fields: `generative/snoise.glsl`, `generative/fbm.glsl`, `generative/curl.glsl`, `generative/voronoi.glsl`, `generative/worley.glsl`.
- Mask morphology: `morphological/dilation.glsl`, `morphological/erosion.glsl`, `morphological/alphaFill.glsl`. Use for `ink-compression` style mask expansion/compression, with bounded radius controls.
- Surface-depth / edge cues: `filter/edge/sobel.glsl`, `lighting/fresnel.glsl`, `lighting/specular/*`, and `color/tonemap/aces.glsl`.
- Pixel / grid effects: use existing catalogue params plus LYGIA math/space helpers where useful; keep `pixelate-grid` in material shader rather than postprocessing-only so it can remain mask-aware.

Useful LYGIA modules for shade / shader controls:

- Color and blend: `color/blend.glsl`, `color/luma.glsl`, `color/hueShift.glsl`, `color/vibrance.glsl`, `color/brightnessContrast.glsl`.
- Palette / tone: `color/palette/*.glsl`, `color/tonemap/aces.glsl`, `color/tonemap/reinhard.glsl`.
- Lighting: `lighting/fresnel.glsl`, `lighting/specular.glsl`, `lighting/diffuse.glsl` for rim/highlight controls visible on dark foreground colors.
- Mask-preserving filters: edge/Sobel and sharpen can enhance character boundaries when sampled against the character mask. Avoid broad blur as a default because it can damage glyph readability.

Postprocessing fit:

- Adopt as optional Surface/Post enhancement after the Character Surface render: `SMAA`, low-opacity `Noise`, low-granularity `Pixelation`, subtle `Bloom`, `HueSaturation`, `BrightnessContrast`, and mild `Vignette`.
- Mark as Experimental or Randomize-only with conservative bounds: `Glitch`, `ChromaticAberration`, `Scanline`, `ShockWave`, heavy `Pixelation`.
- Avoid using postprocessing for core Morph Stack order semantics because it runs after the material and is global; it cannot preserve per-layer mask-aware ordering as cleanly as the Character Surface shader.
- Keep feedback/advection style effects deferred unless a render-target feedback path is deliberately introduced later.

User-facing control mapping:

- `MorphStackPanel`: expose layer schema controls and route stable layers to material uniforms. Add pattern-modulated intensity for `morph-stack` target.
- `PatternLayerPanel`: built-in pattern source, session-only local file source, target selector, lock, delete, max-three enforcement.
- `ShaderPanel`: foreground/background color controls remain active; add depth/rim/highlight controls only when wired to material output.
- `Randomize`: include seed, regenerate, Include Experimental, lock-aware randomization, and randomized shade + shape combos. Randomization should vary Morph Stack order/params, shader colors/gradient, pattern source/target for unlocked layers, and optional post effects within readable bounds.

Art-effect planning correction:

- Primary goal is a Hanzi art-effect system: character shape effects, character shade effects, pattern/material effects, and background effects.
- LYGIA, glslify, and postprocessing are supplements, not architecture owners. They should reduce low-level shader work and broaden the vocabulary without pulling the product into a package showcase.
- Custom project-owned effects are first-class. Hanzi-specific ink edge, paper bleed, bevel ink, dry-brush contrast, calligraphic deformation, and mask-aware pattern routing can be implemented in repo and may use LYGIA helpers internally.
- Highest-flexibility architecture: catalogue layer -> runtime adapter layer -> shader chunk layer -> pattern routing layer -> post surface layer -> UI layer -> randomize layer.
- Effect families for Phase 5 planning: Calligraphic Deformation, Field Warp, Slice And Glitch, Surface Depth, Pattern Material, Color And Shade, Background Effects, and Experimental Motion/Feedback.
- Background effects are part of Surface Shader, Pattern Layer, or Post Surface handling, but should not become a separate generated-background product direction.
- Randomize should generate coherent art presets across custom and package-backed effects, preserving lock behavior and glyph readability.

Verification:

- `pnpm add lygia postprocessing @react-three/postprocessing glslify`
- local Node spike: `glslify` fails on LYGIA `#pragma glslify` export and does not expand raw `#include`.
- local Node spike: recursive LYGIA include resolver expands representative shape/shade modules with `HAS_INCLUDE false`.
- `pnpm exec tsc --noEmit`

## Phase 5 Library Research - 2026-06-17

- [x] Confirm Phase 5 implementation boundary before coding.
- [x] Review current dependencies for reusable UI, drag, shader, and Three/R3F capabilities.
- [x] Research existing libraries for Morph Stack, shader effects, pattern/effect composition, and Studio controls.
- [x] Decide which libraries to adopt, avoid, or defer.
- [x] Record Phase 5 library decision before implementation.

Review result:

- Use existing `framer-motion` `Reorder` for Morph Stack drag reorder; do not add a new DnD dependency.
- Keep existing Mantine `Accordion`, `Switch`, `Select`, `Slider`, `NumberInput`, `SegmentedControl`, and local `PanelBox`/`PanelLabel` for Studio controls; do not adopt Leva because it would introduce a debug-panel style outside the current Studio visual system.
- Keep existing `react-best-gradient-color-picker` for solid/gradient color UI.
- User confirmed this project is personal research, so LYGIA's noncommercial / trial-oriented license is acceptable for Phase 5.
- Adopt `lygia` as a shader helper source/package for stronger Morph runtime, especially distortion, filter, generative/noise, morphological, color, space, and lighting helpers.
- Adopt `glslify` when it can reduce shader include/manual-copy code. If Turbopack/Next integration is brittle, keep a tested local fallback while still using the same shader structure.
- Adopt `postprocessing` / `@react-three/postprocessing` where it improves Pattern Layer or Morph output quality without breaking Character Surface mask routing.
- Phase 5 is no longer a minimum visible Morph adapter. It should maximally enhance `MorphStackPanel`, `PatternLayerPanel`, `Randomize` controls, and visible Morph runtime while preserving current Studio panel style.

## Foreground Gradient Picker Correction - 2026-06-17

- [x] Confirm UI direction: one reusable gradient picker, Solid/Depth show a single-color bar without nodes, Gradient shows draggable color stops.
- [x] Add failing tests for foreground `gradient` style, gradient stop sanitization, shader uniforms, and Shader panel wiring.
- [x] Implement reusable `GradientColorPicker`.
- [x] Persist and sanitize foreground gradient stops in `surfaceShaders.foreground.params.gradientStops`.
- [x] Wire foreground gradient uniforms into `CharacterSurfaceCanvas` material.
- [x] Replace the foreground color input with the unified gradient picker UI.
- [x] Run focused tests, full verification, and record results.

Review result:

- Added `GradientColorPicker` as the unified color UI. Solid and Depth show a single-color bar without stops; Gradient shows draggable stops.
- Replaced the hand-rolled gradient interaction with `react-best-gradient-color-picker` after user review found the custom UX unusable.
- Foreground style tabs now include `Solid`, `Depth`, and `Gradient`, positioned above the color picker.
- Gradient stops are stored at `surfaceShaders.foreground.params.gradientStops`, clamped to valid hex colors and positions, sorted, capped at six stops, and kept to at least two stops.
- Added CSS color/gradient parsing so the package output is converted back into normalized renderer stops.
- Fixed the second-stop editing bug by preserving the package's draft CSS gradient string while editing instead of rebuilding the picker value from normalized persisted stops on every render.
- Removed the separate Foreground style tab. Solid/Gradient mode now comes from `react-best-gradient-color-picker` itself, so there is only one mode selector.
- Moved the picker into a modal. The panel now shows only a compact color preview button whose background reflects the current solid color or gradient.
- Removed the default modal frame. The color picker is centered as the visible floating UI, the overlay closes on outside click, and a custom X button sits at the picker's top-right corner.
- Fixed a `Maximum update depth exceeded` loop by preventing the picker adapter from writing unchanged mode/color/gradient stop values back into the store.
- Fixed rapid color-slider update loops by keeping high-frequency picker changes local, debouncing store commits, and committing immediately only when the picker closes.
- Changed the default Foreground shader style back to `solid` because `Depth` is no longer exposed by the active picker UI.
- Background remains non-gradient: background style is still sanitized to `solid`.
- The Character Surface shader now samples foreground gradient uniforms only inside the character mask.

Verification passed:

- `pnpm add react-best-gradient-color-picker`
- `pnpm vitest run components/studio/gradient-color-picker.test.ts components/studio/shader-panel-contract.test.ts`
- `pnpm vitest run components/studio/gradient-color-picker.test.ts`
- `pnpm vitest run components/studio/shader-panel-contract.test.ts components/studio/gradient-color-picker.test.ts app/studio/studio-store-v2_1-fixtures.test.ts components/studio/surface-shader-material.test.ts`
- `pnpm vitest run components/studio/gradient-color-picker.test.ts components/studio/shader-panel-contract.test.ts`
- `pnpm vitest run components/studio/gradient-color-picker.test.ts components/studio/surface-shader-material.test.ts components/studio/shader-panel-contract.test.ts app/studio/studio-store-v2_1-fixtures.test.ts`
- `pnpm exec tsc --noEmit`
- `pnpm lint`
- `pnpm test`
- `pnpm build`
- `git diff --check`

## Phase 4 UI Correction - 2026-06-17

- [x] Reproduce the mismatch: `ShaderPanel` still controls legacy shader presets while active preview reads `surfaceShaders`.
- [x] Add failing tests for active Surface Shader controls and background non-gradient state.
- [x] Replace the legacy Shader panel body with minimal Surface Shader controllers.
- [x] Force background Surface Shader style to `solid` and remove gradient from current UI surface.
- [x] Run focused tests, full verification, and record results.

Review result:

- Root cause: the visible `ShaderPanel` still updated legacy `shader.selectedPresetId/currentParams`, while the active `CharacterSurfaceCanvas` reads only `surfaceShaders`.
- Replaced the Shader panel with active Surface Shader controls: Foreground color, Foreground `solid`/`depth-lit` style, Foreground lock, Background color, and Background lock.
- Removed the visible legacy shader preset selector from the active panel so users no longer change a control that cannot affect the active renderer.
- Changed default background Surface Shader style back to `solid`.
- Clamped Surface Shader styles so background remains `solid`; stale or attempted `soft-gradient` state is sanitized away for the active store path.
- Kept Foreground style limited to `solid` and `depth-lit`; no gradient controller is exposed.

Verification passed:

- `pnpm vitest run components/studio/shader-panel-contract.test.ts app/studio/studio-store-v2_1-fixtures.test.ts`
- `pnpm exec tsc --noEmit`
- `pnpm lint`
- `pnpm test`
- `pnpm build`
- `git diff --check`

Depth style visibility correction:

- Root cause: `depth-lit` only multiplied the foreground base color by lighting, so the default black foreground stayed visually black.
- Updated `depth-lit` to add subtle diagonal highlight and rim light so dark foreground colors also show a visible surface-depth difference.
- Added a regression test that rejects the old pure-multiply depth path.
- Verification passed: `pnpm vitest run components/studio/surface-shader-material.test.ts`, `pnpm exec tsc --noEmit`, `pnpm lint`, `pnpm test`, `pnpm build`, and `git diff --check`.

## Phase 4 Surface Shader And Pattern Layers Grill - 2026-06-17

- [x] Review Phase 4 task doc, `CONTEXT.md`, Phase 3 store state, Character Surface renderer, and existing pattern texture helpers before asking questions.
- [x] Confirm which Phase 4 decisions are already locked by glossary and current code.
- [x] Collect user answers for the batched Phase 4 design questions.
- [x] Update `CONTEXT.md` only if answers introduce or sharpen domain terms.
- [x] Record the Phase 4 implementation boundary and next gate.

Review result: user approved all Phase 4 recommendations, with Surface Shader Layer completeness clarified as staged across Phase 4, Phase 5, and Phase 6. `CONTEXT.md` did not need changes.

Locked Phase 4 implementation boundary:

- Implement real rendering for Surface Shader Layers and Pattern Layers, but not the full controls UI.
- Phase 4 supports `solid`, `soft-gradient`, and `depth-lit` as the first rendering baseline.
- Phase 5 makes Surface Shader Layers fully user-controllable in the Studio UI.
- Phase 6 adds heavier Experimental renderer/shader capabilities.
- Foreground shader and foreground pattern affect only the rasterized character mask.
- Background shader and background pattern affect only the canvas/background area.
- Pattern target `morph-stack` acts as a pipeline-level input/global modulation, not a per-morph-layer target.
- Support built-in patterns and local-file runtime data; keep uploaded data URLs out of persistence.
- Pattern load failure keeps the last valid texture when possible, otherwise falls back to the first built-in pattern with non-persisted error state.
- `CharacterSurfaceCanvas` should prefer `surfaceShaders.background.color` over legacy `view.backgroundColor` for shader output.

## Phase 4 Implementation Review - 2026-06-17

- Added `components/studio/surface-shader-material.ts` with the Phase 4 rendering baseline: `solid`, `soft-gradient`, and `depth-lit`.
- Wired `CharacterSurfaceCanvas` through the new Surface Shader material, with separate foreground-mask and background-canvas shader uniforms.
- Changed the default Surface Shader styles to foreground `depth-lit` and background `soft-gradient` so Phase 4 has a visible baseline without waiting for Phase 5 controls.
- Added Pattern Layer texture routing for `foreground-shader`, `background-shader`, and `morph-stack`, including runtime local-file data support and non-persisted load-error state.
- Kept uploaded Pattern Layer data URLs runtime-only and preserved Phase 3 lock/randomization behavior.
- Updated the active preview contract test so the Character Surface route is checked through the new material and pattern texture wiring.
- Updated `tasks/v2.1/checkpoints.md` to mark Checkpoint 4 complete.

Verification passed:

- `pnpm vitest run components/studio/surface-shader-material.test.ts components/studio/pattern-layer-texture.test.ts components/studio/character-surface-preview-contract.test.ts app/studio/studio-store.test.ts app/studio/studio-store-v2_1-fixtures.test.ts`
- `pnpm exec tsc --noEmit`
- `pnpm lint`
- `pnpm test`
- `pnpm build`
- `git diff --check`

Residual notes:

- `pnpm test` and `pnpm build` still emit the existing Node warning: ``--localstorage-file` was provided without a valid path`; both commands exited successfully.
- Phase 4 intentionally does not add the full controls UI. Manual `/studio` smoke should verify the default surface remains nonblank, centered, and visually shows the new foreground/background baseline. Full user controls move to Phase 5.

## Phase 3 Morph Stack State Grill - 2026-06-17

- [x] Review Phase 3 task doc, existing Studio store, Phase 2 Morph catalogue API, and current panel wiring before asking questions.
- [x] Confirm which Phase 3 decisions are already locked by `CONTEXT.md` and code.
- [x] Collect user answers for the batched Phase 3 design questions.
- [x] Update `CONTEXT.md` only if the answers introduce or sharpen domain terms.
- [x] Record the Phase 3 implementation boundary and next gate.

Review result: user approved all Phase 3 recommendations. `CONTEXT.md` did not need changes because the existing glossary already covers **Morph Stack**, **Surface Shader Layers**, **Pattern Layer**, and **Renderer Mode**.

Locked Phase 3 implementation boundary:

- Implement store state, actions, persistence, and randomization only.
- Do not implement the full Morph Stack panel UI or Character Surface shader rendering in this phase.
- Quarantine old mesh/displacement state so it is no longer active primary state or persisted; do not delete old components until cleanup.
- Change active v2.1 panels to `character`, `morph`, `shader`, and `pattern`.
- Default Morph Stack starts from a three-layer Stable preset generated from seed `0`.
- Manual reorder can move locked Morph layers; randomization must preserve locked Morph layers in place.
- Persist fixed foreground/background Surface Shader Layer state and Pattern Layer metadata.
- Cap Pattern Layers at three and keep uploaded file data/data URLs runtime-only.
- Persist renderer mode as `webgl` or `webgpu-experimental`, defaulting to `webgl`.
- Use storage key `hanzi-studio-character-surface-v2_1_phase3`.

## Phase 3 Implementation Review - 2026-06-17

- Updated `app/studio/studio-store.ts` to add persisted Morph Stack layers, Surface Shader Layers, Pattern Layer metadata, random seed, and renderer mode.
- Changed the v2.1 storage key to `hanzi-studio-character-surface-v2_1_phase3` and kept old mesh/displacement/svgEffect state out of the persisted payload.
- Added Morph Stack actions for add, duplicate, remove, reorder, param update, lock, replace, and seeded randomization.
- Added Surface Shader Layer actions and Pattern Layer actions, including Pattern Layer cap enforcement and runtime-only uploaded Pattern Layer data.
- Added randomization behavior that preserves locked Morph layers in their existing slots, keeps locked Surface Shader Layers unchanged, and updates existing unlocked Pattern Layers without adding/removing pattern layers.
- Updated `components/studio/StudioControls.tsx` so active v2.1 panels are `character`, `morph`, `shader`, and `pattern`, without adding the full Phase 5 UI.
- Added `app/studio/studio-store-v2_1-fixtures.test.ts` for Phase 3 state, persistence, lock, randomization, renderer mode, and runtime-data guarantees.
- Updated `tasks/v2.1/checkpoints.md` to mark Checkpoint 3 complete.

Verification passed:

- `pnpm vitest run app/studio/studio-store.test.ts app/studio/studio-store-v2_1-fixtures.test.ts`
- `pnpm test`
- `pnpm exec tsc --noEmit`
- `pnpm lint`
- `pnpm build`
- `git diff --check`

Residual notes:

- `pnpm test` and `pnpm build` still emit the existing Node warning: ``--localstorage-file` was provided without a valid path`; both commands exited successfully.
- No browser visual QA is required for Phase 3 because this phase does not wire Character Surface rendering. Full visible effect changes begin in Phase 4 and Phase 5.

## Phase 2 Morph Layer Catalogue Grill - 2026-06-17

- [x] Review `CONTEXT.md`, active v2.1 package docs, and current Studio implementation before asking questions.
- [x] Confirm whether unresolved Phase 2 decisions are answerable from code or docs.
- [x] Collect user answers for the batched Phase 2 design questions.
- [x] Update `CONTEXT.md` only if the answers introduce or sharpen domain terms.
- [x] Record the Phase 2 grill review and next implementation gate.

Review result: user approved all Phase 2 recommendations. `CONTEXT.md` did not need changes because the existing glossary already covers **Morph Layer Catalogue**, **Morph Stack**, **Experimental Extension**, **Vector Pre-Morph**, and **Renderer Mode**.

Locked Phase 2 implementation boundary:

- Build only the new `morph/` schema, registry, params, randomizer, and focused tests.
- Do not modify Studio store, panel UI, or Character Surface shader composition in this phase.
- Implement the first seven Stable catalogue entries and three Experimental Morph Layer entries.
- Keep `webgpu-renderer` out of the Morph Layer registry; it remains a renderer capability.
- Add implementation-only `pipelinePhase` metadata while preserving one user-facing **Morph Stack**.
- Return deterministic `MorphStackPresetDraft` randomization output; Phase 3 will wrap it into persisted store state.

## Phase 2 Implementation Review - 2026-06-17

- Added `morph/types.ts` with Morph Layer tier, category, implementation pipeline phase, param, Experimental badge, and preset draft types.
- Added `morph/catalogue.ts` with the seven Stable first-set entries and three Experimental Morph Layer entries.
- Kept `webgpu-renderer` out of the Morph Layer registry because it remains a renderer capability.
- Added `morph/params.ts` for default and sanitized Morph params.
- Added `morph/randomize.ts` for deterministic seeded `MorphStackPresetDraft` generation, Stable-only by default and Experimental only by opt-in.
- Added `morph/catalogue.test.ts` and `morph/randomize.test.ts` covering ids, broad categories, Experimental metadata, WebGPU boundary, param defaults/bounds, seed normalization, deterministic output, and Stable-only defaults.
- Updated `tasks/v2.1/checkpoints.md` to mark Checkpoint 2 complete.

Verification passed:

- `pnpm vitest run morph/catalogue.test.ts morph/randomize.test.ts`
- `pnpm test`
- `pnpm exec tsc --noEmit`
- `pnpm lint`
- `pnpm build`
- `git diff --check`

Residual notes:

- `pnpm test` and `pnpm build` emit the existing Node warning: ``--localstorage-file` was provided without a valid path`; both commands exited successfully.
- No browser visual QA is required for Phase 2 because this phase does not wire UI or Character Surface rendering.

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
