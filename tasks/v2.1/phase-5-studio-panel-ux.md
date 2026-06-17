# Phase 5: Studio Panel UX

**Purpose:** Replace mesh/displacement controls with Character Surface, Morph Stack, shader, and Pattern Layer controls while preserving current Studio panel style and adding a visible Morph runtime. Before implementation, research the approved shader/postprocessing packages deeply enough to maximize character shade and shape variation, as well as user operability.

Companion guideline: [Phase 5 Layer Compositing Guidelines](./phase-5-layer-compositing-guidelines.md).

## Scope

- UI panels and controls.
- Highest-extent Morph Stack, Pattern Layer, and randomization controls for the current v2.1 architecture.
- Visible Morph runtime for the active Character Surface. Morph controls must affect the active preview and should maximize practical character shape and shader variation.
- Stackable Morph, Surface Shader, Pattern, and optional Post Surface layers with per-layer strength/intensity controls.
- Blend modes for Surface Shader Layers and Pattern Layers where blending is meaningful.
- Library-enabled shader implementation using LYGIA, postprocessing, and glslify where they reduce hand-written shader/effect code.
- Research-first package capability spike before committing to implementation architecture.
- No new visual design system.
- No export/timeline workflow.

Preserve the current Studio panel visual style: Mantine Accordion structure, `PanelBox`/`PanelLabel`, current spacing and typography rhythm, dark controls, and the existing route layout.

This project is personal research, so LYGIA's noncommercial / trial-oriented license is acceptable for Phase 5. Record the dependency in `package.json` and keep the decision visible in `tasks/todo.md`.

## Library Direction

- Use `framer-motion` `Reorder` for Morph Stack drag reorder.
- Use existing Mantine controls for panel UI. Do not adopt Leva for active Studio UI because it would introduce a separate debug-panel design language.
- Keep `react-best-gradient-color-picker` for Surface Shader color and gradient picking.
- Add `lygia` for reusable shader functions, especially distortion, filter, generative/noise, morphological, color, space, and lighting helpers. LYGIA is a capability library, not the product architecture.
- Add `glslify` as auxiliary shader tooling only. Phase 5A showed it does not directly resolve LYGIA's `#include` graph because LYGIA GLSL files do not export glslify symbols.
- Resolve LYGIA GLSL through a local recursive `#include` resolver in the existing shader loader path or a sibling helper.
- Use `glslify` for project-owned GLSL module composition or compatible third-party modules when it reduces duplication. Do not reshape LYGIA code or the Morph Stack around glslify syntax.
- Add `postprocessing` / `@react-three/postprocessing` for Surface-level enhancement when it improves Pattern Layer or post Morph output quality without breaking Character Surface mask routing.
- Keep WebGL as the default Stable renderer. Do not require WebGPU for Phase 5.

## Art Effect Core

The primary Phase 5 objective is a flexible Hanzi character art-effect system, not a showcase of imported packages. LYGIA, glslify, and postprocessing are functional supplements. They should reduce low-level shader code and broaden the effect vocabulary, but the project-owned model remains:

- **Character Surface** as the mask-aware rendering boundary.
- **Morph Stack** as the ordered, user-facing shape/effect pipeline.
- **Surface Shader Layers** as foreground/background shade controls.
- **Pattern Layers** as reusable modulation inputs.
- **Randomize** as a curated art-direction generator, not raw parameter noise.

The reference-image interaction model is accepted: rows of Morph, Surface Shader, and Pattern layers can stack, toggle visibility, lock, reorder where meaningful, and expose per-layer strength/intensity. Internally, these rows compile into strict render phases rather than one arbitrary universal list.

Project-owned effects should be first-class citizens. If a Hanzi-specific effect needs custom math, custom mask sampling, custom pattern routing, or custom randomization bounds, implement it in repo and optionally use LYGIA/glslify helpers inside it.

Package use rules:

- LYGIA helps implement reusable math, noise, morphology, color, filter, and lighting functions.
- glslify helps keep project-owned GLSL chunks modular when the chunk uses glslify-compatible exports/imports.
- postprocessing helps add optional whole-surface finishing effects after the Character Surface material.
- None of these packages should force a second Morph Stack, a debug-style UI, or a postprocess-only design that cannot respect character-mask semantics.

## Effect Families

Phase 5 should plan for multiple art-directed effect families. Each family can mix custom shader code with LYGIA/glslify helpers.

