# Phase 5M — reference editor Dithering Effect Architecture Correction

Date: 2026-07-13  
Branch: `v2.1`  
Route scope: `/studio` only  
Status: plan check-in; application code has not been changed

## Outcome

Rebuild `/studio` around the reference editor's desktop editor architecture while preserving Hanzi Studio's only local input: the current Character selector plus 3D Motion panel. Correct the renderer boundary so ASCII remains an ASCII-only pipeline and Dithering becomes the first real non-ASCII effect with reference-matched Settings and behavior.

This phase is complete only when every visible Dithering control has an effect-local schema, reset/sanitize contract, runtime mapping, and verified visible output behavior on the selected Character.

## Corrected Product Contract

- The reference editor uses `data/sample.jpg` only as the external behavior probe.
- Local Hanzi Studio does not accept images. It renders only the selected Character.
- The local Character keeps the current 3D Motion behavior: position, rotation, depth/extrusion, scale, animation, and auto-spin remain upstream of the chosen visual effect.
- ASCII keeps its dedicated glyph-atlas renderer and ASCII-only Settings.
- Dithering must never receive ASCII Character Set, Scale, Spacing, Output Width, glyph-atlas, or hidden ASCII color-transform state.
- Every later non-ASCII Effect will follow the same effect-module boundary; incomplete Effects must not fall back to an ASCII approximation.

## Evidence Baseline

### Reference editor live layout

Measured at a `1280 × 720` viewport on 2026-07-13:

| Region | Width | Behavior |
| --- | ---: | --- |
| Left sidebar | `288px` / `18rem` | full viewport height, independent vertical scroll, right border |
| Center preview | `640px` at this viewport | fills remaining width, overflow hidden |
| Right sidebar | `352px` / `22rem` | full viewport height, independent vertical scroll, left border |

The reference editor tokens observed in its current public CSS:

```css
--term-bg: #0a0a0a;
--term-panel: #0f0f0f;
--term-border: #222222;
--term-accent: #ffffff;
--term-accent-dim: #aaaaaa;
--term-text: #888888;
--term-text-dim: #555555;
--term-text-bright: #cccccc;
```

The project keeps its current typography contract, but matches the reference editor's spacing, density, borders, color hierarchy, control geometry, and three-column layout.

### Generated implementation reference

Authoritative UI-layout reference:

`data/Generated image 1.png`

The reference editor remains the behavior source for Settings and effect logic; this repository image is the source of truth for local `/studio` visual placement, density, and proportions.

Extracted layout rules:

- Edge-to-edge three-column surface; no page margin, floating shell, rounded cards, gradient, or glass treatment.
- Left sidebar header, expanded Input, expanded Effects, and collapsed Presets use one continuous panel surface with `1px` dividers.
- Character and 3D Motion sit together inside Input; they do not become a reference editor file-drop zone.
- The selected Effect row uses a subtle neutral fill and bright dot, not a raised card.
- The center Character is the dominant visual; toolbars stay small and pinned to edges.
- The right sidebar uses compact groups with `112px` labels, `28px` rows, `1px` slider tracks, `8px` thumbs, and minimal gaps.
- Settings, Processing, Post-Processing, and Export are siblings rather than nested cards.

## Current Root Cause

```text
Effect selection
  → effect-local UI metadata and store bucket
  → generic numeric slot compiler
  → CharacterAsciiCanvas for every Effect
  → createAsciiShaderMaterial for every Effect
  → ASCII brightness/glyph/palette setup
  → approximate effect branch
  → ASCII alpha/saturation/hue/background finishing
```

The visible Settings catalogue is effect-specific, but the renderer is not. `StudioCanvas` always mounts `CharacterAsciiCanvas`; that canvas always builds `character-ascii-material.ts`; the fragment shader constructs ASCII cells/glyphs before selecting any non-ASCII branch and applies ASCII finishing afterward.

The generic option-index table is also keyed only by control id. Identically named controls such as `algorithm`, `direction`, and `color-mode` merge option ordinals across different Effects, so one Effect's enum can corrupt another Effect's shader meaning.

## Target Architecture

```text
Character source
  SVG geometry + 3D Motion
            │
            ▼
Effect router
  ├─ ASCII      → ASCII mesh/glyph-atlas pipeline
  ├─ Dithering  → Character source render target → Dithering screen-space pass
  └─ Incomplete → explicit not-implemented state; never ASCII fallback
            │
            ▼
Shared Processing → Shared Post-Processing → preview/export
```

Required module boundaries:

1. `CharacterSourceMesh`
   - Owns SVG geometry creation and 3D Motion transforms.
   - Contains no ASCII or Dithering logic.

2. Effect router
   - Uses an explicit renderer discriminator.
   - Routes ASCII only to `CharacterAsciiCanvas`.
   - Routes Dithering only to `CharacterDitheringCanvas`.
   - Does not select a renderer by numeric shader id.

3. ASCII effect module
   - Keeps the current glyph atlas and ASCII Settings.
   - Removes all non-ASCII shader branches from the ASCII material.