- **Calligraphic Deformation:** brush pressure, ink swelling, stroke compression, dry-edge roughness, edge feather, mask erosion/dilation.
- **Field Warp:** sine bend, curl/noise flow, swirl well, lens pull, gravity well, directional drift, center-aware stretch.
- **Slice And Glitch:** band slice, staggered strips, pixel grid, chromatic offset, local pixel-sort approximation, scanline accents.
- **Surface Depth:** bevel/rim light, embossed ink, heightfield highlight, specular streak, shadowed groove, surface-depth pattern modulation.
- **Pattern Material:** paper grain, ink wash, textile/moire, halftone, tiled pattern displacement, pattern-to-morph intensity.
- **Color And Shade:** solid/gradient foreground, palette shift, hue drift, saturation/vibrance, contrast, tonal posterization, dark-color-safe highlights.
- **Background Effects:** background solid/gradient-like shade where allowed, pattern wash, subtle noise, paper texture, vignette, controlled bloom/noise finishing.
- **Experimental Motion/Feedback:** feedback-advection approximation, glitch pulses, postprocess shock/chromatic effects, future render-target feedback.

Every effect family should answer:

- Which Character Surface selector it affects: character mask, foreground shade, background shade, Morph Stack, or post surface.
- Which params are user-operable.
- Which params randomize.
- Which params are locked by layer locks.
- Whether it is Stable or Experimental.

## Highest-Flexibility Effect Architecture

Use a layered architecture so new custom effects can be added without changing panel structure:

1. **Catalogue Layer:** effect definition, tier, category, params, defaults, randomization bounds, and capability notes.
2. **Runtime Adapter Layer:** maps catalogue ids to shader uniforms/chunks and postprocessing components.
3. **Shader Chunk Layer:** project-owned GLSL chunks may include LYGIA chunks or glslify-compatible local modules.
4. **Pattern Routing Layer:** Pattern Layers feed foreground, background, or whole Morph Stack modulation.
5. **Post Surface Layer:** optional postprocessing effects that preserve glyph readability.
6. **UI Layer:** generated controls from param schemas plus effect-specific affordances only when needed.
7. **Randomize Layer:** art-directed preset generation that chooses coherent combinations, not arbitrary independent values.

This keeps maximum flexibility while preventing package-driven drift. Adding a new effect should normally mean adding a catalogue definition, runtime adapter mapping, shader/postprocess implementation, and focused tests.

## Stackable Layer Direction

Use the Phase 5 layer compositing guideline as the implementation boundary:

- Keep separate visible stacks for Morph, Surface Shader, and Pattern layers.
- Use one shared row grammar across stacks: visibility, order where meaningful, name, thumbnail/icon, intensity, blend mode where meaningful, lock, and collapsed params.
- Add global `intensity` to Morph layers so every row has a strength control even when the effect-specific params differ.
- Turn Surface Shader into a real layer stack, or add stackable child layers under fixed foreground/background roots. Do not keep it as only one foreground color and one background color.
- Add `enabled`, `intensity`, `blendMode`, and reorder behavior to Pattern Layers.
- Update Pattern Layer runtime so multiple layers for the same target visually accumulate. The current "first texture wins" behavior is not acceptable for the stack model.
- Keep Pattern Layer max at three for Phase 5 unless texture-slot verification proves a higher cap is safe.
- Optional post effects run after the Character Surface material and must remain secondary to mask-aware Morph and Shader composition.

The renderer compiles the user-facing stacks into this order:

1. optional Experimental pre-raster vector effects
2. rasterized character mask
3. coordinate Morph Stack
4. mask / morphology Morph Stack
5. foreground and background Surface Shader stacks
6. Pattern modulation stacks
7. final Character Surface composite
8. optional Post Surface effects

## Phase 5A: Package Capability Research Gate

Complete this before writing the production Phase 5 implementation.

Research `lygia`, `glslify`, `postprocessing`, and `@react-three/postprocessing` against the current Character Surface pipeline. The output should be a short research record in `tasks/todo.md` with these decisions:

- Which LYGIA modules are useful for Character Surface shape changes:
  - coordinate distortion
  - noise / generative fields
  - morphological filters
  - SDF or mask operations
  - lighting / surface-depth helpers
  - color and blend helpers
- Which LYGIA modules are useful for shader / shade changes:
  - gradient/color transforms
  - tonemapping or palette helpers
  - lighting, bevel, rim, normal-like effects
  - filter effects that preserve the character mask boundary
- Whether `glslify` can be integrated with Next/Turbopack without brittle custom build tooling.
- Whether LYGIA should be consumed through npm package imports, copied/pruned local GLSL assets, or resolved into checked-in shader chunks.
- Which `postprocessing` effects are compatible with Character Surface:
  - acceptable: effects that enhance the final image without destroying mask readability
  - risky: effects that blur, crop, or globally distort the character beyond recognition
- Whether postprocessing should run after the Character Surface material, or remain deferred until the Morph material is stable.
- Which package capabilities should become user controls in Phase 5, not hidden constants.
- Which capabilities are too heavy or too unstable and should be labelled Experimental.

The research gate must produce an implementation choice for each approved package:

- **Adopt now:** active Phase 5 dependency and tested integration.
- **Use as reference:** no runtime dependency, but informs shader code.
- **Defer:** documented reason and fallback.

Do not start the production `MorphStackPanel`, `PatternLayerPanel`, randomization UI, or visible Morph runtime until this research gate is recorded.

## Character Shade And Shape Targets

Phase 5 should maximize the range and operability of character changes without turning Hanzi Studio into an export/timeline product.

Shape / morph targets:

- sequential coordinate warps
- swirl/lens/local field deformation
- band slicing and offset
- pixel-grid quantization
- mask expansion/compression
- surface-depth heightfield illusion
- pattern-modulated morph intensity
- Experimental post effects such as pixel-sort or feedback-like approximation when stable enough

Shade / surface targets:

- foreground solid and gradient color
- depth-lit foreground
- rim/highlight controls that remain visible on dark colors
- pattern-driven foreground and background modulation
- postprocessing enhancement when it preserves the character mask
- custom Hanzi-specific shade effects such as ink edge, paper bleed, bevel ink, and dry-brush contrast

Operability targets:

- every visible control must affect the active renderer
- each Morph Layer exposes useful controls from its schema
- every Morph, Surface Shader, and Pattern layer exposes a strength/intensity control
- blend modes are available for Surface Shader and Pattern layers where they affect color/material composition
- stacked Pattern Layers accumulate visibly within the selected target
- Randomize should create meaningfully different shade and shape combinations
- locks must preserve user intent across randomization
- Experimental controls must be visibly labelled and gracefully degrade
- package-backed effects and custom effects use the same control model so users do not need to know which implementation path is used

## Files

- Modify: `components/studio/StudioControls.tsx`
- Create: `components/studio/MorphStackPanel.tsx`
- Create: `components/studio/MorphLayerCard.tsx`
- Create or keep: `components/studio/ShaderPanel.tsx`
- Create: `components/studio/SurfaceShaderLayerPanel.tsx` or equivalent stackable child component if `ShaderPanel.tsx` remains the container.
- Create: `components/studio/PatternLayerPanel.tsx`
- Create: `components/studio/LayerStackRow.tsx`
- Modify: `components/studio/CharacterPanel.tsx`
- Modify: `components/studio/CharacterSurfaceCanvas.tsx`
- Modify: `components/studio/surface-shader-material.ts`
- Create: `components/studio/morph-stack-runtime.ts`
- Create: `components/studio/morph-stack-runtime.test.ts`
- Create: `components/studio/layer-compositing.ts`
- Create: `components/studio/layer-compositing.test.ts`
- Create: `components/studio/postprocessing-effects.tsx` if postprocessing is adopted in the active canvas.
- Remove or retire: `components/studio/MeshPanel.tsx`
- Remove or retire: `components/studio/DisplacementPanel.tsx`

## Panel Set

Recommended panels:

- `Character`
- `Morph Stack`
- `Shaders`
- `Patterns`
- `Surface`

## Morph Stack UI Requirements

- Add layer
- Duplicate layer
- Delete layer
- Enable/disable layer
- Lock layer
- Collapse/expand layer controls
- Drag reorder
- Stable/Experimental badge
- Category-based Add Layer picker
- Randomize with:
  - seed
  - regenerate
  - include Experimental opt-in
  - lock awareness
- Per-layer schema-driven controls:
  - number params use slider plus numeric input where space allows
  - select params use a select control
  - boolean params use a switch
- Layer cards must show layer name, category, Stable/Experimental tier, enable state, lock state, collapse state, and drag handle.
- Layer cards must include a global intensity control.
- Experimental entries remain visible and labelled. Include Experimental opt-in controls whether they can be added by randomization.