4. Dithering effect module
   - Owns its definition, defaults, sanitizer, reset semantics, enum mapping, compiler, material/passes, and focused tests.
   - Samples a rendered Character source texture; it does not sample the ASCII glyph atlas or hidden ASCII state.

5. Shared Processing/Post-Processing
   - Runs after the selected effect output.
   - Remains separate from left-side 3D Motion/Animation.

## Reference editor Dithering Settings Contract

### Dithering

| Control | Type | Default | Range/options | Visibility |
| --- | --- | --- | --- | --- |
| Algorithm | select | Bayer 8x8 | 16 algorithms below | always |
| Intensity | range | `1` | `0.1..2`, step `0.05` | always |
| Levels | range | `2` | `2..32`, step `1` | Tonal or RGB |
| Matrix Size | select | `4` | `2 / 4 / 8 / 16` | Bayer, Ordered, Clustered Dot |
| Line Weight | range | `0.5` | `0.1..1`, step `0.05` | Crosshatch |
| Line Spacing | range | `10` | `1..50`, step `1` | Crosshatch |
| Layers | range | `2` | `1..4`, step `1` | Crosshatch |
| Modulation | toggle | off | boolean | always |
| Mod Type | select | renderer fallback Wave | Wave, Grid, Radial, Horizontal, RGB Split | modulation enabled |
| Mod Frequency | range | `5` | `1..20`, step `1` | modulation enabled |
| Mod Amplitude | range | `0.1` | `0..10`, step `0.1` | modulation enabled |

Algorithm order and effect-local ids:

| ID | Algorithm |
| ---: | --- |
| 0 | Floyd-Steinberg |
| 1 | Atkinson |
| 2 | Jarvis-Judice-Ninke |
| 3 | Stucki |
| 4 | Burkes |
| 5 | Sierra |
| 6 | Sierra Two-Row |
| 7 | Sierra Lite |
| 8 | Bayer 2x2 |
| 9 | Bayer 4x4 |
| 10 | Bayer 8x8 |
| 11 | Bayer 16x16 |
| 14 | Clustered Dot |
| 17 | Blue Noise |
| 19 | Interleaved Gradient |
| 20 | Crosshatch |

Matrix Size labels:

- `2x2 (Coarse)`
- `4x4 (Medium)`
- `8x8 (Fine)`
- `16x16 (Very Fine)`

### Adjustments

| Control | Default | Range | Runtime behavior |
| --- | ---: | --- | --- |
| Brightness | `0` | `-100..100`, step `1` | add `value / 100` to RGB |
| Contrast | `0` | `-100..100`, step `1` | `(1+c)/(1-c*0.99)` around midpoint `0.5` |
| Gamma | `1` | `0.5..2`, step `0.05` | `pow(color, 1/gamma)` |
| Sharpen | `0` | `-1..1`, step `0.1` | 5-sample Laplacian; negative softens |

Each row has a local lowercase `reset` action that appears only when the value differs from default.

### Color

| Control | Default | Options/range | Visibility |
| --- | --- | --- | --- |
| Mode | Mono | Mono, Tonal, Palette, RGB, Original | always |
| Palette | GameBoy | grouped built-in palettes + Custom | Palette |
| Foreground | `#FFFFFF` | color | Mono/Tonal |
| Background | `#000000` | color | Mono/Tonal/Original |
| Color Depth | `2` | `2..64`, step `1` | RGB |

Palette groups:

- Retro Gaming: GameBoy 4, CGA 16, NES 54, PICO-8 16, C64 16, Apple II 16, Macintosh 16.
- Artistic: Sepia 5, Cyberpunk 6.
- Print: Newspaper 2, Risograph 5.
- Custom: Custom palette editor with at most 64 colors.

Color behavior:

- Mono: threshold chooses Foreground or Background.
- Tonal: quantized luminance blends Foreground and Background.
- Palette: choose the nearest two palette colors, then threshold between them using relative distances.
- RGB: quantize each channel independently using Levels/Color Depth.
- Original: dither between original sampled color and Background.

### Chromatic Effects

| Control | Default | Range |
| --- | ---: | --- |
| Enabled | off | boolean |
| Max Displace | `6px` | `0..50`, step `1` |
| Red Channel | `23` | `0..360`, step `1` |
| Green Channel | `50` | `0..360`, step `1` |
| Blue Channel | `80` | `0..360`, step `1` |

Each channel angle becomes a direction vector for spatially displaced sampling. Final mix strength is `maxDisplace / 100`. The group Reset restores only these five defaults.

## Dithering Runtime Semantics

### Source sampling

- Render the current 3D Character and its lighting/depth result to a texture.
- Quantize screen coordinates by `matrixSize` before sampling:
  `pixelatedUV = floor(fragCoord / matrixSize) * matrixSize / resolution`.
- Keep Matrix Size separate from the selected algorithm's threshold matrix. Default output is Bayer 8x8 thresholding over a 4px sample grid.

### Algorithm families

- Bayer 2/4/8/16: exact ordered threshold matrices.
- reference-named error diffusion methods: match the reference editor's current blue-noise threshold approximation rather than implementing CPU-style sequential diffusion.
  - Floyd `0.50`
  - Atkinson `0.35`
  - Jarvis-Judice-Ninke `0.65`
  - Stucki `0.60`
  - Burkes `0.55`
  - Sierra `0.58`
  - Sierra Two-Row `0.52`
  - Sierra Lite `0.40`
- Blue Noise: combine three interleaved-gradient noise layers.
- Interleaved Gradient: deterministic fragment-coordinate noise with the reference editor's constants.
- Clustered Dot: cell size `matrixSize * 2`; radius `(1-luminance) * 0.48`.
- Crosshatch:
  - UV scale `lineSpacing * 5`.
  - thickness `lineWeight * 0.15 * (0.5 + darkness * 1.5)`.
  - layers appear at darkness thresholds `0.15 / 0.35 / 0.55 / 0.75`.
  - directions are horizontal, +45°, vertical, and -45°.

### Intensity

- Adaptive/noise methods add `(intensity - 1) * 0.3` to luminance.
- Other methods adjust black/white points: values above `1` suppress dark-region noise; below `1` suppress light-region noise.

### Modulation

- Wave: X-driven vertical sine displacement and threshold modulation.
- Grid: X and Y drive each other's displacement; threshold uses the product of both sine axes.
- Horizontal: Y-driven horizontal displacement and threshold modulation.
- Radial: center-out displacement with `distance * frequency * 4π`.
- RGB Split: phase-separated channel sampling; no threshold modulation.
- General displacement amplitude is multiplied by `0.05`; RGB Split uses `0.02`.

## Deliberate Bug Policy

The current reference editor WebGPU build exposes two no-op paths:

1. RGB Color Depth is overwritten before the shader reads it.
2. Custom Palette UI state is not passed into the WebGPU renderer.

Recommendation: match the intended visible behavior, not these two no-op wiring bugs. The user's requirement says every Settings change must be tested and implemented. Therefore local Color Depth will control RGB quantization, and Custom Palette colors will reach the Dithering renderer.

## Reset Contract

- Right Settings Reset resets only the selected Effect in Hanzi Studio. It must not reset unrelated Effects, even though the reference editor's current non-ASCII reset resets all non-ASCII effect state.
- Adjustment row reset affects only its row.
- Chromatic Reset affects only the Chromatic group.
- Switching ASCII ↔ Dithering preserves each Effect's local values.

This selected-only policy preserves effect isolation and avoids surprising cross-effect data loss.

## Implementation Slices

### Slice A — Contracts and red tests

- Add an explicit renderer discriminator to Effect definitions.
- Add a Dithering-specific typed settings module and exact defaults/options.
- Replace global control-id option indexes with effect-local enum maps.
- Add red tests for schema snapshot, conditional visibility, selected-only reset, sanitization, persistence, and renderer routing.

### Slice B — Character source and effect router

- Extract reusable SVG geometry + 3D Motion ownership.
- Route ASCII to ASCII-only canvas/material.
- Route Dithering to its own render-target + screen-space pipeline.
- Show an explicit incomplete state for other Effects until their own slice is implemented.

### Slice C — Dithering algorithms

- Implement source texture sampling, Matrix Size grid, adjustments, exact Bayer matrices, blue-noise approximations, Clustered Dot, Interleaved Gradient, and Crosshatch.
- Implement effect-local enum mapping and per-algorithm tests.

### Slice D — Color, modulation, chromatic

- Implement five color modes, built-in/custom palettes, Levels/Color Depth, five modulation modes, and spatial chromatic sampling.
- Add per-setting output fixtures/hashes for defaults, min/max, and each option.

### Slice E — reference editor UI parity

- Match the measured three-column shell and terminal controls.
- Keep Character selector and 3D Motion in Input.
- Implement conditional Dithering rows, reset actions, Processing, Post-Processing, and Export structure.

### Slice F — Verification

- Focused Dithering schema/store/compiler/material tests.
- Fixed grayscale/image-buffer algorithm fixtures.
- ASCII regression suite.
- Full Vitest, TypeScript, lint, build, and `git diff --check`.
- Browser console and renderer-routing checks.
- Manual reference editor visual pass with `data/sample.jpg`; local pass uses only selected Characters.

## Acceptance Matrix

| Requirement | Authoritative evidence |
| --- | --- |
| Local input is Character-only | DOM contract test and browser inspection; no file-input state/action in local code |
| reference editor layout parity | measured `288px / flex / 352px` layout, screenshot comparison, CSS contract test |
| ASCII isolation | router test; Dithering files do not import ASCII material/glyph atlas |
| Dithering settings parity | exact schema/conditional-visibility snapshot against this plan |
| Effect-local persistence | ASCII ↔ Dithering switch/hydration tests |
| Every Dithering control works | per-setting algorithm fixture or rendered output hash plus browser visual checklist |
| 3D Motion preserved | Character source transform/animation tests and browser checklist |
| No fake fallback | unsupported-effect route test and explicit incomplete UI state |

## Plan Check-in

Implementation should begin only after the user accepts this Dithering-first plan, including these two recommended deviations from current reference editor bugs:

1. Color Depth and Custom Palette will work instead of being no-ops.
2. Settings Reset will reset only the selected Effect instead of all non-ASCII Effects.