## Visible Morph Runtime Requirements

- The active Character Surface must consume enabled Morph Stack layers.
- Stable Morph layers should have visible output in Phase 5:
  - `sine-bend`
  - `swirl-well`
  - `curl-flow`
  - `band-slice`
  - `pixelate-grid`
  - `ink-compression`
  - `surface-depth`
- Experimental layers may be visible when feasible, but must degrade gracefully:
  - `vector-pre-morph` may appear in UI but can remain disabled or labelled as future runtime if path tooling is not implemented.
  - `pixel-sort-heavy` and `feedback-advection` may use postprocessing or fallback approximations.
- Locked layers are still applied visually; locks only prevent randomization or edits from changing the layer.
- Disabled layers must not affect the preview.
- Reordering enabled layers must change the composed result when the layer order is visually meaningful.
- Pattern Layer target `morph-stack` should modulate the Morph runtime globally, not a single Morph layer.

## Pattern Layer UI Requirements

- Add up to three Pattern Layers.
- Pattern Layers are stackable within their selected target; multiple layers for one target must visually accumulate.
- Enforce exactly one target per Pattern Layer:
  - `Morph Stack`
  - `Foreground Shader`
  - `Background Shader`
- Support built-in pattern source selection.
- Support local file source for the current browser session only.
- Support intensity and blend mode per Pattern Layer.
- Lock preserves source and target during randomization.
- The fourth Add action must be visibly blocked or disabled.

## Steps

1. Run Phase 5A package capability research for `lygia`, `glslify`, `postprocessing`, and `@react-three/postprocessing`; record findings and adopt/reference/defer decisions in `tasks/todo.md`.

2. Add dependency/tooling tests or smoke tests for adopted package integrations before wiring UI.

3. Define the Phase 5 effect runtime adapter contract for custom effects, LYGIA-backed shader effects, glslify-compatible local modules, and postprocessing effects.

4. Add layer compositing tests for shared intensity, blend modes, caps, and compile ordering.

5. Add component tests where practical for control rendering and actions.

6. Add Morph runtime tests for catalogue-to-uniform mapping, enabled/disabled layers, max supported layer count, intensity, lock-independent rendering, and stable fallback behavior.

7. Replace panel list in `StudioControls.tsx`.

8. Implement shared stack row controls with stable dimensions and no text overflow.

9. Implement `MorphStackPanel` using current accordion/PanelBox visual style.

10. Implement visible Morph runtime in the Character Surface material. Prefer custom Hanzi-specific effects first, using LYGIA helper chunks resolved through the local include resolver when they reduce low-level code.

11. Implement stackable shader layer controls:
   - foreground character layer
   - background canvas layer
   - separate locks
   - intensity
   - blend mode where meaningful

12. Implement Pattern Layer controls:
   - add up to three
   - single target selector
   - intensity
   - blend mode
   - lock
   - upload remains session-only

13. Update Pattern Layer runtime so multiple layers for one target visually accumulate.

14. Integrate postprocessing only if Phase 5A shows it improves visible Pattern/Morph output without fighting the Character Surface mask routing.

15. Run:

   ```sh
   pnpm test
   pnpm exec tsc --noEmit
   pnpm lint
   pnpm build
   ```

16. Ask the user to perform manual browser smoke checks:
   - desktop and mobile
   - open each panel
   - add/reorder/lock Morph layer
   - verify Morph controls visibly change the Character Surface
   - set layer intensity to 0%, 50%, and 100%
   - change Shader and Pattern blend modes
   - randomize with locked layer
   - add three Pattern Layers and verify fourth is blocked

   Do not run automated browser visual checks unless the user explicitly asks for them.

## Checkpoint 5

- [ ] New panels preserve current visual style.
- [ ] Morph Stack UI is usable and reorderable.
- [ ] Morph, Surface Shader, and Pattern layers expose visible per-layer strength/intensity.
- [ ] Surface Shader and Pattern layers expose blend modes where meaningful.
- [ ] Experimental options are visible but labelled.
- [ ] Pattern Layer UI enforces max three and single target.
- [ ] Pattern Layers visually accumulate within the same target.
- [ ] Morph Stack controls visibly affect the active Character Surface.
- [x] Phase 5A package capability research is recorded before production implementation.
- [ ] LYGIA/glslify/postprocessing integration is either active and tested or explicitly documented as deferred with fallback.
- [ ] No mesh/displacement language remains in active UI.
